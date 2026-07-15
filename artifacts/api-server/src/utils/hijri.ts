/**
 * Utilities to parse Hijri hearing dates/times (as they appear in Saudi
 * court SMS notices, e.g. "27/01/1448" + "12:30 مساء") and convert them to
 * a real JavaScript Date so the reminder scheduler can compute "24 hours
 * before" / "6 hours before" windows.
 *
 * The conversion uses the tabular (civil) Islamic calendar algorithm. It is
 * an approximation of the Umm al-Qura calendar (off by at most a day around
 * some month boundaries) — acceptable for scheduling reminders, but not
 * intended as a religious/astronomical calendar authority.
 */

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
export function parseHijriDateString(input: string): HijriDate | null {
  const normalized = normalizeDigits(input.trim());
  const match = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{3,4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 30) {
    return null;
  }
  return { year, month, day };
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

/** Converts a Hijri calendar date to a Julian Day Number using the tabular (civil) algorithm. */
function hijriToJulianDayNumber({ year, month, day }: HijriDate): number {
  return (
    Math.floor((11 * year + 3) / 30) +
    354 * year +
    30 * month -
    Math.floor((month - 1) / 2) +
    day +
    1948440 -
    385
  );
}

/** Converts a Julian Day Number to a proleptic Gregorian calendar date. */
function julianDayNumberToGregorian(jdn: number): {
  year: number;
  month: number;
  day: number;
} {
  let l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const day = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}

export function hijriToGregorian(hijri: HijriDate): {
  year: number;
  month: number;
  day: number;
} {
  return julianDayNumberToGregorian(hijriToJulianDayNumber(hijri));
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
  const hijriDate = parseHijriDateString(sessionDateHijri);
  const time = parseArabicTime(sessionTime);
  if (!hijriDate || !time) {
    return null;
  }
  const gregorian = hijriToGregorian(hijriDate);
  const offsetHours = env.courtTimezoneOffsetHours;
  return new Date(
    Date.UTC(
      gregorian.year,
      gregorian.month - 1,
      gregorian.day,
      time.hours - offsetHours,
      time.minutes,
    ),
  );
}
