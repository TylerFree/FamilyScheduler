# Project Context

- **Owner:** Tyler Free
- **Project:** FamilyScheduler — a single-household family calendar web app for the Free family (7 members, Duvall, WA)
- **Stack:** Next.js + React + TypeScript, CSS Modules or Tailwind with design tokens, Zustand for state, localStorage initially (Supabase later), rrule.js for recurrence, date-fns-tz for timezone handling
- **Design reference:** `Design/HANDOFF.md` (spec) + 4 HTML prototype files in `Design/`
- **Created:** 2026-05-28

## Key Facts

- No implementation exists yet — design phase only
- Most critical test surface: lane assignment algorithm (greedy overlap detection)
- Time-grid math: daily view = 1px/min (7AM start = 0, 9PM end = 840px total), weekly = 36px/hour
- Key edge cases: simultaneous event starts, partial overlaps, events at day boundaries, all-day events
- The 7 settled decisions in HANDOFF.md are regression targets — write tests that would catch undoing them
- No conflict detection UI should ever appear — test that no warning/conflict UI is rendered

## Yen's Deliverables (2026-05-28T14:00)

Yen completed **EventChip** (src/components/calendar/EventChip.tsx) and **DayView** (src/components/calendar/DayView.tsx) with full time-grid CSS math.

- **EventChipProps** takes `EventWithLane + memberColor` string; renders 6px attendee dots + 4px colored left stripe
- **DayViewProps** takes `date, events: EventWithLane[], members: Member[], visibleHoursStart?, visibleHoursEnd?, onEventClick?`
- **Compact modes** (decided contract):
  - `.short`: duration < 45min OR lanes >= 2
  - `.tiny`: lanes >= 3 (hides inline time, reveals on hover via `data-time` attribute)
  - `.micro`: duration < 30min (week view only)
- **Lane math:** uses `--start / --dur / --lane / --lanes` CSS vars; overlap algorithm is greedy-assign-to-lowest-free-lane
- **NOW line:** only renders when date === today AND current time in visible hours
- **src/app/page.tsx** wired with demo Free-family sample events (Yen's integration test)

### Tests Needed (for Linus)
- Lane assignment correctness: simultaneous starts, partial overlaps, day boundaries
- Compact class selection at thresholds (30min, 45min, lanes 2/3)
- Tiny hover reveal via data-time attribute
- DayView clamps --start/--dur to visible hours
- NOW line only on today (regression target for HANDOFF #1: no conflict UI)
- formatTime helper correctness
- All-day event handling (if applicable)

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->
- DayView should exclude `isAllDay` events from the daily time grid, but still allow zero-duration timed events to render with `--dur: 0` when they fall inside visible hours.
- The current Next.js/Vitest setup requires explicit `React` imports in TSX-rendering files under test; without them, component tests fail at runtime with `React is not defined`.
- For component tests, mock Zustand selector hooks by calling the selector with the smallest possible state object; this keeps WeekView tests focused on rendering/math instead of store persistence.
- Add `data-testid` only for non-semantic interaction surfaces that RTL cannot target reliably (`week-day-column-*`, `week-now-line-*`, modal overlay/dialog). Buttons, inputs, and labels stay queryable by role/text.
- EventModal’s all-day toggle preserves prior start/end times when toggled back off; that behavior is now covered and should be treated as part of the form contract.

### Lane Algorithm Finalized — Basher (2026-05-28T22:00)

Basher replaced lane algorithm stub with full implementation in `src/lib/calendar/laneAlgorithm.ts`. Greedy assignment (sort by start time, place in lowest-numbered free lane).

- **Exports:** `assignLanes(events: Event[]): EventWithLane[]`, `assignLanesForDate(events: Event[], date: string, visibleStart?: number): EventWithLane[]`
- **Signatures matched** — all 42/42 existing tests still passing (plus 6 new store tests = 48 total)
- No changes needed to laneAlgorithm test suite; regression targets maintained

### Recurrence Expansion Tests Ready — Basher (2026-05-30)

Basher added recurrence expansion in store selector path. Test coverage now includes:

- **Weekly forever** expansion across multiple weeks
- **Weekly until** date termination
- **Weekday recurrence** (e.g., Mon/Wed/Fri)
- **Filters after expansion** — activeFilter applied after virtual occurrence creation
- **Lane assignment for expanded occurrences** — each virtual occurrence enters lane algorithm independently
- **All 89/89 tests pass**; new recurrence test suite added to `src/store/` and `src/lib/calendar/`

### Custom Recurrence Panel Shipped — Note from Yen (2026-05-30)

Yen built custom recurrence configuration panel. Tests now at 92/92 (up from 89). Your todo: add end-condition + by-day edge case tests for custom recurrence modal. Focus areas: end date >= event date validation, weekly requires >=1 selected day, occurrence count >= 1.

### NOW Line Hydration Fix Shipped — Yen (2026-06-01)

Yen delivered the NOW line SSR hydration fix. DayView and WeekView NOW lines now use the mount-gate-plus-60s-interval pattern, preventing hydration mismatches when server renders at one minute and client hydrates at the next.

**Pattern:** Local `mounted` state set in `useEffect`, render gate with `{mounted && ...}`, 60s interval for live time refresh. This is now the team standard for all clock-driven UI.

**Impact on testing:** The mount gate does not change test surface behavior; NOW line positioning logic remains testable via existing day/week view test patterns. No new test cases required unless future time-dependent UI components are added.

### Deployment Scaffold Shipped (2026-06-04)

Rusty shipped a complete self-hosted deployment scaffold for production. FamilyScheduler now has Docker + Caddy deployment on Tyler's Linux server with GitHub Actions SSH CI/CD on `main` pushes.

- No test changes required — deployment is infrastructure-independent from app logic/UI/state.
- All existing tests (92/92) continue to pass.
- Team focus now: Tyler provisions server and runs first deploy. Linus continues with recurrence edge-case tests (until/byDay validation). Decision #16 in `.squad/decisions.md`.

