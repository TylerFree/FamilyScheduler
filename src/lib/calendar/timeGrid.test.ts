import { getEventTimeGridVars, isEventVisibleInTimeGrid } from "@/lib/calendar/timeGrid";
import type { Event } from "@/types/index";

function buildTimedEvent(overrides: Partial<Pick<Event, "startMinutes" | "endMinutes" | "isAllDay">> = {}) {
  return {
    startMinutes: overrides.startMinutes ?? 9 * 60,
    endMinutes: overrides.endMinutes ?? 10 * 60,
    isAllDay: overrides.isAllDay ?? false,
  };
}

describe("getEventTimeGridVars", () => {
  it("maps 7 AM to start offset 0", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 420, endMinutes: 480 }), {
        visibleHoursStart: 7,
      }),
    ).toEqual({ "--start": 0, "--dur": 60 });
  });

  it("maps 9 AM to start offset 120", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 540, endMinutes: 600 }), {
        visibleHoursStart: 7,
      })?.["--start"],
    ).toBe(120);
  });

  it("maps 1 PM to start offset 360", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 780, endMinutes: 840 }), {
        visibleHoursStart: 7,
      })?.["--start"],
    ).toBe(360);
  });

  it("derives duration from end minus start", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 9 * 60, endMinutes: 10 * 60 + 30 })),
    )?.toMatchObject({ "--dur": 90 });
  });

  it("never returns a negative start offset for events before the visible window", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 6 * 60, endMinutes: 8 * 60 }))?.["--start"],
    ).toBe(0);
  });

  it("caps the start offset at the total visible minutes for events after the visible window", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 22 * 60, endMinutes: 23 * 60 }), {
        visibleHoursStart: 7,
        visibleHoursEnd: 21,
      })?.["--start"],
    ).toBe(14 * 60);
  });

  it("returns zero duration for zero-length events", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 9 * 60, endMinutes: 9 * 60 })),
    )?.toMatchObject({ "--dur": 0 });
  });

  it("keeps exact hour boundaries aligned to exact minute offsets", () => {
    expect(
      getEventTimeGridVars(buildTimedEvent({ startMinutes: 10 * 60, endMinutes: 11 * 60 }))?.["--start"],
    ).toBe(180);
  });

  it("returns null for all-day events because they skip time-grid positioning", () => {
    expect(getEventTimeGridVars(buildTimedEvent({ isAllDay: true }))).toBeNull();
    expect(isEventVisibleInTimeGrid(buildTimedEvent({ isAllDay: true }))).toBe(false);
  });
});
