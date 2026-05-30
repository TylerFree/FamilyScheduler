# Squad Decisions

## Active Decisions

### 1. CSS Modules + globals.css (NOT Tailwind)

**Author:** Rusty (Tech Lead)  
**Date:** 2026-06-05  
**Status:** Implemented

The HANDOFF.md design uses CSS custom properties extensively — `--start`, `--dur`, `--lane`, `--lanes` for time-grid math, `--c` for event chip colors. These patterns are cleaner in plain CSS with `calc()` than in Tailwind utility classes. Component-scoped styles use CSS Modules. All design tokens live in `globals.css`.

### 2. Next.js App Router

**Author:** Rusty (Tech Lead)  
**Date:** 2026-06-05  
**Status:** Implemented

Using App Router (not Pages Router). Server components by default, simpler layout composition for the settings page nav rail pattern.

### 3. Font Loading via next/font/google

**Author:** Rusty (Tech Lead)  
**Date:** 2026-06-05  
**Status:** Implemented

Fonts loaded with `variable` option, exposed as CSS custom properties:
- `--font-fraunces` (display, event titles, names)
- `--font-inter-tight` (body, helper text)
- `--font-jetbrains-mono` (labels, buttons, metadata)

### 4. Vitest (NOT Jest)

**Author:** Rusty (Tech Lead)  
**Date:** 2026-06-05  
**Status:** Implemented

Vitest as test runner — faster, native ESM, works well with modern Next.js. Config uses jsdom environment and resolves `@/*` path aliases.

### 5. Zustand for State

**Author:** Rusty (Tech Lead)  
**Date:** 2026-06-05  
**Status:** Decided

Lightweight, minimal boilerplate. Store structure is Basher's domain but the dependency is ready in package.json.

### 6. Strongly Typed Family Member IDs

