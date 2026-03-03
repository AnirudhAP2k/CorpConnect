# Phase 8: B2B Differentiation

## Goal

Shift the user experience from "event management tool" to "B2B networking graph." Based on competitive analysis: Eventbrite and Luma are event-first; Evently's differentiator is **organization-first networking with AI-powered relationship discovery**.

> Events should act as a catalyst for connections, not the main product.

## Current Gap (Honest Assessment)

| Differentiator | Designed | Schema Ready | UI Exists |
|---|---|---|---|
| Organization profiles | ✅ | ✅ | Basic only |
| Org discovery / browse | ✅ | ✅ | ❌ None |
| Org-to-org connections | ✅ | ❌ | ❌ |
| Richer org profiles | ✅ | ❌ | ❌ |
| Pre-event matchmaking | ✅ | ❌ | ❌ |
| Industry groups | ✅ | ❌ | ❌ |
| AI recommendations | ✅ | ✅ (Phase 7) | ❌ Wired but no UI |

Delivery priority: **1 → 2 → 3 → 4 → 5** (lowest effort, highest differentiating impact first).

---

## Pillar 1: Organization Discovery Page *(Highest priority — changes the product narrative)*

### What it replaces
Currently there is no way to browse organizations. Users can only find orgs by navigating to an event and seeing who hosted it.

### Schema changes
None required — `Organization`, `Industry`, `OrgTag`, `Tag` already have everything needed.

### [NEW] [app/(protected)/organizations/page.tsx](file:///d:/evently/app/(protected)/organizations/page.tsx)
Public browse page for organizations with:
- **Filter sidebar**: industry, org size, location (text), tags
- **Search bar**: keyword search on name + description
- **AI toggle**: "Show AI-recommended orgs" (calls `/api/ai/recommend?type=orgs`, falls back to DB browse if AI unavailable)
- **Org cards**: logo, name, industry, size, tag chips, "View Profile" CTA, connection status badge

### [NEW] [app/api/organizations/discover/route.ts](file:///d:/evently/app/api/organizations/discover/route.ts)
`GET /api/organizations/discover?industry=&size=&location=&tags=&q=&page=&limit=`
Paginated org list (server-side filtering). Excludes the user's own orgs.

### [NEW] [components/organizations/OrgCard.tsx](file:///d:/evently/components/organizations/OrgCard.tsx)
Reusable org card showing: logo, name, industry badge, size, top 3 tags, member count, event count, connection status (if connected / pending / none).

### [MODIFY] Navbar / sidebar
Add "Discover" link pointing to `/organizations`.

---

## Pillar 2: Richer Organization Profiles

### Schema changes

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)
Add to `Organization`:
```prisma
services            String[]              // e.g. ["Cloud Infrastructure", "DevOps"]
technologies        String[]              // e.g. ["Kubernetes", "React", "Python"]
partnershipInterests String[]             // e.g. ["Co-marketing", "Joint events", "Investment"]
hiringStatus        HiringStatus?         @default(NOT_HIRING)
linkedinUrl         String?
twitterUrl          String?
```

New enum:
```prisma
enum HiringStatus { HIRING  NOT_HIRING  OPEN_TO_PARTNERSHIPS }
```

### [MODIFY] [app/(protected)/organizations/[id]/page.tsx](file:///d:/evently/app/(protected)/organizations/%5Bid%5D/page.tsx)
Upgrade org profile with new sections:
- **About** — description + website + social links
- **Services & Technologies** — tag-style chips (use TagInput pattern)
- **Partnership interests** — displayed as interest pills
- **Hiring status** — badge (Hiring / Not Hiring / Open to Partnerships)
- **Events hosted** — existing events list
- **Tags** — existing OrgTag display

### [MODIFY] [app/(protected)/organizations/[id]/edit/page.tsx](file:///d:/evently/app/(protected)/organizations/%5Bid%5D/edit/page.tsx)
Add fields for new profile attributes using the existing TagInput component for `services`, `technologies`, and `partnershipInterests`.

---

## Pillar 3: Org-to-Org Connection Requests

### Schema changes

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)
```prisma
model OrgConnection {
  id             String           @id @default(uuid()) @db.Uuid
  sourceOrgId    String           @db.Uuid
  targetOrgId    String           @db.Uuid
  status         ConnectionStatus @default(PENDING)
  message        String?          // optional intro message
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  sourceOrg      Organization     @relation("ConnectionsInitiated", fields: [sourceOrgId], references: [id], onDelete: Cascade)
  targetOrg      Organization     @relation("ConnectionsReceived",  fields: [targetOrgId],  references: [id], onDelete: Cascade)

  @@unique([sourceOrgId, targetOrgId])
  @@index([targetOrgId, status])
  @@index([sourceOrgId, status])
}

enum ConnectionStatus { PENDING  ACCEPTED  DECLINED  WITHDRAWN }
```

