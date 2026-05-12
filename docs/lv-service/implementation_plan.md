# Phase 11: Virtual Events Service (`lv-service`) 🎥

> Dedicated Node.js/TypeScript microservice for virtual room management using LiveKit.
> Follows the same architecture pattern as `ws-service` — isolated from Next.js,
> authenticated with shared `AUTH_SECRET`, connecting to the same PostgreSQL instance.

---

## 1. Architecture Overview

```
Client Browser
   │
   ├── REST → Next.js (:3000)
   │         │
   │         ├── POST /api/virtual/lv-token  → lv-service (:5000) → LiveKit Cloud
   │         └── GET  /api/virtual/rooms     → lv-service (:5000) → PostgreSQL
   │
   ├── WebRTC ──────────────────────────────────────────► LiveKit Cloud
   │         (video/audio — never touches your servers)
   │
   └── Socket.io ───────────────────────────────────────► ws-service (:4000)
             (Q&A, polls, reactions, hand-raise — non-media)
```

**Key design decisions:**
- `lv-service` holds the `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` — these never enter Next.js.
- Next.js issues a short-lived internal JWT (signed with `AUTH_SECRET`, same as `ws-service`) to authorize `lv-service` calls.
- The browser connects to LiveKit Cloud **directly** using the room token — `lv-service` never proxies media.
- `ws-service` is NOT replaced — it handles all non-media real-time features (Q&A, polls).

---

## 2. Database Schema Changes (`prisma/schema.prisma`)

Add two new models. Run `prisma migrate dev` after.

```prisma
model VirtualRoom {
  id              String    @id @default(uuid()) @db.Uuid
  eventId         String    @db.Uuid
  name            String    // e.g. "Main Stage", "Healthcare Breakout"
  livekitRoom     String    @unique  // Room name used in LiveKit
  isActive        Boolean   @default(true)
  maxParticipants Int?
  createdByUserId String    @db.Uuid
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  event     Events           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  createdBy User             @relation(fields: [createdByUserId], references: [id])
  sessions  VirtualSession[]

  @@index([eventId])
  @@index([isActive])
}

model VirtualSession {
  id             String       @id @default(uuid()) @db.Uuid
  roomId         String       @db.Uuid
  userId         String       @db.Uuid
  organizationId String?      @db.Uuid
  joinedAt       DateTime     @default(now())
  leftAt         DateTime?
  durationSecs   Int?         // Computed on leave via LiveKit webhook

  room         VirtualRoom   @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user         User          @relation(fields: [userId], references: [id])
  organization Organization? @relation(fields: [organizationId], references: [id])

  @@index([roomId])
  @@index([userId])
  @@index([organizationId])
}
```

**Relation additions on existing models:**
```prisma
// On Events:
virtualRooms   VirtualRoom[]

// On User:
virtualRoomsCreated VirtualRoom[]
virtualSessions     VirtualSession[]

// On Organization:
virtualSessions     VirtualSession[]
```

---

## 3. `lv-service` Microservice

A new top-level directory alongside `ws-service/` and `ai-service/`.

### 3.1 Directory Structure

```
lv-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts          # Express HTTP server entry point
    ├── auth.ts           # Verify internal JWT (same pattern as ws-service)
    ├── db.ts             # pg pool (same DATABASE_URL)
    ├── livekit.ts        # LiveKit SDK wrapper (RoomServiceClient, AccessToken)
    └── routes/
        ├── rooms.ts      # POST /rooms, GET /rooms, DELETE /rooms/:id
        └── token.ts      # POST /token — generate LiveKit room access token
```

### 3.2 Key Files

