# Project Context

- **Owner:** Tyler Free
- **Project:** FamilyScheduler — a single-household family calendar web app for the Free family (7 members, Duvall, WA)
- **Stack:** Next.js + React + TypeScript, CSS Modules or Tailwind with design tokens, Zustand for state, localStorage initially (Supabase later), rrule.js for recurrence, date-fns-tz for timezone handling
- **Design reference:** `Design/HANDOFF.md` (spec) + 4 HTML prototype files in `Design/`
- **Created:** 2026-05-28

## Key Facts

- No implementation exists yet — design phase only
- The CSS time-grid math (`--start`/`--dur` CSS vars) is the most critical technical piece
- 7 settled decisions in HANDOFF.md that must not be reversed
- Fonts: Fraunces (serif italic), JetBrains Mono (ALL CAPS labels), Inter Tight (body)
- Family members: Tyler (owner, #c2410c), Heather (editor, #7c2d6f), Erin, Leo, Anthony, Savannah, Lily

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

### 2026-06-05 — Project Scaffold

**Architecture decisions made:**
- **CSS approach:** CSS Modules for component-scoped styles + `globals.css` for design tokens. No Tailwind — the time-grid math with CSS calc() and custom properties is cleaner in plain CSS, and there's no benefit to utility classes for this editorial aesthetic.
- **Router:** Next.js App Router (not Pages Router). Simpler layout nesting, server components by default.
- **Font loading:** `next/font/google` with `variable` option — fonts are available as `--font-fraunces`, `--font-inter-tight`, `--font-jetbrains-mono` CSS variables.
- **Test runner:** Vitest with jsdom environment. Faster than Jest, native ESM, good Next.js compatibility.
- **State:** Zustand (included in deps, store structure is Basher's call).
- **Types:** Full data model types already stubbed in `src/types/index.ts` matching HANDOFF.md exactly.

**Key file paths:**
- `src/app/globals.css` — all design tokens, CSS reset
- `src/app/layout.tsx` — root layout with font loading
- `src/types/index.ts` — Event, Member, Household types
- `vitest.config.ts` — test configuration with path aliases
- `.eslintrc.json` — extends next/core-web-vitals + next/typescript

**For Yen (Frontend):**
- Fonts are CSS variables: use `font-family: var(--font-fraunces)` in CSS Modules
- All design tokens from HANDOFF.md are in `globals.css` — use `var(--paper)`, `var(--ink)`, etc.
- Component styles go in `.module.css` files next to components
- The time-grid CSS math from HANDOFF.md can be implemented directly — `--start`, `--dur`, `--lane`, `--lanes` patterns work with plain CSS calc()
- Work in `src/components/calendar/` and `src/components/ui/`

**For Basher (Backend):**
- Types are already defined in `src/types/index.ts` — extend as needed
- Zustand stores go in `src/store/`
- Date utilities and recurrence helpers go in `src/lib/`
- Lane assignment algorithm goes in `src/lib/calendar/`
