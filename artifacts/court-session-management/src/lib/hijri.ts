/**
 * Lightweight Hijri ↔ Gregorian conversion for the frontend.
 * Uses the same tabular (civil) Islamic calendar algorithm as the backend.
 * Accuracy: ±1 day around some month boundaries vs. Umm al-Qura calendar.
 */

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToHijri(jdn: number): HijriDate {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const year = 30 * n + j - 30;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { year, month, day };
}

/** Convert a JS Date to its Hijri equivalent (uses UTC date components). */
export function dateToHijri(date: Date): HijriDate {
  const jdn = gregorianToJDN(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  return jdnToHijri(jdn);
}

/** Current Hijri date in Riyadh time (UTC+3). */
export function nowHijri(): HijriDate {
  const riyadhNow = new Date(Date.now() + 3 * 3600 * 1000);
  return dateToHijri(riyadhNow);
}

/** Format a HijriDate as "DD/MM/YYYY هـ". */
export function formatHijri(h: HijriDate): string {
  const dd = String(h.day).padStart(2, '0');
  const mm = String(h.month).padStart(2, '0');
  return `${dd}/${mm}/${h.year} هـ`;
}

/** Format a HijriDate as "DD شهر YYYY هـ" in full Arabic. */
export function formatHijriLong(h: HijriDate): string {
  const monthName = HIJRI_MONTHS_AR[h.month - 1] ?? '';
  return `${h.day} ${monthName} ${h.year} هـ`;
}

export interface TimeRemaining {
  totalMs: number;      // negative = past
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isToday: boolean;     // same Hijri day
}

/**
 * Compute how much time remains until `hearingAt` (ISO string).
 * Returns null if hearingAt is null/undefined/invalid.
 */
export function computeTimeRemaining(hearingAt: string | null | undefined): TimeRemaining | null {
  if (!hearingAt) return null;
  const target = new Date(hearingAt).getTime();
  if (isNaN(target)) return null;

  const now = Date.now();
  const totalMs = target - now;
  const absTotalMs = Math.abs(totalMs);

  const totalSeconds = Math.floor(absTotalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // isToday: same Hijri day as current Riyadh date
  const targetHijri = dateToHijri(new Date(target + 3 * 3600 * 1000)); // UTC+3 shift for display
  const currentHijri = nowHijri();
  const isToday =
    targetHijri.year === currentHijri.year &&
    targetHijri.month === currentHijri.month &&
    targetHijri.day === currentHijri.day;

  return { totalMs, days, hours, minutes, seconds, isPast: totalMs < 0, isToday };
}
