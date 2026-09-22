# Phase 12: Custom Live Meeting UI (`lv-service` v2) — Task Tracker

> Tracks implementation of branded meeting components and host moderation.
> Architecture: `docs/lv-service/v2_implementation_plan.md`.
> v1 tracker: `docs/lv-service/tasks.md`.

---

## Phase 12.1 — Token roles & display names

- [x] Extend `generateRoomToken()` in `lv-service/src/livekit.ts`
  - [x] Accept `isHost`, `metadata`
  - [x] Host grant: `roomAdmin: true`
  - [x] Attendee grant: no `roomAdmin`
  - [x] Keep `canPublish` / `canSubscribe` / `canPublishData` as today
- [x] `POST /token` (`lv-service/src/routes/token.ts`)
  - [x] Load `User.name` (or accept `displayName` from Next.js body)
  - [x] Set `participantName` to display name, not `user:${userId}`
  - [x] Attach metadata `{ role, eventId, roomId }`
- [x] Return `isHost` on the token API JSON so the join UI does not guess
- [ ] Manual check: decode host vs attendee JWTs (`roomAdmin` only on host)

---

## Phase 12.2 — Join context

- [x] Extend `getVirtualRoomJoinContext` in `domain/events/queries.ts`
  - [x] `isHost` (hosting org OWNER/ADMIN)
  - [x] `displayName` from session user
- [x] Pass `isHost` + `displayName` from `app/(protected)/events/[id]/join/[roomId]/page.tsx` into `VirtualRoom`
- [x] If Next.js kick/mute proxies 403 hosts whose active org ≠ hosting org: authorize in lv-service only (session auth on Next.js, host check in SQL)

---

## Phase 12.3 — Custom meeting shell (parity with VideoConference)

- [x] Add `components/virtual/meeting/` directory
- [x] `MeetingLayout.tsx` — participant grid + optional chat sidebar
- [x] `MeetingControls.tsx` — mic, camera, screen share, chat toggle, leave
- [x] `MeetingChat.tsx` — LiveKit `Chat` + Evently styles
- [x] Swap `<VideoConference />` in `VirtualRoom.tsx` for `MeetingLayout`
- [x] Keep PreJoin, token fetch, session start/end, disconnect redirect
- [ ] Verify: attendee can mute self, share screen, chat, leave

---

## Phase 12.4 — Host UI (kick + end meeting)

- [x] `ParticipantList.tsx` with host-only moderation actions
- [x] Host badge in participant list
- [x] Wire Kick → existing `POST /api/virtual/rooms/:id/kick` (`participantIdentity` = userId)
- [x] Confirm dialog before kick
- [x] “End meeting” in host control bar → existing `DELETE /api/virtual/rooms/:id`
- [x] Confirm dialog before end
- [x] Attendee build: no Kick / End meeting in the DOM

---

## Phase 12.5 — Mute API + UI

- [x] `POST /rooms/:id/mute` in `lv-service/src/routes/rooms.ts`
  - [x] Body: `{ participantIdentity, trackSid, muted }`
  - [x] Host SQL check (same as kick)
  - [x] `roomService.mutePublishedTrack(...)`
- [x] `app/api/virtual/rooms/[id]/mute/route.ts` proxy
- [x] Host menu: Mute audio / Mute video / Stop screen share (use track SIDs)
- [x] Do **not** offer force-unmute; implemented “Ask to unmute” toast via ws-service
- [ ] 403 test: attendee calling mute endpoint

---

## Phase 12.6 — Raise hand & reactions (`ws-service`)

- [x] `hooks/useVirtualRoomSocket.ts`
  - [x] On meeting mount/reconnect: `join_virtual_room`
  - [x] On leave/unmount: `leave_virtual_room`
  - [x] `raise_hand` / `lower_hand`
  - [x] `react`
  - [x] Listen: `hand_raised`, `hand_lowered`, `reaction_received`
- [x] Raise-hand button in the control bar
- [x] Host sidebar: raised-hand indicators ordered by timestamp + host lower-hand control
- [x] Reactions picker + overlay on grid
- [x] Use Evently `roomId` (UUID), not LiveKit room name

---

## Phase 12.7 — Polish

- [x] Mobile: controls pinned; chat + participants use responsive overlays
- [x] Realtime connection state inside `MeetingLayout`
- [x] Accessible labels on all control buttons
- [x] Host/attendee names visible on tiles (token `name`)
- [x] Loading skeleton for `VirtualRoomList` (Phase 11.9 / 12.7)

---

## Phase 12.8 — Tests

- [ ] Unit: token helper sets `roomAdmin` only when `isHost`
- [ ] Unit: mute/kick routes reject non-host (mock pool)
- [ ] Component: `ParticipantMenu` renders only when `isHost`
- [x] Component: attendee controls exclude End meeting
- [ ] Middleware: no new public routes required (mute stays session-protected)
- [ ] Manual E2E checklist from `v2_implementation_plan.md` §11

---

## Out of scope (do not tick here)

- Recording / LiveKit Egress
- Lobby / waiting room
- Breakout auto-assign
- Closed captions
- Screen-share annotation
- Attendance analytics dashboard

See “Future Enhancements” in `docs/lv-service/tasks.md`.
