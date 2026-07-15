/**
 * Contract every reminder delivery channel must implement. The scheduler
 * only ever talks to `ReminderService.notify(...)` (see reminder.service.ts)
 * — it never knows how a reminder is actually delivered. Adding WhatsApp,
 * email, SMS, or push notifications later means writing a new
 * `ReminderChannel` and registering it; the scheduler's logic never changes.
 */
export interface ReminderPayload {
  sessionId: number;
  caseNumber: string | null;
  sessionDateHijri: string | null;
  sessionTime: string | null;
  /** Which threshold triggered this reminder. */
  kind: "24h" | "6h";
}

export interface ReminderChannel {
  readonly name: string;
  send(payload: ReminderPayload): Promise<void>;
}
