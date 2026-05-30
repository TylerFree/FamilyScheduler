# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|---------|
| Architecture, project setup, scaffolding | Rusty | Next.js app setup, folder structure, design decisions |
| Code review, spec compliance | Rusty | PR review, checking settled decisions aren't violated |
| React components, calendar UI | Yen | DayView, WeekView, EventChip, FilterBar, Modal, Settings |
| CSS, design tokens, time-grid math | Yen | `--start`/`--dur` implementation, overlap lanes, compact modes |
| TypeScript types, data model | Basher | `Event`, `Member`, `Household` types, Zustand store |
| State management, persistence | Basher | Zustand setup, localStorage, future Supabase migration |
| Lane assignment algorithm | Basher | Greedy overlap detection, event positioning logic |
| Recurrence, date/time utilities | Basher | rrule.js integration, UTC↔local conversion |
| Unit tests, integration tests | Linus | Lane algorithm tests, time-grid math tests, edge cases |
| QA, edge case analysis | Linus | Event boundaries, overlaps, all-day events, recurrence |
| Code review | Rusty | Review PRs, check quality, verify spec compliance |
| Scope & priorities | Rusty | What to build next, trade-offs, decisions |
| Session logging | Scribe | Automatic — never needs routing |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Rusty |
| `squad:rusty` | Architecture, scaffolding, code review | Rusty |
| `squad:yen` | React components, CSS, calendar UI | Yen |
| `squad:basher` | Data types, state, persistence, lane algorithm | Basher |
| `squad:linus` | Tests, QA, edge cases | Linus |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
