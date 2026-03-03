# Phase 5: Data Collection for Future AI

Lays the groundwork for AI-powered recommendations (Phase 7) by collecting structured signal data that an AI microservice can consume. This phase is **purely data collection** — no AI runs yet.

## Proposed Changes

---

### 1. Schema Updates

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**A. `Events` — add `viewCount`**
```diff
+ viewCount  Int @default(0)
```
Simple counter; incremented by a server action whenever an event detail page loads for an authenticated user.

**B. New `EventView` table** — per-session view tracking with engagement signals

Industry-standard design: one row **per visit session** (allows repeat visits), with duration filled in on page leave via `navigator.sendBeacon`.

```prisma
model EventView {
  id              String   @id @default(uuid()) @db.Uuid
  eventId         String   @db.Uuid
  userId          String   @db.Uuid
  sessionId       String   @unique @db.Uuid  // client-generated UUID per visit
  startedAt       DateTime @default(now())
  durationSeconds Int?                        // filled via PATCH on page leave
  referrer        String?                     // "search" | "dashboard" | "recommendation" | "direct"
  event           Events   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([eventId])
  @@index([userId])
  @@index([eventId, userId])  // per-user per-event queries
}
```

**AI signals stored:**
- `who viewed what` — collaborative filtering
- `durationSeconds` — engagement strength (>30s = interested, >120s = strong signal)
- `referrer` — discovery channel analysis
- `multiple rows per user-event` — visit frequency = strong interest

`Events.viewCount` is incremented per session (total views, not unique).

**Client flow:**
1. Page mounts → `POST /api/events/[id]/view` (creates row, returns `sessionId`)
2. Page unmounts / tab closes → `navigator.sendBeacon` → `PATCH /api/events/[id]/view` with `{ sessionId, durationSeconds }`

**C. New `OrgInteraction` table** — org→org relationship signals from shared event participation
```prisma
model OrgInteraction {
  id             String       @id @default(uuid()) @db.Uuid
  sourceOrgId    String       @db.Uuid
  targetOrgId    String       @db.Uuid
  sharedEventId  String       @db.Uuid
  createdAt      DateTime     @default(now())
  sourceOrg      Organization @relation("SourceOrg", fields: [sourceOrgId], references: [id], onDelete: Cascade)
  targetOrg      Organization @relation("TargetOrg", fields: [targetOrgId], references: [id], onDelete: Cascade)
  sharedEvent    Events       @relation(fields: [sharedEventId], references: [id], onDelete: Cascade)

  @@unique([sourceOrgId, targetOrgId, sharedEventId])
  @@index([sourceOrgId])
  @@index([targetOrgId])
}
```

**D. New `Tag` + junction tables** — tag system for events and orgs
```prisma
model Tag {
  id         String     @id @default(uuid()) @db.Uuid
  label      String     @unique
  createdAt  DateTime   @default(now())
  eventTags  EventTag[]
  orgTags    OrgTag[]
}

model EventTag {
  eventId String  @db.Uuid
  tagId   String  @db.Uuid
  event   Events  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  tag     Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([eventId, tagId])
}

model OrgTag {
  orgId  String        @db.Uuid
  tagId  String        @db.Uuid
  org    Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  tag    Tag           @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([orgId, tagId])
}
```

---

### 2. Data Access Layer

#### [NEW] [data/analytics.ts](file:///d:/evently/data/analytics.ts)
- `recordEventView(eventId, userId)` — upsert `EventView`, increment `Events.viewCount`
- `recordOrgInteraction(sourceOrgId, targetOrgId, sharedEventId)` — upsert `OrgInteraction`
- `getTagSuggestions(query)` — search tags for autocomplete

---

### 3. API Endpoints

#### [NEW] [app/api/events/[id]/view/route.ts](file:///d:/evently/app/api/events/[id]/view/route.ts)
`POST` — called from the event detail page on load. Records a view for the authenticated user. No-op for unauthenticated users.

#### [NEW] [app/api/tags/route.ts](file:///d:/evently/app/api/tags/route.ts)
- `GET ?q=query` — search/list tags for autocomplete
- `POST` — create a new tag (authenticated)

#### [NEW] [app/api/events/[id]/tags/route.ts](file:///d:/evently/app/api/events/[id]/tags/route.ts)
- `PUT` — update tags on an event (event owner/org admin only)

#### [NEW] [app/api/organizations/[id]/tags/route.ts](file:///d:/evently/app/api/organizations/[id]/tags/route.ts)
- `PUT` — update tags on an org (org owner/admin only)

---

### 4. Admin Data Export Endpoints

Admin-protected (requires `isAppAdmin`). Returns JSON — consumed by the AI microservice for training/inference.

#### [NEW] [app/api/admin/export/participations/route.ts](file:///d:/evently/app/api/admin/export/participations/route.ts)
Returns all participation records with event, org, user (id only), status, timestamps.

#### [NEW] [app/api/admin/export/interactions/route.ts](file:///d:/evently/app/api/admin/export/interactions/route.ts)
Returns the org→org interaction graph derived from `OrgInteraction`.

#### [NEW] [app/api/admin/export/preferences/route.ts](file:///d:/evently/app/api/admin/export/preferences/route.ts)
Returns per-user preference signals: categories and industries of events they've viewed or attended.

---

### 5. UI: Tag Input Component + Integration

#### [NEW] [components/tags/TagInput.tsx](file:///d:/evently/components/tags/TagInput.tsx)
Reusable tag input with autocomplete — used in event and org edit forms.

#### [MODIFY] [components/forms/EventForm.tsx](file:///d:/evently/components/forms/EventForm.tsx) *(if exists)*
Add `TagInput` to the event create/edit form.

#### [MODIFY] [components/forms/OrganizationForm.tsx](file:///d:/evently/components/forms/OrganizationForm.tsx) *(if exists)*
Add `TagInput` to the org create/edit form.

---

### 6. Trigger: OrgInteraction on Participation

#### [MODIFY] [app/api/events/[id]/participate/route.ts](file:///d:/evently/app/api/events/[id]/participate/route.ts)
After a successful `REGISTERED` participation, if the participating org is different from the hosting org, insert an `OrgInteraction` record connecting both orgs via the shared event.

---

## Verification Plan

### Automated
```bash
npx tsc --noEmit    # zero new errors
npx prisma db push  # schema applied cleanly
```

### Manual / Browser
1. Open an event detail page → confirm `EventView` row created and `viewCount` incremented
2. Join an event as org B (hosted by org A) → confirm `OrgInteraction` row created
3. `GET /api/tags?q=tech` → returns matching tags
4. `PUT /api/events/:id/tags` with a tag list → tags saved on event
5. `GET /api/admin/export/participations` (as app admin) → JSON response
6. `GET /api/admin/export/interactions` → org graph JSON
7. `GET /api/admin/export/preferences` → user preference signals JSON
