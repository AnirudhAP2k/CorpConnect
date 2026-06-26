# CorpConnect B2B Platform - Core Features Implementation

## Phase 1: Organization Module ✅
- [x] Organization onboarding flow
  - [x] Create onboarding page after user registration
  - [x] Build organization creation form (name, industry, description, location, size)
  - [x] Auto-assign creator as OWNER role (handled in data layer)
  - [x] Redirect to dashboard after org creation
  - [x] Update middleware to force onboarding
- [x] Organization management
  - [x] Organization profile page
  - [x] Edit organization details
  - [x] Upload organization logo (Cloudinary integration exists)
  - [x] View organization members
- [x] Organization membership
  - [x] Invite members to organization (email invites)
  - [x] Accept/decline invitations
  - [x] Manage member roles (OWNER, ADMIN, MEMBER)
  - [x] Remove members from organization
- [x] Organization switcher
  - [x] Display current active organization in navbar
  - [x] Dropdown to switch between user's organizations
  - [x] Store active org in database (activeOrganizationId)
  - [x] Update context when switching orgs

## Phase 2: Event Module ✅
- [x] Event creation
  - [x] Create event form (title, description, date, location)
  - [x] Event type selection (online/offline/hybrid)
  - [x] Event visibility (public/private/invite-only)
  - [x] Category selection
  - [x] Image upload for events
  - [x] Link event to active organization
  - [x] Capacity limit (maxAttendees)
- [x] Event listing & discovery
  - [x] Public events listing page
  - [x] Filter by category, date, location
  - [x] Search events by title/description
  - [x] Event detail page
  - [x] My organization's events page
- [x] Event management
  - [x] Edit event details
  - [x] Delete events with confirmation
  - [x] View event participants (EventParticipantsPanel)
  - [ ] Event analytics (basic view count)

## Phase 3: Participation Flow ✅
- [x] Event participation
  - [x] Join/RSVP to events (JoinEventButton + /api/events/[id]/participate POST)
  - [ ] Save event for later (requires new DB table — deferred)
  - [x] Cancel participation (CancelParticipationButton + DELETE endpoint)
  - [x] Participation history for users (/my-events page with tabs)
  - [ ] Participation history for organizations (org events page covers attending tab)
- [x] Event interactions
  - [x] Track which orgs attended which events (organizationId on EventParticipation)
  - [ ] Build relationship graph data
  - [x] Store participation metadata (timestamp, status, registeredAt, attendedAt)

## Phase 4: Dashboards ✅
- [x] Schema update
  - [x] Add `isAppAdmin` boolean to User model (applied via `prisma db push`)
