import EventBus from "../../../eventBus";
import { ShouldThrottle } from "../shouldThrottle";
import { OnCommandEvent } from '../../../types/onCommandEvent';
import { BotEvents } from "../../../botEvents";

/**
 * Sends a message to chat with a link to the BBB Discord
 * @param onCommandEvent
 */
export const discord = (onCommandEvent: OnCommandEvent): void => {
  const cooldownSeconds = 300;

  // The broadcaster is allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (
    !onCommandEvent.flags.broadcaster &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)
  ) {
    return;
  }

  const message = `You can join our discord using this link: https://discord.gg/9vkrHBmnPm`;

  // Send the message to Twitch chat
  EventBus.eventEmitter.emit(BotEvents.OnSay, { message });
}
