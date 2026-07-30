/**
 * Utilities to parse Hijri hearing dates/times (as they appear in Saudi
 * court SMS notices, e.g. "27/01/1448" + "12:30 مساء") and convert them to
 * a real JavaScript Date so the reminder scheduler can compute "24 hours
 * before" / "6 hours before" windows.
 *
 * The conversion uses `moment-hijri` which accurately implements the
 * Umm al-Qura calendar used in Saudi Arabia.
 */

import moment from "moment-hijri";
import { env } from "../config/env";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/** Parses a "DD/MM/YYYY" (or "D/M/YYYY") Hijri date string. Returns null if unparseable. */
export function parseHijriDateString(input: string | null | undefined): HijriDate | null {
  if (!input || typeof input !== "string") {
    return null;
  }
  const normalized = normalizeDigits(input.trim());
  if (!normalized) {
    return null;
  }

  // Pass single format strings instead of an array because `moment-hijri`'s array-format overload returns `undefined` when none match
  const formats = [
    "iDD/iMM/iYYYY",
    "iD/iM/iYYYY",
    "iDD-iMM-iYYYY",
    "iD-iM-iYYYY",
    "iYYYY/iMM/iDD",
    "iYYYY-iMM-iDD",
  ];

  // Try strict parsing first
  for (const fmt of formats) {
    try {
      const m = moment(normalized, fmt, true);
      if (m && typeof m.isValid === "function" && m.isValid()) {
        const year = m.iYear();
        const month = m.iMonth() + 1;
        const day = m.iDate();
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 1300 && year < 1600 && month >= 1 && month <= 12 && day >= 1 && day <= 30) {
          return { year, month, day };
        }
      }
    } catch {
      // ignore parsing error for single format
    }
  }

  // Try non-strict parsing as fallback
  for (const fmt of formats) {
    try {
      const m = moment(normalized, fmt);
      if (m && typeof m.isValid === "function" && m.isValid()) {
        const year = m.iYear();
        const month = m.iMonth() + 1;
        const day = m.iDate();
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year > 1300 && year < 1600 && month >= 1 && month <= 12 && day >= 1 && day <= 30) {
          return { year, month, day };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export interface ParsedTime {
  hours: number; // 0-23
  minutes: number; // 0-59
}

/** Parses a time string with Arabic AM/PM markers (صباحا / مساء) or plain AM/PM. Returns null if unparseable. */
export function parseArabicTime(input: string): ParsedTime | null {
  const normalized = normalizeDigits(input.trim());
  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  const isArabicPm = /م(?!ص)/.test(normalized) || /مساء/.test(normalized);
  const isArabicAm = /ص/.test(normalized) || /صباح/.test(normalized);
  const isPm = /pm/i.test(normalized) || isArabicPm;
  const isAm = /am/i.test(normalized) || isArabicAm;

  if (isPm && !isAm && hours < 12) {
    hours += 12;
  } else if (isAm && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function hijriToGregorian(hijri: HijriDate): {
  year: number;
  month: number;
  day: number;
} | null {
  try {
    const dateString = `${hijri.year}/${String(hijri.month).padStart(2, "0")}/${String(hijri.day).padStart(2, "0")}`;
    const m = moment(dateString, "iYYYY/iMM/iDD");
    if (!m || typeof m.isValid !== "function" || !m.isValid()) {
      return null;
    }
    const year = m.year();
    const month = m.month() + 1;
    const day = m.date();
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * Converts a Gregorian Date object to the corresponding Hijri
 * calendar date using Umm al-Qura. Uses UTC date components.
 */
export function gregorianToHijri(date: Date): HijriDate {
  // Convert UTC components into a moment representation ignoring timezone shifts
  const m = moment([date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()]);
  return {
    year: m.iYear(),
    month: m.iMonth() + 1,
    day: m.iDate(),
  };
}

/**
 * Returns the current date as a Hijri date string "DD/MM/YYYY" using the
 * court's configured timezone offset (default Asia/Riyadh UTC+3).
 */
export function currentHijriDateString(): string {
  const offsetHours = env.courtTimezoneOffsetHours;
  // Shift the time to the local court timezone
  const localNow = new Date(Date.now() + offsetHours * 3600 * 1000);
  const h = gregorianToHijri(localNow);
  const dd = String(h.day).padStart(2, "0");
  const mm = String(h.month).padStart(2, "0");
  return `${dd}/${mm}/${h.year}`;
}

/**
 * Combines a Hijri date string and an Arabic/English time string into a
 * concrete UTC `Date` representing the hearing instant, assuming the court's
 * fixed timezone offset (`COURT_TIMEZONE_OFFSET_HOURS`, default Asia/Riyadh
 * UTC+3). Returns null if either part cannot be parsed.
 */
export function computeHearingDateTime(
  sessionDateHijri: string | null | undefined,
  sessionTime: string | null | undefined,
): Date | null {
  if (!sessionDateHijri || !sessionTime) {
    return null;
  }
  try {
    const hijriDate = parseHijriDateString(sessionDateHijri);
    const time = parseArabicTime(sessionTime);
    if (!hijriDate || !time) {
      return null;
    }
    const gregorian = hijriToGregorian(hijriDate);
    if (!gregorian) {
      return null;
    }
    const offsetHours = env.courtTimezoneOffsetHours;
    const hearingDate = new Date(
      Date.UTC(
        gregorian.year,
        gregorian.month - 1,
        gregorian.day,
        time.hours - offsetHours,
        time.minutes,
      ),
    );
    return isNaN(hearingDate.getTime()) ? null : hearingDate;
  } catch {
    return null;
  }
}
