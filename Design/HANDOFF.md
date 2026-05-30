# Family Scheduler — Design Handoff

A single-household calendar for the Free family. Built iteratively in a Claude.ai chat, ready for implementation in Claude Code.

---

## The Family

7 people sharing one calendar:

| Name      | Role   | Color hex | CSS var       |
|-----------|--------|-----------|---------------|
| Tyler     | Parent | `#c2410c` | `--tyler`     |
| Heather   | Parent | `#7c2d6f` | `--heather`   |
| Erin      | Child  | `#1e5f74` | `--erin`      |
| Leo       | Child  | `#b4632f` | `--leo`       |
| Anthony   | Child  | `#4a6b3a` | `--anthony`   |
| Savannah  | Child  | `#8a4c8a` | `--savannah`  |
| Lily      | Child  | `#a8651c` | `--lily`      |

Colors were chosen to be warm, distinct at small sizes (6px dots must stay distinguishable), and harmonious with the cream paper background. Don't substitute brighter saturated colors; the muted palette is intentional.

Home is Duvall, Washington.

---

## Design System

### Aesthetic direction

Editorial almanac. Think a thoughtfully designed household planner, not a corporate calendar app. Newspaper masthead chrome, serif italic display type, monospaced utility labels, cream paper background. Warm but not childish. The goal is something the parents would feel ownership of, not something that looks like a kid's homework app.

Avoid: rounded pills, bright saturated UI colors, generic SaaS gradients, emoji-as-icons.

### Color tokens

```css
:root {
  /* Paper / surface */
  --paper:        #f4ede1;  /* base background */
  --paper-deep:   #ebe2d2;  /* event card surfaces, hover states */
  --paper-darker: #ddd0b7;  /* sparingly used for emphasis */

  /* Ink / text */
  --ink:       #1a1814;  /* primary text, borders, buttons */
  --ink-soft:  #4a4438;  /* secondary text */
  --ink-faint: #8a8170;  /* tertiary, labels, meta */

  /* Rules */
  --rule:      #d4c9b3;  /* dividers, secondary borders */
  --rule-soft: #e4dac6;  /* faint dividers, hour rulers */

  /* Accents */
  --accent: #c2410c;  /* burnt orange — primary accent, also Tyler's color */
  --danger: #991b1b;  /* destructive actions, danger zone */
  --success: #4a6b3a; /* connected integrations, success state */
}
```

### Typography

Three families, each with one job:

- **Fraunces** (serif, italic) — display, event titles, names, dates. Use weights 500–700, often italic. The italic Fraunces is the *signature* of the design.
- **Inter Tight** (sans-serif) — body copy, descriptions, helper text. Use sparingly; most copy isn't body copy.
- **JetBrains Mono** (monospace) — labels, buttons, eyebrows, times, metadata, counts. Always uppercase with `letter-spacing: 0.15em–0.25em` and small sizes (8–11px).

Type contract:
- Headlines and event titles: Fraunces italic, large
- Labels, buttons, meta: JetBrains Mono, ALL CAPS, wide letter-spacing, small
- Body and helper: Inter Tight, italic for inline asides
- Numbers as features (event counts, "72 events"): Fraunces italic, oversize

### Spatial / layout

- Page padding: `20px 28px`
- Max-width: `1600px` for calendar views, `1100px` for settings
- Borders: solid 1px var(--rule) for internal, 1–2px var(--ink) for structural
- Box shadows are square offsets (`4px 4px 0 var(--ink)`), never blurred — the design has no rounded corners or soft shadows. It's flat, paper-like, slightly retro.

### Component patterns

- **Buttons**: square corners, 1px var(--ink) border, JetBrains Mono uppercase labels with 0.15em letter-spacing. Primary buttons are filled ink, hover transitions to accent.
- **Inputs**: 1px var(--ink) border, paper background, focus state darkens to paper-deep (no glow rings).
- **Chips**: square, 1px border, with a 4px colored stripe on the left tied to a CSS var `--c` set inline.
- **Toggles**: rectangular slabs that slide a square handle, not iOS-style rounded pills.
- **Dividers**: dotted for soft separations, solid var(--ink) for structural.

---

## The Time-Grid Math

This is the most important technical decision. Don't skip it.

### Core principle

Events position themselves by **minutes from day-start**, not by being nested inside hour-row containers. Each event uses two CSS custom properties:

- `--start`: minutes elapsed since the day-start hour (e.g. 7 AM)
- `--dur`: duration in minutes

The timeline container is a single absolutely-positioned div. Hour-ruler lines are also absolutely positioned inside the same container, so they share the coordinate space exactly with events.

### Daily view scale

1 minute = 1 pixel, so 1 hour = 60px. Day spans 7 AM – 9 PM = 14 hours × 60 = 840px total height.

```css
.event {
  position: absolute;
  top: calc(var(--start) * 1px);
  height: calc(var(--dur) * 1px);
}
```

