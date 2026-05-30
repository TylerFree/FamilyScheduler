import { assignEventLanes, assignLanes, assignLanesForDate } from "@/lib/calendar/laneAlgorithm";
import type { Event, LaneComputationInput } from "@/types/index";

function buildEvent(overrides: Partial<LaneComputationInput> & Pick<LaneComputationInput, "id">): LaneComputationInput {
  return {
    id: overrides.id,
    date: overrides.date ?? "2026-06-04",
    startMinutes: overrides.startMinutes ?? 9 * 60,
    endMinutes: overrides.endMinutes ?? 10 * 60,
  };
}

function buildCalendarEvent(overrides: Partial<Event> & Pick<Event, "id" | "title" | "ownerId">): Event {
  return {
    id: overrides.id,
    title: overrides.title,
    startMinutes: overrides.startMinutes ?? 9 * 60,
    endMinutes: overrides.endMinutes ?? 10 * 60,
    date: overrides.date ?? "2026-06-04",
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location,
    notes: overrides.notes,
    ownerId: overrides.ownerId,
    attendeeIds: overrides.attendeeIds ?? [overrides.ownerId],
    drivers: overrides.drivers ?? [],
    recurrence: overrides.recurrence,
    createdAt: overrides.createdAt ?? "2026-06-04T00:00:00.000Z",
    createdBy: overrides.createdBy ?? overrides.ownerId,
    updatedAt: overrides.updatedAt ?? "2026-06-04T00:00:00.000Z",
  };
}

describe("assignEventLanes", () => {
  it("assigns a single event to lane 0 with one lane in the group", () => {
    const [event] = assignEventLanes([buildEvent({ id: "solo" })]);

    expect(event.lane).toBe(0);
    expect(event.lanes).toBe(1);
    expect(event["--lane"]).toBe(0);
    expect(event["--lanes"]).toBe(1);
  });

  it("reuses lane 0 for non-overlapping events", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "first", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "second", startMinutes: 10 * 60, endMinutes: 11 * 60 }),
    ]);

    expect(assigned.map((event) => [event.id, event.lane, event.lanes])).toEqual([
      ["first", 0, 1],
      ["second", 0, 1],
    ]);
  });

  it("assigns simultaneous events to separate lanes", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "alpha", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "beta", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
    ]);

    expect(assigned.map((event) => [event.id, event.lane, event.lanes])).toEqual([
      ["alpha", 0, 2],
      ["beta", 1, 2],
    ]);
  });

  it("assigns partially overlapping events to separate lanes", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "early", startMinutes: 9 * 60, endMinutes: 10 * 60 + 30 }),
      buildEvent({ id: "late", startMinutes: 10 * 60, endMinutes: 11 * 60 }),
    ]);

    const early = assigned.find((event) => event.id === "early");
    const late = assigned.find((event) => event.id === "late");

    expect(early?.lane).toBe(0);
    expect(late?.lane).toBe(1);
    expect(early?.lanes).toBe(2);
    expect(late?.lanes).toBe(2);
  });

  it("handles three-way simultaneous overlap with a shared lane count", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "alpha", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "beta", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "gamma", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
    ]);

    expect(assigned.map((event) => event.lane)).toEqual([0, 1, 2]);
    expect(new Set(assigned.map((event) => event.lanes))).toEqual(new Set([3]));
  });

  it("treats an event starting exactly when another ends as non-overlapping", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "first", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "second", startMinutes: 10 * 60, endMinutes: 10 * 60 + 30 }),
    ]);

    expect(assigned[0].lane).toBe(0);
    expect(assigned[1].lane).toBe(0);
    expect(assigned[0].groupId).not.toBe(assigned[1].groupId);
  });

  it("sorts by start time before assigning lanes", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "later", startMinutes: 11 * 60, endMinutes: 12 * 60 }),
      buildEvent({ id: "earlier", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "middle", startMinutes: 10 * 60, endMinutes: 11 * 60 }),
    ]);

    expect(assigned.map((event) => event.id)).toEqual(["earlier", "middle", "later"]);
    expect(assigned.every((event) => event.lane === 0)).toBe(true);
  });

  it("gives every event in an overlap group the same lanes value", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "alpha", startMinutes: 9 * 60, endMinutes: 11 * 60 }),
      buildEvent({ id: "beta", startMinutes: 9 * 60 + 15, endMinutes: 10 * 60 }),
      buildEvent({ id: "gamma", startMinutes: 10 * 60 + 15, endMinutes: 11 * 60 + 15 }),
    ]);

    const alphaGroup = assigned.find((event) => event.id === "alpha")?.groupId;
    const alphaGroupEvents = assigned.filter((event) => event.groupId === alphaGroup);

    expect(alphaGroupEvents.length).toBe(3);
    expect(new Set(alphaGroupEvents.map((event) => event.lanes))).toEqual(new Set([2]));
  });

  it("assigns identical start times deterministically by id", () => {
    const assigned = assignEventLanes([
      buildEvent({ id: "zeta", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
      buildEvent({ id: "alpha", startMinutes: 9 * 60, endMinutes: 10 * 60 }),
    ]);

    expect(assigned.map((event) => [event.id, event.lane])).toEqual([
      ["alpha", 0],
      ["zeta", 1],
    ]);
  });
});

describe("assignLanes", () => {
  it("adds time-grid variables for timed events", () => {
    const [event] = assignLanes([
      buildCalendarEvent({
        id: "planning",
        title: "Planning",
        ownerId: "tyler",
        startMinutes: 8 * 60,
        endMinutes: 9 * 60 + 30,
      }),
    ]);

    expect(event.durationMinutes).toBe(90);
    expect(event["--start"]).toBe(60);
    expect(event["--dur"]).toBe(90);
  });

  it("keeps all-day events out of the timed grid", () => {
    const [event] = assignLanes([
      buildCalendarEvent({
        id: "holiday",
        title: "Holiday",
        ownerId: "heather",
        isAllDay: true,
        startMinutes: 0,
        endMinutes: 24 * 60,
      }),
    ]);

    expect(event.lane).toBe(0);
    expect(event.lanes).toBe(1);
    expect(event["--start"]).toBe(0);
    expect(event["--dur"]).toBe(0);
  });
});

describe("assignLanesForDate", () => {
  it("filters events down to the requested date before assigning lanes", () => {
    const assigned = assignLanesForDate(
      [
        buildCalendarEvent({ id: "today", title: "Today", ownerId: "tyler", date: "2026-06-04" }),
        buildCalendarEvent({ id: "tomorrow", title: "Tomorrow", ownerId: "tyler", date: "2026-06-05" }),
      ],
      "2026-06-04",
    );

    expect(assigned).toHaveLength(1);
    expect(assigned[0]?.id).toBe("today");
  });
});