**Author:** Basher (Backend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

Defined `FAMILY_MEMBER_IDS` const + `MemberId` type to enforce the seven canonical household IDs across all code paths: event ownership, attendee lists, drivers, member records. Paired with `FAMILY_MEMBER_DIRECTORY` as the typed source-of-truth for member metadata (name, color, role, permission).

### 7. JSON-Serializable Recurrence (RFC 5545)

**Author:** Basher (Backend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

`RecurrenceRule` type captures RFC 5545 recurrence as plain JSON data (freq, interval, count, until, byDay, etc.) rather than rrule class instances. This enables straightforward Zustand/localStorage persistence and API serialization.

### 8. Centralized Lane & Time-Grid Types

**Author:** Basher (Backend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

Time-grid helper types (`EventTimeGridVars`, `LaneAssignment`, `EventWithLane`, `LaneGroup`, `LaneComputationInput`) live in the shared type module to keep the `--start` / `--dur` / `--lane` / `--lanes` CSS contract centralized for backend lane computation and component prop contracts.

### 9. Comprehensive Test Coverage for Lane & Time-Grid Math

**Author:** Linus (Tester)  
**Date:** 2026-05-28  
**Status:** Implemented

42 Vitest tests covering:
- **laneAlgorithm:** greedy lane-assignment, simultaneous/partial overlap, exclusive end boundaries, deterministic same-start ordering, shared `lanes` counts (9 tests)
- **timeGrid:** `--start`/`--dur` offsets, visible-hours clamping, zero-duration events, exact hour boundaries, all-day exclusion (9 tests)
- **formatTime:** minute-to-label formatting midnight through 11:59 PM (8 tests)
- **EventChip:** title rendering, compact-mode classes, lane classing, `--c` color stripe, `data-time` attributes, click handling (9 tests)
- **DayView:** visible event filtering, hour labels, NOW line behavior, owner color mapping, zero-duration rendering, all-day omission (7 tests)

Test patterns follow Vitest + jsdom conventions and are established for Basher's store + helper-function tests and Yen's week-view tests. All npm test, build, and lint validations pass.

### 10. Zustand Store + Lane API (Backend State Layer)

**Author:** Basher (Backend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

Three Zustand slices persist independently:
- `eventsStore` — Event CRUD, series deletion, date/week selectors. Persists `events` under `familyscheduler-events`.
- `membersStore` — Member updates/selectors. Persists `members` under `familyscheduler-members`.
- `householdStore` — Persisted `household` object; session-only `activeFilter` and `currentDate` via `partialize`.

Lane algorithm exports `assignLanes()`, `assignLanesForDate()` for day/week consumption. `useEventsForDate(date)` hook returns `EventWithLane[]` with time-grid vars pre-computed using household visible-start preference.

### 11. WeekView Component API & Layout Strategy

**Author:** Yen (Frontend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

- `WeekViewProps` accepts `startDate`, `members`, optional `filter`.
- `startDate` is first visible day; caller respects household `weekStartsOn` setting.
- Weekly event cards render title + attendee dots only, hover-only time tooltip.
- Time math uses `--hour-height: 36px`; chip `top`/`height` derived from `--start`/`--dur` in CSS.
- Lane placement CSS-driven via `--lane`/`--lanes`. Owner color via inline `--c`; attendee dots use per-dot custom properties.
- All-day events excluded from timed grid, rendered in separate row above viewport.
- Faithful to HANDOFF design aesthetic (editorial, not rounded pills).

### 12. Store API Contract (Basher → Yen Handoff)

**Author:** Basher (Backend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented

Yen's WeekView consumes store via:
- `useEventsStore()` → raw event CRUD/selectors
- `useMembersStore()` → member color/visibility lookup
- `useHouseholdStore()` → preferences, activeFilter, currentDate
- `useEventsForDate(date)` → pre-lane-assigned `EventWithLane[]`

All-day events returned with `lane=0`, `lanes=1`, `--dur=0` for easy filtering; DayView/WeekView already filter out. Demo data integrated into event store seed.

### 13. FilterBar Component API & Chip Interaction Rules

**Author:** Yen (Frontend Dev)  
**Date:** 2026-06-05  
**Status:** Implemented

- `FilterBar` accepts `members: Member[]`, `activeFilter: MemberId[] | "all"`, `onFilterChange` callback.
- Renders 8 chips (ALL + 7 members) with toggle semantics: clicking ALL resets to "all"; clicking a member while ALL active removes that person from implicit full-family selection; clicking member on subset toggles in/out.
- Empty or all-selected states normalize back to "all" sentinel.
- State flows through `useHouseholdStore.activeFilter` → `useEventsForDate(date)` → DayView/WeekView, enabling single-source filter logic across calendar surfaces without component coupling to Zustand.

## Cancelled Decisions

### (Archived) 14. FilterBar Decisions

**Author:** Yen (Frontend Dev)  
**Date:** 2026-05-28  
**Status:** Merged into Decision #13

Merged into primary FilterBar decision; archived here for reference.

- `members: Member[]` supplies the full family roster in render order.
- `activeFilter: MemberId[] | "all"` keeps the component stateless while allowing a compact all-members sentinel.
- `onFilterChange: (filter: MemberId[] | "all") => void` pushes selection changes back to the household store without coupling the component to Zustand.
- When `activeFilter === "all"`, the `ALL` chip is active and member chips stay visually at rest.
- Clicking `ALL` always resets the filter to `"all"`.
- Clicking a member while `ALL` is active removes that person from the implicit full-family selection.
- Clicking a member while a subset is active toggles that member in or out of the subset.
- If a toggle would leave zero members selected, or would select all seven members again, normalize back to `"all"`.
- `useHouseholdStore` owns `activeFilter` as `MemberId[] | "all"` and normalizes empty/all-selected arrays back to `"all"`.
- `src/app/page.tsx` reads `activeFilter` and `setActiveFilter`, renders `FilterBar`, and passes the active filter into `WeekView`.
- `useEventsForDate` applies the household filter before lane assignment, so day and week views both receive already-filtered events.
- `useMemberFilter` mirrors the same normalization rules for any future chip or settings UI built on the shared hook.

### (Archived) 15. Event Modal Decisions

**Author:** Yen (Frontend Dev)  
**Date:** 2026-05-28  
**Status:** Implemented (documented in Decision #11 history entry)

Already captured in yen/history.md event modal section. Archived here to consolidate inbox.

- `event?: Event | null` drives create (`null`/`undefined`) vs edit (existing event).
- `defaultDate?: string` and `defaultStartMinutes?: number` prefill slot-created events without forcing page-level form state.
- `onSave` receives an Event-like payload without store-owned timestamps so `src/app/page.tsx` can call `addEvent` for new records or `updateEvent` for existing ones.
- `onDelete?: (eventId: string) => void` is only used in edit mode; the modal never talks to Zustand directly.
- Form state keeps a local form object with title, date, startTime, endTime, isAllDay, location, notes, ownerId, attendeeIds, drivers, repeatPreset.
- All 7 family members render as square attendee chips with a 4px `--c` stripe.
- The selected owner can never be removed; changing owner automatically ensures that member stays in `attendeeIds`.
- DRIVE toggles appear only for selected parent attendees (Tyler, Heather), matching the settled transportation decision without surfacing conflict UI.
- Preset actions (`Whole Family`, `Just Kids`, `Just Adults`, `Clear All`) always preserve the owner.
- `src/app/page.tsx` owns the store bridge: if `onSave` payload includes `id`, call `updateEvent(id, updates)`; otherwise generate `id`, `createdAt`, `createdBy`, and `updatedAt`, then call `addEvent(...)`.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
