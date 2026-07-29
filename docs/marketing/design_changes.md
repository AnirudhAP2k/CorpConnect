# CorpConnect Design Consistency Plan

> Extracted from the go-to-market plan. Covers the design system work needed before
> paying B2B customers see the product, plus the Google Stitch tooling setup used to
> drive the redesign of the off-brand surfaces.
>
> Companion document: [go_to_market_plan.md](go_to_market_plan.md)

---

## Diagnosis: an adoption problem, not a design problem

The Stitch-derived "Nexus Corporate" token set in [tailwind.config.ts](../../tailwind.config.ts) (lines 63-125) is solid, and the marketing pages prove the brand can look premium. The problem is that the token system was never enforced:

- 33 files use `nx-*` tokens (~652 matches)
- 82 files still use hardcoded `text-gray-*`, `bg-white`, `bg-slate-*` (~484 matches)

The result is **three visual identities inside one product**:

| Surface | State |
| :--- | :--- |
| Marketing (`/`, `/about`, `/pricing`) plus profile, messaging, pitches | On-brand, heavy `nx-*` usage |
| Dashboard, events list, event detail, org profile, my-events | Generic gray Tailwind, rainbow badge colors, legacy `.h2-bold` utilities |
| Billing, pitch tasks, auth, onboarding | Separate themes entirely - `billing.css` is dark indigo/slate with 68 hex values |

For a paying B2B buyer, **the inconsistency is more damaging than any single ugly screen**. It signals the product is not fully owned yet.

### Scope: the demo path only

Do **not** redesign all 30 protected routes. Migrate the sequence a prospect actually walks through:

```
register -> login -> onboarding -> dashboard -> event create -> event detail -> org profile -> billing
```

---

## Decisions taken

- **Stitch MCP will be used** as the design source. The original "B2B Network Redesign" project still exists.
- **Dark mode will be implemented properly**, not removed. See the scope consequence below.
- **Billing is the highest-priority rebuild**, because it is the screen where customers pay and it is currently the most off-brand page in the app.

---

## Step 1 - Quick credibility wins

A day or two of work, disproportionate payoff.

- **Temporarily hide the theme toggle** in [components/shared/ThemeToggle.tsx](../../components/shared/ThemeToggle.tsx) / `TopHeader`, then re-expose it once the dark token layer and demo-path migration land. `next-themes` is wired up, but `nx-*` has no dark variants and `globals.css` hardcodes `body` to `#fbf9fa`, so clicking it today yields a half-inverted broken UI. A prospect clicking this during a demo is a bad outcome.
- **Add a favicon and app icon.** None exist anywhere in the repo; the browser tab shows a generic placeholder.
- **Remove emoji from UI chrome:** `🔐 Auth` in [components/auth/Header.tsx](../../components/auth/Header.tsx) line 13, `🎉` in onboarding, `⚡ Admin Console` on the dashboard, and the emoji intent badges on the org profile.
- **Fix `font-poppins`**, referenced in the auth header but never loaded in [app/layout.tsx](../../app/layout.tsx), so it silently falls back. Either load Poppins or switch to `font-headline`.
- **Replace the raw `alert()`** in [components/shared/DeleteConfirmation.tsx](../../components/shared/DeleteConfirmation.tsx) line 36 with the existing `AlertDialog` primitive, and drop its `console.log`.
- **Restore focus rings.** `globals.css` lines 252-260 set `focus-visible:ring-transparent` on `.input-field`, `.select-field`, and `.textarea`, stripping keyboard focus indicators from every legacy form.

---

## Step 2 - Establish the token contract

This is what stops future drift.

- Use the Stitch MCP `fetch_design_md` to pull the authoritative `DESIGN.md` from the "B2B Network Redesign" project and commit it as the design spec.
- Pull screen references for billing, auth, and onboarding via `fetch_screen_image` / `fetch_screen_code`.
- Add an ESLint or Tailwind lint rule rejecting raw `gray-*` / `slate-*` / `white` utilities and hex literals under `app/` and `components/`. Nothing currently enforces token usage, which is precisely why 82 files drifted.

---

## Step 3 - Dark mode: convert tokens to CSS variables first

`nx-*` tokens are currently **static hex literals** in [tailwind.config.ts](../../tailwind.config.ts) lines 63-118, so `bg-nx-surface` emits a fixed color regardless of the `.dark` class. Meanwhile the shadcn CSS variables already have a working `.dark` block in `globals.css` lines 58-89, which is why dark mode half-works today.

Do **not** add `dark:` variants at the ~652 usage sites. Instead:

