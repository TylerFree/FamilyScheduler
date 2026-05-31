# Project Context

- **Owner:** Tyler Free  
- **Project:** FamilyScheduler (7-member calendar, Next.js/React/TS, localStorage→Supabase)
- **Design:** `Design/HANDOFF.md` + 4 HTML prototypes

## Key Facts

- CSS time-grid: Daily `top: calc(var(--start) * 1px)`, weekly `36px/hour`
- Overlap: `left: calc(12px + (var(--lane) * ...))`; stripe: `--c` CSS var
- Design tokens in HANDOFF.md

## Learnings

### Settings SSR Storage Guard (2026-05-31)

Root cause: the settings route imports persisted Zustand stores, and the store modules used bare `localStorage` references in `createJSONStorage` and seed checks. That is unsafe anywhere the module is evaluated without a browser storage object during SSR/RSC/prerender paths. Fix pattern: route all persisted Zustand storage through an SSR-safe helper that returns a no-op `StateStorage` when `window` is unavailable, and guard key-existence checks with `typeof window !== "undefined"`.

### Archive Summary (2026-05-28 — 2026-06-05)

Previous sprint delivered: Mobile WeekView, Date Navigation, Settings, FilterBar, EventModal, WeekView, EventChip+DayView, Lane tests, Zustand, Recurrence Expansion (89/89 tests, build/lint clean).

### Custom Recurrence Panel (2026-05-30)

EventModal custom recurrence: frequency (D/W/M/Y), interval, weekday selection, end conditions (Never/Date/Count). Validation: interval>=1, weekly>=1 day, end>=event start, count>=1. RecurrenceRule JSON clean. Status: 92/92 tests, lint clean, build OK. Next: Linus edge tests, Basher verify expansion.

### Mobile Week View Delivered (2026-06-05)

Built a responsive 3-day sliding window for `src/components/calendar/WeekView.tsx` + `WeekView.module.css`, with a small mobile gutter polish in `src/components/calendar/DayView.module.css`.

Key implementation decisions:
- WeekView now uses an SSR-safe `useIsMobile(640)` hook plus `mobileOffset` state, so mobile renders a 3-column slice of the weekly data while desktop keeps the full 7-column layout unchanged.
- The mobile nav row lives inside the week surface above the headers, uses mono square-corner controls, hides edge buttons instead of disabling them, and advances by 3 days while clamping to the final `FRI – SUN` window.
- Grid column count now flows through a `--col-count` CSS custom property, keeping the header row, all-day row, and timed grid locked together while mobile swaps `minmax(116px, 1fr)` for equal-width `1fr` columns and disables horizontal scrolling.
- Added WeekView tests for the mobile 3-day window and week-reset behavior, and narrowed the DayView mobile gutter to 32px to prevent the daily timeline from crunching on small screens.

Validation notes:
- `npm run build` passes.
- `npm test` passes (85/85 tests).

### Date Navigation Delivered (2026-06-05)

Built a date navigation row in `src/app/page.tsx` between the top controls and `FilterBar`, wired to `useHouseholdStore.currentDate` and `setCurrentDate`.

Key implementation decisions:
- Navigation step size follows the active surface: day view moves by 1 day, week view moves by 7 days while still respecting `weekStartsOn` for the displayed range label and current-week detection.
- The clickable date label formats as mono uppercase display text (`WED · JUN 4` / `JUN 2 – JUN 8`) and jumps back to today; the trailing TODAY button only renders when the current day or week is not already active.
- Added keyboard shortcuts on the home surface (`ArrowLeft`, `ArrowRight`, `t`) gated behind `modalState.open` so modal editing keeps priority over global date navigation.

Validation notes:
- `npm run build` passes.
- `npm test` passes (83/83 tests).

### Settings Page Delivered (2026-06-05)

Built `src/app/settings/page.tsx` + `settings.module.css` from `Design/family-scheduler-settings.html`, then wired a Settings link into `src/app/page.tsx`.

Key implementation decisions:
- The settings surface follows the reference chrome with a left nav rail, Fraunces italic mastheads, mono labels, square controls, and a boxed action bar using the standard `4px 4px 0 var(--ink)` shadow.
- Household name/location, display preferences, weather toggle, and member permissions all edit against a local draft object first, then save back through `useHouseholdStore` and `useMembersStore` only when the Save action fires.
- Household preferences stay in `useHouseholdStore`, while per-member permission edits flow through `useMembersStore.updateMember(...)`; the page bridges both stores without introducing a combined frontend-only settings store.

