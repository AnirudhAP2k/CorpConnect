# Phase 10: Business Messaging (Direct Org-to-Org Chat) 💬

> Real-time, WebSocket-powered direct messaging between connected organizations.
> Builds on the existing `OrgConnection` graph (Phase 8.3) to make CorpConnect
> a genuinely collaborative B2B platform rather than just a discovery tool.

---

## 1. Architecture Overview

### Why a Dedicated WebSocket Service?

Next.js 15 (App Router) is a **serverless-first** runtime. WebSocket connections
require a persistent, long-lived process — something serverless functions cannot
provide. The cleanest solution that fits the existing architecture (Next.js server
+ Python ai-service + Redis + n8n — all in `compose.yaml`) is to add a **dedicated
Node.js WebSocket service** using **Socket.io**.

```
Browser                Next.js Server         WS Service (Node + Socket.io)     Redis (Pub/Sub)   PostgreSQL
  │                        │                            │                              │               │
  │── REST login ──────────►                            │                              │               │
  │◄── JWT session ─────────│                           │                              │               │
  │                         │                           │                              │               │
  │── WS connect (token) ──────────────────────────────►│                              │               │
  │                         │                           │── verify token via REST ──►  │               │
  │                         │                           │◄── userId + orgId ──────────  │               │
  │                         │                           │── subscribe to rooms ────────►│               │
  │                         │                           │                              │               │
  │── socket.emit('msg') ──────────────────────────────►│                              │               │
  │                         │                           │── INSERT DirectMessage ──────────────────────►│
  │                         │                           │── Redis PUBLISH room ────────►│               │
  │                         │   (other tab or replica)  │◄── Redis SUBSCRIBE event ───  │               │
  │◄── socket.on('msg') ──────────────────────────────── │                              │               │
```

**Key design decisions:**
- **Rooms are keyed by `conversationId`** (stable, sorted UUID pair of the two org IDs) so any WS server replica delivers to the right socket.
- **Redis Pub/Sub** as the horizontal adapter — already in `compose.yaml`, zero extra infrastructure.
- **Existing `OrgConnection`** (accepted status) is the gate. Only connected orgs may message each other.
- **Existing NextAuth JWT** is reused for socket authentication — no new auth system.
- **Next.js REST routes** handle history fetch & unread counts. WS handles real-time only.

---

## 2. Database Schema Changes (`prisma/schema.prisma`)

Add two new models and one new enum. Run `prisma db push` after.

```prisma
// Represents the thread between exactly two organizations.
// conversationId is a stable, deterministic string: sorted(orgA, orgB).join(":")
model DirectConversation {
  id        String   @id @default(uuid()) @db.Uuid
  orgAId    String   @db.Uuid
  orgBId    String   @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orgA     Organization      @relation("ConvOrgA", fields: [orgAId], references: [id], onDelete: Cascade)
  orgB     Organization      @relation("ConvOrgB", fields: [orgBId], references: [id], onDelete: Cascade)
  messages DirectMessage[]

  @@unique([orgAId, orgBId])  // enforces one thread per pair
  @@index([orgAId])
  @@index([orgBId])
}

model DirectMessage {
  id             String               @id @default(uuid()) @db.Uuid
  conversationId String               @db.Uuid
  senderOrgId    String               @db.Uuid
  senderUserId   String               @db.Uuid
  content        String               @db.Text
  status         DirectMessageStatus  @default(SENT)
  readAt         DateTime?
  createdAt      DateTime             @default(now())

  conversation   DirectConversation   @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderOrg      Organization         @relation(fields: [senderOrgId], references: [id], onDelete: Cascade)
  senderUser     User                 @relation(fields: [senderUserId], references: [id])

  @@index([conversationId, createdAt])
  @@index([senderOrgId])
  @@index([status])
}

enum DirectMessageStatus {
  SENT
  DELIVERED
  READ
}
```

**Relation additions needed on existing models:**

```prisma
// On Organization:
directConversationsAsA   DirectConversation[]  @relation("ConvOrgA")
directConversationsAsB   DirectConversation[]  @relation("ConvOrgB")
sentDirectMessages       DirectMessage[]

// On User:
sentDirectMessages       DirectMessage[]
```

---

## 3. WebSocket Service (`ws-service/`)

