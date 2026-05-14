# Phase 9: B2B Sidebar Navigation Redesign

## Goal
Transition the application layout from a consumer-style top-heavy navbar to a professional B2B-style sidebar layout. This aligns the visual structure with the new organization-first focus.

## Proposed Layout Structure

### 1. Top Header (`components/shared/TopHeader.tsx`)
A slim, sticky top bar focusing on global context and user actions:
- **Left**: CorpConnect Logo (clickable to Dashboard) + Mobile Menu Toggle
- **Right**: Organization Switcher (Current Context) + User Profile Dropdown (Logout, Profile)

### 2. Left Sidebar (`components/shared/Sidebar.tsx`)
A fixed left sidebar for primary and secondary navigation, divided into logical B2B sections.

**Main Navigation:**
- 🏠 **Dashboard** (`/dashboard`)
- 🏢 **Discover Orgs** (`/organizations/discover`)
- 🤝 **Industry Groups** (`/groups`)
- 📅 **Events Directory** (`/events`)
- 🎟️ **My Events** (`/my-events`)

**Organization Management (Requires Active Org):**
- ⚙️ **My Organization** (`/organizations/[id]`) - Dynamically links to active org profile
- 📊 **Org Dashboard** (`/organizations/[id]/dashboard`)
- ✉️ **Connections** (`/organizations/[id]/dashboard?tab=connections`)

**Administration:**
- 👤 **My Profile** (`/profile`)
- 🛡️ **Admin Console** (`/admin/dashboard` - only visible to app admins)

### 3. Main Content Area
- Adjust `app/(protected)/layout.tsx` to use a CSS Grid or Flex row layout.
- The sidebar will be fixed on desktop and hidden behind a hamburger menu on mobile.
- The main content area will take up the remaining width (`flex-1`).

## Implementation Steps

1. **Create Sidebar Component**: Build a new `Sidebar.tsx` component using `lucide-react` icons and reading the `activeOrganizationId` from the session to determine dynamic links.
2. **Create TopHeader Component**: Refactor the existing `Navbar.tsx` logic (Logo, Org Switcher, User Dropdown) into `TopHeader.tsx`.
3. **Update Protected Layout**: Modify `app/(protected)/layout.tsx` to wrap `children` in a flex container alongside the Sidebar and below the Top Header.
4. **Update Constants**: Create a new `sidebarLinks` constant in `@/constants/index.ts` to manage the static links cleanly.
5. **Mobile Responsiveness**: Build a `MobileSidebar` component (using shadcn `Sheet` or native overlay) to handle opening the navigation on small screens.
