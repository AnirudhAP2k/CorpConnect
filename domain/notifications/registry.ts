/**
 * domain/notifications/registry.ts
 *
 * The Factory — the single source of truth for which channels are active.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  To add a new notification channel:                         ║
 * ║    1. Create its adapter in ./adapters/                     ║
 * ║    2. Import and add it to CHANNEL_REGISTRY below           ║
 * ║  That's it. No other files need changing.                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import type { NotificationChannel } from "./types";
import { EmailAdapter }      from "./adapters/email.adapter";
import { InAppAdapter }      from "./adapters/in-app.adapter";
// import { SmsAdapter }        from "./adapters/sms.adapter";        // ← activate when ready
// import { SlackAdapter }      from "./adapters/slack.adapter";       // ← activate when ready
// import { GoogleChatAdapter } from "./adapters/google-chat.adapter"; // ← activate when ready

// ─── Active Channel Registry ──────────────────────────────────────────────────

const CHANNEL_REGISTRY: NotificationChannel[] = [
    new EmailAdapter(),
    new InAppAdapter(),
    // new SmsAdapter(),
    // new SlackAdapter(),
    // new GoogleChatAdapter(),
];

// ─── Accessors ────────────────────────────────────────────────────────────────

/** Returns all currently active channels. */
export function getChannels(): NotificationChannel[] {
    return CHANNEL_REGISTRY;
}

/** Returns a single channel by its ID, or undefined if not registered. */
export function getChannel(channelId: string): NotificationChannel | undefined {
    return CHANNEL_REGISTRY.find((c) => c.channelId === channelId);
}
