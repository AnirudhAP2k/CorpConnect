# Event Management & Organization Events - Implementation Walkthrough

## ✅ Completed Implementation

Successfully implemented comprehensive event management features with mobile-ready API architecture.

---

## 🎯 What Was Built

### 1. Mobile-Ready API Endpoints

#### PUT /api/events/[id] - Update Event
**File:** [app/api/events/[id]/route.ts](file:///d:/evently/app/api/events/[id]/route.ts)

**Features:**
- Validates `EventSubmitSchema`
- Permission check: OWNER/ADMIN only
- Updates all event fields except organizationId
- Preserves attendeeCount
- Revalidates paths

**Request:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "visibility": "PUBLIC",
  "eventType": "HYBRID",
  "maxAttendees": 100,
  ...
}
```

**Response:**
```json
{
  "message": "Event updated successfully!",
  "event": { ...eventData }
}
```

**Error Codes:**
- 401: Unauthorized
- 403: Permission denied
- 404: Event not found
- 400: Invalid data

---

#### DELETE /api/events/[id] - Delete Event
**File:** [app/api/events/[id]/route.ts](file:///d:/evently/app/api/events/[id]/route.ts)

**Features:**
- Permission check: OWNER/ADMIN only
- Cascades delete to participations
- Revalidates paths
- Returns participation count deleted

**Response:**
```json
{
  "message": "Event deleted successfully",
  "participationsDeleted": 5
}
```

**Error Codes:**
- 401: Unauthorized
- 403: Permission denied
- 404: Event not found

---

### 2. DeleteEventDialog Component

**File:** [components/shared/DeleteEventDialog.tsx](file:///d:/evently/components/shared/DeleteEventDialog.tsx)

**Features:**
- AlertDialog from shadcn/ui
- Two variants: `button` | `icon`
- Shows event title in confirmation
- Warns about participant deletion
- Loading state during deletion
- Error handling with FormErrors
- Redirects to `/events` after success

**Props:**
```typescript
{
  eventId: string;
  eventTitle: string;
  variant?: "button" | "icon";
}
```

**UI Elements:**
- Red destructive styling
- "Are you absolutely sure?" title
- Event title display
- Participant warning message
- Cancel and Delete buttons
- Disabled state during deletion

---

### 3. Updated EventsForm Component

**File:** [components/shared/EventsForm.tsx](file:///d:/evently/components/shared/EventsForm.tsx)

**New Props:**
```typescript
{
  userId: string;
  type: "Create" | "Update";
  organizationId?: string;
  organizationName?: string;
  eventId?: string;  // NEW
  initialData?: {    // NEW
    title: string;
    description: string;
    location: string;
    startDateTime: Date;
    endDateTime: Date;
    categoryId: string;
    price: string;
    isFree: boolean;
    url: string;
    visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
    eventType: "ONLINE" | "OFFLINE" | "HYBRID";
    maxAttendees?: number;
    image: string | null;
  };
}
```

**Edit Mode Features:**
- Pre-fills form with `initialData`
- Image upload optional (uses existing if not changed)
- PUT request to `/api/events/[id]`
- Redirects to event detail after update
- Button text changes to "Update Event"

**Logic Flow:**
```typescript
if (type === "Create") {
  POST /api/events
} else if (type === "Update" && eventId) {
  PUT /api/events/[id]
}
```

---

### 4. Event Edit Page

**File:** [app/(protected)/events/[id]/edit/page.tsx](file:///d:/evently/app/(protected)/events/[id]/edit/page.tsx)

**Features:**
- Fetches event with organization
- Permission check: OWNER/ADMIN only
- Shows error if unauthorized
- Passes `initialData` to EventsForm
- Pre-fills all fields

**Permission Error UI:**
- Red error card
- "Permission Denied" message
- "Back to Event" button

**Data Preparation:**
```typescript
const initialData = {
  title: event.title,
  description: event.description,
  location: event.location,
  startDateTime: event.startDateTime,
  endDateTime: event.endDateTime,
  categoryId: event.categoryId,
  price: event.price || "",
  isFree: event.isFree,
  url: event.url || "",
  visibility: event.visibility,
  eventType: event.eventType,
  maxAttendees: event.maxAttendees || undefined,
  image: event.image,
};
```

---

### 5. Updated Event Detail Page

**File:** [app/(protected)/events/[id]/page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)

**Changes:**
- Replaced `getEventById` with direct Prisma query
- Added `DeleteEventDialog` import
- Added Delete button in action card for hosts

**Action Card for Hosts:**
```tsx
{isHost && (
  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
    <Link href={`/events/${event.id}/edit`}>
      <Button variant="outline" className="w-full">
        Edit Event
      </Button>
    </Link>
    <DeleteEventDialog
      eventId={event.id}
      eventTitle={event.title}
      variant="button"
    />
  </div>
)}
```

**Prisma Query:**
- Includes category, organization, members, participations
- Fetches all necessary data in one query
- Optimized for performance

---

### 6. Organization Events Page

**File:** [app/(protected)/organizations/[id]/events/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/events/page.tsx)

**Features:**
- Three tabs: Hosted, Attending, Past
- Permission-based "Create Event" button
- Empty states for each tab
- Event count badges

**Tabs:**

#### Hosted Events Tab
**Query:**
```typescript
where: {
  organizationId: params.id,
  startDateTime: { gte: now }
}
orderBy: { startDateTime: "asc" }
```

**Shows:**
- All upcoming events created by organization
- Event cards in grid layout
- Create Event button (OWNER/ADMIN only)

#### Attending Events Tab
**Query:**
```typescript
where: {
  participations: {
    some: { organizationId: params.id }
  },
  startDateTime: { gte: now }
}
orderBy: { startDateTime: "asc" }
```

**Shows:**
- Events organization members are attending
- Browse Events button in empty state

#### Past Events Tab
**Query:**
```typescript
where: {
  OR: [
    { organizationId: params.id },
    { participations: { some: { organizationId: params.id } } }
  ],
  endDateTime: { lt: now }
}
orderBy: { endDateTime: "desc" }
take: 20
```

**Shows:**
- Historical events (hosted or attended)
- Limited to 20 most recent
- Read-only view

**Tab Navigation:**
- URL param: `?tab=hosted|attending|past`
- Active tab highlighting
- Event count badges
- Smooth transitions

**Empty States:**
- Contextual messages per tab
- Action buttons (Create Event / Browse Events)
- Helpful guidance

---

## 📱 Mobile-Ready API Architecture

All business logic is in API routes that return JSON, making them easily consumable by any client:

### API Design Principles

1. **Stateless Operations**
   - All endpoints are stateless
   - Authentication via session
   - No server-side state dependencies

2. **Consistent Response Format**
   ```json
   // Success
   {
     "message": "Operation successful",
     "data": { ... }
   }
   
   // Error
   {
     "error": "Error message",
     "details": [ ... ]
   }
   ```

3. **Proper HTTP Status Codes**
   - 200: Success
   - 400: Bad Request
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not Found
   - 500: Internal Server Error

4. **Permission Checks**
   - All mutations check user permissions
   - Consistent permission logic
   - Clear error messages

5. **Data Validation**
   - Zod schema validation
   - Detailed error responses
   - Type-safe inputs/outputs

---

## 🧪 Testing Guide

### Test 1: Edit Event

**Steps:**
1. Navigate to event detail page (as OWNER/ADMIN)
2. Click "Edit Event"
3. Modify fields (title, description, etc.)
4. Submit form

**Expected:**
- ✅ Form pre-filled with current values
- ✅ Image upload optional
- ✅ Success message on update
- ✅ Redirects to event detail
- ✅ Changes reflected immediately

### Test 2: Delete Event

**Steps:**
1. Navigate to event detail page (as OWNER/ADMIN)
2. Click "Delete Event"
3. Read confirmation dialog
4. Click "Delete Event" in dialog

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Event title shown in dialog
- ✅ Warning about participants
- ✅ Event deleted successfully
- ✅ Redirects to `/events`
- ✅ Event no longer appears

### Test 3: Permission Checks

**Edit Permission:**
1. Try to access `/events/[id]/edit` as non-member
2. Try as MEMBER (not OWNER/ADMIN)

**Expected:**
- ✅ Non-members see error
- ✅ Members see error
- ✅ Only OWNER/ADMIN can edit

**Delete Permission:**
1. Try to delete as non-member (via API)
2. Try as MEMBER (not OWNER/ADMIN)

**Expected:**
- ✅ 403 Forbidden response
- ✅ Error message displayed

### Test 4: Organization Events Page

**Hosted Tab:**
1. Navigate to `/organizations/[id]/events`
2. View hosted events

**Expected:**
- ✅ Shows upcoming events
- ✅ Sorted by start date
- ✅ Create button for OWNER/ADMIN
- ✅ Empty state if no events

**Attending Tab:**
1. Click "Attending" tab
2. View events members are attending

**Expected:**
- ✅ Shows events with participations
- ✅ Browse Events button in empty state

**Past Tab:**
1. Click "Past Events" tab
2. View historical events

**Expected:**
- ✅ Shows past events (hosted or attended)
- ✅ Sorted by end date (newest first)
- ✅ Limited to 20 events

---

## 📁 File Structure Summary

```
app/(protected)/
├── events/
│   └── [id]/
│       ├── page.tsx                 # Updated with delete button
│       └── edit/
│           └── page.tsx             # New edit page

