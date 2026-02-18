# Evently B2B Platform - Core Features Implementation

## Phase 1: Organization Module
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

## Phase 2: Event Module
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
  - [ ] View event participants (in detail page)
  - [ ] Event analytics (basic view count)

## Phase 3: Participation Flow
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

## Phase 4: Dashboard
- [ ] Organization dashboard
  - [ ] Upcoming events (hosted by org)
  - [ ] Upcoming events (org is attending)
  - [ ] Recent activity feed
  - [ ] Quick stats (events hosted, events attended, connections)
- [ ] User dashboard
  - [ ] Personal event calendar
  - [ ] Saved events
  - [ ] Recommended events (basic, non-AI initially)

## Phase 5: Data Collection for Future AI
- [ ] Analytics tracking
  - [ ] Track event views
  - [ ] Track event joins
  - [ ] Track organization interactions
  - [ ] Store industry and category data
- [ ] Prepare for embeddings
  - [ ] Ensure rich descriptions for orgs
  - [ ] Ensure rich descriptions for events
  - [ ] Tag system for events and orgs

## Infrastructure & Polish
- [x] Database schema updates
  - [x] Rename Orders to EventParticipation
  - [x] Add User onboarding fields
  - [x] Add Event visibility and type fields
  - [x] Add Organization size and location fields
  - [x] Add participation status tracking
  - [ ] Run migration (requires user action)
  - [ ] Update TypeScript types (auto-generated after migration)
- [ ] Database optimizations
  - [x] Add necessary indexes
  - [ ] Optimize queries for listings
- [x] Data access layer
  - [x] Organization data layer with security
  - [x] Event participation data layer
- [x] Server actions
  - [x] Organization actions with validation
  - [x] Event participation actions
- [ ] API routes
  - [ ] RESTful endpoints for organizations
  - [ ] RESTful endpoints for events
  - [ ] RESTful endpoints for participation
- [ ] UI/UX polish
  - [ ] Responsive design for all pages
  - [ ] Loading states
  - [ ] Error handling
  - [ ] Success notifications
  - [ ] Empty states
