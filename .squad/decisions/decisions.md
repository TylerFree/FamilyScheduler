# Project Decisions

## Yen Inbox → Main (2026-05-28)

### EventChip Component API Contract
- **Props:** `EventChipProps { event: EventWithLane; memberColor: string; onClick?: (...) => void }`
- **CSS Vars:** `--start`, `--dur`, `--lane`, `--lanes`, `--c` (color stripe)
- **Compact Modes:**
  - `.micro`: duration < 30 minutes
  - `.tiny`: lanes >= 3 (hides inline time, reveals on hover via data-time)
  - `.short`: duration < 45 minutes OR lanes >= 2
- **Attendee Rendering:** 6px color dots using FAMILY_MEMBER_DIRECTORY; driver attendees get small "drive" label (hidden in .tiny mode)
- **Keyboard Support:** Enter / Space triggers onClick when provided
- **Left Stripe:** 4px colored stripe via `--c` CSS variable, set inline from memberColor

### DayView Component API Contract
- **Props:** `DayViewProps { date: string; events: EventWithLane[]; members: Member[]; visibleHoursStart?: number; visibleHoursEnd?: number; onEventClick?: (...) => void }`
- **Layout:**
  - 56px left gutter for hour labels
  - Horizontal rule lines at each hour boundary
  - Timeline height = (visibleHoursEnd - visibleHoursStart) * 60 pixels
- **Event Positioning:**
  - Recomputes `--start` as `event.startMinutes - visibleHoursStart * 60`
  - Recomputes `--dur` from clamped event range inside visible window
  - Passes owner color from members prop into each EventChip
- **NOW Line:**
  - Renders only when viewed date matches local current day
  - Only visible if current time falls within visible hours
  - Positioned at `(currentMinutes - visibleHoursStart * 60) * 1px`

### Time-Grid CSS Math (Locked)
- **Daily View:** 1px per minute (7 AM start = 0px, 9 PM end = 840px)
- **Positioning:** All events use `top: calc(var(--start) * 1px); height: calc(var(--dur) * 1px)`
- **Overlap Lane Math:**
  ```css
  left: calc(12px + (var(--lane) * ((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes) + 6px)));
  width: calc((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes));
  ```
  Where lane 0 is leftmost, --lane ranges [0, --lanes-1]
- **Weekly View:** 0.6px per minute (36px per hour), same lane math
- **No Nesting:** Events position absolutely by minutes from day-start; hour rows are visual guides only

### Compact Mode Thresholds
- **micro:** visible duration < 30 minutes (week view only)
- **tiny:** 3 or more simultaneous events (lanes >= 3)
  - Hides inline time text, exposes via CSS ::after pseudo-element reading data-time attribute on hover
  - Hides driver label
- **short:** visible duration < 45 minutes OR 2+ simultaneous events (lanes >= 2)
  - Smaller title, no location, smaller attendee chips

### Component Testing Regression Targets
- Lane assignment algorithm correctly handles simultaneous starts, partial overlaps, day boundaries
- Compact class selection changes at documented thresholds (30min, 45min, lanes 2/3)
- Tiny mode hover time reveal works via data-time attribute
- DayView correctly clamps --start / --dur to visible hours
- NOW line only appears for today (not other dates)
- No conflict detection warnings ever appear (regression test for settled decision #1 from HANDOFF.md)

## Linus — Test Coverage (2026-05-28)

### RTL/Vitest Stable Testing Hooks
Use a restricted set of `data-testid` attributes as stable testing hooks only for non-semantic surfaces:
- `week-day-column-{date}` — for weekly grid click targeting
- `week-now-line-{date}` — for today-line assertions
- `event-modal-overlay` and `event-modal-dialog` — for backdrop-vs-surface dismissal tests

**Rationale:** CSS module hashes make class selectors unstable; these surfaces lack reliable semantic roles for the interactions being tested. All other components tested through roles, labels, and visible text first.

**Constraint:** FilterBar requires explicit `React` import to run under current Vitest/TSX setup. Treat as repo-wide constraint until tooling changes.

## Yen — Settings Page Pattern (2026-05-28)

### Local Draft Pattern for Settings
- Settings page uses local draft object; saves back to existing `useHouseholdStore` and `useMembersStore` only on explicit Save
- No new combined settings store; preserves Basher's existing store boundaries
- Text inputs, segmented controls, and permission selects remain reversible with Cancel

**Implementation:**
- `src/app/settings/page.tsx` owns bridge between store snapshots and UI form state
- Save applies `updateHousehold`, `updatePreferences`, and per-member `updateMember` calls
- Future settings screens can reuse the same local-then-save pattern without coupling unrelated store slices

## Basher — Recurrence Expansion Before Calendar Rendering (2026-05-30)

### Decision

Calendar surfaces must not filter raw `Event.date` directly when they need visible events. Recurring events are stored once with a JSON-safe `recurrence` rule, then expanded into virtual occurrences for the visible date or date range before member filtering, lane assignment, and rendering.

### Implementation

- Expansion helper: `src/lib/calendar/recurrence.ts`
- Store selector: `useEventsStore.getState().getEventsForDateRange(startDate, endDate)`
- Convenience selectors: `getEventsForDate(date)` and `getEventsForWeek(startDate)`
- React hook path: `useEventsForDate(date)` expands first, filters second, assigns lanes last

Virtual occurrences preserve the parent event `id` so existing edit/delete handlers still open the original series event. The occurrence `date` is replaced with the visible occurrence date.

### Team Notes

- **Yen:** use `useEventsForDate(date)` or the store date-range selector; do not reintroduce raw `event.date === date` filtering in views.
- **Linus:** coverage should include weekly forever, weekly until, weekday recurrence, filters after expansion, and lane assignment for expanded occurrences.
- **Basher:** recurrence JSON stays localStorage-safe. Build local occurrence dates from `event.date` and `startMinutes`; avoid UTC drift when expanding all-day/timed occurrences.
