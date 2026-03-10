# Evently B2B Platform - Core Features Implementation

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

## Phase 6: Payment Gateway Integration 💳 *(Deferred — see docs/phase6_implementation_plan.md)*
> Integration with Stripe (international) + Razorpay (India) for org subscriptions and event payments.
> **Full plan documented.** Resuming after B2B differentiation (Phase 8) is complete.

### Key Design Decisions (Locked)
- **Dual provider**: Razorpay (UPI/INR) + Stripe (international) — user picks at checkout
- **Org subscription tiers**: FREE / PRO / ENTERPRISE
- **Event payment modes**: FREE (no change) / PLATFORM (app collects) / EXTERNAL (org's own link)
- **Org webhook delivery**: Platform signs + POSTs payment events to org's configured URL
- **Abuse prevention (4 layers)**:
  - Layer 1: Paid event modes blocked for FREE tier orgs (API returns 402)
  - Layer 2: FREE tier limits — max 3 active public events, max 50 attendees/event
  - Layer 3: Platform fee on PLATFORM payments — 2% (PRO), 1% (ENTERPRISE)
  - Layer 4: `isVerified = true` required to create paid events

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

