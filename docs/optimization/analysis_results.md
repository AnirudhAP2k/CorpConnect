# Next.js Rendering Strategies Audit Report

## Executive Summary
This audit evaluated the application's use of Next.js App Router rendering strategies (CSR, SSR, SSG, ISR). The application utilizes the Next.js App Router (`app` directory) with version `^15.5.9`. 

While some features of the App Router are utilized appropriately, the application heavily relies on Client-Side Rendering (CSR) and traditional API routes for data fetching in key areas. Transitioning to React Server Components (SSR) and Incremental Static Regeneration (ISR) for public-facing pages will drastically improve SEO, initial page load speed, and overall performance.

## Findings by Strategy

### 1. Client-Side Rendering (CSR)
**Current Implementation:**
The application uses the `"use client"` directive extensively. 
- **UI Components:** Correctly used in interactive components like `Button`, `Dialog`, `Select`, `ThemeProvider`, and forms (`EventsForm`, `OrganizationForm`).
- **Pages:** The landing page (`app/(root)/page.tsx`) is entirely a Client Component. It uses a `useEffect` and `axios.get("/api/events")` to fetch data.

**Missed Potential:** 
Using CSR for the public landing page is an anti-pattern in the App Router. It prevents search engines from indexing the events properly and forces the user to wait for JavaScript to load before seeing the content. 

### 2. Server-Side Rendering (SSR) & Server Components
**Current Implementation:**
- Some protected routes and deeper pages (e.g., `app/invite/[token]/page.tsx`) correctly use Server Components by directly querying the database using `await prisma...`. This is an excellent use of the App Router's capabilities.
- Much of the data logic is kept inside traditional `app/api/.../route.ts` route handlers.

**Missed Potential:**
Route Handlers (`app/api/*`) called from Client Components should be minimized. Instead, data fetching should occur directly in Server Components, or via Server Actions for form submissions and mutations. The core entities (Events, Organizations) are largely fetched via API routes from Client Components rather than pre-rendered on the server.

### 3. Static Site Generation (SSG)
**Current Implementation:**
There is no explicit use of `generateStaticParams` for dynamic routes like event detail pages or public organization profiles. By default, Next.js will statically render Server Components that don't use dynamic functions (`cookies()`, `headers()`), but since many pages are either Client Components or fetch via internal APIs, SSG is not fully leveraged.

**Missed Potential:**
Event pages and public profiles are prime candidates for SSG. They change infrequently and should be statically generated at build time (and updated via ISR) to provide instantaneous load times.

### 4. Incremental Static Regeneration (ISR)
**Current Implementation:**
The application does utilize ISR in a few places:
- `(protected)/organizations/discover/page.tsx` uses `export const revalidate = 300;`
- `(protected)/organizations/[id]/page.tsx` uses `export const revalidate = 60;`

**Missed Potential:**
ISR is used for protected routes, but the public-facing pages (which benefit most from ISR for caching at the edge) do not currently utilize it. Public events feeds and organization lists should be cached and revalidated using `revalidatePath` and fetch cache tags.

## Recommendations for Improvement

1. **Refactor the Home Page (`app/(root)/page.tsx`):**
   - Remove `"use client"`.
   - Move the database query (`getAllEvents`) directly into the Server Component.
   - Await the data on the server and pass it down to client components only for interactive filtering and pagination.

2. **Leverage Server Actions:**
   - Instead of standard API routes (`app/api/*`) for forms (creating events, updating organizations), transition to React Server Actions. This integrates tightly with `revalidatePath` to instantly update the UI without client-side state management.

3. **Implement SSG for Dynamic Public Routes:**
   - Use `generateStaticParams` in `app/events/[id]/page.tsx` to pre-build popular events at compile time.

4. **Strategic Caching via `unstable_cache` or Fetch tags:**
   - For database queries executed within Server Components, wrap them in Next.js cache mechanisms so database load is minimized for frequently accessed but rarely changing data.
