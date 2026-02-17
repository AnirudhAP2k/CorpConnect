# Organization Module Completion - Implementation Plan

Completing the organization module with invitation management, member management, and organization switcher.

---

## 🎯 Features to Implement

1. **Accept/Decline Invitations**
2. **Manage Member Roles**
3. **Remove Members**
4. **Organization Switcher**

---

## 1. Invitation Acceptance Flow

### Current State
- ✅ Invitations are sent via email
- ✅ `PendingInvite` model exists in schema
- ❌ No UI to accept/decline invitations
- ❌ No API to process acceptance

### [NEW] Invitations Page
**File:** `app/(protected)/invitations/page.tsx`

**Features:**
- List all pending invitations for logged-in user
- Show organization name, invited by, date
- Accept/Decline buttons
- Empty state if no invitations

**Query:**
```typescript
where: {
  email: user.email,
  status: "PENDING"
}
```

### [NEW] Accept Invitation API
**File:** `app/api/invitations/[id]/accept/route.ts`

**POST Endpoint:**
```typescript
1. Verify user owns the invitation (email match)
2. Check invitation is PENDING
3. Create OrganizationMember record
4. Update PendingInvite status to ACCEPTED
5. Return success
```

### [NEW] Decline Invitation API
**File:** `app/api/invitations/[id]/decline/route.ts`

**POST Endpoint:**
```typescript
1. Verify user owns the invitation
2. Check invitation is PENDING
3. Update PendingInvite status to DECLINED
4. Return success
```

---

## 2. Member Role Management

### [NEW] Update Member Role API
**File:** `app/api/organizations/[id]/members/[memberId]/route.ts`

**PUT Endpoint - Update Role:**
```typescript
1. Check user is OWNER of organization
2. Prevent changing own role
3. Prevent removing last OWNER
4. Update member role
5. Return success
```

**Allowed Transitions:**
- OWNER can change anyone to OWNER/ADMIN/MEMBER
- ADMIN cannot change roles (only OWNER can)

### [MODIFY] Organization Members Page
**File:** `app/(protected)/organizations/[id]/members/page.tsx`

**Add:**
- Role dropdown for each member (OWNER only)
- Change role functionality
- Visual role badges

---

## 3. Remove Members

### [NEW] Remove Member API
**File:** `app/api/organizations/[id]/members/[memberId]/route.ts`

**DELETE Endpoint:**
```typescript
1. Check user is OWNER or ADMIN
2. Prevent removing self
3. Prevent removing last OWNER
4. Delete OrganizationMember record
5. Return success
```

### [MODIFY] Organization Members Page

**Add:**
- Remove button for each member
- Confirmation dialog
- Permission checks (OWNER/ADMIN only)

---

## 4. Organization Switcher

### Database Changes
**No schema changes needed!** Use existing `activeOrganizationId` in User model.

### [NEW] Set Active Organization API
**File:** `app/api/user/active-organization/route.ts`

**POST Endpoint:**
```typescript
1. Verify user is member of organization
2. Update user.activeOrganizationId
3. Revalidate session
4. Return success
```

### [NEW] Organization Switcher Component
**File:** `components/shared/OrganizationSwitcher.tsx`

**Features:**
- Dropdown in navbar
- Shows current active organization
- Lists all user's organizations
- Click to switch
- "Create Organization" option

**UI:**
```
┌─────────────────────────┐
│ 🏢 Acme Corp        ▼  │
├─────────────────────────┤
│ ✓ Acme Corp            │
│   Tech Startup Inc      │
│   Marketing Agency      │
├─────────────────────────┤
│ + Create Organization   │
└─────────────────────────┘
```

### [MODIFY] Navbar
**File:** `components/shared/Navbar.tsx`

**Add:**
- OrganizationSwitcher component
- Position between logo and nav links
- Mobile responsive

### [MODIFY] Event Creation
**File:** `app/(protected)/events/create/page.tsx`

**Update:**
- Use `user.activeOrganizationId` instead of first organization
- Show active organization name

---

## File Structure

```
app/(protected)/
├── invitations/
│   └── page.tsx                     # New invitations page
├── organizations/
│   └── [id]/
│       └── members/
│           └── page.tsx             # Updated with role/remove

app/api/
├── invitations/
│   └── [id]/
│       ├── accept/
│       │   └── route.ts             # New accept endpoint
│       └── decline/
│           └── route.ts             # New decline endpoint
├── organizations/
│   └── [id]/
│       └── members/
│           └── [memberId]/
│               └── route.ts         # New PUT/DELETE endpoints
└── user/
    └── active-organization/
        └── route.ts                 # New set active org endpoint

components/shared/
├── OrganizationSwitcher.tsx         # New component
└── Navbar.tsx                       # Updated
```

---

## Implementation Steps

### Step 1: Invitation Acceptance
1. Create invitations listing page
2. Create accept/decline API endpoints
3. Add navigation link to invitations

### Step 2: Member Management
1. Create member role update API
2. Create member removal API
3. Update members page with role dropdown
4. Add remove member button with confirmation

### Step 3: Organization Switcher
1. Create set active organization API
2. Create OrganizationSwitcher component
3. Update Navbar with switcher
4. Update event creation to use active org

---

## Validation & Permissions

### Accept Invitation
- ✅ User email matches invitation email
- ✅ Invitation status is PENDING
- ✅ Organization exists

### Update Member Role
- ✅ User is OWNER of organization
- ✅ Not changing own role
- ✅ Not removing last OWNER

### Remove Member
- ✅ User is OWNER or ADMIN
- ✅ Not removing self
- ✅ Not removing last OWNER

### Switch Organization
- ✅ User is member of target organization
- ✅ Organization exists

---

## UI/UX Considerations

### Invitations Page
- Badge count in navbar
- Clear accept/decline actions
- Show invitation details
- Success/error messages

### Member Management
- Role badges with colors
- Inline role editing
- Confirmation for removal
- Disabled actions for own membership

### Organization Switcher
- Quick access from navbar
- Visual indicator of active org
- Smooth switching experience
- Persist across page loads

Ready to implement!
