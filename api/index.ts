import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// ── Inline env helpers ──────────────────────────────────────────────────────
function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim().length > 0 ? v : undefined;
}

const APP_USERNAME = readEnv("APP_USERNAME") ?? "5128";
const APP_PASSWORD = readEnv("APP_PASSWORD") ?? "5128";
const SESSION_SECRET = readEnv("SESSION_SECRET") ?? "dev_secret_please_change";
const GOOGLE_SPREADSHEET_ID = readEnv("GOOGLE_SPREADSHEET_ID") ?? "";
const GOOGLE_SHEET_NAME = readEnv("GOOGLE_SHEET_NAME") ?? "Sessions";
const GOOGLE_SERVICE_ACCOUNT_JSON_RAW = readEnv("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "{}";

let googleServiceAccount: Record<string, unknown> = {};
try {
  googleServiceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON_RAW);
} catch { /* ignore */ }

// ── In-memory settings (Vercel Serverless has no disk write) ─────────────────
let _settings: Record<string, string> = {};

// ── App ─────────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));

// ── Auth helpers ─────────────────────────────────────────────────────────────
const COOKIE = "court_session_auth";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === "production";

function setSessionCookie(res: any, username: string) {
  const payload = JSON.stringify({ username, issuedAt: Date.now() });
  res.cookie(COOKIE, payload, {
    httpOnly: true,
    sameSite: "none",
    secure: IS_PROD,
    signed: true,
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

function readSessionCookie(req: any): { username: string } | null {
  const raw = req.signedCookies?.[COOKIE] as string | undefined;
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { username: string; issuedAt: number };
    if (typeof p.username !== "string" || typeof p.issuedAt !== "number") return null;
    if (Date.now() - p.issuedAt > MAX_AGE_MS) return null;
    return { username: p.username };
  } catch { return null; }
}

function attachAuth(req: any, _res: any, next: any) {
  req.authUser = readSessionCookie(req) ?? undefined;
  next();
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.authUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// ── Google Sheets helper ─────────────────────────────────────────────────────
async function getSheets() {
  const { google } = await import("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials: googleServiceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return (google as any).sheets({ version: "v4", auth });
}

function spreadsheetId(): string {
  return (_settings["googleSpreadsheetId"] || GOOGLE_SPREADSHEET_ID || "").trim();
}

function sheetName(): string {
  return (_settings["googleSheetName"] || GOOGLE_SHEET_NAME || "Sessions").trim();
}

// ── URL Normalization Middleware ────────────────────────────────────────────
app.use((req: any, _res: any, next: any) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/favicon")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Health
app.get(["/api/health", "/api/healthz"], (_req: any, res: any) => res.json({ status: "ok" }));

// Auth - Login
app.post("/api/auth/login", (req: any, res: any) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }
  if (username !== APP_USERNAME || password !== APP_PASSWORD) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  setSessionCookie(res, username);
  res.json({ username });
});

// Auth - Logout
app.post("/api/auth/logout", (_req: any, res: any) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.status(204).send();
});

// Auth - Me
app.get("/api/auth/me", attachAuth, requireAuth, (req: any, res: any) => {
  res.json({ username: req.authUser.username });
});

// Settings - Get
app.get("/api/settings", attachAuth, requireAuth, (_req: any, res: any) => {
  const mask = (v?: string) => v ? v.slice(0, 6) + "***" : "";
  const s = _settings;
  res.json({
    aiApiKey: mask(s["aiApiKey"]),
    aiApiKeyIsSet: Boolean(s["aiApiKey"]),
    aiModel: s["aiModel"] ?? "",
    aiBaseUrl: s["aiBaseUrl"] ?? "",
    googleSpreadsheetId: s["googleSpreadsheetId"] ?? GOOGLE_SPREADSHEET_ID,
    googleSheetName: s["googleSheetName"] ?? GOOGLE_SHEET_NAME,
    hfApiToken: mask(s["hfApiToken"]),
    hfApiTokenIsSet: Boolean(s["hfApiToken"]),
    hfModel: s["hfModel"] ?? "",
    whatsappNumber: s["whatsappNumber"] ?? "",
    whatsappApiUrl: s["whatsappApiUrl"] ?? "",
    whatsappToken: mask(s["whatsappToken"]),
    whatsappTokenIsSet: Boolean(s["whatsappToken"]),
    whatsappInstanceId: s["whatsappInstanceId"] ?? "",
  });
});

// Settings - Put
app.put("/api/settings", attachAuth, requireAuth, (req: any, res: any) => {
  const allowed = ["aiApiKey","aiModel","aiBaseUrl","googleSpreadsheetId","googleSheetName","hfApiToken","hfModel","whatsappNumber","whatsappApiUrl","whatsappToken","whatsappInstanceId"];
  const body = req.body ?? {};
  for (const key of allowed) {
    if (typeof body[key] === "string") {
      if (body[key] === "") delete _settings[key];
      else _settings[key] = body[key];
    }
  }
  const mask = (v?: string) => v ? v.slice(0, 6) + "***" : "";
  const s = _settings;
  res.json({
    aiApiKey: mask(s["aiApiKey"]),
    aiApiKeyIsSet: Boolean(s["aiApiKey"]),
    aiModel: s["aiModel"] ?? "",
    aiBaseUrl: s["aiBaseUrl"] ?? "",
    googleSpreadsheetId: s["googleSpreadsheetId"] ?? GOOGLE_SPREADSHEET_ID,
    googleSheetName: s["googleSheetName"] ?? GOOGLE_SHEET_NAME,
    hfApiToken: mask(s["hfApiToken"]),
    hfApiTokenIsSet: Boolean(s["hfApiToken"]),
    hfModel: s["hfModel"] ?? "",
    whatsappNumber: s["whatsappNumber"] ?? "",
    whatsappApiUrl: s["whatsappApiUrl"] ?? "",
    whatsappToken: mask(s["whatsappToken"]),
    whatsappTokenIsSet: Boolean(s["whatsappToken"]),
    whatsappInstanceId: s["whatsappInstanceId"] ?? "",
  });
});

// Sessions - List
app.get("/api/sessions", attachAuth, requireAuth, async (req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.status(500).json({ error: "Google Sheets is not configured." }); return; }
  try {
    const sheets = await getSheets();
    const range = `${sheetName()}!A:Z`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range });
    const rows = response.data.values ?? [];
    if (rows.length < 2) { res.json([]); return; }
    const [headers, ...dataRows] = rows;
    const sessions = dataRows.map((row, i) => {
      const obj: Record<string, unknown> = { id: i + 1 };
      (headers as string[]).forEach((h, j) => { obj[h] = row[j] ?? ""; });
      return obj;
    });
    const status = req.query.status as string | undefined;
    const filtered = status ? sessions.filter((s: any) => s.status === status) : sessions;
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load sessions.", detail: err.message });
  }
});