- [x] Organization dashboard (/organizations/[id]/dashboard)
  - [x] Stats header: events hosted, events attending, members, revenue
  - [x] Upcoming hosted events list
  - [x] Upcoming attending events list
  - [x] Recent activity feed (participations across org's events)
  - [x] Revenue widget (sum of EventParticipation.totalAmount)
  - [x] AI-ready placeholder panel (smart recommendations — Phase 7)
- [x] User dashboard upgrade (/dashboard)
  - [x] Replace static zeros with live getUserDashboardStats()
  - [x] Upcoming events list (first 5)
  - [x] Recommended events (same-industry events not yet joined)
  - [x] Organizations panel with dashboard quick-links
  - [x] Admin console button for isAppAdmin users
- [x] Admin dashboard (/admin/*)
  - [x] isAppAdmin gate in layout (redirect non-admins to /dashboard)
  - [x] Admin layout with sidebar navigation
  - [x] Overview page: platform stats (users, orgs, events, participations)
  - [x] Revenue overview: platform-wide totals by org and by month
  - [x] Organizations list page (paginated, searchable)
  - [x] Users list page (paginated, searchable, with org membership + admin badge)
  - [x] Events list page (platform-wide, with type/visibility badges)
  - [x] Job queue health page (status counts, error messages)
  - [x] AI integration placeholder
- [x] Shared components
  - [x] StatCard component (stat card with icon and optional trend)
  - [x] EventRow component (compact event list item)
  - [x] RevenueWidget component (bar chart + top items)
- [x] Auth updates
  - [x] isAppAdmin persisted in JWT token and session
  - [x] next-auth.d.ts ExtendedUser type updated

## Phase 5: Data Collection for Future AI ✅
- [x] Analytics tracking
  - [x] Track event views (viewCount + EventView table per session)
  - [x] Track event views with engagement (durationSeconds, referrer, sessionId)
  - [x] Track event joins (already tracked via EventParticipation)
  - [x] Track organization interactions (OrgInteraction table — auto-populated on participation)
  - [x] Store industry and category preference data per user (via /api/admin/export/preferences)
- [x] Prepare for embeddings
  - [x] Ensure rich descriptions for orgs (description field exists on Organization)
  - [x] Ensure rich descriptions for events (description field exists on Events)
  - [x] Tag system for events and orgs (Tag, EventTag, OrgTag tables + API routes)
- [x] Data export endpoints
  - [x] Export event participation data as structured JSON (/api/admin/export/participations)
  - [x] Export organization interaction graph (/api/admin/export/interactions)
  - [x] Export per-user preference signals (/api/admin/export/preferences)
- [x] Client-side tracking
  - [x] useEventView hook (sessionId, durationSeconds via sendBeacon, referrer)
- [x] UI
  - [x] TagInput component (autocomplete, keyboard nav, chip display)

## Phase 6: Payment Gateway Integration 💳 ✅

### Database Schema ✅
- [x] Added `paymentMode` (EventPaymentMode), `currency`, `externalPayUrl` to `Events`
- [x] Added `stripeCustomerId`, `razorpayCustomerId`, `subscriptionPlan`, `subscriptionStatus`, `subscriptionExpiresAt`, `paymentWebhookUrl`, `preferredCurrency` to `Organization`
- [x] New model: `OrgSubscription` (billing history per provider)
- [x] New model: `EventPayment` (per-event payment record linked to `EventParticipation`)
- [x] New enums: `PaymentProvider`, `SubscriptionPlan`, `SubscriptionStatus`, `EventPaymentMode`, `PaymentStatus`
- [x] Added `PENDING_PAYMENT` to `ParticipationStatus`
- [x] Added `SEND_PAYMENT_RECEIPT`, `ORG_WEBHOOK_DELIVERY`, `PROCESS_REFUND` to `JobType`
- [x] `prisma db push` applied — Prisma client regenerated

### Billing API Routes ✅
- [x] `POST /api/billing/subscribe` — Stripe Checkout / Razorpay subscription order
- [x] `POST /api/billing/portal` — Stripe Customer Portal session
- [x] `GET /api/billing/status` — org's current plan + status

### Webhook Handlers ✅
- [x] `POST /api/webhooks/stripe` — handles checkout.session.completed, invoice events, subscription deletion, payment_intent.succeeded
- [x] `POST /api/webhooks/razorpay` — handles subscription.activated, subscription.cancelled, payment.captured

### Event Payment Flow ✅
- [x] `POST /api/events/[id]/checkout` — creates Stripe Checkout or Razorpay Order for PLATFORM events; handles all 3 modes
- [x] `POST /api/events/[id]/payment-verify` — belt-and-suspenders post-redirect verification
- [x] Modified `POST /api/events/[id]/participate` — enforces all 4 abuse-prevention layers

### Abuse Prevention ✅
- [x] Layer 1: PLATFORM/EXTERNAL blocked with 402 for FREE tier orgs
- [x] Layer 2: 50-attendee cap per event enforced for FREE org hosts
- [x] Layer 3: 2% (PRO) / 1% (ENTERPRISE) platform fee applied at checkout creation
- [x] Layer 4: `isVerified = true` required for paid event modes

### Org Webhook Delivery ✅
- [x] `lib/jobs/org-webhook-delivery.ts` — HMAC-SHA256 signed POST to org's `paymentWebhookUrl`
- [x] `lib/jobs/payment-receipt.ts` — receipt email after payment success
- [x] Both wired into `job-processor.ts`

### UI Components ✅
- [x] `components/billing/PricingPlans.tsx` — FREE/PRO/ENTERPRISE cards, monthly/yearly toggle, Stripe/Razorpay picker
- [x] `components/billing/ProviderPicker.tsx` — checkout provider modal for event registration
- [x] `app/(protected)/billing/page.tsx` — billing management page (plan, metrics, history)

### Infrastructure ✅
- [x] `lib/payment/stripe.ts` — Stripe singleton + price ID map + fee constants
- [x] `lib/payment/razorpay.ts` — Razorpay singleton
- [x] `npm install stripe razorpay`
- [x] `docs/phase6_env_vars.md` — all required env vars documented

## Phase 7: AI Microservice Integration 🤖 ✅
> Python/FastAPI service at `ai-service/`. Same PostgreSQL DB + pgvector. Multi-tenant auth.
- [x] pgvector extension enabled (`scripts/enable-pgvector.ts`)
- [x] `embedding vector(384)` on Events + Organization
- [x] `ApiCredential` model (tenantId, apiKey bcrypt-hashed, tier FREE/PRO/ENTERPRISE, usage tracking)
- [x] `EMBED_EVENT` + `EMBED_ORG` in JobType enum
- [x] Full Python scaffold: main.py, config, database.py (asyncpg pool), embeddings.py (all-MiniLM-L6-v2), cache.py (Redis + fallback), auth middleware (master JWT + bcrypt tenant key + tier gating)
- [x] Routers: POST /embed/event, POST /embed/org, GET /recommend/events/{userId}, GET /recommend/orgs/{orgId}, POST /search/semantic
- [x] `lib/ai-service.ts` — typed HTTP client, 5s timeout, graceful fallback
- [x] Proxy routes: GET /api/ai/recommend, POST /api/ai/search
- [x] `app/api/organizations/[id]/api-credentials` — OWNER-only key management (bcrypt, shown once)
- [x] Embed job triggers on event create + org create/update

## Phase 8: B2B Differentiation 🤝 *(Current focus — see docs/phase8_implementation_plan.md)*
> Transform from an event management tool into a genuine B2B networking graph.
> Based on competitive analysis vs Luma/Eventbrite — see docs/b2b_platform_differentiation.md.

### 8.1 Organization Discovery ✅
- [x] "Discover Organizations" browse page (`/organizations/discover`) with filters (industry, size, location, tags)
  - [x] SSR Server Component with ISR (`revalidate = 300`) for filter options
  - [x] `OrgResults` nested async SC streamed via Suspense with skeleton fallback
  - [x] URL-searchParam driven filters (shareable/bookmarkable) — `OrgDiscoverFilters` client component
  - [x] Paginated via `<a>` links (no client JS needed)
- [x] `GET /api/organizations/discover` route — keyword, industry, size, location, tag filters; verified orgs sorted first
- [x] `OrgCard` Server Component — logo, verified badge, industry, tags, member/event counts, location/size
- [x] `OrgCardSkeleton` + `OrgGridSkeleton` components under `components/`
- [x] "Discover Orgs" added to navbar (`constants/index.ts`)

### 8.2 Richer Organization Profiles ✅
- [x] Schema: `services[]`, `technologies[]`, `partnershipInterests[]`, `hiringStatus` (enum), `linkedinUrl`, `twitterUrl` added to `Organization`
- [x] `HiringStatus` enum added (HIRING / NOT_HIRING / OPEN_TO_PARTNERSHIPS)
- [x] `OrganizationCreateSchema` + `OrganizationUpdateSchema` extended with new fields
- [x] `TagArrayInput` client component — free-text chip input (Enter/comma to add, Backspace/× to remove)
- [x] `OrganizationForm` updated — Social Links, Hiring Status, Services, Technologies, Partnership Interests sections
- [x] `app/api/organizations/[id]` PUT handler accepts & saves new fields; embed text enriched with services + technologies
- [x] Org profile page rewritten as SSR Server Component (ISR 60s) — new sections: Services, Technologies, Partnership Interests, Tags, hiring badge, social links, Quick Stats sidebar
- [x] Edit page `initialData` passes all new fields to pre-fill form
- [ ] **[Future]** Public vs private profile sections — toggle per org (e.g. `showMemberList` flag on `Organization` model) to control visibility of member list for non-members; most fields stay public by default for B2B discoverability

### 8.3 Connection Requests Between Orgs ✅
- [x] `OrgConnection` model (sourceOrgId, targetOrgId, status: PENDING/ACCEPTED/DECLINED/WITHDRAWN, message, initiatedByUserId)
- [x] `OrgConnectionStatus` enum added to schema; DB pushed + Prisma client regenerated
- [x] List connections & send request (OWNER/ADMIN only, blocks self-connections and duplicates)
- [x] Accept/decline (target org), withdraw (source org), remove accepted connection
- [x] `ConnectButton` client component — handles all 6 states (NONE/PENDING_SENT/PENDING_RECEIVED/ACCEPTED/DECLINED/WITHDRAWN), send dialog with optional intro message
- [x] SSR connection status lookup on org profile page; ConnectButton shown to non-members only
- [x] `OrgConnectionsPanel` dashboard component — tabbed (Connected / Incoming / Sent) with Accept/Decline/Withdraw/Remove actions
- [x] Dashboard page wires OrgConnectionsPanel with live Prisma data (parallel fetch)
- [x] `Dialog` and `Tabs` shadcn UI components created manually (shadcn CLI blocked by SSL on this machine)
- [x] "Connected organizations" list on org dashboard
- [x] Connection notifications (job queue email) — 4 events: REQUESTED / ACCEPTED / DECLINED / WITHDRAWN
  - `lib/email-templates/connection-notification.ts` — HTML template + send helper
  - `lib/jobs/job-processor.ts` — `processConnectionNotification` handles SEND_NOTIFICATION jobs
  - POST /connections enqueues `CONNECTION_REQUEST`; PATCH enqueues `CONNECTION_ACCEPTED`, `CONNECTION_DECLINED`, or `CONNECTION_WITHDRAWN`
  - Emails sent to all OWNER/ADMIN users of the notified org
- [x] Email audit logging via `EmailLog` table
  - Schema: `EmailLog` model (fromAddress, toAddress, subject, templateType, payload JSON, smtpHost, smtpService, status SENT/FAILED, messageId, errorMessage, durationMs)
  - `lib/mailer.ts` rewritten — every send attempt writes a log row (including SMTP verify failures)
  - `sendMail()` accepts `templateType` and `payload` params; both template helpers pass them through

### 8.4 Pre-Event Org Matchmaking
- [x] `MeetingRequest` model (eventId, senderOrgId, receiverOrgId, proposedTime, agenda, status, initiatedByUserId)
- [x] `MeetingRequestStatus` enum (PENDING / ACCEPTED / DECLINED / CANCELLED)
- [x] `getMatchingOrgsForEvent(eventId, callerOrgId)` — AI-primary (vector similarity) + SQL-overlap fallback
- [x] GET/POST `/api/events/[id]/meeting-requests` — list & send requests
- [x] PATCH/DELETE `/api/events/[id]/meeting-requests/[requestId]` — accept/decline/cancel/delete
- [x] `MeetingRequestButton` component — all 5 states handled inline
- [x] `OrgMatchWidget` component — sidebar card with AI badge, top 5 matched orgs + meeting buttons
- [x] `MeetingRequestsPanel` component — tabbed Incoming/Sent/Confirmed panels
- [x] Meeting email notifications — 4 event types (REQUESTED/ACCEPTED/DECLINED/CANCELLED), `lib/email-templates/meeting-request.ts`
- [x] Event detail page integration — OrgMatchWidget in sidebar, MeetingRequestsPanel in main content, SSR data fetch with parallel calls

### 8.5 Industry Groups / Consortiums
- [x] `IndustryGroup` model (name, industryId, description, createdBy) and related models (`IndustryGroupMember`, `GroupPost`, `IndustryGroupEvent`)
- [x] Group membership for orgs (`data/groups.ts`, `/api/groups/[id]/members`)
- [x] Group feed / shared event calendar API routes
- [x] Create/join/leave group API routes
- [x] Group UI Directory and Details Page components

## Infrastructure & Polish
- [x] Database schema updates
  - [x] Rename Orders to EventParticipation
  - [x] Add User onboarding fields
  - [x] Add Event visibility and type fields
  - [x] Add Organization size and location fields
  - [x] Add participation status tracking
  - [x] Add `isAppAdmin` to User model (Phase 4 ✅)
  - [x] Add pgvector extension (Phase 7 ✅)
  - [x] Add tag system tables (Phase 5 ✅ — Tag, EventTag, OrgTag)
  - [x] Add B2B profile fields to Organization (Phase 8.2 ✅ — services[], technologies[], partnershipInterests[], hiringStatus, linkedinUrl, twitterUrl)
  - [x] Add `HiringStatus` enum (Phase 8.2 ✅)
- [ ] Database optimizations
  - [x] Add necessary indexes
  - [ ] Optimize queries for listings
- [x] Data access layer
  - [x] Organization data layer with security
  - [x] Event participation data layer
  - [x] Dashboard data layer (Phase 4 ✅ — 10 functions in data/dashboard.ts)
- [x] Server actions
  - [x] Organization actions with validation
  - [x] Event participation actions
- [/] UI/UX polish
  - [ ] Responsive design for all pages
  - [x] Loading states (skeleton components — SkeletonCard, OrgCardSkeleton, OrgGridSkeleton)
  - [ ] Error handling
  - [ ] Success notifications
  - [ ] Empty states

## Phase 9: B2B Sidebar Navigation UI 🧭
- [ ] Create `TopHeader.tsx`
  - [ ] Logo + Mobile toggle
  - [ ] Org Switcher + User Dropdown
- [ ] Create `Sidebar.tsx`
  - [ ] Discover, Dashboard, Groups, Events navigation using icons
  - [ ] Dynamic links to active organization profile/dashboard
  - [ ] Admin link conditional rendering
- [ ] Update `app/(protected)/layout.tsx`
  - [ ] Implement flex/grid layout for Sidebar + Main Content
- [ ] Mobile Navigation
  - [ ] Build responsive overlay sheet for small screens

## Phase 10: Business Messaging (Direct Org-to-Org Chat) 💬
> Real-time WebSocket-powered DM system between connected organizations.
> See `docs/phase10_business_messaging_plan.md` for full architecture details.

### 10.1 Infrastructure & Schema ✅
- [x] Added `DirectConversation` + `DirectMessage` models + `DirectMessageStatus` enum to `schema.prisma`
- [x] Added relation fields to `Organization` and `User`
- [ ] **RUN:** `npx prisma db push` in `d:\evently` to apply schema to DB
- [x] Scaffolded `ws-service/` directory (package.json, tsconfig.json, Dockerfile)
- [x] Added `ws-service` service block to `compose.yaml`
- [x] Added `NEXT_PUBLIC_WS_URL`, `WS_PORT` to `.env.example`
- [x] Added `wsToken` field to `Session` type in `next-auth.d.ts`
- [x] Updated `auth.session.ts` — mints short-lived WS token on every session
- [x] Added "Messages" link to `sidebarLinks` in `constants/index.ts`

### 10.2 WebSocket Service ✅
- [x] `ws-service/src/index.ts` — HTTP server + Socket.io + Redis adapter + auth middleware
- [x] `ws-service/src/auth.ts` — JWT verification of WS token using `AUTH_SECRET`
- [x] `ws-service/src/db.ts` — pg pool (same `DATABASE_URL` as Next.js)
- [x] `ws-service/src/rooms.ts` — room naming helpers (`conv:*`, `org:*`)
- [x] `ws-service/src/handlers/message.ts` — `join_conversation`, `send_message`, `mark_read`, `leave_conversation`
- [ ] **RUN:** `npm install` in `d:\evently\ws-service`

### 10.3 REST API Routes ✅
- [x] `GET /api/messaging/conversations` — list with last message + unread count
- [x] `POST /api/messaging/conversations` — create/get thread (connection gate + OWNER/ADMIN check)
- [x] `GET /api/messaging/conversations/[id]/messages` — cursor-based paginated history
- [x] `GET /api/messaging/unread` — global unread count for Navbar badge

### 10.4 Client Hooks ✅
- [x] `hooks/useSocket.ts` — singleton Socket.io connection, reconnects on org change
- [x] `hooks/useConversation.ts` — room join/leave, real-time message state, markRead, loadOlderMessages
- [x] **RUN:** `npm install socket.io-client` in `d:\evently`

### 10.5 UI Components & Pages ✅
- [x] `app/(protected)/messaging/layout.tsx` — two-panel shell
- [x] `app/(protected)/messaging/page.tsx` — empty state when no conversation selected
- [x] `app/(protected)/messaging/[conversationId]/page.tsx` — chat window (SSR initial messages)
- [x] `components/messaging/ConversationList.tsx` — sidebar with last message + unread badge
- [x] `components/messaging/ConversationItem.tsx` — org logo, name, snippet, timestamp
- [x] `components/messaging/ChatWindow.tsx` — main client component using `useConversation`
- [x] `components/messaging/MessageList.tsx` — scrollable bubbles with date separators
- [x] `components/messaging/MessageBubble.tsx` — bubble with sender avatar + read receipt
- [x] `components/messaging/MessageInput.tsx` — textarea (Enter = send, Shift+Enter = newline)
- [x] `components/messaging/StartConversationButton.tsx` — on org profile, calls POST conversations
- [x] `components/messaging/UnreadBadge.tsx` — Navbar badge polling `/api/messaging/unread`

### 10.6 Polish & Testing
- [x] Loading skeletons for ConversationList and MessageList (`MessagingSkeletons.tsx`)
- [x] Empty state for /messaging (no conversations yet + CTA to connect with orgs)
- [x] Disconnected banner ("Reconnecting…") when socket drops
- [ ] Mobile-responsive two-panel layout
- [ ] Integration test: two org sessions exchange messages in real time

---

## Phase 11: Organization Role Governance 🛡️
> Enforce exactly 1 Owner and a maximum of 5 Admins per organization.
> See `docs/enterprise_features_implementation_plan.md` § 4 for full context.

### 11.1 Server Action Constraints (`domain/organizations/actions.ts`)
- [x] Block direct promotion to `OWNER` if an owner already exists
- [x] Block `ADMIN` promotion if admin count >= 5
- [x] Implement `transferOrganizationOwnershipAction` (atomic: demote current owner → ADMIN, promote target → OWNER)

### 11.2 REST API Alignment (`app/api/organizations/[id]/members/[memberId]/route.ts`)
- [x] Enforce Owner uniqueness and Admin cap (≤5) in PUT handler
- [x] Prevent direct OWNER assignment via API (must use Transfer Ownership action)

---

## Phase 12: Enterprise Group Messaging 💬
> WhatsApp-style group chat for Enterprise-subscribed organizations only.
> Invitation-based membership (no direct adds).
> See `docs/enterprise_features_implementation_plan.md` for architecture.

### 12.1 Database Schema
- [x] Add `GroupConversation` model
- [x] Add `GroupMember` model (with `lastReadMessageId` for unread tracking)
- [x] Add `GroupInvite` model
- [x] Add `GroupMessage` model
- [x] Add `GroupMemberRole` enum (`OWNER`, `ADMIN`, `MEMBER`)
- [x] Add `GroupInviteStatus` enum (`PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`)
- [x] Run `npx prisma db push` & regenerate Prisma client

### 12.2 WebSocket Service Extension (`ws-service`)
- [x] Add `group:${groupId}` room structure to `ws-service/src/rooms.ts`
- [x] Create `ws-service/src/handlers/group-message.ts` — `join_group`, `send_group_message`, `mark_group_read`, `leave_group`, `group_typing`
- [x] Add Enterprise subscription gate in socket auth middleware
- [x] Wire group handlers into `ws-service/src/index.ts`

### 12.3 Domain Layer (`domain/messaging/`)
- [x] Create `domain/messaging/actions.ts` — `createGroupAction`, `inviteToGroupAction`, `acceptGroupInviteAction`, `rejectGroupInviteAction`, `leaveGroupAction`
- [x] Create `domain/messaging/queries.ts` — `getGroupsForUser`, `getGroupMessages`, `getPendingGroupInvites`
- [x] Create `domain/messaging/types.ts`
- [x] Create `domain/messaging/index.ts` (public API)

### 12.4 REST API Routes
- [x] `POST /api/messaging/groups` — create a group (ENTERPRISE gate)
- [x] `GET /api/messaging/groups` — list user's groups
- [x] `POST /api/messaging/groups/[id]/invitations` — send invite (ENTERPRISE gate on invitee org)
- [x] `POST /api/messaging/groups/invitations/[inviteId]/accept`
- [x] `POST /api/messaging/groups/invitations/[inviteId]/reject`

### 12.5 UI Components & Pages
- [x] Update `app/(protected)/messaging/layout.tsx` — add Group Chat section to sidebar
- [x] Create `app/(protected)/messaging/groups/[groupId]/page.tsx` — group chat window
- [x] Create `components/messaging/GroupConversationList.tsx`
- [x] Create `components/messaging/GroupChatWindow.tsx`
- [x] Create `components/messaging/GroupMembersPanel.tsx`
- [x] Create `components/messaging/GroupMessageBubble.tsx`
- [x] Create `hooks/useGroupConversation.ts` — mirrors `useConversation.ts` for group rooms

---

## Phase 13: AI Event Brainstorming Assistant & Pitching Flow 🤖
> Enterprise members brainstorm event ideas with an AI bot, then pitch them to their org admin.
> See `docs/enterprise_features_implementation_plan.md` for full flow diagram.

### 13.1 Database Schema
- [x] Add `EventPitch` model
- [x] Add `PitchStatus` enum (`DRAFT`, `PITCHED`, `IN_REVIEW`, `REVISION_REQUESTED`, `APPROVED`, `REJECTED`)
- [x] Run `npx prisma db push` & regenerate Prisma client

### 13.2 AI Service Extension (`ai-service`)
- [x] Create `ai-service/app/routers/brainstorm.py` — `POST /chat/brainstorm/message` + `/brief`
- [x] Design specialized brainstorm system prompt (extracts title, agenda, budget, audience from chat history)
- [x] Return structured JSON brief + `aiBrief` markdown
- [x] Register router in `ai-service/main.py`

### 13.3 TypeScript AI Client (`lib/ai-service.ts`)
- [x] Add `chatBrainstorm(...)` and `chatBrainstormBrief(...)` wrapper methods + `AIEventBrief` / `AIChatBrainstormBriefResponse` types

### 13.4 Domain Layer (`domain/pitches/`)
- [x] Create `domain/pitches/actions.ts` — `createPitchAction`, `submitPitchAction`, `updatePitchAction`, `reviewPitchAction`
- [x] Create `domain/pitches/queries.ts` — `getPitchesByOrg`, `getPitchesByMember`, `getPitchById`, `countPendingPitches`
- [x] Create `domain/pitches/types.ts`
- [x] Create `domain/pitches/validation.ts`
- [x] Create `domain/pitches/index.ts`

### 13.5 UI Components & Pages
- [x] Create `app/(protected)/organizations/[id]/ai-planner/page.tsx` — brainstorm chat interface (Enterprise gate)
- [x] Create `components/organizations/BrainstormChat.tsx` — multi-turn chat UI with generate-brief CTA
- [x] Create `components/organizations/PitchBriefModal.tsx` — editable brief popup before submission
- [x] Create `components/dashboard/MemberPitchCard.tsx` — pitch status card on member dashboard
- [x] Create `components/dashboard/AdminPitchReview.tsx` — admin pitch review panel on org dashboard
- [x] Create `app/api/ai/brainstorm/message/route.ts` + `/brief/route.ts` — server-side proxy routes
- [x] Wire pitch status notifications via `domain/notifications`

---

## Phase 14: Post-Event Sentiment & Performance Reports 📊
> Automated post-event analytics report for Enterprise-subscribed hosting organizations.
> Sent via email to all Owners + Admins of the hosting org.

### 14.1 Database Schema
- [x] Add `EventReport` model (registrations, attendance, avg rating, sentiment, themes, AI summary)
- [x] Run `npx prisma db push` & regenerate Prisma client

### 14.2 AI Service Extension (`ai-service`)
- [x] Create `POST /analyse/event-summary` endpoint — synthesizes feedback into executive summary (Strengths / Weaknesses / Recommendations)
- [x] Register endpoint in `ai-service/main.py` (reused existing `analyse` router prefix)

### 14.3 TypeScript AI Client (`lib/ai-service.ts`)
- [x] Add `generateEventSummary(...)` wrapper method + `AIEventSummaryRequest` / `AIEventSummaryResult` types

### 14.4 Report Generation Job (`lib/jobs/report-generator.ts`)
- [x] Implement `processEventReport(payload: { eventId: string })`:
  - [x] Aggregate `EventParticipation` counts (registrations, attendance rate)
  - [x] Aggregate `EventView` count + average `durationSeconds`
  - [x] Aggregate `EventFeedback` sentiment scores and rating distribution
  - [x] Call AI service for executive summary
  - [x] Write `EventReport` record
  - [x] Email report to all OWNER + ADMIN members of the hosting org
- [x] Wire `GENERATE_REPORT` case in `lib/jobs/job-processor.ts`
- [x] Add `scheduleEventReport()` helper in `lib/scheduler/cron-jobs.ts` (enqueues job at `event.endDateTime + 24h`)

### 14.5 Email Template (`lib/email-templates/event-report.ts`)
- [x] Create HTML email template: event title, date, summary metrics, AI executive summary

### 14.6 UI — Reports Page
- [x] Create `app/(protected)/events/[id]/report/page.tsx`
- [x] Display sentiment donut/bar chart (positive/neutral/negative distribution)
- [x] Display attendance rate
- [x] Display average watch time
- [x] Display top themes tags
- [x] Display AI executive summary
- [x] Enterprise paywall overlay for Free/Pro orgs

---

## Phase 15: Enterprise Vertical Hardening 🔐 ✅
> Cross-cutting concerns for all Enterprise features.

- [x] Middleware guard: create `lib/enterprise.ts` — `requireEnterprise`, `checkEnterprise`, `isEnterpriseOrg` helpers (also checks `subscriptionStatus` ACTIVE/TRIALING)
- [x] Apply guard to all Enterprise API routes (Groups via `assertEnterpriseSubscription`, AI brainstorm message + brief routes via `checkEnterprise`)
- [x] Apply guard to AI service initialization (`/api/ai/brainstorm/brief` + `/message`)
- [x] Add `EnterpriseGate` client component (`components/shared/EnterpriseGate.tsx`) — full paywall + blur overlay modes
- [x] Refactor `domain/pitches/actions.ts` — local `assertEnterprise` now delegates to `isEnterpriseOrg`
- [x] Refactor `domain/messaging/queries.ts` — local `assertEnterpriseSubscription` now delegates to `checkEnterprise`
- [x] Refactor `ai-planner/page.tsx` — replaced 18-line custom paywall with `requireEnterprise` redirect
- [x] Refactor `events/[id]/report/page.tsx` — replaced custom paywall with `<EnterpriseGate>` component
- [ ] Billing page: add Enterprise feature list to plan comparison cards

---

## Phase 16: Antigravity Premium Recommendations (Backlog) 💡
> Additional high-value Enterprise features proposed for future sprints.

- [ ] **AI Synergy Matchmaker**: In-group "Generate Synergy Matrix" button — cross-org doc embedding analysis
- [x] **Automated Event Tasklist**: On pitch approval, LLM generates operational milestone checklist
  - [x] `EventTask` model in schema + `GENERATE_TASKLIST` JobType enum
  - [x] `POST /chat/brainstorm/tasklist` endpoint in AI service (LLM + 15-task deterministic fallback)
  - [x] `lib/ai-service.ts` — `generateEventTasklist()` method + `AIEventTasklist*` types
  - [x] `lib/jobs/tasklist-generator.ts` — idempotent job handler
  - [x] `lib/jobs/job-processor.ts` — `GENERATE_TASKLIST` case wired
  - [x] `domain/pitches/actions.ts` — enqueue on `APPROVED` with payload-based dedup
  - [x] `app/.../pitches/[pitchId]/tasks/page.tsx` — phase-grouped checklist UI with progress bar
- [ ] **White-Labeled Emails**: Enterprise orgs inject custom branding into all outgoing system emails

---

## Phase 17: External Event Invitation Flow (Viral loop user acquisition) 🚀
> Allow event hosts to invite external participants (users without accounts) to events, driving viral signup and onboarding.
> See `docs/external_event_invitation_plan.md` for full context.

- [ ] **Database Schema Expansion**
  - [ ] Add `EventInvite` model in `schema.prisma`
  - [ ] Run `npx prisma db push` to synchronize database
- [ ] **Domain Layer Implementation (`domain/events`)**
  - [ ] Add Zod validation schema in `validation.ts`
  - [ ] Add `getEventInviteByToken` query in `queries.ts`
  - [ ] Add `sendEventInvitesAction` server action in `actions.ts`
- [ ] **Background Job Queue Integration**
  - [ ] Add `SEND_EVENT_INVITE_EMAIL` to the `JobType` enum in schema
  - [ ] Create `processEventInviteEmail` worker in `lib/jobs/event-invites.ts`
  - [ ] Register worker in `job-processor.ts`
- [ ] **Public Route & Auto-Registration Hook**
  - [ ] Build `/events/invite/[token]` public page to validate invite links
  - [ ] Enforce login/registration redirect retaining the return token URL
  - [ ] Implement atomic db transaction to register user for event and mark invite accepted
- [ ] **UI Component Integration**
  - [ ] Add an "Invite Guests" button/modal to the Event Detail page layout
  - [ ] Leverage Server Actions with `useTransition` to process invite emails

## Phase 18: Application Monitoring & Observability (Sentry) 🛡️
> Integrate Sentry SDKs to monitor errors, exceptions, and performance bottlenecks across Next.js and the Python AI Service.
> See `docs/monitoring_observability_implementation_plan.md` for full context.

- [/] **Next.js SDK Setup**
  - [x] Install `@sentry/nextjs` dependency
  - [x] Create Sentry initialization files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`)
  - [x] Wrap Next.js configuration in `next.config.ts` with `withSentryConfig`
- [/] **Python/FastAPI SDK Setup**
  - [x] Add `sentry-sdk[fastapi]` to `ai-service/requirements.txt`
  - [x] Initialize Sentry in `ai-service/main.py`
- [/] **Environment Configuration**
  - [x] Document Sentry env vars in `.env.example` and `ai-service/.env.example`
  - [x] Configure `SENTRY_DSN` in local `.env` files
- [ ] **Verification & Validation**
  - [ ] Trigger test errors on client and server runtimes to verify capturing
  - [ ] Verify that source maps upload correctly on production builds