**`lv-service/src/index.ts`**
```typescript
import "dotenv/config";
import express from "express";
import { verifyInternalToken } from "@/auth";
import roomsRouter from "@/routes/rooms";
import tokenRouter from "@/routes/token";

const PORT = parseInt(process.env.LV_PORT ?? "5000", 10);
const NEXTJS_URL = process.env.NEXTJS_URL ?? "http://localhost:3000";

const app = express();
app.use(express.json());

// Auth middleware — all routes require a valid internal JWT
app.use(async (req, res, next) => {
    try {
        const bearer = req.headers.authorization?.split(" ")[1];
        if (!bearer) throw new Error("No token");
        req.auth = await verifyInternalToken(bearer);
        next();
    } catch {
        res.status(401).json({ error: "UNAUTHORIZED" });
    }
});

app.use("/rooms", roomsRouter);
app.use("/token", tokenRouter);

app.get("/health", (_, res) =>
    res.json({ status: "ok", service: "corpconnect-lv" })
);

app.listen(PORT, () =>
    console.log(`[lv-service] Listening on port ${PORT}`)
);
```

**`lv-service/src/auth.ts`**
```typescript
import { jwtVerify } from "jose";

export interface InternalAuthPayload {
    userId: string;
    activeOrgId: string;
    role: string;
}

export async function verifyInternalToken(token: string): Promise<InternalAuthPayload> {
    if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET not set");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
        algorithms: [process.env.HASHING_ALGO || "HS256"],
    });
    const userId = payload["userId"] as string;
    const activeOrgId = payload["activeOrgId"] as string;
    const role = payload["role"] as string;
    if (!userId || !activeOrgId) throw new Error("Missing required fields");
    return { userId, activeOrgId, role };
}
```

**`lv-service/src/livekit.ts`**
```typescript
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LK_URL = process.env.LIVEKIT_URL!;
const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

export const roomService = new RoomServiceClient(LK_URL, LK_KEY, LK_SECRET);

export interface TokenOptions {
    roomName: string;
    participantIdentity: string; // userId
    participantName: string;     // display name
    canPublish: boolean;         // false = view-only
    canSubscribe: boolean;
}

export function generateRoomToken(opts: TokenOptions): string {
    const at = new AccessToken(LK_KEY, LK_SECRET, {
        identity: opts.participantIdentity,
        name: opts.participantName,
        ttl: "4h",
    });
    at.addGrant({
        roomJoin: true,
        room: opts.roomName,
        canPublish: opts.canPublish,
        canSubscribe: opts.canSubscribe,
        canPublishData: true,
    });
    return at.toJwt();
}
```

**`lv-service/src/routes/token.ts`**
```typescript
import { Router } from "express";
import { pool } from "@/db";
import { generateRoomToken } from "@/livekit";

const router = Router();

// POST /token
// Body: { roomId: string }
// Returns: { token: string, livekitUrl: string }
router.post("/", async (req, res) => {
    const { roomId } = req.body as { roomId: string };
    const { userId, activeOrgId, role } = req.auth!;

    // 1. Fetch the room and its event
    const roomResult = await pool.query<{
        id: string; livekitRoom: string; eventId: string; isActive: boolean;
    }>(
        `SELECT id, "livekitRoom", "eventId", "isActive" FROM "VirtualRoom" WHERE id = $1`,
        [roomId]
    );
    if (!roomResult.rows.length) return res.status(404).json({ error: "ROOM_NOT_FOUND" });
    const room = roomResult.rows[0];
    if (!room.isActive) return res.status(403).json({ error: "ROOM_CLOSED" });

    // 2. Verify the user has a valid, non-cancelled participation for this event
    const partResult = await pool.query<{ status: string; isPaid: boolean }>(
        `SELECT status, "isPaid" FROM "EventParticipation"
         WHERE "eventId" = $1 AND "userId" = $2 AND status != 'CANCELLED'`,
        [room.eventId, userId]
    );

    // 3. Also allow host org members (OWNER/ADMIN)
    const hostResult = await pool.query<{ role: string }>(
        `SELECT om.role FROM "OrganizationMember" om
         JOIN "Events" e ON e."organizationId" = om."organizationId"
         WHERE e.id = $1 AND om."userId" = $2 AND om.role IN ('OWNER','ADMIN')`,
        [room.eventId, userId]
    );

    const isParticipant = partResult.rows.length > 0;
    const isHost = hostResult.rows.length > 0;
    if (!isParticipant && !isHost) return res.status(403).json({ error: "NOT_REGISTERED" });

    // 4. Check event time window
    const eventResult = await pool.query<{ startDateTime: Date; endDateTime: Date; isFree: boolean }>(
        `SELECT "startDateTime", "endDateTime", "isFree" FROM "Events" WHERE id = $1`,
        [room.eventId]
    );
    const event = eventResult.rows[0];
    const now = new Date();
    // Allow joining 15 minutes early
    const joinFrom = new Date(event.startDateTime.getTime() - 15 * 60 * 1000);
    if (now < joinFrom || now > event.endDateTime) {
        return res.status(403).json({ error: "EVENT_NOT_LIVE" });
    }

    // 5. Generate token — hosts can publish, participants can by default too
    const token = generateRoomToken({
        roomName: room.livekitRoom,
        participantIdentity: userId,
        participantName: `user:${userId}`,
        canPublish: true,
        canSubscribe: true,
    });

    res.json({ token, livekitUrl: process.env.LIVEKIT_URL });
});

export default router;
```