// Sessions - Create
app.post("/api/sessions", attachAuth, requireAuth, async (req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.status(500).json({ error: "Google Sheets is not configured." }); return; }
  try {
    const sheets = await getSheets();
    const range = `${sheetName()}!A:Z`;
    const headResp = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range });
    const rows = headResp.data.values ?? [];
    const headers: string[] = rows.length > 0 ? (rows[0] as string[]) : [];
    const body = req.body ?? {};
    if (headers.length === 0) {
      const defaultHeaders = ["caseNumber","court","courtCircuit","sessionDateHijri","sessionTime","plaintiff","defendant","caseSubject","caseType","status","notes"];
      await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `${sheetName()}!A1`, valueInputOption: "RAW", requestBody: { values: [defaultHeaders] } });
      headers.push(...defaultHeaders);
    }
    const newId = rows.length; // row index used as id
    const rowData = headers.map((h) => h === "id" ? String(newId) : (body[h] ?? ""));
    await sheets.spreadsheets.values.append({ spreadsheetId: sid, range: `${sheetName()}!A:A`, valueInputOption: "RAW", requestBody: { values: [rowData] } });
    const session: Record<string, unknown> = { id: newId };
    headers.forEach((h, j) => { session[h] = rowData[j]; });
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create session.", detail: err.message });
  }
});

// Sessions - Get by ID
app.get("/api/sessions/:id", attachAuth, requireAuth, async (req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.status(500).json({ error: "Google Sheets is not configured." }); return; }
  const id = Number(req.params.id);
  try {
    const sheets = await getSheets();
    const range = `${sheetName()}!A:Z`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range });
    const rows = response.data.values ?? [];
    if (rows.length < 2) { res.status(404).json({ error: "Session not found." }); return; }
    const [headers, ...dataRows] = rows;
    const row = dataRows[id - 1];
    if (!row) { res.status(404).json({ error: "Session not found." }); return; }
    const session: Record<string, unknown> = { id };
    (headers as string[]).forEach((h, j) => { session[h] = row[j] ?? ""; });
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load session.", detail: err.message });
  }
});

