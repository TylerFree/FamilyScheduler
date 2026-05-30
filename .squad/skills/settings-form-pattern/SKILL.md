# Settings Form Pattern

## Confidence
high

## When to use
Use this when a settings screen needs to stage edits locally across multiple Zustand stores, but should only persist changes when the user clicks Save.

## Pattern
1. Read the current persisted data from each store and derive one frontend-only draft object for the screen.
2. Reset that draft from the store snapshot inside `useEffect` so persisted state and first-load hydration stay aligned.
3. Keep every field fully controlled in React state; do not write to stores on every keystroke when the design has Save / Cancel actions.
4. On Save, write each slice back through its existing store API (`updatePreferences`, `updateMember`, etc.) instead of inventing a cross-store settings action.
5. On Cancel, restore the latest store snapshot and clear transient saved-state UI.

## FamilyScheduler-specific notes
- Keep the editorial chrome from the HTML reference: Fraunces italic mastheads, JetBrains Mono uppercase labels/buttons, square borders, and `4px 4px 0 var(--ink)` shadows.
- Rectangular toggles should be built as slab buttons with a square thumb, never rounded pill switches.
- Member settings rows work well as a 4-column grid: color swatch, name/meta, role badge, permission select.
- If a settings page spans household + member stores, let the page own the bridge logic so the stores stay decoupled.
