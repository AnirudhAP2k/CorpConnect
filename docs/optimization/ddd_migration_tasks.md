# Domain-Driven Design (DDD) Migration Plan & Tasks

## Overview
This document tracks the incremental migration of the CorpConnect Next.js platform to a Domain-Driven Design (Vertical Slice) architecture. The goal is to decouple business logic from the Next.js routing layer to improve cohesion, enable true Server-Side Rendering (SSR), and allow the same backend logic to cleanly serve both web and mobile applications.

## Strategy: Iterative Strangler Fig
For each domain, we follow a 4-step cycle to ensure the system remains functional at all times:
1. **Scaffold:** Create `/domain/[entity]/` with `types.ts` and `validation.ts`.
2. **Core Logic:** Implement `queries.ts` (data fetching) and `actions.ts` (mutations) using the underlying database (Prisma).
3. **API Refactor (Thin Wrapper):** Update existing `/app/api/[entity]/` routes to call the new domain functions instead of running DB queries directly.
4. **UI Refactor:** Transition Next.js client components to Server Components and Server Actions, removing Axios/Fetch calls.

---

## Phase 1: Low-Risk Domain (Tags)
- [x] **1. Scaffold Domain**
  - [x] Create `/domain/tags/types.ts`
  - [x] Create `/domain/tags/validation.ts`
- [x] **2. Core Logic**
  - [x] Create `/domain/tags/queries.ts` (e.g., `getAllTags`)
  - [x] Create `/domain/tags/actions.ts` (e.g., `createTag`)
  - [x] Create `/domain/tags/index.ts` (Exports)
- [x] **3. API Refactor**
  - [x] Refactor `/app/api/tags/route.ts` to use domain functions.
- [x] **4. UI Refactor**
  - [x] Identify components using tags and refactor to Server Components/Actions.

## Phase 2: Moderate-Risk Domain (Organizations)
- [x] **1. Scaffold Domain**
  - [x] Create `/domain/organizations/types.ts` & `validation.ts`
- [x] **2. Core Logic**
  - [x] Create `/domain/organizations/queries.ts`
  - [x] Create `/domain/organizations/actions.ts`
  - [x] Create `/domain/organizations/index.ts`
- [x] **3. API Refactor**
  - [x] Refactor `/app/api/organizations/route.ts`
  - [x] Refactor `/app/api/organizations/[id]/route.ts`
  - [x] Refactor `/app/api/organizations/discover/route.ts`
- [x] **4. Backward-Compat Bridge**
  - [x] `data/organization.ts` → re-exports from domain
  - [x] `actions/organization.actions.ts` → re-exports from domain

## Phase 3: Core Domain (Events)
- [x] **1. Scaffold Domain**
  - [x] Create `/domain/events/types.ts` & `validation.ts`
- [x] **2. Core Logic**
  - [x] Create `/domain/events/queries.ts` (getEventById, getEvents paginated, getUserEvents, getHostEvents, getAttendingEvents, getPastEvents, getMeetingRequestsForEvent, getMatchingOrgsForEvent)
  - [x] Create `/domain/events/actions.ts` (createEventAction, updateEventAction, deleteEventAction)
  - [x] Create `/domain/events/index.ts`
- [x] **3. API Refactor**
  - [x] Refactor `/app/api/events/route.ts`
  - [x] Refactor `/app/api/events/[id]/route.ts`
- [x] **4. Backward-Compat Bridge**
  - [x] `data/events.ts` → re-exports from domain
- [x] **5. UI Refactor**
  - [x] `app/(protected)/events/page.tsx` migrated from raw `getAllEvents` to typed `getEvents` domain query, and Feeds.

## Phase 4: Core Domain (Users & Auth)
- [x] **1. Scaffold Domains**
  - [x] Create `/domain/users/types.ts`, `validation.ts`, `queries.ts`, `actions.ts`, `index.ts`
  - [x] Create `/domain/auth/types.ts`, `queries.ts`, `actions.ts`, `index.ts`
- [x] **2. Core Logic**
  - [x] `domain/users/queries.ts`: getUserById, getUserByEmail, getPublicUserById, getUserWithOrgs, getUserTier (Prisma ApiTier)
  - [x] `domain/users/actions.ts`: setActiveOrganizationAction, updateUserProfileAction
  - [x] `domain/auth/queries.ts`: all token lookups (verification, password-reset, 2FA tokens & confirmations)
  - [x] `domain/auth/actions.ts`: registerAction, verifyEmailAction, requestPasswordResetAction, setNewPasswordAction, sendTwoFactorCodeAction, verifyTwoFactorCodeAction
- [x] **3. API Refactor**
  - [x] `app/api/auth/register/route.ts`
  - [x] `app/api/auth/password-reset/route.ts`
  - [x] `app/api/auth/token-verification/route.ts`
  - [x] `app/api/auth/set-password/route.ts`
  - [x] `app/api/user/active-organization/route.ts`
- [x] **4. Backward-Compat Bridges**
  - [x] `data/user.ts` → re-exports from `domain/users`
  - [x] `data/verificationToken.ts` → re-exports from `domain/auth`
  - [x] `data/password-reset-token.ts` → re-exports from `domain/auth`
  - [x] `data/two-factor-token.ts` → re-exports from `domain/auth` (with camelCase alias fix)
  - [x] `data/two-factor-confirmation.ts` → re-exports from `domain/auth`
- [x] **5. auth.ts Updated**
  - [x] `getUserTierWithActiveOrg` replaced by `getUserTier(activeOrganizationId)` from `domain/users`
  - [ ] Refactor User Profile pages and onboarding flows.

## Phase 5: Architecture Optimization
- [x] **SSR: Home Page** (`app/(root)/page.tsx`)
  - [x] Removed `"use client"`, `useState`, `useEffect`, `axios`
  - [x] Converted to `async` Server Component — events fetched directly via `getEvents()`
  - [x] Added `export const revalidate = 300` (ISR 5-min fallback)
- [x] **SSG: Event Detail Page** (`app/(protected)/events/[id]/page.tsx`)
  - [x] Added `generateStaticParams()` — pre-renders top 30 upcoming public events at build time
  - [x] Added `export const revalidate = 300` — fallback ISR for new events not in SSG set
  - [x] Removed direct `prisma` user query — replaced with `getPublicUserById()` from `domain/users`
  - [x] Consolidated duplicate `@/data/events` imports to single `@/domain/events` import
- [x] **ISR: Cache Tagging** (`domain/events/queries.ts`)
  - [x] `getEventById` wrapped with `unstable_cache(tag: 'events')` — instant edge invalidation via `revalidateTag('events')`
  - [x] `getEvents` wrapped with `unstable_cache(tag: 'events')` — home page and feeds invalidated on create/update/delete
  - [x] All mutation Server Actions already call `revalidateTag('events')` (from Phase 3)
