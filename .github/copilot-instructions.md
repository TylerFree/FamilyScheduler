# FamilyScheduler — Copilot Instructions

A single-household family calendar for the Free family (7 members, Duvall, WA). Currently in **design phase** — the canonical design references are HTML prototypes in `Design/`. The authoritative spec is `Design/HANDOFF.md`.

## Project State

No implementation exists yet. The `Design/` folder contains four reference HTML files:
- `family-scheduler-daily-clean.html` — daily view (no conflict UI)
- `family-scheduler-weekly.html` — 7-column weekly view
- `family-scheduler-edit-modal.html` — event create/edit modal
- `family-scheduler-settings.html` (implied by HANDOFF) — settings page

These are the source of truth for visual design. Do not substitute design patterns from other calendar apps.

## Suggested Stack

Next.js + React + TypeScript. CSS modules or Tailwind with the design tokens below. State via Zustand or Redux Toolkit. Start with localStorage; migrate to Supabase/Postgres when multi-user sync is needed.

- Recurrence: `rrule.js` (RFC 5545)
- Timezone: `date-fns-tz` or Luxon — store UTC, render local
- Fonts: Fraunces, Inter Tight, JetBrains Mono (Google Fonts)

Microsoft-stack alternative (Power Apps + Dataverse + Power Automate + Graph API) is also valid for this family.

## Design System

### Aesthetic

Editorial almanac. Newspaper masthead chrome, serif italic display type, monospaced utility labels, cream paper background. **Avoid:** rounded pills, bright saturated UI colors, generic SaaS gradients, emoji-as-icons, blurred shadows, rounded corners.

### Color Tokens

```css
:root {
  --paper:        #f4ede1;
  --paper-deep:   #ebe2d2;
  --paper-darker: #ddd0b7;
  --ink:       #1a1814;
  --ink-soft:  #4a4438;
  --ink-faint: #8a8170;
  --rule:      #d4c9b3;
  --rule-soft: #e4dac6;
  --accent: #c2410c;
  --danger: #991b1b;
  --success: #4a6b3a;

  /* Family members */
  --tyler:    #c2410c;
  --heather:  #7c2d6f;
  --erin:     #1e5f74;
  --leo:      #b4632f;
  --anthony:  #4a6b3a;
  --savannah: #8a4c8a;
  --lily:     #a8651c;
}
```

Member colors must be distinct at 6px dot size. Do not substitute brighter/more saturated alternatives — the muted palette is intentional.

### Typography

- **Fraunces** (serif italic) — event titles, names, display headings. Weights 500–700, always italic.
- **JetBrains Mono** — labels, buttons, times, metadata. Always ALL CAPS, `letter-spacing: 0.15em–0.25em`, 8–11px.
- **Inter Tight** — body copy and helper text. Use sparingly.

### Component Patterns

- Buttons: square corners, 1px `var(--ink)` border, JetBrains Mono uppercase labels
- Box shadows: `4px 4px 0 var(--ink)` (square offset, never blurred)
- Event chips: square, 1px border, 4px colored left stripe via `--c` CSS var set inline
- Toggles: rectangular slabs with square handle, not iOS-style pills
- Focus states: darken to `paper-deep`, no glow rings

## The Time-Grid Math

**This is the most critical technical piece.** Events position by minutes from day-start, not by nesting inside hour-row containers.

Each event sets two CSS custom properties:
- `--start`: minutes elapsed since the day-start hour (e.g., 7 AM = 0)
- `--dur`: duration in minutes

### Daily view (1px/min)

```css
.event {
  position: absolute;
  top: calc(var(--start) * 1px);
  height: calc(var(--dur) * 1px);
}
```

Day spans 7 AM – 9 PM = 840px total. Example: 9:00–10:30 AM → `--start: 120; --dur: 90`.

### Weekly view (0.6px/min)

```css
:root { --hour-height: 36px; }

.event {
  top: calc(var(--start) * var(--hour-height) / 60);
  height: calc(var(--dur) * var(--hour-height) / 60);
}
```