- Move every `nx-*` value into CSS custom properties in `globals.css` under both `:root` and `.dark`, alongside the existing shadcn block.
- Store them as **space-separated RGB channels**, not hex, and reference them in the Tailwind config as `rgb(var(--nx-primary) / <alpha-value>)`. Plain `var(--nx-primary)` breaks Tailwind's opacity modifiers, which are already in use - for example `via-nx-primary/90` in the pricing page CTA at line 126. Done this way, all existing usages become theme-aware with **zero component edits**.
- Remove the hardcoded `background-color: #fbf9fa` and `color: #1b1c1d` from `body` (globals.css lines 99-106) and use the token variables, so `.dark` actually takes effect.
- Convert `nx-cta-gradient` in the Tailwind config (line 139), which hardcodes `#041627` and `#1a2b3c`.

### MD3 semantics worth respecting

- The `*-fixed` and `*-fixed-dim` tokens are **by definition identical in both themes**, so they need only one value.
- Only the surface, on-surface, outline, primary/secondary/tertiary container, and error roles need distinct dark values.
- A dark palette is not a mechanical inversion of the light one. Derive it from the Stitch `DESIGN.md` if that includes a dark scheme.
- While in here, check contrast on `nx-on-primary-container` (`#8192a7`) against navy backgrounds; it likely fails WCAG AA for small text.

### Scope consequence to accept

Choosing full dark mode means the 82 files still using hardcoded `gray-*` / `bg-white` **cannot render correctly in dark mode**. The migration below therefore stops being optional for any screen a customer touches. Keep the toggle hidden until the demo path is migrated, then ship it.

---

## Step 4 - Rebuild the genuinely off-brand surfaces

These need new design rather than migration, which makes them the right use of Stitch generation.

- **Billing** - delete [app/(protected)/billing/billing.css](../../app/(protected)/billing/billing.css) (68 hex values, fixed 900px width, dark indigo theme) and rebuild on `nx-*` plus shadcn. Highest priority.
- **Auth** - replace the sky gradient in [app/(auth)/layout.tsx](../../app/(auth)/layout.tsx) and the fixed `w-[400px]` card wrapper. First login sets expectations.
- **Onboarding** and the **pitch tasks** page (inline hex colors such as `#ef4444`).
- Clean up the off-brand third-party overrides in `globals.css`: Clerk `#705CF7`, datepicker `#624cf5`, the indigo tag-input palette, and the violet `ChatWidget` bubbles.

---

## Step 5 - Migrate the remaining demo-path screens

- Move dashboard, events list, event create, event detail, and org profile off hardcoded grays onto `nx-*`.
- Collapse the **three parallel type systems** down to one: `font-headline`/`font-body`/`font-label` tokens, the legacy `.h1-bold` through `.p-medium-12` utilities in `globals.css` lines 144-248, and raw Tailwind `text-2xl`.
- Pick a single border-radius convention. Currently `rounded-full` in the header, `rounded-lg` in the sidebar, `rounded-xl` on marketing CTAs, and `rounded-md` from shadcn defaults all coexist.
- Verify every migrated screen in **both light and dark** before re-exposing the theme toggle.

### Missing shadcn primitives

`components/ui/` has 17 primitives but lacks several common B2B ones: `avatar`, `table`, `tooltip`, `popover`, `command`, `switch`, `progress`, `breadcrumb`. Add them as the migration needs them rather than hand-rolling.

---

## Step 6 - Add loading, error, and empty states

The repo currently has **zero** `loading.tsx`, `error.tsx`, and `not-found.tsx` files. Most protected pages are server-rendered and pop in fully with no transition, and route failures surface raw.

- Add route-level `loading.tsx` and `error.tsx` for the demo-path routes, plus a global `not-found.tsx`.
- Build skeletons modeled on the ones that already exist: `ui/skeleton`, `MessagingSkeletons`, `OrgCardSkeleton`, `SkeletonCard`.

---

## Step 7 - Fix mobile on the demo path

- **Messaging is functionally broken on mobile.** The conversation list is `hidden md:flex` in [app/(protected)/messaging/layout.tsx](../../app/(protected)/messaging/layout.tsx) line 128 and `ChatWindow` has no back button, so a phone user can view one conversation but cannot switch to another without editing the URL. Messaging is a headline feature and B2B buyers will open the product on their phone.
- Dashboard header (`dashboard/page.tsx` lines 76-97) uses a horizontal `flex justify-between` row with multiple buttons - check for overflow on small screens.
- Auth card wrapper is a fixed `w-[400px]` - tight at 320px.
- `OrganizationSwitcher` is `hidden md:block`, so org switching on mobile is only reachable through the sheet.

---

### Useful tools exposed

`fetch_design_md`, `fetch_screen_code`, `fetch_screen_image`, `list_projects`, `list_screens`, `export_project`, `generate_screen_from_text`, `generate_variants`, `edit_screens`, plus a design-system group: `create_design_system_from_design_md`, `apply_design_system`, `upload_design_md`, `list_design_systems`.

