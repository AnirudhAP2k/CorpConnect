# Organization Management Features - Implementation Plan

Building comprehensive organization profile viewing and management capabilities for the B2B platform.

---

## User Review Required

> [!IMPORTANT]
> **Member Invitation Flow**
> Members will be invited via email. For now, we'll implement a simple flow where:
> 1. Admin/Owner enters email address
> 2. System checks if user exists
> 3. If exists, add to organization immediately
> 4. If not exists, we'll show a message to invite them to register first
> 
> In the future, this can be enhanced with email invitations and pending invites.

> [!WARNING]
> **Single Organization per User**
> As per your requirement, users can only belong to ONE organization at a time. The organization switcher will be omitted for now, but the data model supports it for future expansion.

---

## Proposed Changes

### Organization Profile & Management

#### [NEW] [organizations/[id]/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/page.tsx)

**Purpose:** Organization profile page showing all details

**Features:**
- Organization header with logo, name, industry
- Organization details (description, website, location, size)
- Member list with roles
- Hosted events list
- Edit button (OWNER/ADMIN only)
- Manage members button (OWNER/ADMIN only)

**Layout:**
```
┌─────────────────────────────────────┐
│  [Logo]  Org Name                   │
│          Industry • Location        │
│          [Edit] [Manage Members]    │
├─────────────────────────────────────┤
│  About                              │
│  Description text...                │
│  Website: link                      │
├─────────────────────────────────────┤
│  Members (5)                        │
│  • John Doe (OWNER)                 │
│  • Jane Smith (ADMIN)               │
│  • ...                              │
├─────────────────────────────────────┤
│  Hosted Events (12)                 │
│  [Event Card] [Event Card] ...      │
└─────────────────────────────────────┘
```

---

#### [NEW] [organizations/[id]/edit/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/edit/page.tsx)

**Purpose:** Edit organization details

**Features:**
- Pre-filled form with current organization data
- Same fields as creation (name, industry, description, etc.)
- Logo upload/change
- Permission check (OWNER/ADMIN only)
- Cancel button returns to profile

---

#### [NEW] [organizations/[id]/members/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/members/page.tsx)

**Purpose:** Manage organization members

**Features:**
- Full member list with avatars and roles
- Add member form (email input)
- Remove member button (with confirmation)
- Change role dropdown (OWNER only)
- Member activity stats (events attended, etc.)

---

### Components

#### [NEW] [OrganizationHeader.tsx](file:///d:/evently/components/shared/OrganizationHeader.tsx)

**Purpose:** Reusable organization header component

**Features:**
- Organization logo with fallback
- Name and industry badge
- Location and size display
- Verification badge (if verified)
- Action buttons slot

---

#### [NEW] [MemberCard.tsx](file:///d:/evently/components/shared/MemberCard.tsx)

**Purpose:** Display member information

**Features:**
- User avatar
- Name and email
- Role badge with color coding
- Action menu (remove, change role)
- Joined date

---

#### [NEW] [MemberInviteForm.tsx](file:///d:/evently/components/shared/MemberInviteForm.tsx)

**Purpose:** Form to invite new members

**Features:**
- Email input with validation
- Role selector
- Submit button
- Success/error messages

---

#### [MODIFY] [OrganizationForm.tsx](file:///d:/evently/components/shared/OrganizationForm.tsx)

**Changes:**
- Support both Create and Update modes
- Pre-fill data for Update mode
- Different button text based on mode
- Handle logo update (keep existing or upload new)

---

### Server Actions Updates

#### [MODIFY] [actions/organization.ts](file:///d:/evently/actions/organization.ts)

**New Actions:**
- `updateOrganization()` - Already exists, ensure it works
- `addOrganizationMember()` - Already exists
- `removeOrganizationMember()` - Already exists
- `updateMemberRole()` - NEW: Change member's role

---

### Data Layer Updates

#### [MODIFY] [data/organization.ts](file:///d:/evently/data/organization.ts)

**New Functions:**
- `getOrganizationEvents()` - Get all events hosted by organization
- `updateMemberRole()` - Change a member's role
- `getOrganizationStats()` - Get stats (member count, event count, etc.)

---

### UI Components Needed

#### [NEW] [Badge Component Variants](file:///d:/evently/components/ui/badge.tsx)

**Role Badges:**
- OWNER - Gold/Yellow
- ADMIN - Blue
- MEMBER - Gray

**Industry Badge:**
- Display industry with icon

**Size Badge:**
- STARTUP - Green
- SME - Blue  
- ENTERPRISE - Purple

---

## File Structure

```
app/(protected)/
├── organizations/
│   └── [id]/
│       ├── page.tsx              # Organization profile
│       ├── edit/
│       │   └── page.tsx          # Edit organization
│       └── members/
│           └── page.tsx          # Manage members

components/shared/
├── OrganizationHeader.tsx        # Org header component
├── MemberCard.tsx                # Member display card
├── MemberInviteForm.tsx          # Invite member form
└── OrganizationForm.tsx          # Updated for edit mode

data/
└── organization.ts               # Add new functions

actions/
└── organization.ts               # Add updateMemberRole
```

---

## Security Considerations

### Permission Checks

**Organization Profile (View):**
- ✅ Public (anyone can view)
- ✅ Show member emails only to org members

**Edit Organization:**
- ✅ OWNER or ADMIN only
- ✅ Verify membership before allowing edit

**Manage Members:**
- ✅ Add members: OWNER or ADMIN
- ✅ Remove members: OWNER only
- ✅ Change roles: OWNER only
- ✅ Cannot remove last OWNER

**Data Access:**
- ✅ Validate organization exists
- ✅ Check user permissions on all mutations
- ✅ Sanitize inputs
- ✅ Rate limiting on member invites (future)

---

## Verification Plan

### Manual Testing

**Organization Profile:**
1. Navigate to `/organizations/[id]`
2. Verify all organization details display correctly
3. Check member list shows with correct roles
4. Verify hosted events appear
5. Check edit button only shows for OWNER/ADMIN
6. Verify member emails hidden for non-members

**Edit Organization:**
1. Click "Edit" button
2. Verify form pre-fills with current data
3. Update organization details
4. Upload new logo
5. Save and verify redirect to profile
6. Check changes persisted

**Member Management:**
1. Navigate to members page
2. Add new member by email
3. Verify member added with correct role
4. Change member role (OWNER only)
5. Remove member with confirmation
6. Try removing last OWNER (should fail)

**Permissions:**
1. Login as MEMBER
2. Try accessing edit page (should fail)
3. Try accessing members page (should fail)
4. Login as ADMIN
5. Verify can edit org but not manage members
6. Login as OWNER
7. Verify full access

---

## Next Steps After This Phase

Once organization management is complete:

1. **Enhanced Event Creation**
   - Add visibility controls
   - Add event type selection
   - Link to organization automatically
   - Add capacity limits

2. **Event Discovery**
   - Public events listing page
   - Filters (category, date, location, type)
   - Search functionality
   - Event detail page with participation

3. **Event Participation**
   - Join/RSVP functionality
   - Participation tracking
   - Attendee management for hosts

Let me know if you'd like any changes to this plan before I start implementation!
