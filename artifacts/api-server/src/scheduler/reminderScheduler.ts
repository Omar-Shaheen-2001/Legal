import cron from "node-cron";
import { env, isGoogleSheetsConfigured } from "../config/env";
import { logger } from "../lib/logger";
import { listSessions, markReminderSent } from "../services/session.service";
import { notify } from "../services/reminder/reminder.service";
import { computeHearingDateTime } from "../utils/hijri";

const WINDOW_MINUTES = 10; // Matches the default cron cadence; keeps each reminder firing exactly once.

function withinWindow(target: Date, now: Date, hoursBefore: number): boolean {
  const diffMs = target.getTime() - hoursBefore * 60 * 60 * 1000 - now.getTime();
  return Math.abs(diffMs) <= WINDOW_MINUTES * 60 * 1000;
}

async function runReminderSweep(): Promise<void> {
  const sessions = await listSessions();
  const now = new Date();

  for (const session of sessions) {
    if (session.status === "Cancelled" || session.status === "Finished") {
      continue;
    }
    const hearingAt = computeHearingDateTime(
      session.sessionDateHijri,
      session.sessionTime,
    );
    if (!hearingAt) {
      continue;
    }

    if (!session.reminder24 && withinWindow(hearingAt, now, 24)) {
      await notify({
        sessionId: session.id,
        caseNumber: session.caseNumber,
        sessionDateHijri: session.sessionDateHijri,
        sessionTime: session.sessionTime,
        kind: "24h",
      });
      await markReminderSent(session.id, "24h");
    }

    if (!session.reminder6 && withinWindow(hearingAt, now, 6)) {
      await notify({
        sessionId: session.id,
        caseNumber: session.caseNumber,
        sessionDateHijri: session.sessionDateHijri,
        sessionTime: session.sessionTime,
        kind: "6h",
      });
      await markReminderSent(session.id, "6h");
    }
  }
}

let started = false;

/** Starts the recurring reminder sweep. No-ops (with a warning) if Google Sheets isn't configured yet. */
export function startReminderScheduler(): void {
  if (started) {
    return;
  }
  if (!isGoogleSheetsConfigured()) {
    logger.warn(
      "Reminder scheduler not started: GOOGLE_SPREADSHEET_ID / GOOGLE_SERVICE_ACCOUNT_JSON are not configured yet.",
    );
    return;
  }

  started = true;
  cron.schedule(env.reminderCronExpression, () => {
    runReminderSweep().catch((err) => {
      logger.error({ err }, "Reminder sweep failed");
    });
  });
  logger.info(
    { cron: env.reminderCronExpression },
    "Reminder scheduler started",
  );
}
