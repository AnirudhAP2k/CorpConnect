# Phase 12: Custom Live Meeting UI (`lv-service` v2) 🎥

> Evolve the stock LiveKit `VideoConference` into Evently-branded meeting
> components with **role-aware host controls**. Media still goes browser →
> LiveKit Cloud. Moderation goes Next.js → `lv-service`. Hand-raise / reactions
> stay on `ws-service`.
>
> Prerequisite: Phase 11 (`docs/lv-service/implementation_plan.md`) is in place —
> rooms, tokens, join page, session tracking, and LiveKit webhooks.

---

## 1. Why v2

Phase 11 ships a working meeting by wrapping LiveKit’s default UI:

```210:212:components/virtual/VirtualRoom.tsx
                <VideoConference
                    chatMessageFormatter={formatChatMessageLinks}
                />
```

That gives every participant the same chrome: mic, camera, screen share, chat,
leave. It does **not** give hosts kick / mute / end-for-all, and it never
connects the already-built `ws-service` hand-raise and reaction handlers.

v2 replaces the inner `VideoConference` with composed LiveKit primitives plus
Evently overlays. `LiveKitRoom`, PreJoin, token gating, and session webhooks
stay as they are.

---

## 2. Architecture (unchanged split, new UI layer)

```
Client Browser
   │
   ├── REST → Next.js (:3000)
   │         ├── POST /api/virtual/token          (join grant; host vs attendee)
   │         ├── POST /api/virtual/rooms/:id/kick
   │         ├── POST /api/virtual/rooms/:id/mute
   │         └── DELETE /api/virtual/rooms/:id    (end meeting)
   │
   ├── WebRTC ──────────────────────────────────► LiveKit Cloud
   │         (A/V + LiveKit data chat)
   │
   └── Socket.io ───────────────────────────────► ws-service (:4000)
             (raise hand, reactions, polls)
```

**Still true from v1:**

- `LIVEKIT_API_SECRET` never enters Next.js or the browser.
- Browsers connect to LiveKit with a short-lived room token.
- `lv-service` is the only process that calls `RoomServiceClient`.

**New in v2:**

- Token grants differ for **host** vs **attendee**.
- Meeting UI is custom React, not `VideoConference`.
- Host actions call Evently APIs; they are not LiveKit-admin-from-the-browser.

---

## 3. Roles and powers

| Capability | Attendee | Host (event org OWNER/ADMIN) |
|---|---|---|
| Own mic / camera | Yes | Yes |
| Screen share | Yes (until host disables) | Yes |
| LiveKit chat | Yes | Yes |
| Raise hand / reactions | Yes | Yes (plus see queue first) |
| Mute another participant’s published track | No | Yes |
| Unmute another participant | No | **No** (browser consent; request only) |
| Kick | No | Yes (API already exists) |
| End room for everyone | No | Yes (existing DELETE) |
| `roomAdmin` on LiveKit token | No | Yes (metadata / future lobby) |

Host is resolved the same way as today’s token gate: `OrganizationMember.role IN ('OWNER','ADMIN')` for the event’s hosting org — **not** the caller’s currently active org role alone.

---

## 4. Token grants (`lv-service`)

**File:** `lv-service/src/livekit.ts`, `lv-service/src/routes/token.ts`

Today every successful `/token` call issues:

```ts
canPublish: true
canSubscribe: true
canPublishData: true
```

v2 changes:

1. Resolve `isHost` (already queried in `/token`).
2. Set `participantName` to the user’s display name (pass from Next.js or look up `User.name`), not `user:${userId}`.
3. Add LiveKit metadata JSON: `{ role: "HOST" | "ATTENDEE", eventId, roomId }`.
4. Host grant extras: `roomAdmin: true`. Attendees omit it.
5. Keep `canPublish` true for both unless a later “view-only” event flag is added.

Do **not** give attendees `roomAdmin`. If you do, any attendee can kick via the LiveKit client.

---

## 5. New / extended APIs

### 5.1 Already exists — wire into UI

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/virtual/rooms/:id/kick` | Host removes participant by LiveKit identity (`userId`) |
| DELETE | `/api/virtual/rooms/:id` | Host closes room + LiveKit room |

### 5.2 New — mute / permission

**`lv-service`:** `POST /rooms/:id/mute`

```json
{
  "participantIdentity": "<userId>",
  "trackSid": "<livekit-track-sid>",
  "muted": true
}
```

Implementation: same host DB check as kick, then `roomService.mutePublishedTrack(livekitRoom, identity, trackSid, muted)`.

**Next.js proxy:** `app/api/virtual/rooms/[id]/mute/route.ts` — session + OWNER/ADMIN of **active** org is not enough; lv-service re-checks hosting org membership.

**Optional later:** `POST /rooms/:id/permissions` to set `canPublish` / `canPublishSources` on a participant (stop screen share without kicking).

Mute is **one-way**. Hosts can force-mute. Forcing unmute is not reliable in browsers; show “Ask to unmute” as a data message / toast instead of a fake unmute button.

---

## 6. Frontend composition

Keep `components/virtual/VirtualRoom.tsx` as the connection shell (PreJoin, token fetch, session start/end, `LiveKitRoom`).

Replace `<VideoConference />` with a local layout:

```
components/virtual/meeting/
  MeetingLayout.tsx          # grid + side panels
  MeetingControls.tsx        # mic, cam, share, chat toggle, leave, raise hand
  ParticipantList.tsx        # names + host menus
  ParticipantMenu.tsx        # mute / kick (host only)
  MeetingChat.tsx            # LiveKit Chat primitive, Evently styles
  RaiseHandButton.tsx        # ws-service raise_hand / lower_hand
  ReactionsBar.tsx           # ws-service react
  HostBadge.tsx
