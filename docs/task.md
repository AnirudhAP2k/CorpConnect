# Evently B2B Platform - Core Features Implementation

## Phase 1: Organization Module
- [x] Organization onboarding flow
  - [x] Create onboarding page after user registration
  - [x] Build organization creation form (name, industry, description, location, size)
  - [x] Auto-assign creator as OWNER role (handled in data layer)
  - [x] Redirect to dashboard after org creation
  - [x] Update middleware to force onboarding
- [ ] Organization management
  - [ ] Organization profile page
  - [ ] Edit organization details
  - [ ] Upload organization logo (Cloudinary integration exists)
  - [ ] View organization members
- [ ] Organization membership
  - [ ] Invite members to organization (email invites)
  - [ ] Accept/decline invitations
  - [ ] Manage member roles (OWNER, ADMIN, MEMBER)
  - [ ] Remove members from organization
- [ ] Organization switcher
  - [ ] Display current active organization in navbar
  - [ ] Dropdown to switch between user's organizations
  - [ ] Store active org in session/cookie
  - [ ] Update context when switching orgs

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
  - [ ] My organization's events page
- [ ] Event management
  - [ ] Edit event details
  - [ ] Cancel/delete events
  - [ ] View event participants
  - [ ] Event analytics (basic view count)

## Phase 3: Participation Flow
- [ ] Event participation
  - [ ] Join/RSVP to events
  - [ ] Save event for later
  - [ ] Cancel participation
  - [ ] Participation history for users
  - [ ] Participation history for organizations
- [ ] Event interactions
  - [ ] Track which orgs attended which events
  - [ ] Build relationship graph data
  - [ ] Store participation metadata (timestamp, status)

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
