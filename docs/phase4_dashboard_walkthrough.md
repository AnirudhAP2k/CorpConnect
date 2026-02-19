# Phase 4: Stakeholder Dashboards — Walkthrough

## What Was Built

Phase 4 delivers real, data-driven dashboards for three distinct user roles and upgrades the existing static user dashboard.

---

## 1. Schema Update

### `isAppAdmin` field added to `User` model

```diff
+ isAppAdmin Boolean @default(false)
```

- Applied via `npx prisma db push` (migrate dev failed due to remote DB permission constraint)
- Prisma Client regenerated (`v6.3.0`)
- Confirmed in `node_modules/.prisma/client/index.d.ts`

To make a user an app admin, run in psql / DB console:
```sql
UPDATE "User" SET "isAppAdmin" = true WHERE email = 'your@email.com';
```

---

## 2. Files Created / Modified

### Data Layer
| File | Description |
|------|-------------|
| [`data/dashboard.ts`](file:///d:/evently/data/dashboard.ts) | Central data access layer for all dashboards |

**Functions:**
- `getOrgDashboardStats(orgId)` — events hosted/attending, members, revenue
- `getOrgRecentActivity(orgId)` — last 15 participations feed
- `getOrgRevenueBreakdown(orgId)` — revenue by event + monthly chart data
- `getUserDashboardStats(userId)` — personal event counts + upcoming events
- `getRecommendedEvents(userId, industryId)` — rule-based recommendations
- `getAdminPlatformStats()` — platform-wide user/org/event/participation counts
- `getAdminRevenueStats()` — platform revenue by org + monthly breakdown
- `getAdminOrgsList(skip, take, search)` — paginated org list
- `getAdminUsersList(skip, take, search)` — paginated user list with org relation
- `getAdminEventsList(skip, take, search)` — paginated events list
- `getAdminJobQueueHealth()` — job status counts + recent failures

### Shared Components
| File | Description |
|------|-------------|
| [`components/dashboard/StatCard.tsx`](file:///d:/evently/components/dashboard/StatCard.tsx) | Stat card with icon, value, trend indicator |
| [`components/dashboard/EventRow.tsx`](file:///d:/evently/components/dashboard/EventRow.tsx) | Compact event list item with date block and badges |
| [`components/dashboard/RevenueWidget.tsx`](file:///d:/evently/components/dashboard/RevenueWidget.tsx) | Revenue summary with bar chart, top items, and payment gateway placeholder |

### Organization Dashboard
| File | Description |
|------|-------------|
| [`app/(protected)/organizations/[id]/dashboard/page.tsx`](file:///d:/evently/app/(protected)/organizations/[id]/dashboard/page.tsx) | Org dashboard — stats, events, revenue, activity feed, AI placeholder |

**Access:** OWNER and ADMIN of the org only. Others are redirected to the org public page.

### Admin Dashboard (App-wide)
| File | Description |
|------|-------------|
| [`app/admin/layout.tsx`](file:///d:/evently/app/admin/layout.tsx) | Admin sidebar layout — gates access by `isAppAdmin`, redirects others |
| [`app/admin/dashboard/page.tsx`](file:///d:/evently/app/admin/dashboard/page.tsx) | Platform overview: stats, revenue, job health, recent orgs |
| [`app/admin/organizations/page.tsx`](file:///d:/evently/app/admin/organizations/page.tsx) | Paginated org list with search |
| [`app/admin/users/page.tsx`](file:///d:/evently/app/admin/users/page.tsx) | Paginated user list with org membership and admin badges |
| [`app/admin/events/page.tsx`](file:///d:/evently/app/admin/events/page.tsx) | Platform-wide events with type/visibility badges |
| [`app/admin/jobs/page.tsx`](file:///d:/evently/app/admin/jobs/page.tsx) | Job queue health with failed job details |

### User Dashboard (Upgraded)
| File | Description |
|------|-------------|
| [`app/(protected)/dashboard/page.tsx`](file:///d:/evently/app/(protected)/dashboard/page.tsx) | Replaced static placeholders with live data, added recommendations and org cards |

### Auth
| File | Description |
|------|-------------|
| [`auth.ts`](file:///d:/evently/auth.ts) | `isAppAdmin` persisted in JWT token + session |
| [`next-auth.d.ts`](file:///d:/evently/next-auth.d.ts) | `isAppAdmin: boolean` added to `ExtendedUser` type |

### Documentation
| File | Description |
|------|-------------|
| [`docs/task.md`](file:///d:/evently/docs/task.md) | Updated with Phase 4 progress + Phase 5/6/7 roadmap |
| [`docs/phase4_dashboard_implementation_plan.md`](file:///d:/evently/docs/phase4_dashboard_implementation_plan.md) | Implementation plan moved to docs |
| [`docs/phase3_participation_flow_walkthrough.md`](file:///d:/evently/docs/phase3_participation_flow_walkthrough.md) | Phase 3 walkthrough moved to docs |

---

## 3. TypeScript Verification

```
npx tsc --noEmit
```

**Result: Zero new errors.** Only the 4 pre-existing errors remain (documented since Phase 2):
- `__tests__/sample.test.ts` — missing jest-dom types
- `api/organizations/route.ts` — Prisma industryId type mismatch  
- `components/shared/Navbar.tsx` — image src null check
- `data/two-factor-token.ts` — TwoFactorToken unique input

> [!NOTE]
> The TS Language Server may show `isAppAdmin` errors due to stale cache. Run `tsc --noEmit` to confirm — it compiles clean. A TS server restart (`Ctrl+Shift+P` → "TypeScript: Restart TS Server") will clear the LSP cache.

---

## 4. Dashboard Feature Summary

### Organization Dashboard (`/organizations/[id]/dashboard`)
- **5-stat header:** Events Hosted · Events Attending · Members · Total Attendees · Revenue
- **Hosted events list** with capacity indicator (from `getHostEvents`)
- **Attending events list** (from `getAttendingEvents`)
- **Revenue widget** with monthly bar chart and top events by revenue
- **Activity feed** — last 15 participations across org's events
- **AI-ready placeholder** panel linking to Phase 7 roadmap

### Admin Dashboard (`/admin/dashboard`)
- **Platform stats:** Total users, orgs, events, participations (with this-month delta)
- **Revenue widget** — platform-wide, by org
- **Job queue health** — status grid + last 10 failed jobs with error messages
- **Recent organizations** table

### Admin Sub-pages
- `/admin/organizations` — search + paginated org list
- `/admin/users` — search + user table with org/admin role badges
- `/admin/events` — search + events with type/visibility badges
- `/admin/jobs` — job status overview + failed job detail

### User Dashboard (`/dashboard`)
- Live stats (events hosted, attending, org count, upcoming)
- Upcoming registered events list
- Your organizations panel (with "Dashboard" quick-link for OWNER/ADMIN)
- Rule-based recommended events (same industry, not yet joined)
- Admin Console button (visible only to `isAppAdmin` users)

---

## 5. Future Phases Roadmap (in task.md)

| Phase | Focus |
|-------|-------|
| **5** | Data collection for AI (view tracking, tag system, export endpoints) |
| **6** | Payment gateway (Stripe/Razorpay) — revenue widgets already stubbed |
| **7** | Python/FastAPI AI microservice — smart recommendations, semantic search, sentiment analysis |