```

Use `@livekit/components-react` primitives, not a from-scratch WebRTC stack:

- `GridLayout` / `ParticipantTile` / `TrackLoop`
- `ControlBar` **or** custom buttons on `useLocalParticipant()` (`setMicrophoneEnabled`, `setCameraEnabled`, `setScreenShareEnabled`)
- `Chat` + `useChat`
- `useParticipants`, `useTracks`, `useRoomContext`

**Join page** (`app/(protected)/events/[id]/join/[roomId]/page.tsx`) must pass:

- `isHost: boolean`
- `displayName: string`
- `roomId`, `eventId`, `eventTitle` (already passed)

`getVirtualRoomJoinContext` should include host membership + user name so the client does not guess role from the token.

### Socket.io wiring (already implemented, unused)

On `LiveKitRoom` `onConnected`:

1. Connect the existing app socket (same client as messaging) if not connected.
2. Emit `join_virtual_room` with Evently `roomId` (UUID, not LiveKit room name).
3. Listen for `hand_raised`, `hand_lowered`, `reaction_received`.
4. On disconnect / pagehide: emit `leave_virtual_room`.

Handlers live in `ws-service/src/handlers/virtual-event.ts`. Do not duplicate them on LiveKit data channels unless we later drop Socket.io for in-meeting extras.

---

## 7. UX rules

- Attendee control bar: Mic, Camera, Share, Chat, Raise hand, Leave.
- Host control bar: same + “End meeting”.
- Participant row (host): Mute audio, Mute video, Stop share, Kick. No unmute-other.
- Raised-hand queue: host sidebar, sorted by timestamp from `hand_raised`.
- Kick / end meeting: confirm dialog.
- After kick or room close: existing `onDisconnected` redirect to `/events/{id}`.
- Display names: token `name`, never raw UUID in tiles.
- Mobile: stack grid above controls; chat/hand-queue as sheets. Full-screen join already exists.

---

## 8. Security

| Rule | Where |
|---|---|
| Host mutations re-check hosting org OWNER/ADMIN in SQL | `lv-service` kick / mute / delete |
| Attendee tokens must not include `roomAdmin` | `generateRoomToken` |
| Kick/mute identity is LiveKit identity = `userId` | token + UI |
| `ws-service` already checks event participation before joining `vroom:{id}` | keep; UI must use Evently room UUID |
| Do not expose LiveKit API secret to the client to “admin from the browser” | never |

Next.js `getLvAuthContext()` still requires an active org. Hosts whose **active** org is not the hosting org can fail the proxy’s OWNER/ADMIN check even if they are host in the DB. v2 should either:

- pass hosting-org membership from the session into `lvFetch` after a DB check on the Next.js route, or
- drop the Next.js role short-circuit and let lv-service be the only authorizer.

Prefer the second for mute/kick: Next.js authenticates the user; lv-service authorizes host.

---

## 9. Out of scope for v2 (keep on the later list)

- Recording / Egress
- Waiting room / lobby admit
- Breakout auto-assignment (schema already allows multiple rooms)
- Closed captions
- Screen-share annotation
- Attendance dashboard charts (sessions already record duration)

---

## 10. Files to add or change

| Path | Change |
|---|---|
| `lv-service/src/livekit.ts` | Host vs attendee grants, metadata, display name |
| `lv-service/src/routes/token.ts` | Pass name + isHost into token; optional `SELECT name FROM "User"` |
| `lv-service/src/routes/rooms.ts` | `POST /:id/mute` |
| `app/api/virtual/rooms/[id]/mute/route.ts` | **New** thin proxy |
| `app/api/virtual/rooms/[id]/kick/route.ts` | Relax Next.js role short-circuit if needed |
| `domain/events/queries.ts` | Join context: `isHost`, `displayName` |
| `app/(protected)/events/[id]/join/[roomId]/page.tsx` | Pass host + name into `VirtualRoom` |
| `components/virtual/VirtualRoom.tsx` | Swap `VideoConference` for `MeetingLayout` |
| `components/virtual/meeting/*` | **New** custom components |
| `hooks/useVirtualRoomSocket.ts` | **New** join/leave + raise hand + reactions |
| `__tests__/virtual-meeting-ui.test.ts` | Host menu hidden for attendees; mute/kick payloads |

No Prisma schema change is required for v2 unless we persist raised-hand history (optional JSON on `VirtualSession` — skip unless product asks).

---

## 11. Verification

1. Attendee joins: mic, camera, share, chat work; no Kick / Mute others / End meeting.
2. Host joins: extra menus appear; mute audio of attendee → their mic tile shows muted.
3. Host kicks attendee → attendee redirected to event page; `VirtualSession.leftAt` set (webhook or kick handler).
4. Host ends meeting → all clients disconnect; room `isActive = false`.
5. Raise hand → other clients (especially host sidebar) update without refresh.
6. Reaction emoji broadcasts to the room.
7. Non-host POST to `/api/virtual/rooms/:id/mute` → 403.
8. Offline event still cannot create rooms (v1 gate unchanged).

---

## 12. Implementation order

1. Token role + display name (no UI yet; inspect JWT).
2. Custom layout that **parity-matches** current VideoConference (mic/cam/share/chat/leave).
3. Pass `isHost` into UI; host-only menus.
4. Wire kick + end meeting.
5. Add mute API + UI.
6. Socket.io raise hand + reactions.
7. Mobile layout + tests.

Steps 1–4 are the minimum viable host meeting. Mute and hand-raise can ship immediately after.
