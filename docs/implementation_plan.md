# Evently B2B Platform - Core Features Implementation Plan

Building the foundation for a B2B events and networking platform with organization management, event creation, and participation tracking.

## User Review Required

> [!IMPORTANT]
> **Organization Onboarding Flow**
> After a user registers, they will be required to create or join an organization before accessing the main platform. This is a hard requirement for the B2B model. Users without an organization will be redirected to onboarding.

> [!IMPORTANT]
> **Event Participation Model**
> Currently using the `Orders` model for event participation (likely from a previous ticketing system). We should rename this to `EventParticipation` or `EventAttendee` to better reflect the B2B use case where organizations attend events, not just buy tickets.

> [!WARNING]
> **Multi-Organization Support**
> Users can belong to multiple organizations. We need an "active organization" context that determines which org they're acting on behalf of. This will be stored in the session and can be switched via a dropdown.

---

## Proposed Changes

### Database & Schema

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**Changes needed:**
1. **Rename `Orders` to `EventParticipation`** - Better reflects B2B model
2. **Add participation tracking fields:**
   - `status` (REGISTERED, ATTENDED, CANCELLED)
   - `registeredBy` (userId who registered on behalf of org)
   - `organizationId` (which org is participating)
3. **Add User fields:**
   - `hasCompletedOnboarding` boolean
   - `activeOrganizationId` (current working context)
4. **Add Organization fields:**
   - `size` (STARTUP, SME, ENTERPRISE)
   - `location` (city/country)
   - `isVerified` boolean
5. **Add Event fields:**
   - `visibility` (PUBLIC, PRIVATE, INVITE_ONLY)
   - `eventType` (ONLINE, OFFLINE, HYBRID)
   - `maxAttendees` (optional capacity limit)
   - `attendeeCount` (cached count)

---

### Organization Module

#### [NEW] [onboarding/page.tsx](file:///d:/evently/app/(protected)/onboarding/page.tsx)

**Purpose:** Force new users to create/join an organization

**Features:**
- Two-step form: Create new org OR join existing
- Industry selection dropdown
- Organization name, description, website
- Logo upload (Cloudinary)
- Auto-assign OWNER role on creation

#### [MODIFY] [middleware.ts](file:///d:/evently/middleware.ts)

**Changes:**
- Check if authenticated user has `hasCompletedOnboarding`
- Redirect to `/onboarding` if false
- Allow access to onboarding page without org

#### [NEW] [organizations/[id]/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/page.tsx)

**Purpose:** Organization profile and management page

**Features:**
- Display org details (name, industry, description, logo)
- Member list with roles
- Edit button (OWNER/ADMIN only)
- Events hosted by this org
- Invite members button

#### [NEW] [organizations/[id]/edit/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/edit/page.tsx)

**Purpose:** Edit organization details

**Features:**
- Form pre-filled with current org data
- Upload/change logo
- Update description, website, industry
- Permission check (OWNER/ADMIN only)

#### [NEW] [OrganizationSwitcher.tsx](file:///d:/evently/components/shared/OrganizationSwitcher.tsx)

**Purpose:** Dropdown to switch active organization context

**Features:**
- Display current active org name + logo
- List all user's organizations
- Switch active org (update session)
- "Create new organization" link

---

### Event Module

#### [MODIFY] [events/create/page.tsx](file:///d:/evently/app/(protected)/events/create/page.tsx)

**Enhancements needed:**
- Add event visibility selector (PUBLIC/PRIVATE)
- Add event type selector (ONLINE/OFFLINE/HYBRID)
- Add max attendees field (optional)
- Link event to active organization automatically
- Add location field with online meeting link option

#### [NEW] [events/page.tsx](file:///d:/evently/app/(protected)/events/page.tsx)

**Purpose:** Public event discovery page

**Features:**
- Grid/list view of upcoming events
- Filters: category, date range, location, event type
- Search bar (title/description)
- "Hosted by [Org]" display
- Join/RSVP button

#### [MODIFY] [events/[id]/page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)

**Enhancements needed:**
- Display hosting organization info
- Show attendee count and list
- Join/RSVP button with organization context
- Show which of user's orgs are attending
- Related events from same org

#### [NEW] [events/[id]/participants/page.tsx](file:///d:/evently/app/(protected)/events/[id]/participants/page.tsx)

**Purpose:** View event participants (host only)

**Features:**
- List of organizations attending
- Individual attendees from each org
- Export participant list
- Send announcements to participants

---

### Participation System

#### [NEW] [actions/event-participation.ts](file:///d:/evently/actions/event-participation.ts)

**Purpose:** Server actions for event participation