A new top-level directory alongside `ai-service/`. It is a lightweight Node.js
service — **not** part of the Next.js build.

### 3.1 Directory Structure

```
ws-service/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts           # entry point, creates http server + Socket.io
    ├── auth.ts            # validates NextAuth JWT, returns { userId, orgId }
    ├── rooms.ts           # room naming helpers
    ├── db.ts              # pg pool (same DATABASE_URL as Next.js)
    └── handlers/
        └── message.ts     # on('send_message') handler
```

### 3.2 Key Files

**`ws-service/src/index.ts`**
```typescript
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { verifySocketAuth } from "./auth";
import { registerMessageHandlers } from "./handlers/message";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTJS_URL, credentials: true },
});

// Redis adapter for horizontal scaling
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = await verifySocketAuth(token);   // throws on invalid
    socket.data.userId = payload.userId;
    socket.data.activeOrgId = payload.activeOrgId;
    next();
  } catch (err) {
    next(new Error("AUTH_FAILED"));
  }
});

io.on("connection", (socket) => {
  // Auto-join the org's personal notification room
  socket.join(`org:${socket.data.activeOrgId}`);
  registerMessageHandlers(io, socket);
});

httpServer.listen(process.env.WS_PORT ?? 4000);
```

**`ws-service/src/auth.ts`**
```typescript
import jwt from "jsonwebtoken";

export async function verifySocketAuth(token: string) {
  // Decode the same NextAuth JWT that the browser already holds.
  // AUTH_SECRET must match the value in Next.js .env
  const payload = jwt.verify(token, process.env.AUTH_SECRET!) as any;
  return {
    userId: payload.sub as string,
    activeOrgId: payload.activeOrganizationId as string,
  };
}
```

**`ws-service/src/handlers/message.ts`**
```typescript
import type { Server, Socket } from "socket.io";
import { pool } from "../db";
import { conversationRoom } from "../rooms";

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export function registerMessageHandlers(io: Server, socket: Socket) {
  const { userId, activeOrgId } = socket.data;

  // Client joins a specific conversation room when they open a chat window
  socket.on("join_conversation", (conversationId: string) => {
    socket.join(conversationRoom(conversationId));
  });

  socket.on("send_message", async (payload: SendMessagePayload, ack) => {
    const { conversationId, content } = payload;

    // 1. Verify the calling org is actually part of this conversation
    const conv = await pool.query(
      `SELECT id FROM "DirectConversation"
       WHERE id = $1 AND ("orgAId" = $2 OR "orgBId" = $2)`,
      [conversationId, activeOrgId]
    );
    if (!conv.rows.length) return ack({ error: "FORBIDDEN" });

    // 2. Persist to DB
    const msg = await pool.query(
      `INSERT INTO "DirectMessage"
         (id, "conversationId", "senderOrgId", "senderUserId", content, status, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'SENT', NOW())
       RETURNING id, content, "senderOrgId", "senderUserId", status, "createdAt"`,
      [conversationId, activeOrgId, userId, content]
    );
    const newMsg = msg.rows[0];

    // 3. Broadcast to everyone in the conversation room (including sender)
    io.to(conversationRoom(conversationId)).emit("new_message", newMsg);

    // 4. Mark as delivered for the receiver's org notification room
    // (used to show unread badge without the receiver being in the chat room)
    io.to(`org:${/* receiverOrgId resolved from conv */ "..."}`).emit("message_notification", {
      conversationId,
      senderOrgId: activeOrgId,
    });

    ack({ ok: true, messageId: newMsg.id });
  });

  socket.on("mark_read", async (conversationId: string) => {
    await pool.query(
      `UPDATE "DirectMessage"
       SET status = 'READ', "readAt" = NOW()
       WHERE "conversationId" = $1
         AND "senderOrgId" != $2
         AND status != 'READ'`,
      [conversationId, activeOrgId]
    );
    io.to(conversationRoom(conversationId)).emit("messages_read", {
      conversationId,
      byOrgId: activeOrgId,
    });
  });
}
```

**`ws-service/src/rooms.ts`**
```typescript
export const conversationRoom = (conversationId: string) =>
  `conv:${conversationId}`;
```

