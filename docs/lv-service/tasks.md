# Phase 11: Virtual Events (`lv-service`) — Task Tracker

> Tracks implementation progress for the virtual room microservice.
> Architecture details: see `docs/lv-service/implementation_plan.md`.

---

## Phase 11.1 — Database Schema

- [x] Add `VirtualRoom` model to `prisma/schema.prisma`
- [x] Add `VirtualSession` model to `prisma/schema.prisma`
- [x] Add `virtualRooms` relation to `Events` model
- [x] Add `virtualRoomsCreated` + `virtualSessions` relations to `User` model
- [x] Add `virtualSessions` relation to `Organization` model
- [x] Run `npx prisma db push` in `d:\evently` ✅ (migrate dev blocked on Render — db push used instead)
- [x] Verify Prisma client regenerated (`@prisma/client`)

---

## Phase 11.2 — `lv-service` Scaffold

- [x] Create `lv-service/` directory at root alongside `ws-service/`
- [x] Create `lv-service/package.json` (Express, jose, livekit-server-sdk, pg)
- [x] Create `lv-service/tsconfig.json` (with `@/*` path alias → `src/*`)
- [x] Create `lv-service/Dockerfile`
- [x] Create `lv-service/.env.example`
- [x] Run `npm install` in `d:\evently\lv-service` ✅ (148 packages)

---

## Phase 11.3 — `lv-service` Core

- [x] Create `lv-service/src/db.ts` — pg pool (copy pattern from `ws-service/src/db.ts`)
- [x] Create `lv-service/src/auth.ts` — `verifyInternalToken()` using `jose`
- [x] Create `lv-service/src/livekit.ts` — `RoomServiceClient` + `generateRoomToken()`
- [x] Create `lv-service/src/routes/rooms.ts` — `GET /rooms`, `POST /rooms`, `DELETE /rooms/:id`, `POST /rooms/:id/kick`
- [x] Create `lv-service/src/routes/token.ts` — `POST /token` with full access gate logic
- [x] Create `lv-service/src/index.ts` — Express server + auth middleware + router mount
- [x] TypeScript compile check passes (`npx tsc --noEmit`) ✅
- [ ] Test health endpoint: `curl http://localhost:5000/health`

---

## Phase 11.4 — Environment & Infrastructure

- [x] Sign up / log in to LiveKit Cloud (`livekit.io`) and create a project
- [x] Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` to root `.env`
- [x] Add `LV_SERVICE_URL=http://localhost:5000` to root `.env`
- [x] Add `NEXT_PUBLIC_LIVEKIT_URL=wss://...` to root `.env`
- [x] Add `lv-service` block to `compose.yaml`
- [x] Update `.env.example` with all 5 new variables

---

## Phase 11.5 — Next.js Integration Layer

- [x] Create `lib/lv-service.ts` — `lvFetch()` helper (internal JWT minting + forwarding)
- [x] Create `app/api/virtual/rooms/route.ts` — `GET` + `POST` (proxy to lv-service)
- [x] Create `app/api/virtual/rooms/[id]/route.ts` — `DELETE` (proxy to lv-service)
- [x] Create `app/api/virtual/token/route.ts` — `POST` (proxy to lv-service)
- [x] Create `app/api/virtual/rooms/[id]/kick/route.ts` — `POST`
- [x] Test routes with a REST client (verify 401 without session, 403 without participation)

---

## Phase 11.6 — Frontend Components

- [x] Run `npm install livekit-client @livekit/components-react` in `d:\evently`
- [x] Create `components/virtual/JoinVirtualButton.tsx` — gated button with full access check
- [x] Create `components/virtual/VirtualRoomList.tsx` — host view: list + create rooms form
- [x] Create `components/virtual/VirtualRoom.tsx` — `<LiveKitRoom>` wrapper
- [x] Create `app/(protected)/events/[id]/join/[roomId]/page.tsx` — full-screen join page

---

## Phase 11.7 — Event Detail Page Integration

- [x] Add `JoinVirtualButton` to sidebar action card in `app/(protected)/events/[id]/page.tsx`
  - Only shown when `eventType === "ONLINE" || "HYBRID"`
  - Gate: `isRegistered && isPaid && within event time window`
- [x] Add `VirtualRoomList` to host sidebar section (visible to host org OWNER/ADMIN)
- [x] Show "Virtual Session" badge/section in event details panel for ONLINE/HYBRID events

---

## Phase 11.8 — ws-service Extension (In-Event Real-Time Features)

- [x] Create `ws-service/src/handlers/virtual-event.ts`
  - [x] `join_virtual_room` — socket joins `vroom:{roomId}` presence room
  - [x] `leave_virtual_room` — socket leaves presence room
  - [x] `raise_hand` / `lower_hand` — Q&A queue broadcast
  - [x] `react` — emoji reaction broadcast to room
  - [x] `poll_vote` — vote broadcast + aggregate
- [x] Add `virtualRoomPresence` helper to `ws-service/src/rooms.ts`
- [x] Register `registerVirtualEventHandlers` in `ws-service/src/index.ts`
- [x] Rebuild ws-service: `npm run build` in `d:\evently\ws-service`

---

## Phase 11.9 — Polish & Testing

- [ ] Loading skeleton for `VirtualRoomList` while rooms fetch
- [ ] Empty state: "No rooms open yet — the host will start a session soon"
- [ ] Error state: "Session not live yet" / "Event has ended" (use `EVENT_NOT_LIVE` error code)
- [ ] Mobile-responsive full-screen layout for `/join/[roomId]` page
- [ ] Integration test: host creates room → participant joins → verify LiveKit token flow
- [ ] Integration test: raise hand → other participants see queue update via ws-service
- [ ] LiveKit webhook endpoint (`POST /api/webhooks/livekit`) for `participant_left` — write `leftAt` + `durationSecs` to `VirtualSession`

---

## Future Enhancements (Post Phase 11)

- [ ] **Recording** — LiveKit Egress → Cloudinary upload → playback link on event page
- [ ] **Breakout rooms** — multiple `VirtualRoom` rows per event (already supported by schema)
- [ ] **Screen share annotation** — LiveKit DataChannel for collaborative markup
- [ ] **Lobby / waiting room** — hold participants until host admits them (LiveKit `participantPermission`)
- [ ] **Attendance analytics** — aggregate `VirtualSession.durationSecs` per org on event dashboard
- [ ] **Closed captions** — LiveKit's built-in transcription via Deepgram integration
- [ ] **Virtual networking** — after session ends, surface matched attendees using existing `OrgMatchWidget`
