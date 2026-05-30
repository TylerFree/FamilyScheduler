import { expandRecurringEventsForDate, expandRecurringEventsForDateRange } from "@/lib/calendar/recurrence";
import type { Event } from "@/types/index";

function buildEvent(overrides: Partial<Event> & Pick<Event, "id" | "title" | "date">): Event {
  return {
    id: overrides.id,
    title: overrides.title,
    startMinutes: overrides.startMinutes ?? 9 * 60,
    endMinutes: overrides.endMinutes ?? 10 * 60,
    date: overrides.date,
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location,
    notes: overrides.notes,
    ownerId: overrides.ownerId ?? "tyler",
    attendeeIds: overrides.attendeeIds ?? ["tyler"],
    drivers: overrides.drivers ?? [],
    recurrence: overrides.recurrence,
    createdAt: overrides.createdAt ?? `${overrides.date}T00:00:00.000Z`,
    createdBy: overrides.createdBy ?? "tyler",
    updatedAt: overrides.updatedAt ?? `${overrides.date}T00:00:00.000Z`,
  };
}

describe("recurrence expansion", () => {
  it("expands a weekly forever event into future weeks with the parent id", () => {
    const event = buildEvent({
      id: "weekly-practice",
      title: "Weekly practice",
      date: "2026-06-04",
      recurrence: { freq: "WEEKLY" },
    });

    const occurrences = expandRecurringEventsForDateRange([event], "2026-06-18", "2026-06-24");

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]).toMatchObject({
      id: "weekly-practice",
      title: "Weekly practice",
      date: "2026-06-18",
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
    });
  });

  it("does not include weekly occurrences after an until date", () => {
    const event = buildEvent({
      id: "short-series",
      title: "Short series",
      date: "2026-06-04",
      recurrence: { freq: "WEEKLY", until: "2026-06-18T23:59:59.000Z" },
    });

    expect(expandRecurringEventsForDate([event], "2026-06-18")).toHaveLength(1);
    expect(expandRecurringEventsForDate([event], "2026-06-25")).toHaveLength(0);
  });

  it("expands weekday rules only on matching weekdays", () => {
    const event = buildEvent({
      id: "school-run",
      title: "School run",
      date: "2026-06-01",
      recurrence: { freq: "DAILY", byDay: ["MO", "TU", "WE", "TH", "FR"] },
    });

    const occurrences = expandRecurringEventsForDateRange([event], "2026-06-01", "2026-06-07");

    expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
    ]);
  });
});