Add to `JobType`: `SEND_CONNECTION_REQUEST_EMAIL`, `SEND_CONNECTION_ACCEPTED_EMAIL`

### API routes

#### [NEW] [app/api/organizations/[id]/connections/route.ts](file:///d:/evently/app/api/organizations/%5Bid%5D/connections/route.ts)
- `GET` — fetch connections for an org (accepted + pending)
- `POST { targetOrgId, message? }` — send connection request (OWNER/ADMIN only)

#### [NEW] [app/api/organizations/[id]/connections/[connectionId]/route.ts](file:///d:/evently/app/api/organizations/%5Bid%5D/connections/%5BconnectionId%5D/route.ts)
- `PATCH { status: "ACCEPTED" | "DECLINED" }` — respond to request (target org OWNER/ADMIN)
- `DELETE` — withdraw request (source org OWNER/ADMIN)

### UI

#### [MODIFY] Org profile page
- "Connect" button (if not connected, not the user's org)
- Shows pending badge if request already sent
- Shows "Connected" badge if accepted
- Opens a small modal with optional intro message

#### [NEW] Connections tab on org dashboard
- Incoming pending requests (Accept / Decline)
- Accepted connections list (with "View Profile" and "Request Meeting" CTAs)
- Sent pending requests (Withdraw)

---

## Pillar 4: Pre-Event Org Matchmaking

### Schema changes

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)
```prisma
model MeetingRequest {
  id             String        @id @default(uuid()) @db.Uuid
  senderOrgId    String        @db.Uuid
  receiverOrgId  String        @db.Uuid
  eventId        String        @db.Uuid
  message        String?
  proposedTime   String?
  status         MeetingStatus @default(PENDING)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  senderOrg      Organization  @relation("MeetingsSent",     fields: [senderOrgId],   references: [id], onDelete: Cascade)
  receiverOrg    Organization  @relation("MeetingsReceived", fields: [receiverOrgId], references: [id], onDelete: Cascade)
  event          Events        @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([senderOrgId, receiverOrgId, eventId])
  @@index([receiverOrgId, status])
}

enum MeetingStatus { PENDING  ACCEPTED  DECLINED }
```

### [NEW] [components/events/AttendeeMatchPanel.tsx](file:///d:/evently/components/events/AttendeeMatchPanel.tsx)
Widget on the event detail page (shown to registered attendees):
- "Orgs attending this event that match your profile" — calls AI recommend filtered by event attendees
- Shows top 3–5 org cards with similarity score
- "Request a meeting" CTA on each card

### [NEW] [app/api/events/[id]/meeting-requests/route.ts](file:///d:/evently/app/api/events/%5Bid%5D/meeting-requests/route.ts)
- `GET` — fetch meeting requests for an org at this event
- `POST { receiverOrgId, message?, proposedTime? }` — send meeting request

---

## Pillar 5: Industry Groups / Consortiums *(Lower priority, implement last)*

### Schema changes

```prisma
model IndustryGroup {
  id          String              @id @default(uuid()) @db.Uuid
  name        String
  description String?
  industryId  String              @db.Uuid
  createdBy   String              @db.Uuid        // orgId
  isPublic    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  industry    Industry            @relation(fields: [industryId], references: [id])
  members     GroupMembership[]
}

model GroupMembership {
  groupId        String        @db.Uuid
  organizationId String        @db.Uuid
  joinedAt       DateTime      @default(now())
  group          IndustryGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@id([groupId, organizationId])
}
```

### Features
- Browse / create groups
- Join / leave groups
- Group page: member list + shared event activity feed
- Suggest joint events to group members

---

## Delivery Order

| Priority | Pillar | Est. Complexity | Impact |
|---|---|---|---|
| 1️⃣ | Org Discovery page | Low — no schema changes | 🔥 Highest — changes the product feel immediately |
| 2️⃣ | Richer org profiles | Medium — schema + UI | High — makes org pages worth visiting |
| 3️⃣ | Connection requests | Medium — new schema + 2 routes | High — adds the "networking graph" intent layer |
| 4️⃣ | Pre-event matchmaking | Medium — new schema + AI wiring | Medium — deepens event value |
| 5️⃣ | Industry groups | High — significant UI | Medium — longer-term network effects |

---

## Verification Plan

```bash
# After Pillar 1
GET /api/organizations/discover?industry=<id>&size=STARTUP
# → returns paginated org list

# After Pillar 2
PUT /api/organizations/<id>  { services: ["SaaS", "Cloud"], technologies: ["React"] }
GET /api/organizations/<id>  → new fields in response

# After Pillar 3
POST /api/organizations/<id>/connections { targetOrgId: "...", message: "Let's connect" }
PATCH /api/organizations/<id>/connections/<cid> { status: "ACCEPTED" }
# → connection email sent via JobQueue

# After Pillar 4
# Register as Org A for an event → AttendeeMatchPanel shows Org B (also registered)
# → Request meeting → Org B receives notification

npx tsc --noEmit   # zero new errors after each pillar
```
