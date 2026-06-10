# Enterprise Tier Feature Suite: Documentation & Implementation Plan 🚀

This document outlines the architecture, database schema changes, service integrations, and implementation phases for the three new Enterprise-tier perks, along with premium suggestions to further elevate the CorpConnect platform.

---

## 1. Architectural Summary & Subscription Gating

All three features are restricted to **Enterprise** subscribers. Gating is enforced at the database level and API router level.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (Client/Server)              │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐                    │
│   │  Group Messaging    │   │  AI Brainstorming   │                    │
│   │  (Socket.io client) │   │  (Server Actions)   │                    │
│   └──────────┬──────────┘   └──────────┬──────────┘                    │
│              │                         │                               │
└──────────────┼─────────────────────────┼───────────────────────────────┘
               │                         │
               ▼                         ▼
┌─────────────────────────┐   ┌──────────────────────────────────────────┐
│   Node.js WS Service    │   │   Python/FastAPI AI Service              │
│   (Socket.io & Redis)   │   │   (LLM, pgvector & Chat History)         │
│                         │   │                                          │
│   - Group rooms         │   │   - Brainstorm Prompt System             │
│   - Enterprise Auth     │   │   - JSON Deep Brief Generator            │
│   - PG message writes   │   │   - Feedback Sentiment & Theme Aggregator│
└──────────────┬──────────┘   └──────────┬───────────────────────────────┘
               │                         │
               ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database (Prisma)                     │
│                                                                        │
│   - GroupConversation / GroupMember / GroupInvite / GroupMessage       │
│   - EventPitch (Draft / Pitched / Approved / Revisions)                │
│   - EventReport (Sentiment score, themes, watchtime, AI summary)       │
└────────────────────────────────────────────────────────────────────────┘
```

### Enforcing Tier Gates
1. **Group Messaging Gate**: Only organizations with `subscriptionPlan === "ENTERPRISE"` can create or join group conversations. All members in a group must belong to an Enterprise organization.
2. **AI Brainstorming Gate**: The AI assistant route will reject the session initialization if the user's active organization is not on the Enterprise plan.
3. **Sentiment Analysis & Analytics Report Gate**: The background job checks if `event.organization.subscriptionPlan === "ENTERPRISE"`. The frontend renders a premium paywall overlay if the hosting org is on the Free or Pro tier.

---

## 2. Database Schema Changes (`prisma/schema.prisma`)

We will add new models to support Group Messaging, Group Invites, Event Pitching, and Post-Event Reports. 

```prisma
// ==========================================
// 1. Group Messaging Models (Enterprise Only)
// ==========================================

model GroupConversation {
  id           String         @id @default(uuid()) @db.Uuid
  name         String
  description  String?
  creatorOrgId String         @db.Uuid
  createdById  String         @db.Uuid
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  creatorOrg   Organization   @relation("GroupCreatorOrg", fields: [creatorOrgId], references: [id], onDelete: Cascade)
  creatorUser  User           @relation("GroupCreatorUser", fields: [createdById], references: [id], onDelete: Cascade)
  members      GroupMember[]
  messages     GroupMessage[]
  invites      GroupInvite[]

  @@index([creatorOrgId])
}

model GroupMember {
  id             String           @id @default(uuid()) @db.Uuid
  groupId        String           @db.Uuid
  orgId          String           @db.Uuid
  userId         String           @db.Uuid
  role           GroupMemberRole  @default(MEMBER)
  joinedAt       DateTime         @default(now())
  lastReadMessageId String?       @db.Uuid // Tracks read message for unread count

  group          GroupConversation @relation(fields: [groupId], references: [id], onDelete: Cascade)
  organization   Organization      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([userId])
  @@index([orgId])
}

enum GroupMemberRole {
  OWNER
  ADMIN
  MEMBER
}

