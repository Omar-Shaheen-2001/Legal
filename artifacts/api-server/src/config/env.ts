/**
 * Centralized, lazy access to environment variables / secrets.
 *
 * Nothing here throws at import time. Each getter is called only when the
 * feature that needs it actually runs, so the server can boot even if a
 * given integration (Google Sheets, OpenAI, login) has not been configured
 * yet. Callers get a clear, actionable error instead of a silent failure.
 */

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
    throw new MissingEnvVarError(key, hint);
  }
  return value;
}

export const env = {
  // --- Auth (simple env-based credentials, no user database in v1) ---
  get appUsername(): string {
    return requireEnv(
      "APP_USERNAME",
      "Set it in Secrets so staff can log in.",
    );
  },
  get appPassword(): string {
    return requireEnv(
      "APP_PASSWORD",
      "Set it in Secrets so staff can log in.",
    );
  },
  get sessionSecret(): string {
    return requireEnv(
      "SESSION_SECRET",
      "Used to sign the login session cookie.",
    );
  },

  // --- Google Sheets (acts as the database in v1) ---
  get googleSpreadsheetId(): string {
    return requireEnv(
      "GOOGLE_SPREADSHEET_ID",
      "Create/open a Google Sheet, copy the ID from its URL, and share it with your service account email.",
    );
  },
  get googleServiceAccountJson(): Record<string, unknown> {
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
    return readEnv("GOOGLE_SHEET_NAME") ?? "Sessions";
  },

  // --- OpenAI (AI extraction) ---
  get openaiApiKey(): string {
    return requireEnv(
      "OPENAI_API_KEY",
      "Add your OpenAI API key so the chat screen can extract session details.",
    );
  },

  // --- Scheduler ---
  get reminderCronExpression(): string {
    return readEnv("REMINDER_CRON_EXPRESSION") ?? "*/10 * * * *";
  },
  /** Fixed UTC offset (hours) used to interpret Hijri session dates/times. Saudi courts operate in Asia/Riyadh (UTC+3) with no DST. */
  get courtTimezoneOffsetHours(): number {
    const raw = readEnv("COURT_TIMEZONE_OFFSET_HOURS");
    const parsed = raw ? Number(raw) : 3;
    return Number.isFinite(parsed) ? parsed : 3;
  },

  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
};

/** Returns true only if every env var Google Sheets access needs is present, without throwing. */
export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    readEnv("GOOGLE_SPREADSHEET_ID") && readEnv("GOOGLE_SERVICE_ACCOUNT_JSON"),
  );
}

/** Returns true only if login credentials are configured, without throwing. */
export function isAuthConfigured(): boolean {
  return Boolean(readEnv("APP_USERNAME") && readEnv("APP_PASSWORD"));
}

/** Returns true only if the OpenAI key is present, without throwing. */
export function isAiConfigured(): boolean {
  return Boolean(readEnv("OPENAI_API_KEY"));
}