**`lv-service/src/routes/rooms.ts`**
```typescript
import { Router } from "express";
import { pool } from "@/db";
import { roomService } from "@/livekit";
import crypto from "crypto";

const router = Router();

// GET /rooms?eventId=
router.get("/", async (req, res) => {
    const { eventId } = req.query as { eventId: string };
    const result = await pool.query(
        `SELECT id, name, "livekitRoom", "isActive", "maxParticipants", "createdAt"
         FROM "VirtualRoom" WHERE "eventId" = $1 AND "isActive" = true`,
        [eventId]
    );
    res.json({ rooms: result.rows });
});

// POST /rooms — Host creates a new virtual room
// Body: { eventId, name, maxParticipants? }
router.post("/", async (req, res) => {
    const { eventId, name, maxParticipants } = req.body;
    const { userId, activeOrgId, role } = req.auth!;

    // Only OWNER/ADMIN of the hosting org can create rooms
    if (!["OWNER", "ADMIN"].includes(role)) {
        return res.status(403).json({ error: "INSUFFICIENT_ROLE" });
    }

    // Verify this user's org hosts this event
    const hostCheck = await pool.query(
        `SELECT e.id FROM "Events" e
         JOIN "OrganizationMember" om ON om."organizationId" = e."organizationId"
         WHERE e.id = $1 AND om."userId" = $2 AND om.role IN ('OWNER','ADMIN')`,
        [eventId, userId]
    );
    if (!hostCheck.rows.length) return res.status(403).json({ error: "NOT_HOST" });

    const livekitRoom = `event-${eventId}-${crypto.randomBytes(4).toString("hex")}`;

    // Create room in LiveKit
    await roomService.createRoom({ name: livekitRoom, maxParticipants });

    // Persist to DB
    const result = await pool.query(
        `INSERT INTO "VirtualRoom" (id, "eventId", name, "livekitRoom", "maxParticipants", "createdByUserId")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         RETURNING id, name, "livekitRoom", "isActive", "createdAt"`,
        [eventId, name, livekitRoom, maxParticipants ?? null, userId]
    );
    res.status(201).json({ room: result.rows[0] });
});

// DELETE /rooms/:id — Host closes a room
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.auth!;

    // Verify host ownership
    const check = await pool.query(
        `SELECT vr."livekitRoom" FROM "VirtualRoom" vr
         JOIN "Events" e ON e.id = vr."eventId"
         JOIN "OrganizationMember" om ON om."organizationId" = e."organizationId"
         WHERE vr.id = $1 AND om."userId" = $2 AND om.role IN ('OWNER','ADMIN')`,
        [id, userId]
    );
    if (!check.rows.length) return res.status(403).json({ error: "NOT_HOST" });

    const { livekitRoom } = check.rows[0];
    await roomService.deleteRoom(livekitRoom);
    await pool.query(`UPDATE "VirtualRoom" SET "isActive" = false WHERE id = $1`, [id]);
    res.json({ ok: true });
});

export default router;
```

