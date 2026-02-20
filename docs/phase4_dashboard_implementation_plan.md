# Phase 4: Stakeholder Dashboards

Build real data-driven dashboards for **Organization owners/admins** and the **Application Admin** (SaaS platform operator).
The existing `/dashboard` user page remains as-is (static), and gets upgraded with live data as a side effect.

## User Review Required

> [!IMPORTANT]
> **Admin Role Strategy** — There is no global "app admin" role in the schema. The cleanest approach is to add a boolean `isAppAdmin` field to the `User` model in `schema.prisma` and run a migration. Admins are seeded/set manually in DB. The `/admin` route is protected by this flag.
>
> If you prefer an **environment-variable approach** (no schema change — e.g. `ADMIN_EMAILS=a@b.com`), I can use that instead. Please confirm before we proceed.

> [!NOTE]
> **Revenue/Cost Widgets** — Since Stripe is not fully integrated, revenue data will come from `EventParticipation.totalAmount` (stored as string). We will display totals per org and platform-wide. The widgets will be clearly marked as ready for AI-enhanced analytics in Phase 5.

---

## Proposed Changes

### 1. Database — Schema Update

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)
- Add `isAppAdmin Boolean @default(false)` field to `User` model
- Run `npx prisma migrate dev --name add_app_admin_flag`

---

### 2. Data Access Layer

#### [NEW] [dashboard.ts](file:///d:/evently/data/dashboard.ts)
Central data functions reused by all three dashboards:
- `getOrgDashboardStats(orgId)` — events hosted, events attending, total members, total revenue (sum of `totalAmount`)
- `getOrgRecentActivity(orgId)` — last 10 participations (joins/cancels) across org's events
- `getAdminPlatformStats()` — total users, orgs, events, participations (all-time + this month)
- `getAdminRevenueStats()` — platform-wide revenue breakdown by org and by month
- `getAdminOrgsList()` — paginated list of all orgs with member/event counts
- `getAdminJobQueueHealth()` — counts by `JobStatus` from the `JobQueue` model
- `getUserDashboardStats(userId)` — events hosted, events attending, connections
- `getRecommendedEvents(userId, orgId)` — basic recommendation (events in same industry the user hasn't joined yet)

---

### 3. Organization Dashboard

Route: `/organizations/[id]/dashboard` (OWNER and ADMIN only)

#### [NEW] [page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/dashboard/page.tsx)
Server component — fetches org dashboard stats, upcoming hosted/attending events, recent activity.

Sections:
| Widget | Data Source |
|--------|------------|
| 4-stat header strip | `getOrgDashboardStats()` |
| Upcoming Hosted Events | `getHostEvents(orgId)` (already exists) |
| Upcoming Attending Events | `getAttendingEvents(orgId)` (already exists) |
| Member Activity | Recent participations via `getOrgRecentActivity()` |
| Revenue Overview | `totalAmount` sum from EventParticipation |
| ⚡ AI Ready Panel | Static placeholder — "Smart Recommendations coming soon" |

#### [NEW] [OrgStatCard.tsx](file:///d:/evently/components/dashboard/OrgStatCard.tsx)
Reusable stat card with icon, value, label, and trend indicator (up/down vs last month).

#### [NEW] [OrgEventRow.tsx](file:///d:/evently/components/dashboard/OrgEventRow.tsx)
Compact event list item for dashboard use (date, title, attendee count, status badge).

#### [NEW] [RevenueWidget.tsx](file:///d:/evently/components/dashboard/RevenueWidget.tsx)
Displays total revenue, paid events count, avg revenue per event. Shows currency formatted from `totalAmount` strings.

---

### 4. Admin Dashboard

Route: `/admin/dashboard` (isAppAdmin only — middleware protected)

#### [MODIFY] [middleware.ts](file:///d:/evently/middleware.ts)
Protect `/admin/*` routes — redirect non-admins to `/dashboard`.

#### [NEW] [layout.tsx](file:///d:/evently/app/admin/layout.tsx)
Admin layout with a sidebar navigation: Overview, Organizations, Users, Events, Job Queue, Revenue.

#### [NEW] [page.tsx](file:///d:/evently/app/admin/dashboard/page.tsx)
Server component — fetches platform stats and renders overview widgets.

Sections:
| Widget | Data Source |
|--------|------------|
| Platform Stats (4-up) | `getAdminPlatformStats()` |
| Revenue Overview | `getAdminRevenueStats()` |
| Organizations Table | `getAdminOrgsList()` (top 10 by activity) |
| Job Queue Health | `getAdminJobQueueHealth()` |
| Users Joined This Month | `getAdminPlatformStats()` |
| ⚡ AI Integration Panel | Static placeholder for future chatbot + recommendations |

#### [NEW] [page.tsx](file:///d:/evently/app/admin/users/page.tsx)
Paginated user list with search, role badge, org membership, and joined date.

#### [NEW] [page.tsx](file:///d:/evently/app/admin/organizations/page.tsx)
Paginated org list with industry, size, member count, event count, verification status.

#### [NEW] [page.tsx](file:///d:/evently/app/admin/events/page.tsx)
Platform-wide event list with org, category, type, and participation count.

#### [NEW] [page.tsx](file:///d:/evently/app/admin/jobs/page.tsx)
Job queue viewer with status filter, retry counts, and error messages.

---

### 5. User Dashboard Upgrade

#### [MODIFY] [page.tsx](file:///d:/evently/app/(protected)/dashboard/page.tsx)
Replace static zeros with real data from `getUserDashboardStats()`.  
Add upcoming events list (first 3 by date).
Add "Recommended Events" section using `getRecommendedEvents()`.

---

### 6. Navigation Updates

#### [MODIFY] [constants/index.ts](file:///d:/evently/constants/index.ts)
- Add org dashboard link to org-specific navigation (within org pages)

#### [MODIFY] [Navbar.tsx](file:///d:/evently/components/shared/Navbar.tsx)
- Add "Admin" link (only visible when `session.user.isAppAdmin === true`)

---

## Verification Plan

### Automated
```bash
npx tsc --noEmit   # TypeScript check
npx prisma migrate dev --name add_app_admin_flag  # Schema migration
```

### Manual
1. Set `isAppAdmin = true` on a test user in DB
2. Verify `/admin/dashboard` accessible only by that user
3. Create an org + events + participations, verify org dashboard shows correct stats
4. Verify revenue widget sums `totalAmount` fields correctly
5. Verify recommended events exclude already-joined events