Validation notes:
- `npm run build` passes.
- `npm test` passes (83/83 tests).

### FilterBar Delivered (2026-06-05)

Built `src/components/calendar/FilterBar.tsx` + `FilterBar.module.css` from the daily reference bar and wired it into `src/app/page.tsx`.

Key implementation decisions:
- `FilterBar` exposes a frontend-only API of `members`, `activeFilter`, and `onFilterChange`, with `activeFilter` normalized to `"all"` or an ordered member-id subset.
- Clicking a member while `ALL` is active removes that person from the implicit full-family selection; removing the last visible member or reselecting all seven collapses back to `"all"`.
- Household filter state now flows through `useHouseholdStore.activeFilter`, `useEventsForDate`, and `WeekView` so the chip bar affects both day and week surfaces without duplicating filter math in the views.

Validation notes:
- `npm run build` passes.
- `npm test` passes (48/48 tests).
- `npm run lint` passes.

### Event Modal Delivered (2026-06-05)

Built `src/components/calendar/EventModal.tsx` + `EventModal.module.css` from `Design/family-scheduler-edit-modal.html`, then wired create/edit flows through `src/app/page.tsx`, `DayView.tsx`, and `WeekView.tsx`.

Key implementation decisions:
- The modal keeps all event editing local with React state, then emits an Event-like payload so the page can decide between `addEvent`, `updateEvent`, and `deleteEvent` in the Zustand store.
- Owner selection and attendee chips stay coupled: the owner is always injected into `attendeeIds`, and the DRIVE toggle only appears for selected parent attendees (Tyler or Heather).
- Time editing stays string-based in the form (`HH:MM`) and only converts to `startMinutes` / `endMinutes` during save validation, with all-day mode forcing `0` and `1439` while keeping the hidden time controls in the DOM.
- Day and week surfaces now expose optional `onEventClick` and `onTimeSlotClick` hooks so the modal can open from either an existing event or a clicked slot without changing existing default behavior.

Validation notes:
- `npm run build` passes.
- `npm test` passes (48/48 tests).
- `npm run lint` passes.

### WeekView Delivered (2026-06-05)

Built `src/components/calendar/WeekView.tsx` + `WeekView.module.css` from `Design/family-scheduler-weekly.html`.

Key implementation decisions:
- WeekView keeps the weekly time-grid math in CSS with `--hour-height: 36px` and positions events from `--start` / `--dur`, never hand-coded heights.
- Weekly event cards render inline in WeekView instead of reusing DayView's EventChip markup, so the week surface can stay dot-only with hover-revealed times without disturbing DayView.
- All-day events live in a dedicated row above the scrollable timeline, while timed events stay in the 7-column grid with a shared left gutter and a today-only NOW line.
- Page toggle wiring in `src/app/page.tsx` computes the current week start from household preferences and switches cleanly between DayView and WeekView.

Validation notes:
- `npm run build` passes.
- `npm test` passes (48/48 tests).
- `npm run lint` passes.


### Scaffold Complete — CSS Modules + Font Variables (2026-05-28)

Rusty has completed the Next.js scaffold. Key facts for your component work:

- **CSS Modules:** Component styles go in `.module.css` files scoped to components. Global design tokens live in `src/app/globals.css`.
- **Font CSS Variables:** Use `var(--font-fraunces)` for display (event titles, names), `var(--font-inter-tight)` for body text, `var(--font-jetbrains-mono)` for labels/buttons.
- **All Color Tokens in globals.css:** `--paper`, `--paper-deep`, `--paper-darker`, `--ink`, `--ink-soft`, `--ink-faint`, `--rule`, `--rule-soft`, `--accent`, `--danger`, `--success`, and 7 member colors (`--tyler`, `--heather`, `--erin`, `--leo`, `--anthony`, `--savannah`, `--lily`).
- **CSS Vars for Time-Grid:** Use `--start` (minutes from day-start), `--dur` (duration in minutes), `--lane`, `--lanes` for positioning. Event chips use `--c` for color stripe.
- **Folder Structure Ready:** `src/components/calendar/`, `src/components/ui/`, `src/components/settings/` all exist.
- **Test Infrastructure:** Vitest configured with jsdom. Write tests alongside components in `.test.tsx` files.

### Types Module Complete — Ready for Component Props (2026-05-28)

