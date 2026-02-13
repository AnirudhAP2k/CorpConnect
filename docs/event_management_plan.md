# Enhanced Event Creation & Discovery - Implementation Plan

Implementing comprehensive event management with visibility controls, event types, capacity limits, discovery features, and participation tracking.

---

## Current State Analysis

### ✅ Already in Database Schema
- `visibility` - EventVisibility enum (PUBLIC, PRIVATE, INVITE_ONLY)
- `eventType` - EventType enum (ONLINE, OFFLINE, HYBRID)
- `maxAttendees` - Int (capacity limit)
- `attendeeCount` - Int (current count)
- `organizationId` - Link to organization

### ❌ Missing in Current Implementation
- Validation schemas don't include new fields
- EventsForm doesn't have UI for visibility/type/capacity
- No automatic organization linking
- No event discovery/listing page
- No event detail page
- No participation management

---

## Proposed Changes

### Phase 1: Enhanced Event Creation

#### [MODIFY] [lib/validation.ts](file:///d:/evently/lib/validation.ts)

**Update EventCreateSchema:**
```typescript
export const EventCreateSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(5).max(1000),
  location: z.string().min(3).max(200),
  image: z.instanceof(File).nullable().optional(),
  startDateTime: z.date(),
  endDateTime: z.date(),
  categoryId: z.string().uuid(),
  price: z.string(),
  isFree: z.boolean(),
  url: z.string().url().optional().or(z.literal("")),
  
  // New fields
  visibility: z.enum(["PUBLIC", "PRIVATE", "INVITE_ONLY"]).default("PUBLIC"),
  eventType: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).default("OFFLINE"),
  maxAttendees: z.number().int().positive().optional(),
});
```

---

#### [MODIFY] [components/shared/EventsForm.tsx](file:///d:/evently/components/shared/EventsForm.tsx)

**Add New Form Fields:**
1. **Event Visibility** - Radio buttons or Select
   - PUBLIC - Anyone can see and join
   - PRIVATE - Only organization members
   - INVITE_ONLY - Only invited users

2. **Event Type** - Radio buttons or Select
   - ONLINE - Virtual event with meeting link
   - OFFLINE - Physical location
   - HYBRID - Both online and offline

3. **Capacity Limit** - Optional number input
   - Max attendees allowed
   - Show remaining spots

4. **Organization** - Auto-filled from user's organization
   - Display organization name (read-only)
   - Hidden field with organizationId

**Update onSubmit:**
- Include new fields in API call
- Validate capacity > 0 if provided
- Ensure endDateTime > startDateTime

---

#### [MODIFY] [app/api/events/route.ts](file:///d:/evently/app/api/events/route.ts)

**Update POST endpoint:**
```typescript
- Fetch user's organizationId
- Validate user belongs to organization
- Include visibility, eventType, maxAttendees in creation
- Set attendeeCount to 0
- Return event ID for redirect
```

---

### Phase 2: Event Discovery

#### [NEW] [app/(protected)/events/page.tsx](file:///d:/evently/app/(protected)/events/page.tsx)

**Public Events Listing Page**

**Features:**
- Grid/List view of PUBLIC events
- Filter sidebar:
  - Category dropdown
  - Date range picker
  - Location search
  - Event type checkboxes
  - Price filter (Free/Paid)
- Search bar (title/description)
- Sort options:
  - Upcoming (default)
  - Recently added
  - Most popular
- Pagination (20 per page)

**Event Card:**
- Event image
- Title and description (truncated)
- Organization name with logo
- Date, time, location
- Event type badge
- Capacity indicator (if limited)
- "View Details" button

---

#### [NEW] [app/(protected)/events/[id]/page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)

**Event Detail Page**

**Sections:**
1. **Hero Section**
   - Large event image
   - Title, date, time
   - Event type and visibility badges
   - Organization info
   - Join/RSVP button (if applicable)

2. **Event Details**
   - Full description
   - Location (with map for OFFLINE/HYBRID)
   - Meeting link (for ONLINE/HYBRID)
   - Category
   - Price
   - Capacity (X/Y spots filled)

3. **Hosted By**
   - Organization card
   - Link to organization profile

4. **Attendees** (if user is participant or host)
   - List of organizations attending
   - Avatar grid

5. **Similar Events**
   - Same category
   - Same organization

---

#### [NEW] [app/api/events/[id]/route.ts](file:///d:/evently/app/api/events/[id]/route.ts)

**GET endpoint:**
- Fetch event with organization and category
- Check visibility permissions:
  - PUBLIC: Anyone can view
  - PRIVATE: Only org members
  - INVITE_ONLY: Only invited users
- Include participation count
- Return 403 if no permission

---

### Phase 3: Event Participation

#### [NEW] [app/api/events/[id]/participate/route.ts](file:///d:/evently/app/api/events/[id]/participate/route.ts)

**POST - Join Event:**
```typescript
- Check user is authenticated
- Check event visibility allows joining
- Check capacity not exceeded
- Create EventParticipation record
- Increment attendeeCount
- Return success
```

