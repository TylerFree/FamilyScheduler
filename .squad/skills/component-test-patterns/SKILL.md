# Component Test Patterns

## Confidence
high

## When to use
Use this pattern for React component tests in FamilyScheduler when the component reads Zustand selector hooks, renders CSS-module-based layout, or needs precise interaction coverage without snapshots.

## Pattern
1. Mock selector hooks at the module boundary with `vi.mock`, and have the mock call the selector against a minimal fake state object.
2. Keep event/member fixtures small and explicit so tests describe calendar edge cases directly.
3. Query buttons, inputs, labels, and visible text semantically first.
4. Add `data-testid` only for non-semantic surfaces such as timeline columns, NOW lines, overlays, or dialog surfaces.
5. Assert behavior and payloads, not DOM shape or CSS class names.

## FamilyScheduler examples
- `WeekView` tests should click `week-day-column-{date}` and mock `getBoundingClientRect()` to verify minute rounding for `onTimeSlotClick`.
- `EventModal` tests should use labels for form fields, then `event-modal-overlay` / `event-modal-dialog` for dismissal behavior.
- `FilterBar` tests should assert `aria-pressed` and callback payloads rather than CSS state.

## Gotchas
- The current Vitest setup needs explicit `React` imports in TSX files under test.
- Avoid snapshots for layout-heavy calendar components; test rendered text, accessible names, callbacks, and computed form values instead.