Basher has completed `src/types/index.ts`. Event, Member, Household, MemberId constants, RecurrenceRule, EventWithLane (with `--start`/`--dur`/`--lane`/`--lanes` fields), and LaneGroup types are all exported. Build is clean. Use these types for all component props.

### EventChip + DayView Delivered (2026-06-05)

Built `src/components/calendar/EventChip.tsx` + `EventChip.module.css` and `src/components/calendar/DayView.tsx` + `DayView.module.css` from `Design/family-scheduler-daily-clean.html`.

Key implementation decisions:
- `EventChip` consumes `EventWithLane` directly and sets `--start`, `--dur`, `--lane`, `--lanes`, and `--c` inline so positioning always stays in CSS.
- Compact modes are driven from visible duration and lane count: `micro` for under 30 minutes, `tiny` for 3+ lanes, `short` for under 45 minutes or 2 lanes.
- The non-obvious overlap math lives in CSS with the exact HANDOFF lane formula and a comment beside it for future maintenance.
- `DayView` recalculates visible `--start` / `--dur` from `startMinutes` relative to `visibleHoursStart`, so the timeline stays 1px-per-minute even when hours change.
- `src/app/page.tsx` now renders a live demo DayView with Free-family sample events for local visual verification.

Validation notes:
- `npm run build` passes.
- `npm run lint` passes.
- `npm test` currently reports no test files, so Linus will need to add component tests later.

### 42 Tests Passing — Linus Complete (2026-05-28)

Linus wrote 42 Vitest tests covering EventChip, DayView, lane algorithm, time-grid math, and formatTime. Fixed React import issue in calendar components. All tests pass. Test files:
- `src/lib/calendar/laneAlgorithm.test.ts`
- `src/lib/calendar/timeGrid.test.ts`
- `src/lib/calendar/formatTime.test.ts`
- `src/components/calendar/EventChip.test.tsx`
- `src/components/calendar/DayView.test.tsx`

Ready for Basher (Zustand store) and Yen (WeekView) to follow test patterns.

### Zustand Store + Lane Algorithm Complete — Basher (2026-05-28T22:00)

Basher built **Zustand stores** (events, members, household) with localStorage persistence and central hooks. Key import point for WeekView:

- **Hook:** `useEventsForDate(date: string): EventWithLane[]` — returns lane-assigned events ready for DayView, filtered by household activeFilter
- **Stores:** `useEventsStore`, `useMembersStore`, `useHouseholdStore` (all exported from `src/store/index.ts`)
- **localStorage keys:** `familyscheduler-events`, `familyscheduler-members`, `familyscheduler-household`
- **Session-only (not persisted):** `activeFilter` (member IDs), `currentDate` (ISO string)
- **Result:** 48/48 tests, clean build/lint, src/app/page.tsx wired to real state

Start WeekView by importing `useEventsForDate` and `useMembersStore` from src/store/index.ts.

### Recurrence Expansion Completed — Basher (2026-05-30)

Basher completed recurrence expansion in store selector path. The `useEventsForDate()` hook and `getEventsForDateRange()` store selector now expand recurring events before filtering and lane assignment.

- **Expansion helper:** `src/lib/calendar/recurrence.ts`
- **Store path:** `useEventsForDate(date)` → expand recurring → filter activeFilter → assignLanes
- **Use in WeekView:** Query by date range using `getEventsForWeek(startDate)` instead of filtering `event.date`; recurrence expansion is built in
- **Note:** All 89/89 tests pass; build clean

### Custom Recurrence Panel Shipped — Yen (2026-05-30)

Yen completed custom recurrence configuration panel in EventModal. Users can now specify frequency (Daily/Weekly/Monthly/Yearly), interval, weekly weekday selection, and end conditions (Never/On date/After N occurrences). All validation rules in place: interval >= 1, weekly requires >=1 day, end date >= event date, count >= 1.

- **Panel location:** `src/components/calendar/EventModal.tsx`
- **Form state fields:** customFrequency, customInterval, customByDay, customEndCondition, customEndDate, customOccurrenceCount
- **RecurrenceRule outputs:** Clean JSON shapes for localStorage/Zustand (weekly: byDay array with RFC codes; monthly/yearly: simple same-day repeats)
- **Status:** 92/92 tests passing (up from 89), lint clean, build succeeds
- **Next:** Linus to add end-condition + by-day edge tests; Basher to verify RecurrenceRule shape expansion