That last group matters: it lets us push the existing Nexus tokens **into** Stitch, so newly generated billing/auth/onboarding screens come out on-brand rather than generic.

### Tooling limitation

Stitch exports HTML/CSS/Tailwind, **not React**. Output needs hand-porting into the existing shadcn primitives. Treat Stitch as a design source, not a code generator.

---

## Ranked by impact on a paying B2B first impression

1. Three visual brands in one product - Nexus marketing vs gray product vs indigo billing/auth.
2. Token system defined but not enforced - 82 files on gray/white vs 33 on `nx-*`.
3. Emoji in product UI - auth header, onboarding, org badges, admin button.
4. No loading/error/not-found routes - reads as unfinished, failures feel brittle.
5. Messaging broken on mobile - no way to switch conversations.
6. Auth and onboarding first-run experience off-brand - contradicts the marketing site.
7. Dark mode toggle that breaks the product when clicked.
8. Typography and radius inconsistency - three type systems, four radius conventions.
9. Legacy overrides suppress focus rings and inject off-brand purple.
10. No favicon or app icon.

---

## Implementation status

| Step | State |
| :--- | :--- |
| 1 - Quick credibility wins | **Done.** Emoji removed, `font-poppins` -> `font-headline`, favicon added, focus rings restored, `alert()` -> `sonner` toast, theme toggle hidden. |
| 2 - Token contract | **Partial.** `DESIGN.md` pulled from Stitch and committed at the repo root. The lint rule banning raw colors is **not** written yet. |
| 3 - Dark mode CSS variables | **Done.** All `nx-*` tokens are `rgb(var(--token) / <alpha-value>)`; 55 tokens defined in `:root`, 43 overridden in `.dark`, the 12 `*-fixed` roles correctly theme-invariant. |
| 4 - Off-brand rebuilds | **Partial.** `billing.css` deleted and billing + `PricingPlans` rebuilt on tokens; third-party overrides (Clerk, datepicker, tag input) detokenized. Auth, onboarding, and pitch tasks still pending. |
| 5 - Demo-path migration | **Not started.** 84 files / ~538 occurrences still use `bg-white` and `text-gray-*`. |
| 6 - Loading and error states | **Not started.** Still zero `loading.tsx` / `error.tsx` / `not-found.tsx`. |
| 7 - Mobile | **Not started.** Messaging conversation list is still `hidden md:flex` with no back button. |

### The theme is force-pinned to light — this must be reverted

`app/layout.tsx` passes `forcedTheme="light"` to `ThemeProvider`. Hiding the toggle alone was not enough: `next-themes` reads `localStorage`, so a stored `dark` or `system` preference from an earlier session still applied `.dark`, and because Step 5 is incomplete, that renders light cards on a dark body with no visible control to escape.

**To ship dark mode**, do all three together, in this order:

1. Complete the Step 5 migration (the 84 files above).
2. Remove `forcedTheme="light"` from `app/layout.tsx`.
3. Re-expose `<ThemeToggle />` in `components/shared/TopHeader.tsx` (two commented call sites; the import was removed and must be restored).

### Token set additions

`nx-success` and `nx-warning` were added (each with `-container`, `on-`, and `on-*-container` variants, mirroring the existing `error` role) because the Stitch palette ships **only** an error role. That gap was the reason status colors kept being hardcoded — the billing page had inline `#22c55e` and `#f59e0b`, and `MemberPitchCard` still carries a rainbow of `bg-blue-50` / `bg-amber-50` / `bg-emerald-50` badges that should move onto these roles during Step 5.

Note these values were authored to MD3 tonal conventions, **not** taken from Stitch. The same caveat applies to the entire `.dark` palette: `DESIGN.md` contains no dark scheme, so all 43 dark values are derived rather than specified. Validate them against the brand before shipping dark mode.

### Known deviations from DESIGN.md

- **Pill buttons.** `DESIGN.md` says *"Don't use the `full` (pill) roundedness scale for buttons"*, but `rounded-full` is used throughout the header, auth, and form fields. Fold into the Step 5 radius unification.
- **Input backgrounds.** `DESIGN.md` specifies `surface_container_lowest`; the implementation uses `surface-container-low` to preserve the existing `#F6F6F6` appearance. Reconcile deliberately.
- **The "No-Line" rule.** Sectioning borders remain on the messaging sidebar and tag inputs. `DESIGN.md` wants boundaries from background shifts alone, with a 15%-opacity ghost border as the only fallback; the tag input currently uses 60%.
- **Contrast.** `nx-on-primary-container` (`#8192a7`) against navy is still unverified for WCAG AA on small text.
