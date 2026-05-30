# Modal Form Pattern

## Use when

- A design reference requires a create/edit dialog with the same component handling both modes.
- The form should stay locally controlled, but saving/deleting must be delegated to a parent container or store.
- The modal needs keyboard support (Escape close, focus trap) and backdrop-dismiss behavior.

## Pattern

1. Accept `item?: T | null` plus `default*` props for create-mode prefills.
2. Build a local `FormState` from those props and reset it inside `useEffect` whenever the source item changes.
3. Keep native date/time inputs in string form inside the modal; convert to domain values in `handleSubmit`.
4. Keep modal responsibilities local (layout, validation, accessibility, field interactions) and emit a clean save payload upward.
5. Add optional surface callbacks like `onEventClick` / `onTimeSlotClick` so timeline components can open the modal without owning its form logic.

## FamilyScheduler-specific notes

- Use `var(--paper)` surfaces, `4px 4px 0 var(--ink)` shadows, and no border radius.
- Put Fraunces italic on the primary title field and JetBrains Mono uppercase on labels/buttons.
- Preserve store ownership boundaries: the modal should not import Zustand actions directly.
- If all-day hides timed controls, keep the controls in the DOM and restore prior timed values when toggled back off.
