/**
 * domain/notifications/types.ts
 *
 * Core contracts for the notification domain.
 * All adapters and handlers import from here — never from each other directly.
 */

// ─── Channel Contract ─────────────────────────────────────────────────────────

/**
 * Every channel adapter must implement this interface.
 * Adding a new channel = creating a class that satisfies this contract.
 */
export interface NotificationChannel {
    /** Unique, stable identifier for this channel (e.g. "email", "in-app", "slack") */
    readonly channelId: string;
    send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void>;
}

// ─── Recipient ────────────────────────────────────────────────────────────────

/**
 * Normalised recipient shape.
 * Adapters pick only the fields they need (e.g. email adapter uses `email`,
 * SMS adapter uses `phone`). Channels silently no-op when their field is absent.
 */
export interface NotificationRecipient {
    userId: string;
    name: string;
    /** Required by EmailAdapter */
    email: string;
    /** Required by SmsAdapter (future) */
    phone?: string;
    /** Required by SlackAdapter (future) — stored as an org-level setting */
    slackWebhookUrl?: string;
    /** Required by GoogleChatAdapter (future) */
    googleChatWebhookUrl?: string;
}

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * Channel-agnostic description of what to communicate.
 * Templates and adapters derive their channel-specific format from this.
 */
export interface NotificationPayload {
    /**
     * Identifies the notification scenario.
     * Used by templates to produce channel-specific copy.
     */
    event: NotificationEvent;
    /** Short title — shown in in-app notification bell and email subject */
    title: string;
    /** One-sentence body — shown in in-app notification and email preview */
    body: string;
    /** Deep link into the application */
    link?: string;
    /** Free-form context data consumed by templates */
    data: Record<string, string | number | Date>;
}

// ─── Notification Events ──────────────────────────────────────────────────────

/**
 * Closed set of all notification scenarios in the platform.
 * Add new values here when introducing new notification types.
 */
export type NotificationEvent =
    | "EVENT_REMINDER_24H"
    | "VIRTUAL_ROOM_OPENED"
    | "MEETING_REQUESTED"
    | "MEETING_ACCEPTED"
    | "MEETING_DECLINED"
    | "MEETING_CANCELLED"
    | "CONNECTION_INVITE"
    | "PAYMENT_RECEIVED";

// ─── Handler Payloads ─────────────────────────────────────────────────────────

/** Job payload for the SEND_EVENT_REMINDER job type */
export interface EventReminderPayload {
    eventId: string;
}

/** Job payload for the VIRTUAL_ROOM_OPENED job type */
export interface VirtualRoomOpenedPayload {
    roomId: string;
    eventId: string;
}
