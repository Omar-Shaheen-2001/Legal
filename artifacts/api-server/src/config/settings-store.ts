/**
 * settings-store.ts
 *
 * A lightweight, file-backed store for user-configurable runtime settings.
 * Values here take precedence over environment variables so that staff can
 * update API keys and spreadsheet IDs through the /settings UI without
 * restarting the server.
 *
 * The file is stored at <cwd>/settings.json (next to the process working dir).
 * On first boot it is created as an empty object; missing keys fall through to
 * process.env as a fallback.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { logger } from "../lib/logger";

export interface AppSettings {
  /** AI Provider API key (e.g. OpenRouter, OpenAI, Groq) */
  aiApiKey?: string;
  /** AI Provider Base URL */
  aiBaseUrl?: string;
  /** AI Model identifier */
  aiModel?: string;
  /** Google Spreadsheet ID (from the Sheet URL) */
  googleSpreadsheetId?: string;
  /** Tab/sheet name inside the spreadsheet (defaults to "Sessions") */
  googleSheetName?: string;
  /** Hugging Face API Token */
  hfApiToken?: string;
  /** Hugging Face Model */
  hfModel?: string;
  /** WhatsApp Phone Number to receive reminders */
  whatsappNumber?: string;
  /** Optional WhatsApp API Gateway URL (base URL) */
  whatsappApiUrl?: string;
  /** Optional WhatsApp API Token/Key */
  whatsappToken?: string;
  /** Green API Instance ID (e.g. 7107XXXXXXXXX) */
  whatsappInstanceId?: string;
}

const SETTINGS_PATH = resolve(process.cwd(), "settings.json");

function loadFromDisk(): AppSettings {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const raw = readFileSync(SETTINGS_PATH, "utf-8");
      return JSON.parse(raw) as AppSettings;
    }
  } catch (err) {
    logger.warn({ err, path: SETTINGS_PATH }, "Failed to read settings.json — using defaults");
  }
  return {};
}

function saveToDisk(settings: AppSettings): void {
  try {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err, path: SETTINGS_PATH }, "Failed to write settings.json");
    throw new Error("Could not persist settings to disk.");
  }
}

// In-memory cache — loaded once at startup, updated on every save.
let _cache: AppSettings = loadFromDisk();

/** Return the current settings (in-memory cache). */
export function getSettings(): AppSettings {
  return { ..._cache };
}

/**
 * Merge `patch` into the current settings, persist to disk, and update
 * the in-memory cache.
 */
export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  // Strip empty strings so they don't shadow env var fallbacks
  const cleaned: Partial<AppSettings> = {};
  for (const [k, v] of Object.entries(patch) as [keyof AppSettings, string | undefined][]) {
    if (v !== undefined && v !== "") {
      (cleaned as Record<string, string>)[k] = v as string;
    }
  }

  _cache = { ..._cache, ...cleaned };

  // If the user explicitly set a value to "" we should delete that key
  if (patch.aiApiKey === "") delete _cache.aiApiKey;
  if (patch.aiBaseUrl === "") delete _cache.aiBaseUrl;
  if (patch.aiModel === "") delete _cache.aiModel;
  if (patch.googleSpreadsheetId === "") delete _cache.googleSpreadsheetId;
  if (patch.googleSheetName === "") delete _cache.googleSheetName;
  if (patch.hfApiToken === "") delete _cache.hfApiToken;
  if (patch.hfModel === "") delete _cache.hfModel;
  if (patch.whatsappNumber === "") delete _cache.whatsappNumber;
  if (patch.whatsappApiUrl === "") delete _cache.whatsappApiUrl;
  if (patch.whatsappToken === "") delete _cache.whatsappToken;
  if (patch.whatsappInstanceId === "") delete _cache.whatsappInstanceId;

  saveToDisk(_cache);
  return { ..._cache };
}
