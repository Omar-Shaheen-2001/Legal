import { google, type sheets_v4 } from "googleapis";
import { env } from "../config/env";
import { logger } from "../lib/logger";

/**
 * Thin wrapper around the Google Sheets API that treats one spreadsheet tab
 * as the database of record for hearing sessions. Row 1 is a fixed header;
 * every subsequent row is one session, and its 1-based sheet row index
 * doubles as the record's `id` (there is no separate primary key column).
 */

export const SHEET_COLUMNS = [
  "Case Number",
  "Plaintiff",
  "Defendant",
  "Court",
  "Court Circuit",
  "Case Subject",
  "Session Type",
  "Session Date Hijri",
  "Session Time",
  "Notes",
  "Status",
  "Reminder24",
  "Reminder6",
  "Created At",
] as const;

export type SheetRow = string[];

let sheetsClient: sheets_v4.Sheets | null = null;

function getClient(): sheets_v4.Sheets {
  if (!sheetsClient) {
    const credentials = env.googleServiceAccountJson as {
      client_email?: string;
      private_key?: string;
    };
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email/private_key. Paste the full service account key JSON.",
      );
    }
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheetsClient = google.sheets({ version: "v4", auth });
  }
  return sheetsClient;
}

function dataRange(): string {
  return `${env.googleSheetName}!A2:N`;
}

function headerRange(): string {
  return `${env.googleSheetName}!A1:N1`;
}

let sheetIdCache: number | null = null;

/** Resolves the numeric sheet (tab) id needed for row delete operations. Cached per process. */
async function getSheetId(): Promise<number> {
  if (sheetIdCache !== null) {
    return sheetIdCache;
  }
  const sheets = getClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: env.googleSpreadsheetId,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === env.googleSheetName,
  );
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new Error(
      `Sheet tab "${env.googleSheetName}" was not found in the configured spreadsheet.`,
    );
  }
  sheetIdCache = sheet.properties.sheetId;
  return sheetIdCache;
}

/** Ensures the target sheet tab exists with the expected header row. Safe to call repeatedly. */
export async function ensureSheetReady(): Promise<void> {
  const sheets = getClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: env.googleSpreadsheetId,
  });
  const existing = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === env.googleSheetName,
  );

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.googleSpreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: env.googleSheetName } } }],
      },
    });
    sheetIdCache = null;
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: env.googleSpreadsheetId,
    range: headerRange(),
  });
  const currentHeader = headerResponse.data.values?.[0];
  const headerMatches =
    currentHeader &&
    currentHeader.length === SHEET_COLUMNS.length &&
    SHEET_COLUMNS.every((col, i) => currentHeader[i] === col);

  if (!headerMatches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: env.googleSpreadsheetId,
      range: headerRange(),
      valueInputOption: "RAW",
      requestBody: { values: [[...SHEET_COLUMNS]] },
    });
  }
}

/** Returns every data row (excluding the header) as `{ id, values }`, where `id` is the 1-based sheet row number. */
export async function listRows(): Promise<{ id: number; values: SheetRow }[]> {
  const sheets = getClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.googleSpreadsheetId,
    range: dataRange(),
  });
  const rows = response.data.values ?? [];
  return rows
    .map((row, index) => ({ id: index + 2, values: row as SheetRow }))
    .filter((row) => row.values.some((cell) => cell !== undefined && cell !== ""));
}

/** Appends a new row and returns its 1-based sheet row id. */
export async function appendRow(values: SheetRow): Promise<number> {
  const sheets = getClient();
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: env.googleSpreadsheetId,
    range: dataRange(),
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
  const updatedRange = response.data.updates?.updatedRange;
  const match = updatedRange?.match(/![A-Z]+(\d+):/);
  if (!match) {
    logger.warn({ updatedRange }, "Could not parse appended row id from Sheets response");
    const rows = await listRows();
    const last = rows[rows.length - 1];
    if (!last) {
      throw new Error("Failed to determine id of newly created session row.");
    }
    return last.id;
  }
  return Number(match[1]);
}

/** Overwrites a single existing row (1-based sheet row id) with new values. */
export async function updateRow(id: number, values: SheetRow): Promise<void> {
  const sheets = getClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSpreadsheetId,
    range: `${env.googleSheetName}!A${id}:N${id}`,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

/** Overwrites specific columns (0-based indexes into SHEET_COLUMNS) on a row, leaving others untouched. */
export async function updateRowCells(
  id: number,
  updates: Record<number, string>,
): Promise<void> {
  const sheets = getClient();
  const data = Object.entries(updates).map(([colIndex, value]) => {
    const column = String.fromCharCode("A".charCodeAt(0) + Number(colIndex));
    return {
      range: `${env.googleSheetName}!${column}${id}:${column}${id}`,
      values: [[value]],
    };
  });
  if (data.length === 0) {
    return;
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: env.googleSpreadsheetId,
    requestBody: { valueInputOption: "RAW", data },
  });
}

/** Deletes a row (1-based sheet row id). Note: all subsequent rows shift up by one id after this call. */
export async function deleteRow(id: number): Promise<void> {
  const sheets = getClient();
  const sheetId = await getSheetId();
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
