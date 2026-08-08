import { google, type sheets_v4 } from "googleapis";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Google Sheets service for Power of Attorney (Wakala) records.
 * Uses a dedicated sheet tab named "Attorney" in the same spreadsheet.
 */

const POA_SHEET_NAME = "Attorney";

export const POA_SHEET_COLUMNS = [
  "اسم العميل",
  "رقم الوكالة",
  "تاريخ الإصدار هجري",
  "تاريخ الانتهاء هجري",
  "الأيام المتبقية",
  "ملاحظات",
  "تاريخ الإنشاء",
] as const;

export const POA_COLS = POA_SHEET_COLUMNS.length; // 7
const COL_LAST = String.fromCharCode("A".charCodeAt(0) + POA_COLS - 1); // "G"

let sheetsClient: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const credentials = env.googleServiceAccountJson as {
      client_email?: string;
      private_key?: string;
    };
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email/private_key.",
      );
    }
    const privateKey = credentials.private_key.replace(/\\n/g, "\n");
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

let poaSheetIdCache: number | null = null;
let isPoaSheetReadyCache = false;

// In-memory POA data cache
let poaDataCache: { id: number; values: PoaRow }[] | null = null;
let lastPoaCacheTime = 0;
const POA_CACHE_TTL_MS = 15000; // 15 seconds

export function invalidatePoaCache(): void {
  poaDataCache = null;
  lastPoaCacheTime = 0;
}

async function getPoaSheetId(): Promise<number> {
  if (poaSheetIdCache !== null) return poaSheetIdCache;
  const sheets = getClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: env.googleSpreadsheetId,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === POA_SHEET_NAME,
  );
  if (!sheet?.properties && sheet?.properties?.sheetId === undefined) {
    throw new Error(`Sheet tab "${POA_SHEET_NAME}" not found.`);
  }
  poaSheetIdCache = sheet!.properties!.sheetId!;
  return poaSheetIdCache;
}

/** Ensures the "Attorney" sheet tab exists with the correct header row. Safe to skip after 1st run. */
export async function ensurePoaSheetReady(): Promise<void> {
  if (isPoaSheetReadyCache) return;
  try {
    const sheets = getClient();
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: env.googleSpreadsheetId,
    });
    const existing = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === POA_SHEET_NAME,
    );

    if (!existing) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: env.googleSpreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: POA_SHEET_NAME } } }],
        },
      });
      poaSheetIdCache = null;
      logger.info(`Created sheet tab "${POA_SHEET_NAME}"`);
    }

    // Always ensure the header is correct
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.googleSpreadsheetId,
      range: `${POA_SHEET_NAME}!A1:${COL_LAST}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...POA_SHEET_COLUMNS]] },
    });
    isPoaSheetReadyCache = true;
  } catch (err) {
    isPoaSheetReadyCache = false;
    logger.warn({ err }, "ensurePoaSheetReady non-fatal warning");
  }
}

export type PoaRow = string[];

/** Returns all POA records (excluding header row), using in-memory cache if fresh. */
export async function listPoaRows(forceRefresh = false): Promise<{ id: number; values: PoaRow }[]> {
  const now = Date.now();
  if (!forceRefresh && poaDataCache !== null && now - lastPoaCacheTime < POA_CACHE_TTL_MS) {
    return poaDataCache;
  }

  await ensurePoaSheetReady();

  try {
    const sheets = getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: env.googleSpreadsheetId,
      range: `${POA_SHEET_NAME}!A2:${COL_LAST}`,
    });
    const rows = response.data.values ?? [];
    const result = rows
      .map((row, index) => ({ id: index + 2, values: row as PoaRow }))
      .filter((row) => row.values.some((cell) => cell !== undefined && cell !== ""));
    
    poaDataCache = result;
    lastPoaCacheTime = now;
    return result;
  } catch (err) {
    logger.warn({ err }, "Failed to fetch POA rows from Google Sheets, returning cached/empty");
    return poaDataCache ?? [];
  }
}

/** Appends a new POA record row and returns its 1-based row id. */
export async function appendPoaRow(values: PoaRow): Promise<number> {
  invalidatePoaCache();
  const sheets = getClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSpreadsheetId,
    range: `${POA_SHEET_NAME}!A:${COL_LAST}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
  const updatedRange = response.data.updates?.updatedRange;
  const match = updatedRange?.match(/![A-Z]+(\d+):/);
  if (match) return Number(match[1]);
  const rows = await listPoaRows(true);
  const last = rows[rows.length - 1];
  if (!last) throw new Error("Failed to determine id of newly created POA row.");
  return last.id;
}

/** Updates an existing POA row by its 1-based row id. */
export async function updatePoaRow(id: number, values: PoaRow): Promise<void> {
  invalidatePoaCache();
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSpreadsheetId,
    range: `${POA_SHEET_NAME}!A${id}:${COL_LAST}${id}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

/** Deletes a POA row by its 1-based row id. */
export async function deletePoaRow(id: number): Promise<void> {
  invalidatePoaCache();
  const sheets = getClient();
  const sheetId = await getPoaSheetId();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.googleSpreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: id - 1,
              endIndex: id,
            },
          },
        },
      ],
    },
  });
}
