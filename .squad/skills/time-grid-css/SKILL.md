# Time-Grid CSS Skill

## Confidence
medium

## When to use
Use this pattern for any day/week calendar surface where event blocks must position by minutes instead of by nesting inside hour rows.

## Core rule
Keep event layout in CSS custom properties and let React only set the numbers:

```css
.event {
  position: absolute;
  top: calc(var(--start) * 1px);
  height: calc(var(--dur) * 1px);
}
```

For overlap lanes, keep the exact formula in CSS:

```css
.event.inLane {
  left: calc(12px + (var(--lane) * ((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes) + 6px)));
  width: calc((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes));
}
```

## React handoff contract
Each rendered event should set these inline vars:
- `--start`: minutes from the start of the visible day window
- `--dur`: visible duration in minutes
- `--lane`: 0-based lane index
- `--lanes`: total lanes in the overlap group
- `--c`: owner/member color for the left stripe

## Implementation notes
- Recompute `--start` and `--dur` in the view layer from `startMinutes` / `endMinutes` and the current visible hours.
- Clamp events to the visible window before passing values to the chip so partially visible events still render correctly.
- Keep all spacing constants inside CSS so the geometry stays inspectable and shared across components.
- If compact rendering depends on available space, derive classes from visible duration and lane count, not hard-coded pixel heights.

## Weekly view additions
- Weekly surfaces switch to `--hour-height: 36px`, so event geometry becomes `top: calc(var(--start) * var(--hour-height) / 60)` and `height: calc(var(--dur) * var(--hour-height) / 60)`.
- Keep the week overlap formula in CSS too; only the lane gap changes (for FamilyScheduler, week view uses tighter 4px lane gaps than day view).
- Put all-day events in a separate row above the scrollable grid; timed events should remain the only absolutely positioned elements inside the timeline coordinate space.
- A today-only NOW line should use the same `--start` math as events so it stays locked to the time grid when visible hours change.
- Hover-only time labels belong on the weekly chip via `data-time` + `::after`, so time stays hidden until density allows it.