Example: 9:00–10:30 AM event → `--start: 120; --dur: 90;` renders 90px tall starting at the 9 AM ruler.

### Weekly view scale

Compressed to 0.6 px/min → 1 hour = 36px. Same math, different multiplier:

```css
:root { --hour-height: 36px; }

.event {
  top: calc(var(--start) * var(--hour-height) / 60);
  height: calc(var(--dur) * var(--hour-height) / 60);
}
```

This single formula scales every event correctly regardless of view density.

### Overlap lanes

When multiple events occur at the same time, they render in side-by-side lanes. Each event in a lane group declares:

- `--lane`: zero-indexed lane position (0, 1, 2, 3...)
- `--lanes`: total lanes in the group

Width and left-offset compute automatically:

```css
.event.in-lane {
  left: calc(12px + (var(--lane) * ((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes) + 6px)));
  width: calc((100% - 24px - (var(--lanes) - 1) * 6px) / var(--lanes));
}
```

For the implementation: lane assignment is the *algorithmic* problem to solve. Given a list of events on one day, sort by start time, then greedily place each into the lowest-numbered lane that doesn't conflict. The number of lanes for a group equals the max simultaneous overlap count in that window.

### Compact rendering modes

As events get narrower or shorter, downshift through three sizes:

- **Default**: full title, time, location, attendee chips
- **`.short`**: smaller title, no location, smaller chips
- **`.tiny`** or **`.micro`**: 1-line title, time hidden (shown on hover), tiny attendee dots only

Trigger thresholds (approximate, tune for feel):
- `.short` when event is < ~60min or in a 2-lane overlap
- `.tiny` when in a 3+ lane overlap or column width is narrow
- `.micro` (week view only) when duration < 45min

---

## Views

### Daily View

Single day. Full-width timeline below the header and member filter bar. Horizontal layout with title + time + location on one row, attendee chips below.

Header is a single row: brand left, date center, view-switch / nav / today / +New Event right.

Family member filter bar is a horizontal scrolling row of chips. Each chip shows: 4px colored stripe + italic name + event count badge. Tapping toggles `.muted` (35% opacity, no fill tint). Quick-action links at the far right: All / None / Just Me.

NOW line renders as a 1px accent-colored horizontal rule with a circular endpoint on the left and a `NOW · 2:47` label on the right.

### Weekly View

7 columns × 14 hours. Same color system, same time math (scaled to 0.6 px/min). Day headers show dow + date number + event count, with `today` highlighted in accent color. Weekends get a faint gray tint to differentiate.

At this density, events show only:
- A 2-line truncated title (1 line for micro)
- A row of 6px colored dots, one per attendee
- **Hover reveals the time** via a `::after` tooltip with `data-time` attribute

NOW line renders only in today's column.

### Event Edit / Create Modal

Same modal for both. Opens over the calendar with a darkened scrim and the target event highlighted (dashed outline) behind the modal. Modal is centered, max 560px wide, with a 8px square drop shadow.

Sections, top to bottom:
1. **Header**: eyebrow (`— Editing Event —` or `— New Event —`), italic Fraunces title, close button
2. **Title** input (large italic Fraunces)
3. **When**: 3-column row (date, start time, end time) + all-day checkbox
4. **Location** input (optional, italic)
5. **Attendees**: 4-column grid of family member tiles, each toggleable. Parent tiles (Tyler, Heather) have a small **Drive** button to mark them as transportation rather than full attendee. Bulk shortcuts below: Whole family / Just kids / Just adults / Clear all. Live preview chip row at the bottom.
6. **Color/owner**: row of swatches to pick whose calendar owns the event (defaults to first attendee, drives the colored stripe).
7. **Repeats**: select with sensible presets (does not repeat, weekly on X until Y, weekly forever, every weekday, custom).
8. **Notes**: italic textarea.

Footer: **Delete Event** (red, far left, edit-only) | **Cancel** (transparent) | **Save Changes** (filled ink).

### Settings

Full-page, not modal. Left nav rail (Family / Display / Notifications / Integrations / Account) with active item highlighted by left burnt-orange border. Content area on the right with sectioned blocks.

Family section is the centerpiece. Each member is a row with: color stripe (gradient fade right) + italic name + meta (school/role) + Parent/Child badge + permission badge (Owner/Editor/View only/No access) + monthly event count + edit chevron.

Permission system has 4 levels:
- **Owner**: full control including settings (Tyler)
- **Editor**: can create and edit events (Heather)
- **View only**: read-only access (teenagers)
- **No access**: not a user, only an attendee data row (young children)

Display preferences cover default view, week-starts-on, visible hours, time format, weather toggle.

Notifications cover default reminder time, daily digest, weekly preview, attendee-added alerts, quiet hours.

Integrations: Microsoft 365 (relevant for Tyler), Google Calendar (Heather), Apple Calendar, School Calendar ICS feed.