Never hand-code pixel heights for events. All positioning must derive from `--start` and `--dur`.

### Overlap Lanes

Events sharing a timeslot render in side-by-side lanes. Each event declares `--lane` (0-indexed) and `--lanes` (total in group):

```css
.event.in-lane {
  left: calc(12px + (var(--lane) * ((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes) + 6px)));
  width: calc((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes));
}
```

Lane assignment algorithm: sort events by start time, greedily place each into the lowest-numbered free lane.

### Compact Rendering

As events get narrower, downshift:
- **Default**: title + time + location + attendee chips
- **`.short`**: smaller title, no location, smaller chips (< ~60min or 2-lane overlap)
- **`.tiny`**: 1-line title, time hidden (hover to reveal), dots only (3+ lane overlap)
- **`.micro`** (week view only): duration < 45min

## Data Model

```typescript
type Event = {
  id: string;
  title: string;
  startMinutes: number;  // minutes from midnight, local timezone
  endMinutes: number;
  date: string;          // ISO date "2026-06-04"
  isAllDay: boolean;
  location?: string;
  notes?: string;
  ownerId: string;       // drives event color stripe
  attendeeIds: string[]; // includes ownerId
  drivers: string[];     // subset of attendeeIds marked as transportation
  recurrence?: RecurrenceRule;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

type Member = {
  id: string;
  name: string;
  color: string;         // hex
  role: "parent" | "child";
  permission: "owner" | "editor" | "view" | "none";
  defaultView: "day" | "week";
  meta?: string;         // e.g., "11th grade · Cedarcrest HS"
  order: number;
};

type Household = {
  id: string;
  name: string;          // "The Free Family"
  location: string;      // "Duvall, WA"
  members: Member[];
  preferences: {
    defaultView: "day" | "week" | "month";
    weekStartsOn: 0 | 1;
    visibleHoursStart: number;
    visibleHoursEnd: number;
    timeFormat: "12h" | "24h";
    showWeather: boolean;
  };
};
```

## Settled Decisions — Do Not Reverse

1. **No conflict detection UI.** The data model supports it (driver assignments make conflicts detectable), but no warnings should appear unless explicitly requested.
2. **Driver/passenger toggle on parent attendee tiles.** Parents on a child's event can be marked "Drive" (transportation) vs. full attendee. Renders as a small italic "drive" label next to the parent chip.
3. **Solid cream background.** No paper noise or radial gradients.
4. **Full-width timeline, no right rail.** Footer absorbs glance-info (event count, weather).
5. **Family filter as horizontal chip bar**, not sidebar. 7 chips fit in one row.
6. **All event positioning derived from `--start`/`--dur` CSS vars.** No hand-coded pixel values.
7. **Week view uses attendee dots (6px), not names.** Times hidden until hover.

## Family Members

| Name     | Role   | Color     | Permission  |
|----------|--------|-----------|-------------|
| Tyler    | Parent | `#c2410c` | Owner       |
| Heather  | Parent | `#7c2d6f` | Editor      |
| Erin     | Child  | `#1e5f74` | View only   |
| Leo      | Child  | `#b4632f` | View only   |
| Anthony  | Child  | `#4a6b3a` | No access   |
| Savannah | Child  | `#8a4c8a` | No access   |
| Lily     | Child  | `#a8651c` | No access   |

## Open Questions (Deferred to Implementation)

- Auth: single shared account vs. per-person logins
- Mobile layout (all designs are desktop; week view needs rethinking for mobile)
- Recurring event editing semantics (this occurrence / all future / series)
- "Just Me" filter behavior per logged-in user
- Cross-timezone handling (likely out of scope for v1)
- External calendar conflict resolution on sync

## Squad Team

This repo uses Squad (`.squad/`). The team is not yet cast. Before spawning agents, check `.squad/team.md` for the current roster. Branch naming convention for squad work: `squad/{issue-number}-{kebab-case-slug}`.