**DELETE - Leave Event:**
```typescript
- Find participation record
- Delete participation
- Decrement attendeeCount
- Return success
```

---

#### [MODIFY] [app/(protected)/events/[id]/page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)

**Add Participation UI:**
- "Join Event" button (if not joined)
- "Leave Event" button (if joined)
- "Event Full" message (if at capacity)
- "Members Only" message (if PRIVATE and not member)
- "Invitation Required" message (if INVITE_ONLY)

---

### Phase 4: My Organization's Events

#### [NEW] [app/(protected)/organizations/[id]/events/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/events/page.tsx)

**Organization Events Page**

**Tabs:**
1. **Hosted Events** - Events created by this org
2. **Attending Events** - Events org is participating in
3. **Past Events** - Historical events

**Features:**
- Create Event button (OWNER/ADMIN only)
- Edit/Delete buttons on event cards (OWNER/ADMIN)
- Participant count
- Status badges (Upcoming, Ongoing, Past)

---

### Phase 5: Enhanced Components

#### [NEW] [components/shared/EventCard.tsx](file:///d:/evently/components/shared/EventCard.tsx)

**Reusable Event Card Component**

**Props:**
- event data
- variant (compact, full)
- showActions (edit/delete buttons)

**Features:**
- Event image
- Title, description
- Organization badge
- Date, location
- Event type badge
- Capacity indicator
- Join button

---

#### [NEW] [components/shared/EventFilters.tsx](file:///d:/evently/components/shared/EventFilters.tsx)

**Filter Sidebar Component**

**Filters:**
- Category select
- Date range
- Location search
- Event type checkboxes
- Price filter
- Clear all button

---

#### [NEW] [components/shared/EventTypeB adge.tsx](file:///d:/evently/components/shared/EventTypeBadge.tsx)

**Badge Component for Event Types**

**Variants:**
- ONLINE - Blue (🌐)
- OFFLINE - Green (📍)
- HYBRID - Purple (🔄)

---

## File Structure

```
app/(protected)/
├── events/
│   ├── page.tsx                     # Public events listing
│   ├── create/
│   │   └── page.tsx                 # Create event (existing)
│   └── [id]/
│       ├── page.tsx                 # Event detail
│       └── edit/
│           └── page.tsx             # Edit event

app/api/
├── events/
│   ├── route.ts                     # POST (create), GET (list)
│   └── [id]/
│       ├── route.ts                 # GET, PUT, DELETE
│       └── participate/
│           └── route.ts             # POST (join), DELETE (leave)

components/shared/
├── EventsForm.tsx                   # Update with new fields
├── EventCard.tsx                    # New
├── EventFilters.tsx                 # New
├── EventTypeBadge.tsx               # New
└── CapacityIndicator.tsx            # New

lib/
├── validation.ts                    # Update schemas
└── data/
    └── events.ts                    # New data access layer
```

---

## Implementation Steps

### Step 1: Update Validation & Form
1. Update `EventCreateSchema` with new fields
2. Update `EventsForm` with visibility, type, capacity fields
3. Add organization auto-linking
4. Update API route to handle new fields

### Step 2: Event Discovery
1. Create events listing page
2. Build EventCard component
3. Build EventFilters component
4. Implement search and filter logic
5. Add pagination

### Step 3: Event Detail
1. Create event detail page
2. Fetch event with permissions check
3. Display all event information
4. Add similar events section

### Step 4: Participation
1. Create participation API routes
2. Add Join/Leave buttons
3. Implement capacity checking
4. Update attendee count

### Step 5: Organization Events
1. Create organization events page
2. Add tabs for hosted/attending/past
3. Add edit/delete actions for hosts

---

## User Flows

### Flow 1: Create Event
```
1. User clicks "Create Event"
2. Form shows with all fields
3. Organization auto-filled
4. User selects visibility, type
5. Optional: Set capacity limit
6. Submit → Event created
7. Redirect to event detail page
```

### Flow 2: Discover Events
```
1. User navigates to /events
2. Sees grid of PUBLIC events
3. Applies filters (category, date, type)
4. Searches by keyword
5. Clicks event card
6. Views event details
```

### Flow 3: Join Event
```
1. User on event detail page
2. Checks capacity available
3. Clicks "Join Event"
4. Participation created
5. Button changes to "Leave Event"
6. Capacity updated
```

---

## Validation Rules

### Event Creation
- ✅ Title: 3-100 characters
- ✅ Description: 5-1000 characters
- ✅ Location: 3-200 characters
- ✅ endDateTime > startDateTime
- ✅ maxAttendees > 0 (if provided)
- ✅ User must belong to organization
- ✅ URL required for ONLINE events

### Event Participation
- ✅ Event must be PUBLIC or user has permission
- ✅ Capacity not exceeded
- ✅ User not already participating
- ✅ Event not in the past

---

## Next Steps After Implementation

1. **Event Analytics** - Track views, joins
2. **Event Reminders** - Email notifications before event
3. **Waitlist** - When event is full
4. **Event Check-in** - QR code for attendance
5. **Event Feedback** - Post-event surveys

Ready to proceed with implementation!
