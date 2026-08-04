/**
 * Centralized, lazy access to environment variables / secrets.
 *
 * Nothing here throws at import time. Each getter is called only when the
 * feature that needs it actually runs, so the server can boot even if a
 * given integration (Google Sheets, OpenAI, login) has not been configured
 * yet. Callers get a clear, actionable error instead of a silent failure.
 *
 * Priority order for every setting:
 *   1. Value saved in settings.json (via the /settings UI)
 *   2. Environment variable / secret
 *   3. Built-in default (where applicable)
 */

import { getSettings } from "./settings-store";

export class MissingEnvVarError extends Error {
  constructor(public readonly key: string, hint?: string) {
    super(
      `Missing required environment variable "${key}".${hint ? ` ${hint}` : ""}`,
    );
    this.name = "MissingEnvVarError";
  }
}

function readEnv(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value : undefined;
}

function requireEnv(key: string, hint?: string): string {
  const value = readEnv(key);
  if (!value) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[DEV WARNING] Missing env var "${key}". Using fallback.`);
      if (key === 'GOOGLE_SERVICE_ACCOUNT_JSON') return '{}';
      return `dev_fallback_${key.toLowerCase()}`;
    }
    throw new MissingEnvVarError(key, hint);
  }
  return value;
}

export const env = {
  // --- Auth (simple env-based credentials, no user database in v1) ---
  get appUsername(): string {
    return readEnv("APP_USERNAME") ?? "5128";
  },
  get appPassword(): string {
    return readEnv("APP_PASSWORD") ?? "5128";
  },
  get sessionSecret(): string {
    return readEnv("SESSION_SECRET") ?? "court_session_secret_fallback_key";
  },

  // --- Google Sheets (acts as the database in v1) ---
  // Settings UI takes precedence over env vars.
  get googleSpreadsheetId(): string {
    const stored = getSettings().googleSpreadsheetId;
    if (stored && stored.trim()) return stored.trim();
    return requireEnv(
      "GOOGLE_SPREADSHEET_ID",
      "Create/open a Google Sheet, copy the ID from its URL, and share it with your service account email.",
    ).trim();
  },
  get googleServiceAccountJson(): Record<string, unknown> {
    try {
      const fs = require("fs");
      const path = require("path");
      // The file is located in the root of the workspace
      const saPath = path.resolve(process.cwd(), "..", "..", "service-account.json");
      if (fs.existsSync(saPath)) {
        return JSON.parse(fs.readFileSync(saPath, "utf-8"));
      }
      
      // Fallback to checking the current working directory as well
      const localPath = path.resolve(process.cwd(), "service-account.json");
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, "utf-8"));
      }
    } catch (e) {
      // Ignore filesystem errors and fallback to env var
    }

    const raw = requireEnv(
      "GOOGLE_SERVICE_ACCOUNT_JSON",
      "Paste the full JSON key downloaded from your Google Cloud service account.",
    );
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the entire service account key file contents.",
      );
    }
  },
  get googleSheetName(): string {
    const stored = getSettings().googleSheetName;
    if (stored && stored.trim()) return stored.trim();
    return readEnv("GOOGLE_SHEET_NAME") ?? "Sessions";
  },

  // --- AI Settings (OpenRouter/Groq/OpenAI compatible) ---
  // Settings UI takes precedence over env vars.
  get aiApiKey(): string {
    const stored = getSettings().aiApiKey;
    if (stored && stored.trim()) return stored.trim();
    return requireEnv(
      "AI_API_KEY",
      "Add your AI Provider API key (e.g. from OpenRouter) so the chat screen can extract session details.",
    );
  },
  get aiBaseUrl(): string {
    const stored = getSettings().aiBaseUrl;
    if (stored && stored.trim()) return stored.trim();
    return readEnv("AI_BASE_URL") ?? "https://openrouter.ai/api/v1";
  },
  get aiModel(): string {
    const stored = getSettings().aiModel;
    if (stored && stored.trim()) return stored.trim();
    return readEnv("AI_MODEL") ?? "qwen/qwen-2.5-7b-instruct";
  },

  // --- Scheduler ---
  get reminderCronExpression(): string {
    return readEnv("REMINDER_CRON_EXPRESSION") ?? "*/10 * * * *";
  },
  /**
   * Fixed UTC offset (hours) used to interpret Hijri session dates/times.
   * Uses Mecca time (Asia/Makkah = UTC+3), identical to Asia/Riyadh.
   * Saudi Arabia has no daylight-saving time, so the offset is always +3.
   */
  get courtTimezoneOffsetHours(): number {
    const raw = readEnv("COURT_TIMEZONE_OFFSET_HOURS");
    const parsed = raw ? Number(raw) : 3; // Mecca / Riyadh = UTC+3
    return Number.isFinite(parsed) ? parsed : 3;
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

/** Returns true only if every env var Google Sheets access needs is present, without throwing. */
export function isGoogleSheetsConfigured(): boolean {
  const stored = getSettings().googleSpreadsheetId;
  const hasSpreadsheetId = Boolean(
    (stored && stored.trim()) || readEnv("GOOGLE_SPREADSHEET_ID"),
  );
  
  let hasServiceAccount = Boolean(readEnv("GOOGLE_SERVICE_ACCOUNT_JSON"));
  if (!hasServiceAccount) {
    try {
      const fs = require("fs");
      const path = require("path");
      hasServiceAccount = fs.existsSync(path.resolve(process.cwd(), "..", "..", "service-account.json")) || 
                          fs.existsSync(path.resolve(process.cwd(), "service-account.json"));
    } catch(e) {}
  }
  
  return Boolean(hasSpreadsheetId && hasServiceAccount);
}

/** Returns true only if login credentials are configured (or dev fallbacks are active), without throwing. */
export function isAuthConfigured(): boolean {
  return true; // We now have default credentials "5128" if env vars are missing
}

/** Returns true only if the AI API key is present (settings or env var), without throwing. */
export function isAiConfigured(): boolean {
  const stored = getSettings().aiApiKey;
  return Boolean((stored && stored.trim()) || readEnv("AI_API_KEY"));
}
