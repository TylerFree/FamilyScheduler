# Recurrence Expansion Skill

Use this pattern when a calendar stores one parent event with a recurrence rule but views need concrete occurrences for a visible date range.

## Pattern

1. Persist recurrence as JSON-safe data on the parent event.
2. Expand events for the requested date range before UI filtering or lane math.
3. Emit virtual occurrences that copy the parent event and replace only occurrence-specific fields, currently `date`.
4. Preserve the parent `id` so edit/delete handlers still target the source event.
5. Run lane assignment after expansion so overlapping recurring occurrences participate in normal layout.

## FamilyScheduler Locations

- Helper: `src/lib/calendar/recurrence.ts`
- Store selectors: `src/store/eventsStore.ts` (`getEventsForDateRange`, `getEventsForDate`, `getEventsForWeek`)
- React hook: `src/store/index.ts` (`useEventsForDate`)

## Gotchas

- Do not filter raw `event.date` in DayView/WeekView paths; that hides future occurrences.
- Keep recurrence data serializable for Zustand/localStorage.
- Build occurrence comparisons using local ISO dates and `startMinutes`; UTC strings can shift dates around timezone boundaries.
- Test both helper expansion and store selectors so future view changes do not bypass the pattern.