app/(protected)/organizations/
└── [id]/
    └── events/
        └── page.tsx                 # New org events page

app/api/
└── events/
    └── [id]/
        └── route.ts                 # New PUT/DELETE endpoints

components/shared/
├── EventsForm.tsx                   # Updated for edit mode
└── DeleteEventDialog.tsx            # New component
```

---

## ✅ Completed Features

- [x] Edit event functionality
  - [x] Pre-filled form with current values
  - [x] Optional image upload
  - [x] PUT API endpoint
  - [x] Permission checks (OWNER/ADMIN)
  
- [x] Delete event functionality
  - [x] Confirmation dialog
  - [x] Participant warning
  - [x] DELETE API endpoint
  - [x] Permission checks (OWNER/ADMIN)
  - [x] Cascade delete participations

- [x] Organization events page
  - [x] Hosted events tab
  - [x] Attending events tab
  - [x] Past events tab
  - [x] Tab navigation
  - [x] Empty states
  - [x] Permission-based actions

- [x] Mobile-ready API architecture
  - [x] Stateless endpoints
  - [x] Consistent responses
  - [x] Proper HTTP codes
  - [x] Permission checks
  - [x] Data validation

---

## 🚀 Next Steps (Optional Enhancements)

1. **Event Duplication**
   - Clone event feature
   - Modify dates and details
   - Quick event creation

2. **Bulk Actions**
   - Select multiple events
   - Bulk delete
   - Bulk export

3. **Event Analytics**
   - View count tracking
   - Participation trends
   - Popular events dashboard

4. **Advanced Filters**
   - Date range picker
   - Price range filter
   - Distance/location filter

Ready for production! 🎉