model GroupInvite {
  id             String            @id @default(uuid()) @db.Uuid
  groupId        String            @db.Uuid
  inviterOrgId   String            @db.Uuid
  inviterUserId  String            @db.Uuid
  inviteeOrgId   String            @db.Uuid
  inviteeUserId  String            @db.Uuid
  status         GroupInviteStatus @default(PENDING)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  group          GroupConversation @relation(fields: [groupId], references: [id], onDelete: Cascade)
  inviterOrg     Organization      @relation("GroupInviterOrg", fields: [inviterOrgId], references: [id], onDelete: Cascade)
  inviterUser    User              @relation("GroupInviterUser", fields: [inviterUserId], references: [id])
  inviteeOrg     Organization      @relation("GroupInviteeOrg", fields: [inviteeOrgId], references: [id], onDelete: Cascade)
  inviteeUser    User              @relation("GroupInviteeUser", fields: [inviteeUserId], references: [id], onDelete: Cascade)

  @@unique([groupId, inviteeUserId])
  @@index([inviteeUserId, status])
}

enum GroupInviteStatus {
  PENDING
  ACCEPTED
  REJECTED
  EXPIRED
}

model GroupMessage {
  id             String           @id @default(uuid()) @db.Uuid
  groupId        String           @db.Uuid
  senderOrgId    String           @db.Uuid
  senderUserId   String           @db.Uuid
  content        String           @db.Text
  createdAt      DateTime         @default(now())

  group          GroupConversation @relation(fields: [groupId], references: [id], onDelete: Cascade)
  senderOrg      Organization      @relation(fields: [senderOrgId], references: [id], onDelete: Cascade)
  senderUser     User              @relation(fields: [senderUserId], references: [id])

  @@index([groupId, createdAt])
  @@index([senderOrgId])
}

// ==========================================
// 2. AI Brainstorming & Event Pitching Models
// ==========================================

model EventPitch {
  id              String         @id @default(uuid()) @db.Uuid
  organizationId  String         @db.Uuid
  proposedById    String         @db.Uuid
  title           String
  description     String         @db.Text
  location        String?
  startDateTime   DateTime?
  endDateTime     DateTime?
  estimatedBudget Float?
  targetAudience  String?
  agenda          Json?          // Array of { time: string, title: string, durationMin: number }
  aiBrief         String         @db.Text // Markdown summary generated by AI bot
  status          PitchStatus    @default(DRAFT)
  adminNotes      String?        @db.Text
  eventId         String?        @db.Uuid @unique
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  proposedBy      User           @relation(fields: [proposedById], references: [id], onDelete: Cascade)
  event           Events?        @relation("PitchToEvent", fields: [eventId], references: [id], onDelete: SetNull)

  @@index([organizationId, status])
  @@index([proposedById])
}

enum PitchStatus {
  DRAFT
  PITCHED
  IN_REVIEW
  REVISION_REQUESTED
  APPROVED
  REJECTED
}

// ==========================================
// 3. Post-Event Sentiment & Performance Analytics
// ==========================================

model EventReport {
  id                  String        @id @default(uuid()) @db.Uuid
  eventId             String        @unique @db.Uuid
  totalRegistrations  Int
  totalAttendance     Int
  attendanceRate      Float        // percentage: (attendance / registrations) * 100
  avgDurationSecs     Int?         // average watch time / active presence
  viewsCount          Int          // total event page views
  avgRating           Float?       // average feedback rating (1.0 - 5.0)
  sentimentScore      Float?       // average feedback sentiment (-1.0 to 1.0)
  sentimentDistribution Json        // Object: { positive: number, neutral: number, negative: number }
  topThemes           String[]     // Aggregated most common tags (e.g. ["Speakers", "Networking"])
  aiExecutiveSummary  String        @db.Text // Synthesized executive summary generated by AI
  generatedAt         DateTime      @default(now())

  event               Events        @relation(fields: [eventId], references: [id], onDelete: Cascade)
}
```

---

## 3. Technical Design

### Feature 1: Enterprise Group Messaging (WhatsApp-style)

This extends the dedicated `ws-service/` microservice to support multi-user group chat rooms.

#### 1. WebSocket Channel Mechanics
- **Room structure**: Group chats will be broadcasted to `group:${groupId}`.
- **Verification Gate**: Upon joining a room, the socket server queries PostgreSQL to verify the user is a registered member of `GroupMember` for that group, and that their organization has `subscriptionPlan === "ENTERPRISE"`.
- **Typing Indicator**: Ephemeral event `group_typing` `{ groupId, userId, typing: boolean }` broadcasted without database persistence.
- **Unread Tracking**: When a message is sent to a group:
  - Broadcast `new_group_message` to the room.
  - Compute unread counts on the client using the difference between a message's ID/timestamp and the member's `lastReadMessageId`.
  - When the client opens the group, emit `mark_group_read` `{ groupId }` which updates `lastReadMessageId` in the database to the latest message ID.

#### 2. Group Messaging REST API & Invitation Flow
To keep the application professional, **members of external organizations are not added directly**. Instead, an invitation workflow is implemented:
- `POST /api/messaging/groups`: Creates a group, automatically inserting the creator as a `GroupMember` with `role: OWNER`.
- `POST /api/messaging/groups/[id]/invitations`: Invites another business owner or admin. Creates a `GroupInvite` with status `PENDING`.
- `POST /api/messaging/groups/invitations/[inviteId]/accept`: Invitee accepts the invite. Transitions `GroupInvite.status` to `ACCEPTED`, and inserts a new `GroupMember` record for the user.
- `POST /api/messaging/groups/invitations/[inviteId]/reject`: Transitions status to `REJECTED`.

---

### Feature 2: AI Event Brainstorming Bot & Pitching Flow

Members of Enterprise organizations converse with an AI bot to brainstorm a event idea. When finalized, the bot converts the conversation history into a structured proposal brief which the user can edit in a modal and pitch to their admin.

```
[Member] ── Chat / Brainstorm ──► [Brainstorm Bot] (AI Service)
                                         │
