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

## Phase 5: Data Collection for Future AI 📋
- [ ] Analytics tracking
  - [ ] Track event views (view count on Events model)
  - [ ] Track event joins (already tracked via EventParticipation)
  - [ ] Track organization interactions
  - [ ] Store industry and category preference data per user
- [ ] Prepare for embeddings
  - [ ] Ensure rich descriptions for orgs (prompt users to fill in on onboarding)
  - [ ] Ensure rich descriptions for events
  - [ ] Tag system for events and orgs (new DB table)
- [ ] Data export endpoints
  - [ ] Export event participation data as structured JSON (for AI training)
  - [ ] Export organization interaction graph (org→org connections via shared events)

## Phase 6: Payment Gateway Integration 💳
> Integration with a payment provider (Stripe, Razorpay, or equivalent) for paid events.
- [ ] Select payment provider (Stripe recommended for international; Razorpay for India-first)
- [ ] Add payment fields to Events model (isPaid, price, currency)
- [ ] Create Stripe/Razorpay checkout session on event join
- [ ] Handle webhook for payment confirmation → update EventParticipation.isPaid
- [ ] Revenue reporting in org and admin dashboards (already stubbed out)
- [ ] Refund flow for cancellations (partial or full)
- [ ] Invoice generation (PDF, sent via email through job queue)

## Phase 7: AI Microservice Integration 🤖
> A separate Python/FastAPI microservice for AI-powered features.
> The microservice will be its own repository, deployed independently, and called via REST API from Next.js.

### AI Microservice Capabilities
- [ ] **Smart Event Recommendation** — Recommend events to users based on:
  - User's industry, organization size, past participation history
  - Semantic similarity between event descriptions and user profile
  - Collaborative filtering (users who attended similar events)
- [ ] **Smart Org Connection Recommendation** — Suggest organizations to connect with:
  - Same or adjacent industry
  - Similar organization size
  - Shared event participation history (relationship graph)
- [ ] **Event Summary Generation** — Auto-generate concise summaries for events using LLM
- [ ] **Sentiment Analysis** — Analyze post-event feedback/comments for sentiment
- [ ] **Semantic Search** — Upgrade event/org search from keyword to vector similarity

### Integration Points (Next.js ↔ Python/FastAPI)
- [ ] Define REST API contract between Next.js and AI service
- [ ] Add `AI_SERVICE_URL` env variable to Next.js app
- [ ] Create `lib/ai-service.ts` client for calling the AI microservice
- [ ] Add embedding generation trigger on event/org create/update
- [ ] Rate limiting and auth between services (shared API key or JWT)

### AI Microservice Stack (separate repo)
- Python 3.11+, FastAPI, Uvicorn
- Sentence-Transformers or OpenAI Embeddings
- pgvector (PostgreSQL extension) for vector storage — same DB
- Redis for caching recommendations
- Celery + Redis for async embedding jobs

## Infrastructure & Polish
- [x] Database schema updates
  - [x] Rename Orders to EventParticipation
  - [x] Add User onboarding fields
  - [x] Add Event visibility and type fields
  - [x] Add Organization size and location fields
  - [x] Add participation status tracking
  - [x] Add `isAppAdmin` to User model (Phase 4 ✅)
  - [ ] Add pgvector extension (Phase 7)
  - [ ] Add tag system tables (Phase 5)
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
- [ ] UI/UX polish
  - [ ] Responsive design for all pages
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Success notifications
  - [ ] Empty states