**Functions:**
- `joinEvent(eventId, organizationId)` - Register org for event
- `leaveEvent(eventId, organizationId)` - Cancel registration
- `getEventParticipants(eventId)` - Get all participants
- `getUserEventHistory(userId)` - Get user's event history
- `getOrgEventHistory(orgId)` - Get org's event history

#### [NEW] [api/events/[id]/join/route.ts](file:///d:/evently/app/api/events/[id]/join/route.ts)

**Purpose:** API endpoint for joining events

**Logic:**
- Validate user is member of organization
- Check event capacity
- Create EventParticipation record
- Increment event attendeeCount
- Send confirmation email/notification

---

### Dashboard

#### [NEW] [dashboard/page.tsx](file:///d:/evently/app/(protected)/dashboard/page.tsx)

**Purpose:** Main dashboard after login

**Features:**
- Welcome message with active org
- Quick stats cards:
  - Events hosted (by active org)
  - Events attending (by active org)
  - Total connections made
- Upcoming events calendar view
- Recent activity feed
- Quick actions (Create Event, Invite Members)

#### [NEW] [dashboard/my-events/page.tsx](file:///d:/evently/app/(protected)/dashboard/my-events/page.tsx)

**Purpose:** User's personal event management

**Features:**
- Tabs: Hosting | Attending | Saved
- Calendar view and list view toggle
- Filter by organization
- Quick actions (edit, cancel, view participants)

---

### Data Layer

#### [NEW] [data/organization.ts](file:///d:/evently/data/organization.ts)

**Purpose:** Database queries for organizations

**Functions:**
- `getOrganizationById(id)`
- `getUserOrganizations(userId)`
- `createOrganization(data, creatorId)`
- `updateOrganization(id, data)`
- `getOrganizationMembers(orgId)`
- `addMemberToOrg(userId, orgId, role)`

#### [NEW] [data/event-participation.ts](file:///d:/evently/data/event-participation.ts)

**Purpose:** Database queries for event participation

**Functions:**
- `getEventParticipants(eventId)`
- `getOrgParticipations(orgId)`
- `getUserParticipations(userId)`
- `createParticipation(eventId, orgId, userId)`
- `updateParticipationStatus(id, status)`

#### [MODIFY] [data/events.ts](file:///d:/evently/data/events.ts)

**Enhancements:**
- Add organization filtering
- Add visibility filtering
- Include participation count in queries
- Add related events query (same org/category)

---

### Components

#### [NEW] [EventCard.tsx](file:///d:/evently/components/shared/EventCard.tsx)

**Purpose:** Reusable event card component

**Features:**
- Event image, title, date, location
- Hosting organization badge
- Attendee count
- Join button with loading state
- Category badge

#### [NEW] [OrganizationCard.tsx](file:///d:/evently/components/shared/OrganizationCard.tsx)

**Purpose:** Display organization info in cards

**Features:**
- Org logo, name, industry
- Member count
- Events hosted count
- Connect/Follow button (future)

#### [NEW] [MemberList.tsx](file:///d:/evently/components/shared/MemberList.tsx)

**Purpose:** Display organization members with roles

**Features:**
- Avatar, name, email, role
- Role badge styling
- Remove member button (OWNER/ADMIN only)
- Change role dropdown (OWNER only)

---

## Verification Plan

### Automated Tests

```bash
# Run Prisma migrations
npx prisma migrate dev --name add_participation_and_org_enhancements

# Generate Prisma client
npx prisma generate

# Seed database with test data
npx prisma db seed

# Run development server
npm run dev
```

### Manual Verification

**Organization Flow:**
1. Register new user → Should redirect to onboarding
2. Create organization → Should become OWNER
3. Invite another user → Should receive email
4. Switch between organizations → Context should update

**Event Flow:**
1. Create event as Organization A → Event should link to org
2. View event as Organization B → Should see "Join" button
3. Join event → Should create participation record
4. View participants as host → Should see Organization B

**Dashboard:**
1. View dashboard → Should show active org stats
2. Switch org → Stats should update
3. View "My Events" → Should filter by active org

### Data Validation

**Check database records:**
```sql
-- Verify organization membership
SELECT u.name, o.name, om.role 
FROM "OrganizationMember" om
JOIN "User" u ON om."userId" = u.id
JOIN "Organization" o ON om."organizationId" = o.id;

-- Verify event participation
SELECT e.title, o.name, ep.status
FROM "EventParticipation" ep
JOIN "Events" e ON ep."eventId" = e.id
JOIN "Organization" o ON ep."organizationId" = o.id;
```

### UI/UX Checks

- [ ] All forms have proper validation
- [ ] Loading states during async operations
- [ ] Success/error toast notifications
- [ ] Responsive design on mobile
- [ ] Empty states with helpful CTAs
- [ ] Permission-based UI (hide edit buttons for non-admins)
