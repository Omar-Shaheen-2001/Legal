import cron from "node-cron";
import { env, isGoogleSheetsConfigured } from "../config/env";
import { logger } from "../lib/logger";
import { listSessions, markReminderSent } from "../services/session.service";
import { notify } from "../services/reminder/reminder.service";
import { computeHearingDateTime } from "../utils/hijri";

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Formats the exact remaining time as a human-readable Arabic string.
 * e.g. "يوم و 3 ساعات و 25 دقيقة" or "5 ساعات و 12 دقيقة" or "45 دقيقة"
 */
function formatRemainingTime(diffMs: number): string {
  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(days === 1 ? "يوم" : days === 2 ? "يومين" : `${days} أيام`);
  }
  if (hours > 0) {
    parts.push(
      hours === 1 ? "ساعة"
      : hours === 2 ? "ساعتين"
      : hours <= 10 ? `${hours} ساعات`
      : `${hours} ساعة`,
    );
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(
      minutes === 1 ? "دقيقة"
      : minutes === 2 ? "دقيقتين"
      : minutes <= 10 ? `${minutes} دقائق`
      : `${minutes} دقيقة`,
    );
  }

  return `متبقي ${parts.join(" و ")}`;
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

    const diffMs = hearingAt.getTime() - now.getTime();
    const hoursLeft = diffMs / MS_PER_HOUR;
    const remainingText = formatRemainingTime(diffMs);

    // Check 24-hour reminder threshold:
    // Trigger if remaining time is <= 24 hours, session hasn't passed yet (> 0), and 24h reminder was not sent.
    if (!session.reminder24 && hoursLeft <= 24 && hoursLeft > 0) {
      logger.info(
        { sessionId: session.id, caseNumber: session.caseNumber, hoursLeft: hoursLeft.toFixed(2) },
        "Triggering 24h session reminder",
      );
      await notify({
        sessionId: session.id,
        caseNumber: session.caseNumber,
        sessionDateHijri: session.sessionDateHijri,
        sessionTime: session.sessionTime,
        kind: "24h",
        remainingText,
        court: session.court,
        courtCircuit: session.courtCircuit,
        plaintiff: session.plaintiff,
        defendant: session.defendant,
        caseSubject: session.caseSubject,
      });
      await markReminderSent(session.id, "24h");
    }

    // Check 6-hour reminder threshold:
    // Trigger if remaining time is <= 6 hours, session hasn't passed yet (> 0), and 6h reminder was not sent.
    if (!session.reminder6 && hoursLeft <= 6 && hoursLeft > 0) {
      logger.info(
        { sessionId: session.id, caseNumber: session.caseNumber, hoursLeft: hoursLeft.toFixed(2) },
        "Triggering 6h session reminder",
      );
      await notify({
        sessionId: session.id,
        caseNumber: session.caseNumber,
        sessionDateHijri: session.sessionDateHijri,
        sessionTime: session.sessionTime,
        kind: "6h",
        remainingText,
        court: session.court,
        courtCircuit: session.courtCircuit,
        plaintiff: session.plaintiff,
        defendant: session.defendant,
        caseSubject: session.caseSubject,
      });
      await markReminderSent(session.id, "6h");
    }
  }
}

let started = false;

/** Starts the recurring reminder scheduler. Runs every 1 minute or configured cron schedule. */
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
  // Run an immediate sweep on server startup
  runReminderSweep().catch((err) => {
    logger.error({ err }, "Initial reminder sweep failed");
  });

  cron.schedule(env.reminderCronExpression, () => {
    runReminderSweep().catch((err) => {
      logger.error({ err }, "Reminder sweep failed");
    });
  });
  logger.info(
    { cron: env.reminderCronExpression },
    "Reminder scheduler started successfully",
  );
}
