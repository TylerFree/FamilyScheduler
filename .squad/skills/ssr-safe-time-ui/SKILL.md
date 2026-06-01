# SSR-Safe Time UI

Use this skill when building React/Next.js UI that depends on the current clock: NOW lines, live timestamps, countdowns, relative time, or today labels.

## Pattern

1. Keep clock state local to the client component.
2. Gate visible time-derived markup until after mount.
3. Refresh with an interval and clean it up on unmount.

```tsx
const [mounted, setMounted] = useState(false);
const [now, setNow] = useState(() => new Date());

useEffect(() => {
  setMounted(true);
}, []);

useEffect(() => {
  const intervalId = setInterval(() => setNow(new Date()), 60_000);

  return () => clearInterval(intervalId);
}, []);

return mounted && showTimeUi ? <div>{formatNow(now)}</div> : null;
```

## Why

Next.js server output must match the first client render. Rendering `new Date()` directly can mismatch when the client hydrates a minute later. The mount gate keeps SSR and initial hydration deterministic; the interval makes the UI live after hydration.

## FamilyScheduler standard

- DayView NOW line: gate with `mounted`, position from `now` after hydration.
- WeekView NOW line and today-only styling: gate current-day UI until `mounted`.
- Do not use browser-only clock values in rendered markup without a mount gate.