### 3.3 `package.json`

```json
{
  "name": "corpconnect-lv-service",
  "version": "1.0.0",
  "description": "Virtual room management service for CorpConnect events",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc && tsc-alias",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "dotenv": "^17.4.2",
    "express": "^4.19.2",
    "jose": "^5.9.6",
    "livekit-server-sdk": "^2.6.0",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "tsc-alias": "^1.8.17",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

### 3.4 `Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### 3.5 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "paths": { "@/*": ["src/*"] }
  }
}
```

---

## 4. Next.js Integration

### 4.1 Internal Token Minting

Next.js issues a short-lived JWT before calling `lv-service` — the same pattern used for `ws-service`.

**`lib/lv-service.ts`** (new file)
```typescript
import { SignJWT } from "jose";
import { auth } from "@/auth";

const LV_SERVICE_URL = process.env.LV_SERVICE_URL!;

async function getLvToken(activeOrgId: string, role: string): Promise<string> {
    const session = await auth();
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    return new SignJWT({ userId: session!.user!.id, activeOrgId, role })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("5m")
        .sign(secret);
}

export async function lvFetch(
    path: string,
    options: RequestInit & { activeOrgId: string; role: string }
) {
    const { activeOrgId, role, ...fetchOpts } = options;
    const token = await getLvToken(activeOrgId, role);
    return fetch(`${LV_SERVICE_URL}${path}`, {
        ...fetchOpts,
        headers: {
            ...fetchOpts.headers,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
}
```

### 4.2 New API Routes in Next.js

| Method | Route | Purpose |
|--------|-------|---------|
| `GET`  | `/api/virtual/rooms?eventId=` | List active rooms for an event |
| `POST` | `/api/virtual/rooms` | Host creates a new room |
| `POST` | `/api/virtual/token` | Get LiveKit room access token |
| `DELETE` | `/api/virtual/rooms/[id]` | Host closes a room |

These are **thin proxies** — they verify the NextAuth session, then forward to `lv-service`.

### 4.3 Frontend Components

```
app/(protected)/events/[id]/
└── join/
    └── [roomId]/
        └── page.tsx          ← Full-screen LiveKit room

components/virtual/
├── JoinVirtualButton.tsx     ← Gated "Join Session" button on event detail page
├── VirtualRoomList.tsx       ← Host view: list + create rooms
├── VirtualRoom.tsx           ← @livekit/components-react LiveKitRoom wrapper
├── ParticipantBar.tsx        ← Org-branded participant tiles
└── ControlBar.tsx            ← Mic/cam/screen-share/leave controls
```

**Access gate in `JoinVirtualButton`:**
```typescript
const canJoinVirtually =
    (eventType === "ONLINE" || eventType === "HYBRID") &&
    isRegistered &&
    participation.status !== "CANCELLED" &&
    (event.isFree || participation.isPaid) &&
    new Date() >= new Date(new Date(event.startDateTime).getTime() - 15 * 60 * 1000) &&
    new Date() <= new Date(event.endDateTime);
```

**Frontend packages to install:**
```bash
npm install @livekit/components-react @livekit/client
```

---

## 5. `compose.yaml` Addition

```yaml
  lv-service:
    build:
      context: ./lv-service
    container_name: corpconnect-lv
    restart: always
    ports:
      - "5000:5000"
    env_file:
      - .env
    environment:
      LV_PORT: 5000
      LIVEKIT_URL: ${LIVEKIT_URL}
      LIVEKIT_API_KEY: ${LIVEKIT_API_KEY}
      LIVEKIT_API_SECRET: ${LIVEKIT_API_SECRET}
      AUTH_SECRET: ${AUTH_SECRET}
      DATABASE_URL: ${DATABASE_URL}
      NEXTJS_URL: ${NEXTJS_URL:-http://localhost:3000}
    depends_on:
      - redis
```

---

## 6. Environment Variables

Add to root `.env` and `.env.example`:

```env
# LiveKit — use LiveKit Cloud to start (livekit.io)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# lv-service internal URL (used by Next.js server-side only)
LV_SERVICE_URL=http://localhost:5000

# LiveKit URL for browser WebRTC connections (must be public/WSS)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## 7. Security & Access Control

| Rule | Enforcement Layer |
|------|------------------|
| `LIVEKIT_API_SECRET` never exposed to browser | Only in `lv-service` env — Next.js never holds it |
| Only registered, paid, non-cancelled participants get tokens | `lv-service` `/token` route — DB query check |
| Hosts can only create rooms for their own events | `lv-service` `/rooms POST` — org membership check |
| Tokens have 4-hour TTL | LiveKit `AccessToken` `ttl` option |
| Rooms gated by event time window (± 15 min) | `lv-service` start/end time check |
| Internal Next.js → lv-service calls use 5-min JWTs | `lib/lv-service.ts` `SignJWT` |
| LiveKit Cloud handles TURN/STUN, NAT traversal | Managed infrastructure — no ops burden |

---

## 8. LiveKit Cloud vs Self-Host Decision

| Scale | Recommendation | Cost |
|-------|---------------|------|
| < 50,000 participant-minutes/month | **LiveKit Cloud Free Tier** | $0 |
| 50k – 300k participant-minutes/month | LiveKit Cloud Starter/Pro | ~$50–$250/mo |
| > 300k participant-minutes/month | Self-host LiveKit on dedicated VM | ~$150–$400/mo infra |

> Start on LiveKit Cloud. Migration to self-host only requires changing `LIVEKIT_URL`,
> `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` — zero code changes.

---

## 9. ws-service Extension for In-Event Features

Add a new handler file to the **existing** `ws-service` (no new service needed):

**`ws-service/src/handlers/virtual-event.ts`**
```typescript
// New socket events for the virtual room experience
// Emitted by clients in the /events/[id]/join/[roomId] page

socket.on("raise_hand", (roomId) => { ... })      // Q&A queue
socket.on("lower_hand", (roomId) => { ... })
socket.on("react", (roomId, emoji) => { ... })     // Emoji reactions
socket.on("poll_vote", (pollId, optionId) => { ... })
socket.on("join_virtual_room", (roomId) => {       // Presence tracking
    socket.join(`vroom:${roomId}`);
})
```

Room naming helper to add to `ws-service/src/rooms.ts`:
```typescript
export const virtualRoomPresence = (roomId: string) => `vroom:${roomId}`;
```

---

## 10. File Change Summary

| File | Type | Notes |
|------|------|-------|
| `prisma/schema.prisma` | Modify | Add `VirtualRoom`, `VirtualSession` models + relations |
| `lv-service/` | **New directory** | Entire virtual room microservice |
| `compose.yaml` | Modify | Add `lv-service` service block |
| `.env` / `.env.example` | Modify | Add 4 new LiveKit + service vars |
| `lib/lv-service.ts` | **New file** | Internal JWT client for Next.js → lv-service calls |
| `app/api/virtual/**` | **New files** | 4 thin proxy API routes |
| `components/virtual/*.tsx` | **New files** | JoinVirtualButton, VirtualRoomList, VirtualRoom, ControlBar |
| `app/(protected)/events/[id]/join/[roomId]/page.tsx` | **New file** | Full-screen LiveKit room page |
| `app/(protected)/events/[id]/page.tsx` | Modify | Add JoinVirtualButton + VirtualRoomList to sidebar |
| `ws-service/src/handlers/virtual-event.ts` | **New file** | Q&A, polls, reactions handlers |
| `ws-service/src/rooms.ts` | Modify | Add `virtualRoomPresence` helper |
| `package.json` (root) | Modify | Add `@livekit/components-react`, `@livekit/client` |