Danger Zone: combined Export & Reset (export first as safety net).

---

## Data Model

Minimum event shape:

```typescript
type Event = {
  id: string;
  title: string;
  startMinutes: number;  // minutes from midnight, in user's local timezone
  endMinutes: number;
  date: string;          // ISO date "2026-06-04"
  isAllDay: boolean;
  location?: string;
  notes?: string;
  ownerId: string;       // drives event color
  attendeeIds: string[]; // shows as dots/chips, includes ownerId
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
  meta?: string;         // "11th grade · Cedarcrest HS"
  order: number;         // for chip-bar sort
};

type Household = {
  id: string;
  name: string;          // "The Free Family"
  location: string;      // "Duvall, WA"
  members: Member[];
  preferences: {
    defaultView: "day" | "week" | "month";
    weekStartsOn: 0 | 1; // 0 = Sun, 1 = Mon
    visibleHoursStart: number;
    visibleHoursEnd: number;
    timeFormat: "12h" | "24h";
    showWeather: boolean;
  };
};
```

---

## Iteration Decisions Worth Preserving

These came out of back-and-forth refinement. Don't undo them by accident:

1. **Conflict detection was built and then removed.** The user wanted a clean view without warnings. The data model still supports it (driver assignments make logical conflicts detectable), but UI for it should not appear unless explicitly requested.

2. **Driver/passenger toggle on parent tiles.** When a parent is added to a kid's event, the user wanted to distinguish "going as attendee" from "providing transportation." Implemented as a `Drive` toggle button on parent attendee tiles only. Renders in the calendar as a small italic "drive" label next to the parent's chip.

3. **Solid cream background, no texture.** An early iteration added paper noise + radial gradients. The user preferred clean solid color.

4. **Full-width timeline, no right rail.** The original daily view had a right rail with weather + agenda + stats. User asked to maximize screen real estate. Now the footer absorbs glance-info (event count, weather).

5. **Family filter as horizontal chip bar, not sidebar.** Same motivation — vertical real estate. 7 chips fit comfortably in one row.

6. **Mathematically precise event positioning.** Early iterations used hand-coded pixel heights for events; the user caught that a 9:00–10:30 event was visually only reaching 9:30. Fixed by deriving all positioning from `--start` and `--dur` CSS variables. Don't regress to hand-coded values.

7. **Attendee dots, not names, for week-view density.** Times hidden until hover. This was an explicit user choice over title+time-only or title+name+time.

---

## Suggested Implementation Stack

Framework-agnostic, but a sensible default:

- **Next.js + React + TypeScript**
- **Tailwind CSS** with the color tokens above mapped to theme extension. Or vanilla CSS modules — the existing styling is plain CSS and translates directly.
- **Fonts**: Fraunces, Inter Tight, JetBrains Mono — all from Google Fonts, declared in `<head>`
- **State**: Zustand or Redux Toolkit for events, members, preferences. Keep it simple.
- **Persistence**: start with localStorage; migrate to a real backend (Supabase / Postgres) when multi-user sync matters
- **Recurrence**: use `rrule.js` for RFC 5545–compatible recurrence rules
- **Timezone**: use `date-fns-tz` or Luxon. Store events in UTC, render in user's local zone.

For a Microsoft-stack family this could equally well be:
- Power Apps as the UI (matches Tyler's daily tooling)
- Dataverse as the backing store
- Power Automate for notifications and daily digest emails
- Synced with Microsoft 365 Calendar via Graph API

The HTML files in this folder are framework-agnostic — they can be lifted into any of these stacks.

---

## File Index

- `family-scheduler-daily-clean.html` — final daily view (no conflict UI)
- `family-scheduler-weekly.html` — 7-column weekly view
- `family-scheduler-edit-modal.html` — event create/edit modal over week view
- `family-scheduler-settings.html` — settings + family management

These are the canonical reference designs. Earlier iterations (overlaps, compact versions, conflict-tracking variants) are not the source of truth.

---

## Open Questions

Things deferred during design that need answers during implementation:

1. **Single shared account vs. per-person logins.** Permissions in settings imply per-person logins, but no auth flow has been designed.
2. **Mobile layout.** All current designs are desktop. Mobile is critical for a family app (parents check the calendar on their phones). Day view should adapt cleanly; week view needs a rethink — likely a horizontal swipe between days or a condensed view.
3. **Recurring event editing semantics.** "Edit this occurrence" vs. "Edit all future" vs. "Edit series." Standard but worth deciding early.
4. **What "Just Me" means in the family filter** when the logged-in user could be any family member. Probably: show only events I'm an attendee or driver on.
5. **Cross-timezone handling** when family travels. Probably out of scope for v1.
6. **External calendar conflict resolution** when the Microsoft 365 or Google sync brings in events that conflict with manually-added family events.
