# Notification System — Architectural Design

> **Location:** `domain/notifications/`
> **Pattern:** Factory + Adapter (mirrors Laravel's `Notification::send()`)

---

## 1. Is the Approach Correct?

**Yes, completely.** The two-trigger approach is the industry standard:

| Trigger | When | Mechanism |
| :--- | :--- | :--- |
| **24-Hour Reminder** | 24h before `event.startDateTime` | CRON job scans upcoming events |
| **Room Opened** | When host calls `POST /api/virtual/rooms` | Event hook enqueues an immediate job |

Both flow through the existing `JobQueue` → `job-processor.ts` → `domain/notifications` pipeline.

---

## 2. Domain Directory Structure

```
domain/notifications/
├── index.ts           ← Public API: sendNotification(), sendNotificationToMany()
├── types.ts           ← NotificationChannel interface, NotificationPayload, NotificationEvent
├── registry.ts        ← Channel registry — the Factory
├── adapters/
│   ├── email.adapter.ts
│   ├── in-app.adapter.ts
│   ├── sms.adapter.ts          [future stub]
│   ├── slack.adapter.ts        [future stub]
│   └── google-chat.adapter.ts  [future stub]
└── handlers/
    ├── event-reminder.ts       ← processEventReminder() — used by job-processor
    └── virtual-room-opened.ts  ← processVirtualRoomOpened() — used by job-processor
```

---

## 3. Data Flow

```
                             ┌── EmailAdapter      (Resend SDK)
sendNotification(recipient, payload)
         │                   ├── InAppAdapter      (Prisma → Notification table)
         │   registry.ts     ├── SmsAdapter        [future — Twilio / AWS SNS]
         └─► resolves ──────►├── SlackAdapter      [future — Incoming Webhooks]
                             └── GoogleChatAdapter [future — Google Chat API]
```

1. A job handler (e.g. `processEventReminder`) fetches recipients from the DB.
2. It calls `sendNotificationToMany(recipients, payload)` from `domain/notifications`.
3. `sendNotification` resolves all active channels via `registry.ts`.
4. Each channel adapter runs concurrently (`Promise.allSettled` — one failing channel never blocks others).

---

## 4. Adding a New Channel

Adding SMS, Slack, or any future channel requires exactly **two steps**:

**Step 1 — Create the adapter** in `domain/notifications/adapters/`:
```typescript
export class SlackAdapter implements NotificationChannel {
    readonly channelId = "slack";
    async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
        if (!recipient.slackWebhookUrl) return;
        await fetch(recipient.slackWebhookUrl, {
            method: "POST",
            body: JSON.stringify({ text: `*${payload.title}*\n${payload.body}` }),
            headers: { "Content-Type": "application/json" },
        });
    }
}
```

**Step 2 — Register it** in `domain/notifications/registry.ts` (one line):
```typescript
const CHANNEL_REGISTRY: NotificationChannel[] = [
    new EmailAdapter(),
    new InAppAdapter(),
    new SlackAdapter(), // ← that's it
];
```

> No changes needed in `sendNotification()`, job handlers, or any callers.

---

## 5. Comparison to Laravel

| Laravel | CorpConnect |
| :--- | :--- |
| `Notifiable` trait on `User` | `NotificationRecipient` interface |
| `Notification` class with `via()` | `NotificationPayload` + `NotificationEvent` |
| `toMail()`, `toSlack()` methods | `EmailAdapter.send()`, `SlackAdapter.send()` |
| `Notification::send($users, new X())` | `sendNotificationToMany(recipients, payload)` |
| `config/broadcasting.php` | `registry.ts` |

---

## 6. Integration Points

### A. Schedule 24h reminder on event create/update

In `domain/events/actions.ts`, after persisting the event:
```typescript
const reminderTime = new Date(event.startDateTime.getTime() - 24 * 60 * 60 * 1000);
await prisma.jobQueue.create({
    data: {
        type: "SEND_EVENT_REMINDER",
        payload: { eventId: event.id } satisfies EventReminderPayload,
        scheduledAt: reminderTime,
    },
});
```

### B. Enqueue immediate notification on room creation

In `app/api/virtual/rooms/route.ts`, after the `lvFetch` succeeds:
```typescript
await prisma.jobQueue.create({
    data: {
        type: "VIRTUAL_ROOM_OPENED",
        payload: { roomId: data.room.id, eventId } satisfies VirtualRoomOpenedPayload,
    },
});
```

### C. Register both job types in `lib/jobs/job-processor.ts`

```typescript
import { processEventReminder }     from "@/domain/notifications/handlers/event-reminder";
import { processVirtualRoomOpened } from "@/domain/notifications/handlers/virtual-room-opened";
import type { EventReminderPayload, VirtualRoomOpenedPayload }
    from "@/domain/notifications/handlers/types";

// In the processJob() switch:
case "SEND_EVENT_REMINDER":
    await processEventReminder(payload as EventReminderPayload);
    break;

case "VIRTUAL_ROOM_OPENED":
    await processVirtualRoomOpened(payload as VirtualRoomOpenedPayload);
    break;
```

### D. Prisma schema — add new JobType value

```prisma
enum JobType {
  // ... existing values ...
  VIRTUAL_ROOM_OPENED  // ← new
}
```

Run: `npx prisma migrate dev --name add_virtual_room_opened_job_type`

---

## 7. Notification Type Enum Extension

The `Notification` model's `type` field currently supports:
`VERIFICATION | INVITE | SYSTEM | MEETING | PAYMENT`

Two new values are needed for this feature:
```prisma
enum NotificationType {
  // existing...
  EVENT_REMINDER
  VIRTUAL_ROOM
}
```

Or map to the existing `SYSTEM` type in the `InAppAdapter` to avoid a migration.
