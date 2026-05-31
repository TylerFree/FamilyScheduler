# Project Context

- **Owner:** Tyler Free
- **Project:** FamilyScheduler — a single-household family calendar web app for the Free family (7 members, Duvall, WA)
- **Stack:** Next.js + React + TypeScript, CSS Modules or Tailwind with design tokens, Zustand for state, localStorage initially (Supabase later), rrule.js for recurrence, date-fns-tz for timezone handling
- **Design reference:** `Design/HANDOFF.md` (spec) + 4 HTML prototype files in `Design/`
- **Created:** 2026-05-28

## Key Facts

- No implementation exists yet — design phase only
- Core TypeScript types defined in HANDOFF.md: `Event`, `Member`, `Household`
- `startMinutes`/`endMinutes` = minutes from midnight in local timezone
- `ownerId` drives event color (must map to member's hex color for CSS `--c` var)
- `drivers[]` ⊆ `attendeeIds[]` — parents marked as transportation, not separate attendees
- Lane assignment algorithm: sort by startMinutes, greedy lowest-numbered free lane
- No conflict detection UI (data supports it; UI must not show it)

## Learnings

### SSR-Safe Persisted Store Pattern (2026-05-31)

Yen fixed the `/settings` crash by moving all persisted Zustand storage through `src/store/storage.ts`. Basher-owned store work should use this pattern for any new persisted store: `storage: createJSONStorage(getPersistentStorage)` and `hasPersistedState(storageKey)` for browser key checks. Do not reference bare `localStorage` at module-eval time; App Router SSR/RSC/prerender paths can evaluate the module without `window`.

### Scaffold Complete — Store and Types Ready (2026-05-28)

Rusty has completed the Next.js scaffold. Key facts for your store and type work:

- **Store Directory Ready:** `src/store/` exists and is ready for Zustand store definitions. Follow Zustand patterns (hooks, selectors, immutable updates).
- **Types Stub:** `src/types/index.ts` is ready. Define `Event`, `Member`, `Household` types with the shape from HANDOFF.md (including `startMinutes`/`endMinutes`, `ownerId`, `drivers[]`, `recurrence`, etc.).
- **Type-Safe Path Aliases:** Use `@/types`, `@/store`, `@/lib`, etc. — all path aliases configured in `tsconfig.json`.
- **Zustand + TypeScript:** Store config uses `create<StateType>()` pattern. State persists to localStorage initially (Supabase comes later).
- **Test Infrastructure:** Vitest configured with jsdom. Write store tests in `.test.ts` files.

### Types Module Conventions (2026-05-28)

- `src/types/index.ts` now exports literal-source constants for calendar views, permissions, week starts, recurrence weekdays, and the seven canonical `MemberId` values.
- `FAMILY_MEMBER_DIRECTORY` is the single typed source for the Free family member IDs, names, roles, permissions, and muted palette hex colors from HANDOFF.
- `RecurrenceRule` is a JSON-safe wrapper around rrule concepts (`freq`, `byDay`, `until`, etc.) so Zustand/localStorage can persist recurrence data without `Date` or `Weekday` instances.
- Time-grid helpers live with the core types: `EventWithLane`, `LaneAssignment`, and `LaneGroup` carry the computed `--start` / `--dur` / `--lane` / `--lanes` values Yen needs for layout.

### Zustand Store + Lane API Implemented (2026-05-28)

- `src/store/` now owns three persisted Zustand slices: `useEventsStore`, `useMembersStore`, and `useHouseholdStore`, with session-only `activeFilter` / `currentDate` kept out of localStorage via `partialize`.
- Persistence keys are `familyscheduler-events`, `familyscheduler-members`, and `familyscheduler-household`; the demo page now hydrates from these stores instead of hardcoded sample data.
- `src/lib/calendar/laneAlgorithm.ts` exports `assignLanes(events, visibleStart?)`, `assignLanesForDate(events, date, visibleStart?)`, and the test-compatible `assignEventLanes(events)` helper so Yen can consume ready-to-render `EventWithLane[]` data while Linus's 42 tests keep passing.
- `src/types/index.ts` now exports `FAMILY_MEMBERS` as the canonical seeded member array for store initialization and household defaults.

### Recurrence Expansion Selector Pattern (2026-05-30)

- Weekly recurring events were being saved correctly by `EventModal` as JSON-safe `recurrence` data, but date/week selectors only compared the stored `event.date`, so future occurrences never reached DayView or WeekView.
- `src/lib/calendar/recurrence.ts` now expands recurring events into virtual occurrences for a requested date range; each occurrence keeps the parent event `id` for edit/delete routing and replaces only `date` with the occurrence date.
- `src/store/eventsStore.ts` exposes `getEventsForDateRange(startDate, endDate)` and routes `getEventsForDate` / `getEventsForWeek` through expansion. `src/store/index.ts` applies the same expansion before member filtering and lane assignment in `useEventsForDate`, so both DayView and WeekView receive occurrences.
- Gotcha: recurrence rules are persisted as plain JSON, not live rrule objects. Build occurrence datetimes from local ISO dates + `startMinutes` to avoid UTC date drift; only convert `until` with `Date` when comparing end boundaries.

### Custom Recurrence Panel Shipped — Note from Yen (2026-05-30)

Yen built custom recurrence configuration panel (EventModal). Tests now at 92/92. Your todo: confirm RecurrenceRule shape from custom panel expands correctly. Verify weekly byDay codes, end conditions (until/count), and simple monthly/yearly same-day repeats all produce correct virtual occurrences in expansion path.
