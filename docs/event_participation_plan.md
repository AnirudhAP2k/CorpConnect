# Phase 3: Participation Flow - Implementation Plan

The backend data layer (`data/event-participation.ts`) and server actions (`actions/event-participation.actions.ts`) are **already complete**. This plan focuses on the missing UI and API routes.

---

## What Already Exists ✅
- `createEventParticipation` — join with capacity/duplicate checks
- `cancelEventParticipation` — cancel with ownership check
- `getEventParticipants` — host-gated participant list
- `getUserParticipations` — personal history
- `getOrganizationParticipations` — org history
- `checkEventParticipation` — participation status check
- All wrapped in server actions in `event-participation.actions.ts`

## What's Missing ❌
- `/api/events/[id]/participate` API route (event detail page points here but it doesn't exist)
- `JoinEventButton` client component (currently raw HTML form)
- `CancelParticipationButton` client component
- Participants panel on event detail page (host view)
- User participation history page
- "Save event for later" feature (schema doesn't have this yet — will use a lightweight approach)

---

## Proposed Changes

### API Layer

#### [NEW] app/api/events/[id]/participate/route.ts
- **POST** — Join event (calls `createEventParticipation`)
- **DELETE** — Cancel participation (calls `cancelEventParticipation`)
- Returns JSON for mobile-first compatibility

---

### Client Components

#### [NEW] components/shared/JoinEventButton.tsx
- Client component with loading state
- Calls `POST /api/events/[id]/participate` with `organizationId` from active org
- Shows "Join Event" / "Event Full" / "Login to Join" states
- Refreshes router on success

#### [NEW] components/shared/CancelParticipationButton.tsx
- Client component with confirmation dialog
- Calls `DELETE /api/events/[id]/participate`
- Shows loading state, error handling
- Redirects/refreshes on success

#### [NEW] components/shared/EventParticipantsPanel.tsx
- Shows participant list (visible to host + registered attendees)
- Displays org logo, name, user name
- Status badges (REGISTERED / ATTENDED)
- Mark as attended button (host only)

---

### Pages

#### [MODIFY] app/(protected)/events/[id]/page.tsx
- Replace raw HTML forms with `JoinEventButton` and `CancelParticipationButton`
- Replace inline attendees section with `EventParticipantsPanel`
- Add `DeleteEventDialog` back (was removed by user earlier)
- Pass `activeOrganizationId` to `JoinEventButton`

#### [NEW] app/(protected)/my-events/page.tsx
- User's participation history with tabs: **Upcoming** | **Past** | **Cancelled**
- Uses `getUserParticipations` server action
- Shows event cards with status badges
- Cancel button for upcoming events

#### [NEW] app/(protected)/organizations/[id]/participants/page.tsx
- Org's participation history (events they attended)
- Uses `getOrganizationParticipations`
- Tabs: **Upcoming** | **Past**

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — TypeScript check

### Manual
1. Join a free public event → badge shows "You're Registered"
2. Cancel registration → badge disappears, count decrements
3. Try joining own org's event → error shown
4. Try joining full event → "Event Full" shown
5. Host views participants panel → sees attendee list
6. Visit `/my-events` → see participation history
7. API endpoints return JSON (curl test)