[Member] ◄── Generate proposal brief ────┘ (Invokes /chat/brainstorm/brief)
   │
   ├── Edit Brief inside Modal Popup
   ▼
[Member] ── Submit Pitch ────────► [Postgres (EventPitch)]
                                         │
                                         ├── Notify Admin (WebSocket / In-app notification)
                                         ▼
                                   [Org Admin Dashboard]
                                         │
                     ┌───────────────────┼──────────────────┐
                     ▼                   ▼                  ▼
              [Request Revision]     [Reject]           [Approve]
                     │                                      │
                     └─► Updates Status                     └─► Auto-create Draft Event
```

#### 1. AI Service Extension (`ai-service`)
We will create a new endpoint inside `ai-service/app/routers/chat.py` (or a new file `ai-service/app/routers/brainstorm.py`):
- `POST /chat/brainstorm/brief`:
  - **Inputs**: `sessionId` (the UUID of the chat session) or raw history array.
  - **Model Instruction**: Read the brainstorming chat history, extract event variables, and format them into a JSON payload:
    ```json
    {
      "title": "Cleaned up event title",
      "description": "Engaging description based on brainstorm",
      "location": "Suggested venue or Virtual Room",
      "estimatedBudget": 5000,
      "targetAudience": "Target professionals",
      "agenda": [
        { "time": "10:00 AM", "title": "Opening Note", "durationMin": 30 },
        { "time": "10:30 AM", "title": "Keynote Presentation", "durationMin": 60 }
      ],
      "aiBrief": "## Executive Brief\n...\n## Objectives\n..."
    }
    ```

#### 2. Pitch Status Transitions
- `DRAFT`: Pitch is local to the member.
- `PITCHED`: Submitted to admin. Shows up on admin's review feed.
- `REVISION_REQUESTED`: Admin sent back with review notes. Member can edit and pitch again.
- `APPROVED`: Admin accepted. Next.js triggers `Events.create` using the details, setting `Events.visibility` to `PRIVATE`/`DRAFT`, linked back to the `EventPitch.eventId`.
- `REJECTED`: Declined by admin.

---

### Feature 3: Post-Event Sentiment & Performance Analytics Reports

Automatically aggregates performance metrics and participant feedbacks to generate an interactive and emailable report 24 hours after an event ends.

#### 1. Background Job Execution (`GENERATE_REPORT`)
We will replace the placeholder in `lib/jobs/job-processor.ts`:
1. **Trigger**: When an event's `endDateTime` passes, a cron job checks if the hosting organization has an `ENTERPRISE` plan. If yes, it creates a `GENERATE_REPORT` job queue entry scheduled for `endDateTime + 24 hours` (allowing feedback collection time).
2. **Metrics Fetch**:
   - Total registrations: `EventParticipation.count` where `eventId = X`.
   - Total attendance: `EventParticipation.count` where `eventId = X` and `status === "ATTENDED"`.
   - Average watch time: `VirtualSession.avg(durationSecs)` where session belongs to a virtual room linked to event `X`.
   - Page views: `EventView.count` where `eventId = X`.
3. **Sentiment Aggregation**:
   - Fetch all `EventFeedback` records.
   - Aggregate ratings (average stars) and sentiment scores (average -1.0 to 1.0).
   - Group counts of positive, neutral, and negative feedbacks.
   - Group frequency counts of themes.
4. **AI Summary Generation**:
   - Send all parsed feedback texts to a new AI service endpoint: `POST /analyse/event-summary`.
   - Prompt instructions: Read all feedback and generate a concise executive summary divided into "Strengths", "Weaknesses", and "Direct Recommendations".
5. **Write**: Store in `EventReport` table.
6. **Email Delivery**: Call `mailer.ts` to send the report. To ensure all relevant stakeholders are informed, the email will be broadcast to the **Owner and all active Admins** of the hosting organization (derived by querying `OrganizationMember` with `role: "OWNER" | "ADMIN"`).

---

## 4. Organization Membership Boundaries (Role Validations) 🛡️

To prevent administrative clutter and maintain compliance, we will implement strict checks on organization member roles:
1. **Exactly 1 Owner**:
   - **No Multi-Owner Creation**: A user cannot be promoted to `OWNER` directly if another owner exists. 
   - **Transfer Ownership Action**: A dedicated server action `transferOrganizationOwnershipAction` must be invoked to demote the current owner to `ADMIN` and promote the target user to `OWNER` within a single transactional block.
   - **No Owner Deletion/Demotion**: Prevent demoting or deleting the only owner in `removeOrganizationMemberAction` or user deletion APIs.
2. **Maximum of 5 Admins**:
   - Limit `ADMIN` role members to a maximum of 5.
   - When promoting a user to `ADMIN` (or inviting them as `ADMIN`), verify that `prisma.organizationMember.count({ where: { organizationId, role: "ADMIN" } }) < 5`. Otherwise, reject the action.

---

## 5. Antigravity's Premium Recommendations 💡

To make the Enterprise tier exceptionally attractive, I propose adding the following features:

### Recommendation A: AI Collaborative Synergy Matchmaker (for Groups)
In Enterprise group conversations involving multiple organizations, provide an **AI Synergy Report**.
- **How it works**: The admin can click "Generate Synergy Matrix". The system pulls the corporate documents (`OrgDocument` table) of all participating organizations, computes embeddings, and sends them to the LLM.
- **Output**: A document outlining mutual business goals, technology overlaps, complementary services, and 3 specific joint venture/event themes.

### Recommendation B: Automated Event Setup Tasklist & Checklist
When an event pitch is approved, the AI assistant automatically builds an **Operational Milestone Checklist** (e.g. Booking venue, sending marketing invites, AV check, catering coordination).
- **How it works**: An LLM reads the approved `EventPitch` brief and creates tasks in a workspace board, automatically assigning them to organization members with due dates aligned to the event's start date.

### Recommendation C: White-Labeled Email Layout & Templates
Allow Enterprise organizations to upload branding styles (primary color, logo, and signature name).
- **How it works**: When invitation emails, payment receipts, or post-event reports are sent via the background job queues, the system reads the host organization's custom branding tokens from `Organization.meta` and injects them into the base HTML template wrapper, bypassing default platform branding.

---

## 6. Phased Action Plan

### Phase 1: Database Migration *(Day 1-2)*
- [ ] Add `GroupConversation`, `GroupMember`, `GroupInvite`, `GroupMessage`, `EventPitch`, `EventReport` to `prisma/schema.prisma`.
- [ ] Create `PitchStatus`, `GroupMemberRole`, and `GroupInviteStatus` enums.
- [ ] Run `npx prisma db push` (or create a migration for production) and regenerate client.

### Phase 2: Role Validations (Admin/Owner Limits) *(Day 2)*
- [ ] Refactor `addOrganizationMemberAction` in `domain/organizations/actions.ts` to block promotions to `OWNER` if an owner already exists.
- [ ] Add the check for `ADMIN` limits (< 5) when adding or changing roles.
- [ ] Implement `transferOrganizationOwnershipAction` in `domain/organizations/actions.ts`.
- [ ] Refactor the REST API endpoint `app/api/organizations/[id]/members/[memberId]/route.ts` to match the server action constraints.

### Phase 3: Extend WebSocket Service *(Day 2-3)*
- [ ] Extend `ws-service` package with `send_group_message` and `join_group` socket events.
- [ ] Add verification middleware ensuring all participants are in Enterprise organizations.
- [ ] Integrate group unread tracking (updating `lastReadMessageId` on read marks).
- [ ] Write integrations/tests using two client connections.

### Phase 4: AI Service Brainstorming & Summary Routers *(Day 3-4)*
- [ ] Add `POST /chat/brainstorm/brief` endpoint in python service. Craft a specialized system prompt for brainstorming events.
- [ ] Add `POST /analyse/event-summary` endpoint for feedback synthesis.
- [ ] Write TypeScript client methods in `lib/ai-service.ts`.

### Phase 5: Server Actions & REST API Development *(Day 4-5)*
- [ ] Implement `domain/messaging/actions.ts` and `domain/messaging/queries.ts` for group management & invites.
- [ ] Implement `domain/pitches/actions.ts` (methods: `createPitch`, `submitPitch`, `reviewPitch`).
- [ ] Update `lib/jobs/job-processor.ts` to implement `GENERATE_REPORT` workflow and trigger emails.

### Phase 6: UI & Dashboards Refactoring *(Day 5-7)*
- [ ] **Group Messaging**: Build the Group Sidebar element and `app/(protected)/messaging/group/[groupId]/page.tsx` chat window.
- [ ] **AI Planner**: Build `app/(protected)/organizations/ai-planner/page.tsx` chat panel and the Glassmorphism brief popup.
- [ ] **Dashboard Integration**: Build the Member's pitch feed card, and the Admin's Pitch Review dashboard.
- [ ] **Reports Page**: Create the Event Analytics page showcasing charts (sentiment, registration rate, watch times) and the AI summary. Add the premium paywall gate for Free/Pro users.

---

## 7. File Change Summary

| File | Change Type | Purpose |
|------|-------------|---------|
| `prisma/schema.prisma` | Modify | Add models for Group Chats, Group Invites, Event Pitches, and Event Reports |
| `domain/organizations/actions.ts` | Modify | Implement Owner and Admin role limits; add Transfer Ownership Action |
| `app/api/organizations/[id]/members/[memberId]/route.ts` | Modify | Update membership REST endpoints with the new role limits |
| `ws-service/src/handlers/group-message.ts` | **New file** | WebSocket handlers for group chat events |
| `ws-service/src/index.ts` | Modify | Attach group message handlers and routing |
| `ai-service/app/routers/brainstorm.py` | **New file** | AI endpoint for brainstorming sessions and brief generation |
| `ai-service/main.py` | Modify | Include the new brainstorm router |
| `lib/ai-service.ts` | Modify | Add `chatBrainstormBrief` and `generateEventSummary` client wrappers |
| `lib/jobs/job-processor.ts` | Modify | Implement the report generation job runner |
| `lib/jobs/report-generator.ts` | **New file** | Logic to aggregate metrics, call AI summary, write `EventReport`, and email admins/owners |
| `domain/messaging/actions.ts` | **New file** | Group chat & invite operations (create group, invite user, accept/reject invite) |
| `domain/pitches/actions.ts` | **New file** | Server actions for the event pitching lifecycle |
| `app/(protected)/messaging/layout.tsx` | Modify | Show Enterprise Group Chats alongside Direct Messages |
| `app/(protected)/messaging/group/[groupId]/page.tsx` | **New file** | Group chat window component |
| `app/(protected)/organizations/ai-planner/page.tsx` | **New file** | Brainstorm bot page with chat UI |
| `components/organizations/PitchBriefModal.tsx` | **New file** | Pop-up modal containing the editable event brief details |
| `components/dashboard/MemberPitchCard.tsx` | **New file** | Renders pitch status on member's personal dashboard |
| `components/dashboard/AdminPitchReview.tsx` | **New file** | Admin dashboard panel for event pitch approval/feedback |
| `app/(protected)/events/[id]/report/page.tsx` | **New file** | Sentiment and performance report charts and summary page |
