# Phase 8 Pillar 4: Pre-Event Org Matchmaking

Match organizations attending the same event and let them request meetings with each other — turning events into B2B networking opportunities.

## Proposed Changes

---

### Schema & DB

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

Add `MeetingRequest` model and `MeetingRequestStatus` enum:

```prisma
enum MeetingRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}

model MeetingRequest {
  id              String               @id @default(uuid()) @db.Uuid
  eventId         String               @db.Uuid
  senderOrgId     String               @db.Uuid
  receiverOrgId   String               @db.Uuid
  proposedTime    DateTime?            // optional proposed meeting time
  agenda          String?              // optional agenda / message
  status          MeetingRequestStatus @default(PENDING)
  initiatedByUserId String             @db.Uuid
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  event           Events               @relation(...)
  senderOrg       Organization         @relation("SentMeetings", ...)
  receiverOrg     Organization         @relation("ReceivedMeetings", ...)
  initiatedBy     User                 @relation(...)

  @@unique([eventId, senderOrgId, receiverOrgId])
  @@index([eventId])
  @@index([receiverOrgId, status])
  @@index([senderOrgId, status])
}
```

Also add `sentMeetingRequests` / `receivedMeetingRequests` relations to `Organization`  
and `initiatedMeetingRequests` to `User`.

---

### API Routes

#### [NEW] `/api/events/[id]/meeting-requests/route.ts`
- `GET` — list meeting requests for this event (filtered to caller's active org: sent + received)
- `POST` — send a meeting request from caller's active org to another attending org

#### [NEW] `/api/events/[id]/meeting-requests/[requestId]/route.ts`
- `PATCH` — accept / decline / cancel a meeting request
- `DELETE` — remove (sender only, only if PENDING)

---

### Data Layer

#### [MODIFY] [events.ts](file:///d:/evently/data/events.ts)
- `getMatchingOrgsForEvent(eventId, callerOrgId)` — **hybrid matching** function:

```
Primary (AI vector similarity):
  1. Call aiService.recommendOrgs(callerOrgId, limit=20)
  2. Filter returned org IDs to only those registered for this event
     (via EventParticipation.organizationId)
  3. Return top 5 with score + reason from AI response

Fallback (SQL overlap scoring — used when AI service is down or returns empty):
  1. Fetch orgs registered for the event (via EventParticipation)
  2. Score each by overlap with caller org:
     - Same industry: +3 pts
     - Each shared service: +1 pt
     - Each shared technology: +1 pt
     - Each shared partnershipInterest: +1 pt
  3. Return top 5 sorted by score, ties broken by attendeeCount
```

The fallback runs automatically when `aiService.recommendOrgs` returns `[]`.  
Both paths exclude the host org and the caller's own org.

### UI Components

#### [NEW] `components/events/OrgMatchWidget.tsx` *(Server Component)*
- SSR widget rendered inside the event detail sidebar (below "Hosted By")
- Only shown when the viewer has an active org AND is registered for the event
- Fetches `getMatchingOrgsForEvent` data server-side
- Shows up to 5 matching orgs with match tags (shared industry/services/tech)
- Each card has a **"Request Meeting"** button which opens `MeetingRequestButton`

#### [NEW] `components/events/MeetingRequestButton.tsx` *(Client Component)*
- Handles the meeting request flow: opens an AlertDialog to input an optional agenda and proposed time
- Shows current state: NONE / PENDING_SENT / PENDING_RECEIVED / ACCEPTED / DECLINED
- Accept/Decline inline for incoming requests

#### [NEW] `components/events/MeetingRequestsPanel.tsx` *(Client Component)*
- Full panel showing all meeting requests for this event from the perspective of the active org
- Tabs: Incoming / Sent / Confirmed
- Rendered below the attendees panel on the event detail page (only shown to registered attendees)

---

### Email Notifications

#### [MODIFY] [connection-notification.ts](file:///d:/evently/lib/email-templates/connection-notification.ts) → new file: **`meeting-request.ts`**
- `sendMeetingRequestEmail(data)` — 4 event types: REQUESTED / ACCEPTED / DECLINED / CANCELLED
- Linked to the recipient org's dashboard meeting requests view

#### [MODIFY] [job-processor.ts](file:///d:/evently/lib/jobs/job-processor.ts)
- Add `MEETING_REQUEST` notification case within `processJob`

---

### Event Detail Page Integration

#### [MODIFY] [page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)
- Fetch `getMatchingOrgsForEvent` and pending meeting requests server-side (parallel)
- Add `OrgMatchWidget` to sidebar (below "Hosted By", only if registered + has active org)
- Add `MeetingRequestsPanel` to main content area (below attendees panel, registered users only)

---

## Verification Plan

### Automated Checks
```bash
npx tsc --noEmit 2>&1 | Select-String "meeting|OrgMatch|MeetingRequest"
```

### Manual Verification
1. Register as Org A for an event where Org B (with matching services/industry) is also registered
2. Go to the event detail page → sidebar should show Org B in "Orgs at this event"
3. Click "Request Meeting" → AlertDialog with agenda + proposed time → submit
4. Log in as Org B admin → event page should show the incoming request in "Meeting Requests" panel
5. Accept → both orgs see "Confirmed" status
6. Check email inbox for meeting request notifications
