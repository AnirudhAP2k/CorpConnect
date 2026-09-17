# Phase 12: Custom Live Meeting UI (`lv-service` v2) — Task Tracker

> Tracks implementation of branded meeting components and host moderation.
> Architecture: `docs/lv-service/v2_implementation_plan.md`.
> v1 tracker: `docs/lv-service/tasks.md`.

---

## Phase 12.1 — Token roles & display names

- [ ] Extend `generateRoomToken()` in `lv-service/src/livekit.ts`
  - [ ] Accept `isHost`, `metadata`
  - [ ] Host grant: `roomAdmin: true`
  - [ ] Attendee grant: no `roomAdmin`
  - [ ] Keep `canPublish` / `canSubscribe` / `canPublishData` as today
- [ ] `POST /token` (`lv-service/src/routes/token.ts`)
  - [ ] Load `User.name` (or accept `displayName` from Next.js body)
  - [ ] Set `participantName` to display name, not `user:${userId}`
  - [ ] Attach metadata `{ role, eventId, roomId }`
- [ ] Return `isHost` on the token API JSON so the join UI does not guess
- [ ] Manual check: decode host vs attendee JWTs (`roomAdmin` only on host)

---

## Phase 12.2 — Join context

- [ ] Extend `getVirtualRoomJoinContext` in `domain/events/queries.ts`
  - [ ] `isHost` (hosting org OWNER/ADMIN)
  - [ ] `displayName` from session user
- [ ] Pass `isHost` + `displayName` from `app/(protected)/events/[id]/join/[roomId]/page.tsx` into `VirtualRoom`
- [ ] If Next.js kick/mute proxies 403 hosts whose active org ≠ hosting org: authorize in lv-service only (session auth on Next.js, host check in SQL)

---

## Phase 12.3 — Custom meeting shell (parity with VideoConference)

- [ ] Add `components/virtual/meeting/` directory
- [ ] `MeetingLayout.tsx` — participant grid + optional chat sidebar
- [ ] `MeetingControls.tsx` — mic, camera, screen share, chat toggle, leave
- [ ] `MeetingChat.tsx` — LiveKit `Chat` + Evently styles
- [ ] Swap `<VideoConference />` in `VirtualRoom.tsx` for `MeetingLayout`
- [ ] Keep PreJoin, token fetch, session start/end, disconnect redirect
- [ ] Verify: attendee can mute self, share screen, chat, leave

---

## Phase 12.4 — Host UI (kick + end meeting)

- [ ] `ParticipantList.tsx` + `ParticipantMenu.tsx` (host-only)
- [ ] `HostBadge.tsx` on host tiles
- [ ] Wire Kick → existing `POST /api/virtual/rooms/:id/kick` (`participantIdentity` = userId)
- [ ] Confirm dialog before kick
- [ ] “End meeting” in host control bar → existing `DELETE /api/virtual/rooms/:id`
- [ ] Confirm dialog before end
- [ ] Attendee build: no Kick / End meeting in the DOM

---

## Phase 12.5 — Mute API + UI

- [ ] `POST /rooms/:id/mute` in `lv-service/src/routes/rooms.ts`
  - [ ] Body: `{ participantIdentity, trackSid, muted }`
  - [ ] Host SQL check (same as kick)
  - [ ] `roomService.mutePublishedTrack(...)`
- [ ] `app/api/virtual/rooms/[id]/mute/route.ts` proxy
- [ ] Host menu: Mute audio / Mute video / Stop screen share (use track SIDs from `useTracks`)
- [ ] Do **not** offer force-unmute; optional “Ask to unmute” toast later
- [ ] 403 test: attendee calling mute endpoint

---

## Phase 12.6 — Raise hand & reactions (`ws-service`)

- [ ] `hooks/useVirtualRoomSocket.ts`
  - [ ] On LiveKit connect: `join_virtual_room`
  - [ ] On leave / pagehide: `leave_virtual_room`
  - [ ] `raise_hand` / `lower_hand`
  - [ ] `react`
  - [ ] Listen: `hand_raised`, `hand_lowered`, `reaction_received`, `error`
- [ ] `RaiseHandButton.tsx` in the control bar
- [ ] Host sidebar: raised-hand queue ordered by timestamp
- [ ] `ReactionsBar.tsx` — small emoji set, overlay on grid
- [ ] Use Evently `roomId` (UUID), not LiveKit room name

---

## Phase 12.7 — Polish

- [ ] Mobile: controls pinned; chat + hand queue as sheets
- [ ] Empty / reconnecting states inside `MeetingLayout`
- [ ] Accessible labels on all control buttons
- [ ] Host/attendee names visible on tiles (token `name`)
- [ ] Loading skeleton already listed in v1 Phase 11.9 — keep if still open

---

## Phase 12.8 — Tests

- [ ] Unit: token helper sets `roomAdmin` only when `isHost`
- [ ] Unit: mute/kick routes reject non-host (mock pool)
- [ ] Component: `ParticipantMenu` renders only when `isHost`
- [ ] Component: attendee controls exclude End meeting
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
