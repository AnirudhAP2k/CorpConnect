# Phase 5: Data Collection for AI — Walkthrough

## What Was Built

### 1. Schema Changes (`prisma/schema.prisma`)

Applied via `npx prisma db push` ✅

| Model | Purpose |
|---|---|
| `Events.viewCount` | Total view count per event (incremented per session) |
| `EventView` | Per-session engagement tracking (sessionId, durationSeconds, referrer) |
| `OrgInteraction` | Bidirectional org→org graph from shared event participation |
| `Tag` | Global tag registry (unique labels) |
| `EventTag` | Junction: events ↔ tags |
| `OrgTag` | Junction: organizations ↔ tags |

#### EventView Design (Industry Standard)
```prisma
model EventView {
  sessionId       String   @unique @db.Uuid  // one row per visit
  durationSeconds Int?                        // filled on page leave
  referrer        String?  // "search"|"dashboard"|"recommendation"|"direct"
  startedAt       DateTime @default(now())
  ...
}
```
- One row **per visit session** (allows multiple visits → frequency signal)
- `durationSeconds` filled via `navigator.sendBeacon` on tab close
- `referrer` tracks discovery channel (for recommendation pipeline)

---

### 2. Data Access Layer (`data/analytics.ts`)

| Function | Purpose |
|---|---|
| `recordEventView` | Create EventView + increment viewCount atomically |
| `updateViewDuration` | PATCH durationSeconds by sessionId |
| `getEventViewStats` | Aggregate: totalViews, uniqueViewers, avgDuration, referrerBreakdown |
| `recordOrgInteraction` | Insert bidirectional org graph edges (skipDuplicates) |
| `getTagSuggestions` | Autocomplete tag search |
| `upsertTags` | Get-or-create tags by label (normalised to kebab-case) |
| `setEventTags` | Replace all tags on an event (transactional) |
| `setOrgTags` | Replace all tags on an org (transactional) |
| `getEventTags` | Fetch tags for an event |
| `getOrgTags` | Fetch tags for an org |

---

### 3. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/events/[id]/view` | POST | Record view session start |
| `/api/events/[id]/view` | PATCH | Update durationSeconds on page leave |
| `/api/tags` | GET `?q=` | Tag autocomplete search |
| `/api/tags` | POST | Create tag (authenticated) |
| `/api/events/[id]/tags` | GET | Get tags for event |
| `/api/events/[id]/tags` | PUT | Set tags on event (owner/admin only) |
| `/api/organizations/[id]/tags` | GET | Get tags for org |
| `/api/organizations/[id]/tags` | PUT | Set tags on org (OWNER/ADMIN only) |
| `/api/admin/export/participations` | GET | All participations JSON (isAppAdmin) |
| `/api/admin/export/interactions` | GET | Org graph + edges JSON (isAppAdmin) |
| `/api/admin/export/preferences` | GET | Per-user preference signals (isAppAdmin) |

---

### 4. OrgInteraction Trigger (`app/api/events/[id]/participate/route.ts`)

After successful event registration, if the participating org ≠ hosting org:
```
OrgInteraction: hostOrg → attendingOrg (shared event)
OrgInteraction: attendingOrg → hostOrg (shared event)
```
Both directions recorded. Idempotent (skipDuplicates). Non-fatal if it fails.

---

### 5. Client-Side Tracking (`hooks/useEventView.ts`)

```typescript
// On event detail page:
useEventView({ eventId, referrer: "search" })
```

**Flow:**
1. Mount → wait 3s (filters bounces) → POST session start
2. Unmount / beforeunload → `navigator.sendBeacon` → PATCH duration
3. Falls back to `fetch({ keepalive: true })` for older browsers

---

### 6. TagInput Component (`components/tags/TagInput.tsx`)

- Debounced autocomplete (200ms) sourced from `/api/tags?q=`
- Keyboard nav: ↑↓ arrows, Enter/comma to add, Backspace to delete last
- Inline tag creation ("Create 'new-tag'" option)
- Removable chip display, maxTags limit

---

### 7. Admin Preference Export Schema (for AI microservice)

The `/api/admin/export/preferences` endpoint returns per-user aggregated signals:
```json
{
  "userId": "...",
  "categoryFrequency": { "cat-id": 3.3 },
  "industryFrequency": { "ind-id": 2.6 },
  "eventTypeFrequency": { "ONLINE": 2 },
  "avgViewDuration": 87,
  "totalViews": 5,
  "attendedCount": 2,
  "cancelledCount": 0
}
```
Participation = 1.0 weight, view = 0.3 weight (engagement signal weighting).

---

## TypeScript Verification

```
npx tsc --noEmit  →  0 new errors introduced by Phase 5
```

Pre-existing errors (4, unchanged since Phase 1–3): `__tests__/sample.test.ts`, `api/organizations/route.ts`, `Navbar.tsx`, `data/two-factor-token.ts`

> **Note:** IDE shows stale Prisma type errors for new models (`eventView`, `orgInteraction`, `tag`, etc.) — these are TS Language Server cache artifacts. `tsc --noEmit` confirms they compile correctly. Do `Ctrl+Shift+P → TypeScript: Restart TS Server` to clear.
