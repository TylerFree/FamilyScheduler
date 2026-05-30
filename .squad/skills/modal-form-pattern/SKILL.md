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
6. For conditional form sections, keep all nested controls in the same local `FormState` even while hidden, reveal the section from the controlling field, and validate the nested fields only when the section is active.

## FamilyScheduler-specific notes

- Use `var(--paper)` surfaces, `4px 4px 0 var(--ink)` shadows, and no border radius.
- Put Fraunces italic on the primary title field and JetBrains Mono uppercase on labels/buttons.
- Preserve store ownership boundaries: the modal should not import Zustand actions directly.
- If all-day hides timed controls, keep the controls in the DOM and restore prior timed values when toggled back off.
- Conditional slabs such as Custom Recurrence should use bordered `var(--paper-deep)` panels, segmented square buttons, and rectangular toggle groups; never use rounded pills or glow-ring focus states.
- When hidden state maps to persisted JSON (for example `RecurrenceRule`), write small prefill/build helpers next to the modal so edit-mode values round-trip through the same form controls as create-mode values.