// Sessions - Update
app.patch("/api/sessions/:id", attachAuth, requireAuth, async (req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.status(500).json({ error: "Google Sheets is not configured." }); return; }
  const id = Number(req.params.id);
  try {
    const sheets = await getSheets();
    const range = `${sheetName()}!A:Z`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range });
    const rows = response.data.values ?? [];
    if (rows.length < 2) { res.status(404).json({ error: "Session not found." }); return; }
    const [headers, ...dataRows] = rows;
    const row = dataRows[id - 1];
    if (!row) { res.status(404).json({ error: "Session not found." }); return; }
    const body = req.body ?? {};
    const updated = (headers as string[]).map((h, j) => body[h] !== undefined ? body[h] : (row[j] ?? ""));
    const rowIndex = id + 1; // +1 for header row, 1-indexed
    await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `${sheetName()}!A${rowIndex}:Z${rowIndex}`, valueInputOption: "RAW", requestBody: { values: [updated] } });
    const session: Record<string, unknown> = { id };
    (headers as string[]).forEach((h, j) => { session[h] = updated[j]; });
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update session.", detail: err.message });
  }
});

// Sessions - Delete
app.delete("/api/sessions/:id", attachAuth, requireAuth, async (req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.status(500).json({ error: "Google Sheets is not configured." }); return; }
  const id = Number(req.params.id);
  try {
    const sheets = await getSheets();
    const metaResp = await sheets.spreadsheets.get({ spreadsheetId: sid });
    const sheet = metaResp.data.sheets?.find((s: any) => s.properties?.title === sheetName());
    const sheetId = sheet?.properties?.sheetId ?? 0;
    const rowIndex = id; // 0-indexed after header (id=1 → row index 1)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sid,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 }
          }
        }]
      }
    });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete session.", detail: err.message });
  }
});

// Dashboard
app.get(["/api/dashboard", "/api/dashboard/stats"], attachAuth, requireAuth, async (_req: any, res: any) => {
  const sid = spreadsheetId();
  if (!sid) { res.json({ totalSessions: 0, upcomingSessions: 0, completedSessions: 0, cancelledSessions: 0 }); return; }
  try {
    const sheets = await getSheets();
    const range = `${sheetName()}!A:Z`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range });
    const rows = response.data.values ?? [];
    if (rows.length < 2) { res.json({ totalSessions: 0, upcomingSessions: 0, completedSessions: 0, cancelledSessions: 0 }); return; }
    const [headers, ...dataRows] = rows;
    const statusIdx = (headers as string[]).indexOf("status");
    const total = dataRows.length;
    const upcoming = statusIdx >= 0 ? dataRows.filter((r: any) => r[statusIdx] === "upcoming").length : 0;
    const completed = statusIdx >= 0 ? dataRows.filter((r: any) => r[statusIdx] === "completed").length : 0;
    const cancelled = statusIdx >= 0 ? dataRows.filter((r: any) => r[statusIdx] === "cancelled").length : 0;
    res.json({ totalSessions: total, upcomingSessions: upcoming, completedSessions: completed, cancelledSessions: cancelled });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load dashboard.", detail: err.message });
  }
});

// AI chat
app.post(["/api/ai/extract", "/api/ai/analyze"], attachAuth, requireAuth, async (req: any, res: any) => {
  const aiApiKey = _settings["aiApiKey"] || readEnv("AI_API_KEY") || "";
  const aiBaseUrl = _settings["aiBaseUrl"] || readEnv("AI_BASE_URL") || "https://openrouter.ai/api/v1";
  const aiModel = _settings["aiModel"] || readEnv("AI_MODEL") || "google/gemini-2.5-flash";
  if (!aiApiKey) { res.status(500).json({ error: "AI API key is not configured." }); return; }
  try {
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: aiApiKey, baseURL: aiBaseUrl });
    const { messages } = req.body ?? {};
    const completion = await client.chat.completions.create({ model: aiModel, messages });
    res.json(completion);
  } catch (err: any) {
    res.status(500).json({ error: "AI request failed.", detail: err.message });
  }
});

export default app;