### 3.3 `ws-service/package.json` Dependencies
```json
{
  "dependencies": {
    "socket.io": "^4.7.4",
    "@socket.io/redis-adapter": "^8.3.0",
    "redis": "^4.6.13",
    "pg": "^8.13.1",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/pg": "^8.11.0",
    "@types/jsonwebtoken": "^9.0.7",
    "typescript": "^5"
  }
}
```

### 3.4 `ws-service/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

---

## 4. `compose.yaml` Changes

Add the `ws-service` alongside `server`, `redis`, `n8n`:

```yaml
  ws-service:
    build:
      context: ./ws-service
    container_name: corpconnect-ws
    restart: always
    ports:
      - "4000:4000"
    env_file:
      - .env
    environment:
      WS_PORT: 4000
      REDIS_URL: redis://redis:6379
      NEXTJS_URL: ${NEXTJS_URL:-http://localhost:3000}
      # AUTH_SECRET must match Next.js value
    depends_on:
      - redis
```

---

## 5. Next.js REST API Routes

These handle history loading and conversation management (WebSocket delivers new
messages, REST serves the initial page load).

| Method | Route | Purpose |
|--------|-------|---------|
| `GET`  | `/api/messaging/conversations` | List all conversations for active org (with last message + unread count) |
| `POST` | `/api/messaging/conversations` | Create or retrieve conversation with another org (idempotent) |
| `GET`  | `/api/messaging/conversations/[id]/messages` | Paginated message history (cursor-based, `?before=<messageId>`) |
| `GET`  | `/api/messaging/unread` | Total unread count across all conversations (for Navbar badge) |

### `POST /api/messaging/conversations` — Create/Get Conversation
```typescript
// Validates the two orgs are ACCEPTED connections before creating.
// Returns { conversationId } — client then connects socket to this room.

const connection = await prisma.orgConnection.findFirst({
  where: {
    OR: [
      { sourceOrgId: callerOrgId, targetOrgId: targetOrgId, status: "ACCEPTED" },
      { sourceOrgId: targetOrgId, targetOrgId: callerOrgId, status: "ACCEPTED" },
    ],
  },
});
if (!connection) return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 403 });

// Canonical order: smaller UUID first → enforces the @@unique([orgAId, orgBId])
const [orgAId, orgBId] = [callerOrgId, targetOrgId].sort();
const conversation = await prisma.directConversation.upsert({
  where: { orgAId_orgBId: { orgAId, orgBId } },
  create: { orgAId, orgBId },
  update: {},
});
```

---

## 6. Next.js Client — Socket.io Hook

**`hooks/useSocket.ts`**
```typescript
"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

let socketSingleton: Socket | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.accessToken || socketSingleton) return;

    socketSingleton = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token: session.accessToken }, // NextAuth JWT passed here
      transports: ["websocket"],
    });

    socketRef.current = socketSingleton;

    return () => {
      socketSingleton?.disconnect();
      socketSingleton = null;
    };
  }, [session]);

  return socketRef.current;
}
```

> **Note:** `session.accessToken` requires exposing the JWT in the NextAuth
> session callback (one-line change to `auth.ts`).

**`hooks/useConversation.ts`**
```typescript
"use client";
import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";

export function useConversation(conversationId: string) {
  const socket = useSocket();
  const [messages, setMessages] = useState<DirectMessage[]>([]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("join_conversation", conversationId);

    const onNewMessage = (msg: DirectMessage) =>
      setMessages((prev) => [...prev, msg]);

    socket.on("new_message", onNewMessage);
    return () => { socket.off("new_message", onNewMessage); };
  }, [socket, conversationId]);

  const sendMessage = (content: string) => {
    socket?.emit("send_message", { conversationId, content });
  };

  const markRead = () => {
    socket?.emit("mark_read", conversationId);
  };

  return { messages, sendMessage, markRead };
}
```

---

## 7. UI Components & Pages

### 7.1 Page Structure
```
app/(protected)/
└── messaging/
    ├── layout.tsx         ← Sidebar (conversation list) + main panel
    └── [conversationId]/
        └── page.tsx       ← Chat window for a specific conversation
```

### 7.2 Component Map

