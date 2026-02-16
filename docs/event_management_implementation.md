# Event Management & Organization Events - Implementation Plan

Implementing event editing, deletion, and organization events page with comprehensive event tracking.

---

## Phase 1: Event Management

### 1. Edit Event Functionality

#### [NEW] [app/(protected)/events/[id]/edit/page.tsx](file:///d:/evently/app/(protected)/events/[id]/edit/page.tsx)

**Features:**
- Fetch existing event data
- Pre-fill EventsForm with current values
- Permission check: Only OWNER/ADMIN of hosting organization
- Update mode for EventsForm

**Flow:**
```
1. Check user authentication
2. Fetch event with organization
3. Check if user is OWNER/ADMIN
4. If not → Show error
5. If yes → Show form with pre-filled data
```

#### [MODIFY] [components/shared/EventsForm.tsx](file:///d:/evently/components/shared/EventsForm.tsx)

**Updates:**
- Support `initialData` prop for edit mode
- Pre-fill all form fields
- Change submit endpoint based on type (Create vs Update)
- Handle PUT request for updates

#### [NEW] [app/api/events/[id]/route.ts](file:///d:/evently/app/api/events/[id]/route.ts)

**PUT Endpoint:**
```typescript
- Validate EventSubmitSchema
- Check user is OWNER/ADMIN of hosting org
- Update event fields
- Revalidate paths
- Return success
```

---

### 2. Delete Event Functionality

#### [NEW] Delete Confirmation Dialog Component

**File:** [components/shared/DeleteEventDialog.tsx](file:///d:/evently/components/shared/DeleteEventDialog.tsx)

**Features:**
- Modal dialog with warning
- Shows event title
- "Are you sure?" message
- Cancel and Delete buttons
- Red destructive styling

**Props:**
```typescript
{
  eventId: string;
  eventTitle: string;
  onSuccess: () => void;
}
```

#### [MODIFY] [app/(protected)/events/[id]/page.tsx](file:///d:/evently/app/(protected)/events/[id]/page.tsx)

**Add Delete Button:**
- Only visible to OWNER/ADMIN
- Opens DeleteEventDialog
- Positioned in action card

#### [MODIFY] [app/api/events/route.ts](file:///d:/evently/app/api/events/route.ts)

**Update DELETE Endpoint:**
- Check user is OWNER/ADMIN
- Delete event (cascade deletes participations)
- Return success
- Redirect to /events

---

## Phase 2: Organization Events Page

### [NEW] [app/(protected)/organizations/[id]/events/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/events/page.tsx)

**Layout:**
- Tabs for Hosted / Attending / Past
- Event cards grid
- Empty states for each tab
- Create Event button (OWNER/ADMIN only)

**Tabs:**

#### 1. Hosted Events
**Query:**
```typescript
where: {
  organizationId: orgId,
  startDateTime: { gte: new Date() }
}
orderBy: { startDateTime: 'asc' }
```

**Features:**
- Shows all events created by organization
- Edit/Delete buttons on each card (OWNER/ADMIN)
- Participant count
- Status badges (Upcoming, Ongoing)

#### 2. Attending Events
**Query:**
```typescript
where: {
  participations: {
    some: { organizationId: orgId }
  },
  startDateTime: { gte: new Date() }
}
orderBy: { startDateTime: 'asc' }
```

**Features:**
- Shows events organization members are attending
- Leave button on each card
- Hosted by info

#### 3. Past Events
**Query:**
```typescript
where: {
  OR: [
    { organizationId: orgId },
    { participations: { some: { organizationId: orgId } } }
  ],
  endDateTime: { lt: new Date() }
}
orderBy: { endDateTime: 'desc' }
```

**Features:**
- Shows historical events
- Read-only (no edit/delete)
- Attendance stats

---

## Component Updates

### [MODIFY] [components/shared/EventCard.tsx](file:///d:/evently/components/shared/EventCard.tsx)

**Add Props:**
```typescript
{
  showActions?: boolean;
  isHost?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

**New Features:**
- Action buttons overlay (Edit/Delete)
- Only show if `showActions && isHost`
- Positioned in top-right corner

---

## File Structure

```
app/(protected)/
├── events/
│   └── [id]/
│       ├── page.tsx                 # Add delete button
│       └── edit/
│           └── page.tsx             # New edit page
├── organizations/
│   └── [id]/
│       └── events/
│           └── page.tsx             # New org events page

app/api/
└── events/
    ├── route.ts                     # Update DELETE
    └── [id]/
        └── route.ts                 # New PUT endpoint

components/shared/
├── EventsForm.tsx                   # Support edit mode
├── EventCard.tsx                    # Add action buttons
└── DeleteEventDialog.tsx            # New component
```

---

## Implementation Steps

### Step 1: Event Editing
1. Create edit page with permission checks
2. Update EventsForm to support initialData
3. Create PUT API endpoint
4. Add "Edit Event" button to detail page

### Step 2: Event Deletion
1. Create DeleteEventDialog component
2. Update DELETE API endpoint with permissions
3. Add delete button to detail page
4. Add delete button to event cards (for hosts)

### Step 3: Organization Events Page
1. Create page with tabs
2. Implement Hosted Events tab
3. Implement Attending Events tab
4. Implement Past Events tab
5. Add navigation link from org profile

---

## Validation & Permissions

### Edit Event
- ✅ User authenticated
- ✅ Event exists
- ✅ User is OWNER/ADMIN of hosting organization
- ✅ Valid event data

### Delete Event
- ✅ User authenticated
- ✅ Event exists
- ✅ User is OWNER/ADMIN of hosting organization
- ✅ Confirmation dialog shown

### Organization Events Page
- ✅ Organization exists
- ✅ User can view organization
- ✅ Proper tab filtering
- ✅ Action buttons only for authorized users

---

## UI/UX Considerations

### Edit Page
- Pre-filled form with current values
- Same validation as create
- "Update Event" button text
- Success message on update
- Redirect to event detail after update

### Delete Confirmation
- Clear warning message
- Event title displayed
- Destructive action styling (red)
- Keyboard shortcuts (Esc to cancel)
- Focus management

### Organization Events Tabs
- Active tab highlighting
- Loading states for each tab
- Empty states with helpful messages
- Responsive grid layout
- Quick actions on hover

---

## Next Steps After Implementation

1. **Event Analytics**
   - View count tracking
   - Participation trends
   - Popular events

2. **Event Duplication**
   - Clone event feature
   - Modify dates and details
   - Quick event creation

3. **Bulk Actions**
   - Select multiple events
   - Bulk delete
   - Bulk export

Ready to implement!
