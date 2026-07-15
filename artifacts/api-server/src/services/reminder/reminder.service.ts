import { logger } from "../../lib/logger";
import { ConsoleReminderChannel } from "./channels/consoleChannel";
import type { ReminderChannel, ReminderPayload } from "./reminder.types";

/**
 * Fan-out point for reminder delivery. The scheduler calls `notify(...)`
 * once per triggered reminder; this service dispatches it to every
 * registered channel. Today that's just the console channel — future work
 * (WhatsApp/email/SMS/push) is additive: implement `ReminderChannel` and
 * push an instance into `channels` below.
 */
const channels: ReminderChannel[] = [new ConsoleReminderChannel()];

export async function notify(payload: ReminderPayload): Promise<void> {
  await Promise.all(
    channels.map(async (channel) => {
      try {
        await channel.send(payload);
      } catch (err) {
        logger.error(
          { err, channel: channel.name, payload },
          "Reminder channel failed to send",
        );
      }
    }),
  );
}