| Component | Path | Description |
|-----------|------|-------------|
| `MessagingLayout` | `app/(protected)/messaging/layout.tsx` | Two-panel shell: ConversationList (left) + outlet (right) |
| `ConversationList` | `components/messaging/ConversationList.tsx` | SSR list of conversations with last message preview + unread badge |
| `ConversationItem` | `components/messaging/ConversationItem.tsx` | Single row: org logo, name, last message snippet, timestamp, unread count |
| `ChatWindow` | `components/messaging/ChatWindow.tsx` | Client component; uses `useConversation` hook; renders MessageList + MessageInput |
| `MessageList` | `components/messaging/MessageList.tsx` | Scrollable list of bubbles; groups by date; auto-scrolls to bottom |
| `MessageBubble` | `components/messaging/MessageBubble.tsx` | Single message; shows sender org logo, content, timestamp, read receipt |
| `MessageInput` | `components/messaging/MessageInput.tsx` | Textarea + Send button; Shift+Enter for newline, Enter to send |
| `StartConversationButton` | `components/messaging/StartConversationButton.tsx` | Placed on org profile page; calls POST /api/messaging/conversations then routes to /messaging/[id] |
| `UnreadBadge` | `components/messaging/UnreadBadge.tsx` | Small red badge on Navbar "Messages" icon; polls GET /api/messaging/unread every 30s |

### 7.3 `StartConversationButton` placement
The button is injected into the existing **Org Profile Page** next to the existing
`ConnectButton` — only rendered when `connection.status === "ACCEPTED"`.

---

## 8. Auth: Expose JWT in NextAuth Session

**`auth.ts`** — add one line to the `session` callback:
```typescript
callbacks: {
  async session({ session, token }) {
    // ... existing fields ...
    session.accessToken = token.jti; // or encode a minimal JWT — see note below
    return session;
  }
}
```

> For production, create a **separate short-lived signed token** containing only
> `{ userId, activeOrganizationId }` rather than exposing the full NextAuth JWT.
> The WS service verifies it with the same `AUTH_SECRET`.

**`next-auth.d.ts`** — extend the `Session` type:
```typescript
interface Session {
  accessToken?: string;
}
```

---

## 9. Environment Variables

Add to `.env` and `.env.example`:

```env
# WebSocket service
NEXT_PUBLIC_WS_URL=http://localhost:4000   # browser-side (public)
WS_PORT=4000
```

The existing `REDIS_URL` and `AUTH_SECRET` are reused — no new secrets needed.

---

## 10. Security & Access Control

| Rule | Enforcement Layer |
|------|------------------|
| Only users with an active organization can send/receive messages | WS middleware: rejects socket if `activeOrgId` is null |
| Only `ACCEPTED` org connections may open a conversation | REST: `POST /api/messaging/conversations` checks `OrgConnection.status` |
| A socket cannot inject messages into conversations it's not part of | WS handler: DB query validates `orgAId OR orgBId = activeOrgId` before insert |
| OWNER / ADMIN role required to start a new conversation | REST: checks `OrganizationMember.role` before creating conversation |
| Message history only visible to participants | REST `/messages` route checks `orgAId OR orgBId = activeOrgId` |

---

## 11. Phased Action Plan

### Phase 10.1 — Infrastructure & Schema *(~2-3 hours)*
- [ ] Add `DirectConversation`, `DirectMessage` models + `DirectMessageStatus` enum to `schema.prisma`
- [ ] Add relation fields to `Organization` and `User`
- [ ] Run `prisma db push` + regenerate client
- [ ] Scaffold `ws-service/` directory with `package.json`, `tsconfig.json`, `Dockerfile`
- [ ] Add `ws-service` to `compose.yaml`
- [ ] Add `NEXT_PUBLIC_WS_URL` to `.env` and `.env.example`

### Phase 10.2 — WebSocket Service *(~3-4 hours)*
- [ ] Implement `ws-service/src/index.ts` (http server + Socket.io + Redis adapter)
- [ ] Implement `ws-service/src/auth.ts` (JWT verification using `AUTH_SECRET`)
- [ ] Implement `ws-service/src/db.ts` (pg pool, same `DATABASE_URL`)
- [ ] Implement `ws-service/src/handlers/message.ts` (`send_message`, `join_conversation`, `mark_read`)
- [ ] Write `ws-service/src/rooms.ts` (room naming helpers)
- [ ] Test locally with `wscat` or a simple HTML test page

