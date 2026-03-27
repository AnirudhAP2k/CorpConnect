# Future Improvement Plan: Domain-Driven Design (DDD) Architecture Migration

This document outlines the step-by-step plan to transition the CorpConnect platform's current architecture to a Domain-Driven Design (DDD) / Vertical Slice Architecture.

## Goal
To decouple business logic from the Next.js routing layer (API routes) and UI components. This will improve code cohesion, enable true Server-Side Rendering (SSR) via React Server Components, and allow the same backend logic to cleanly serve both the Next.js Web Application and future Mobile Applications.

## Target Architecture Structure
The codebase will be reorganized around business entities (domains) rather than technical concerns.

```text
/domain
  /[entity-name] (e.g., events, organizations, users)
    ├── index.ts        # Public API for the domain (exports functions to be used elsewhere)
    ├── actions.ts      # Server Actions (Mutations: create, update, delete)
    ├── queries.ts      # Data Fetching (DML: getById, getAll)
    ├── validation.ts   # Zod validation schemas specific to the entity
    └── types.ts        # TypeScript interfaces and types
```

---

## Migration Steps

### Phase 1: Preparation & Scaffolding
1. **Identify Domains:** Clearly define the core domains of the application. Based on the current schema, these involve:
   - `events`
   - `organizations`
   - `users`
   - `tags`
   - `groups`
   - `jobs` (or background processes)
2. **Create the Foundation:** Create a `/domain` folder at the root of the project. Inside, create folders for each identified domain.

### Phase 2: Extracting the Core Logic (Domain by Domain)
For each domain (starting with the most central, e.g., `events`), perform the following extraction:

1. **Move Types & Validation (`domain/[entity]/types.ts` & `validation.ts`):** 
   - Extract relevant Zod schemas from `/lib/validation.ts` into the domain's `validation.ts`.
   - Move related TypeScript interfaces from `/lib/types.ts` or directly from components into `types.ts`.
2. **Extract Queries (`domain/[entity]/queries.ts`):**
   - Locate all `prisma.[entity].findMany`, `findUnique`, and `findFirst` operations currently residing in `app/api/**/route.ts` or inline within Server Components.
   - Move these into isolated, exported asynchronous functions in `queries.ts`.
   - Ensure these functions handle their own basic error catching and return strongly typed data.
3. **Extract Actions (`domain/[entity]/actions.ts`):**
   - Locate all `prisma.[entity].create`, `update`, and `delete` operations in API route handlers.
   - Move these into exported asynchronous functions marked with `"use server"` at the top of the file to designate them as Server Actions.
   - Implement Zod validation checks at the beginning of these actions.
4. **Establish the Public Contract (`domain/[entity]/index.ts`):**
   - Export only the necessary functions, types, and schemas from the `index.ts` file so other parts of the app can consume them cleanly.

### Phase 3: Web Application Refactoring (Next.js App Router)
Now that the core logic is accessible via the `/domain` directory, refactor the Next.js frontend to use it:

1. **Convert to Server Components:**
   - Identify pages currently using `"use client"` purely for data fetching (e.g., `app/(root)/page.tsx` fetching events).
   - Remove `"use client"`.
   - Remove `useEffect` and `axios`/`fetch` calls.
   - Import the corresponding query from `/domain/[entity]` and `await` it directly within the Server Component.
2. **Refactor Client Mutations to Server Actions:**
   - In form components (e.g., `EventsForm`), replace `axios.post('/api/events')` with direct calls to the Server Actions imported from `/domain/[entity]/actions.ts`.
   - Utilize Next.js hooks like `useTransition` or `useActionState` to handle loading states for these actions.

### Phase 4: Mobile API Route Refactoring (Thin Wrappers)
The existing `app/api/*` routes currently house a lot of business logic. They must be refactored to act strictly as an HTTP interface for the future mobile app.

1. **Strip Business Logic:** Remove Prisma calls and complex validation from the API route handlers.
2. **Implement Thin Wrappers:** Have the API route extract the request parameters/body, call the appropriate function from `/domain/[entity]`, and return the result formatted using `NextResponse.json()`.

```typescript
// Example refactored API Route (app/api/events/route.ts)
import { getAllEventsService } from "@/domain/events";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const events = await getAllEventsService(/* extract params */);
        return NextResponse.json(events, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}
```

### Phase 5: Verification & Cleanup
1. **Audit Imports:** Ensure no UI components or API routes are importing directly from `/lib/db` (Prisma) or bypassing the `/domain` layer.
2. **Test:** Run all existing test suites to ensure the refactoring hasn't broken core functionality.
3. **Remove Dead Code:** Delete old utility files or consolidated validations that are no longer used.

## Benefits of this Migration
- **SEO & Performance:** By moving data fetching to Server Components, the web app will serve fully populated HTML documents, avoiding client-side loading spinners for critical content.
- **Reusability:** The identical business logic handles both web browser renders and mobile API requests.
- **Maintainability:** Developers working on the core platform logic only need to navigate the `/domain` folder, rather than hunting through UI routes and generic libraries.

---

## Phase 6: Rendering Strategy Optimization (Performance & SEO)
Following the DDD migration, the application's rendering strategies must be optimized to leverage Next.js features fully. This will drastically improve First Contentful Paint (FCP) and SEO rankings.

### 1. Refactor Home Page (`app/(root)/page.tsx`) from CSR to SSR
- **Remove:** Delete the `"use client"` directive at the top of the file.
- **Remove Hooks:** Remove the `useEffect`, `useState`, and `axios.get` calls used for data fetching.
- **Implement Server Fetching:** Make the `Home` component an `async` function and await the new `getAllEventsService()` directly from the server.
- **Pass Data:** Pass the fetched events array directly down to the `<Collection />` component. Client components will only be used where interactivity (like searching/filtering) is explicitly needed.

### 2. Implement Static Site Generation (SSG) for Public Profiles & Events
- **Events Detail Pages:** In `app/events/[id]/page.tsx`, export a `generateStaticParams()` function. This should fetch the IDs of the most popular/upcoming events and pre-build their HTML pages at compile time.
- **Organizations Public Pages:** Similarly, use `generateStaticParams()` to pre-render the pages for top organizations.
- **Fallback:** Ensure `dynamicParams = true` (default) so that newly created events or organizations are generated on-demand when first visited.

### 3. Implement Incremental Static Regeneration (ISR)
- **Public Feeds:** For the generic public event feeds or directories where SSG is not feasible for every single item, configure ISR.
- **Cache Tags:** Use Next.js fetch caching (`{ next: { tags: ['events'] } }`) inside your DML queries (`domain/events/queries.ts`).
- **Revalidate:** In your Server Actions (e.g., `createEvent`, `updateEvent`), call `revalidateTag('events')` instead of heavily relying on `revalidatePath`. This instantly updates the cached data across the Edge network without requiring a full container rebuild.
- **Time-based Revalidation:** For moderately changing data where real-time accuracy isn't critical, add `export const revalidate = 60;` (or similar intervals) to the `page.tsx`.

### 4. Transition Forms to Server Actions
- **Forms (`EventsForm`, `OrganizationForm`):** Currently reliant on client-side React Hook Form + Axios.
- **Action State:** Refactor to use React's `useActionState` (or `useFormState`) to submit directly to the Server Actions defined in the `/domain` layer. This removes the need for intermediary API routes and provides out-of-the-box progressive enhancement.
