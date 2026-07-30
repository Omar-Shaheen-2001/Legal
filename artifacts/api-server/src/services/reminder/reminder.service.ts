import { logger } from "../../lib/logger";
import { ConsoleReminderChannel } from "./channels/consoleChannel";
import { WhatsappReminderChannel } from "./channels/whatsappChannel";
import type { ReminderChannel, ReminderPayload } from "./reminder.types";

/**
 * Fan-out point for reminder delivery. The scheduler calls `notify(...)`
 * once per triggered reminder; this service dispatches it to every
 * registered channel (Console & WhatsApp).
 */
const channels: ReminderChannel[] = [
  new ConsoleReminderChannel(),
  new WhatsappReminderChannel(),
];

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