### Phase 10.3 — REST API Routes *(~2-3 hours)*
- [ ] `GET /api/messaging/conversations` — list conversations with last message + unread count
- [ ] `POST /api/messaging/conversations` — create/get conversation (connection gate)
- [ ] `GET /api/messaging/conversations/[id]/messages` — paginated history
- [ ] `GET /api/messaging/unread` — total unread count
- [ ] Add `next-auth.d.ts` `accessToken` field + expose in `auth.ts` session callback

### Phase 10.4 — Client Hooks *(~2 hours)*
- [ ] `hooks/useSocket.ts` — singleton socket connection with NextAuth JWT
- [ ] `hooks/useConversation.ts` — join room, listen for messages, send, mark read
- [ ] Install `socket.io-client` in `package.json`

### Phase 10.5 — UI *(~4-5 hours)*
- [ ] `app/(protected)/messaging/layout.tsx` — two-panel shell
- [ ] `app/(protected)/messaging/[conversationId]/page.tsx` — chat window page
- [ ] `components/messaging/ConversationList.tsx` — SSR conversation list sidebar
- [ ] `components/messaging/ChatWindow.tsx` — main chat client component
- [ ] `components/messaging/MessageList.tsx` — message bubbles with date separators
- [ ] `components/messaging/MessageBubble.tsx` — individual message
- [ ] `components/messaging/MessageInput.tsx` — textarea + send
- [ ] `components/messaging/StartConversationButton.tsx` — on org profile page
- [ ] `components/messaging/UnreadBadge.tsx` — Navbar badge
- [ ] Add "Messages" link to `constants/index.ts` and Navbar

### Phase 10.6 — Polish & Testing *(~2 hours)*
- [ ] Loading skeletons for `ConversationList` and `MessageList`
- [ ] Empty state for messaging page (no conversations yet, prompt to connect with orgs)
- [ ] Error boundary for socket disconnect (show "Reconnecting..." banner)
- [ ] Mobile-responsive layout for messaging page
- [ ] Integration test: open two browser tabs with different org sessions, send messages, verify delivery

---

## 12. File Change Summary

| File | Change Type | Notes |
|------|------------|-------|
| `prisma/schema.prisma` | Modify | Add `DirectConversation`, `DirectMessage`, `DirectMessageStatus` |
| `ws-service/` | **New directory** | Entire Node.js Socket.io service |
| `compose.yaml` | Modify | Add `ws-service` service block |
| `.env` / `.env.example` | Modify | Add `NEXT_PUBLIC_WS_URL`, `WS_PORT` |
| `auth.ts` | Modify | Expose `accessToken` in session callback |
| `next-auth.d.ts` | Modify | Add `accessToken` to `Session` type |
| `hooks/useSocket.ts` | **New file** | Socket.io singleton hook |
| `hooks/useConversation.ts` | **New file** | Conversation state + event handlers |
| `app/(protected)/messaging/layout.tsx` | **New file** | Two-panel messaging layout |
| `app/(protected)/messaging/[conversationId]/page.tsx` | **New file** | Chat window page |
| `components/messaging/*.tsx` | **New files** | All messaging UI components (7 files) |
| `app/api/messaging/**` | **New files** | 4 REST routes |
| `components/shared/Navbar.tsx` | Modify | Add Messages link + UnreadBadge |
| `constants/index.ts` | Modify | Add messaging nav link |
| `package.json` | Modify | Add `socket.io-client` |

---

## 13. Future Enhancements (Post Phase 10)

- **File attachments** — upload via UploadThing (already integrated) and send a
  message with `type: "FILE"` and a `fileUrl` field on `DirectMessage`.
- **Typing indicators** — ephemeral `socket.emit("typing")` event, no DB write.
- **Message reactions** — new `DirectMessageReaction` model.
- **Group conversations** — extend `DirectConversation` to support >2 participants
  (useful for multi-org consortium deals surfaced from Industry Groups).
- **Push notifications** — use the existing `Notification` model + `JobQueue` to
  send an email when a message is received and the recipient is offline.
- **Message search** — PostgreSQL `tsvector` full-text index on `DirectMessage.content`.
