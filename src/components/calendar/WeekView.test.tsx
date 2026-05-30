import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import WeekView from "@/components/calendar/WeekView";
import { FAMILY_MEMBERS, type Event, type EventWithLane } from "@/types/index";

const mockUseEventsForDate = vi.fn();
const mockUseHouseholdStore = vi.fn();

vi.mock("@/store", () => ({
  useEventsForDate: (date: string) => mockUseEventsForDate(date),
  useHouseholdStore: (selector: (state: unknown) => unknown) => mockUseHouseholdStore(selector),
}));

function buildEvent(overrides: Partial<EventWithLane> & Pick<EventWithLane, "id" | "title" | "date" | "ownerId">): EventWithLane {
  const startMinutes = overrides.startMinutes ?? 9 * 60;
  const endMinutes = overrides.endMinutes ?? 10 * 60;
  const durationMinutes = overrides.durationMinutes ?? Math.max(endMinutes - startMinutes, 0);

  return {
    id: overrides.id,
    title: overrides.title,
    startMinutes,
    endMinutes,
    date: overrides.date,
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location,
    notes: overrides.notes,
    ownerId: overrides.ownerId,
    attendeeIds: overrides.attendeeIds ?? [overrides.ownerId],
    drivers: overrides.drivers ?? [],
    recurrence: overrides.recurrence,
    createdAt: overrides.createdAt ?? `${overrides.date}T00:00:00.000Z`,
    createdBy: overrides.createdBy ?? overrides.ownerId,
    updatedAt: overrides.updatedAt ?? `${overrides.date}T00:00:00.000Z`,
    durationMinutes,
    lane: overrides.lane ?? 0,
    lanes: overrides.lanes ?? 1,
    groupId: overrides.groupId ?? `${overrides.date}-group-1`,
    "--start": overrides["--start"] ?? startMinutes - 7 * 60,
    "--dur": overrides["--dur"] ?? durationMinutes,
    "--lane": overrides["--lane"] ?? 0,
    "--lanes": overrides["--lanes"] ?? 1,
  };
}

function setColumnBounds(element: HTMLElement, height = 504) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: height,
      width: 100,
      height,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  });
}

let mediaQueryMatches = false;
const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();

function installMatchMediaMock() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mediaQueryMatches,
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.add(listener);
      },
      removeEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
        mediaQueryListeners.delete(listener);
      },
      dispatchEvent: () => true,
    })),
  });
}

function setMobileViewport(isMobile: boolean) {
  mediaQueryMatches = isMobile;
  const event = { matches: isMobile } as MediaQueryListEvent;
  mediaQueryListeners.forEach((listener) => listener(event));
}

describe("WeekView", () => {
  let eventsByDate: Record<string, EventWithLane[]>;

  beforeEach(() => {
    vi.useFakeTimers();
    mediaQueryListeners.clear();
    mediaQueryMatches = false;
    installMatchMediaMock();
    eventsByDate = {};
    mockUseEventsForDate.mockImplementation((date: string) => eventsByDate[date] ?? []);
    mockUseHouseholdStore.mockImplementation((selector: (state: { household: { preferences: { visibleHoursStart: number; visibleHoursEnd: number; }; }; }) => unknown) =>
      selector({
        household: {
          preferences: {
            visibleHoursStart: 7,
            visibleHoursEnd: 21,
          },
        },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    mediaQueryListeners.clear();
    vi.clearAllMocks();
  });

  function renderWeekView(props: Partial<React.ComponentProps<typeof WeekView>> = {}) {
    return render(<WeekView startDate="2026-06-01" members={FAMILY_MEMBERS} {...props} />);
  }

  it("renders seven day columns for the visible week", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    const { container } = renderWeekView();

    expect(container.querySelectorAll('[data-testid^="week-day-column-"]')).toHaveLength(7);
  });

  it("renders a three-day mobile window with range navigation", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    setMobileViewport(true);

    const { container } = renderWeekView();

    expect(container.querySelectorAll('[data-testid^="week-day-column-"]')).toHaveLength(3);
    expect(screen.getByText("MON – WED")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /← Prev/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Next →/i })).toBeTruthy();
    expect(screen.queryByText("THU · TODAY")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));

    expect(screen.getByText("THU – SAT")).toBeTruthy();
    expect(screen.getByText("THU · TODAY")).toBeTruthy();
    expect(screen.getByRole("button", { name: /← Prev/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));

    expect(screen.getByText("FRI – SUN")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Next →/i })).toBeNull();
  });

  it("resets the mobile window when the week changes", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    setMobileViewport(true);

    const { rerender } = renderWeekView();

    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(screen.getByText("THU – SAT")).toBeTruthy();

    rerender(<WeekView startDate="2026-06-08" members={FAMILY_MEMBERS} />);

    expect(screen.getByText("MON – WED")).toBeTruthy();
    expect(screen.queryByText("THU – SAT")).toBeNull();
  });

  it("renders the correct week heading and day headers", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    renderWeekView();

    expect(screen.getByText("June 1 – 7")).toBeTruthy();
    expect(screen.getByText("MON")).toBeTruthy();
    expect(screen.getByText("TUE")).toBeTruthy();
    expect(screen.getByText("WED")).toBeTruthy();
    expect(screen.getByText("THU · TODAY")).toBeTruthy();
    expect(screen.getByText("FRI")).toBeTruthy();
    expect(screen.getByText("SAT")).toBeTruthy();
    expect(screen.getByText("SUN")).toBeTruthy();
  });

  it("renders timed events in the column matching each event date", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    eventsByDate["2026-06-02"] = [buildEvent({ id: "piano", title: "Piano lesson", date: "2026-06-02", ownerId: "savannah" })];
    eventsByDate["2026-06-05"] = [buildEvent({ id: "pickup", title: "School pickup", date: "2026-06-05", ownerId: "heather" })];

    renderWeekView();

    expect(within(screen.getByTestId("week-day-column-2026-06-02")).getByText("Piano lesson")).toBeTruthy();
    expect(within(screen.getByTestId("week-day-column-2026-06-05")).getByText("School pickup")).toBeTruthy();
    expect(within(screen.getByTestId("week-day-column-2026-06-02")).queryByText("School pickup")).toBeNull();
  });

  it("renders all-day events outside the timed day column", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    eventsByDate["2026-06-03"] = [buildEvent({ id: "holiday", title: "Field Day", date: "2026-06-03", ownerId: "erin", isAllDay: true })];

    renderWeekView();

    expect(screen.getByText("Field Day")).toBeTruthy();
    expect(within(screen.getByTestId("week-day-column-2026-06-03")).queryByText("Field Day")).toBeNull();
  });

  it("renders the NOW line only in today's column", () => {
    vi.setSystemTime(new Date("2026-06-04T12:15:00"));

    renderWeekView();

    expect(screen.getByTestId("week-now-line-2026-06-04")).toBeTruthy();
    expect(screen.queryByTestId("week-now-line-2026-06-03")).toBeNull();
    expect(screen.queryByTestId("week-now-line-2026-06-05")).toBeNull();
  });

  it("does not render the NOW line when the current time is outside visible hours", () => {
    vi.setSystemTime(new Date("2026-06-04T05:30:00"));

    renderWeekView();

    expect(screen.queryByTestId("week-now-line-2026-06-04")).toBeNull();
  });

  it("calls onTimeSlotClick with the clicked date and rounded minutes", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    const onTimeSlotClick = vi.fn();

    renderWeekView({ onTimeSlotClick });

    const column = screen.getByTestId("week-day-column-2026-06-03");
    setColumnBounds(column);
    fireEvent.click(column, { clientY: 18 });

    expect(onTimeSlotClick).toHaveBeenCalledTimes(1);
    expect(onTimeSlotClick).toHaveBeenCalledWith("2026-06-03", 450);
  });

  it("calls onEventClick for timed events and does not bubble to the column click handler", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    const meeting = buildEvent({ id: "meeting", title: "Team planning", date: "2026-06-04", ownerId: "tyler" });
    const onEventClick = vi.fn();
    const onTimeSlotClick = vi.fn();
    eventsByDate["2026-06-04"] = [meeting];

    renderWeekView({ onEventClick, onTimeSlotClick });

    fireEvent.click(screen.getByRole("button", { name: /Team planning, 9:00 AM – 10:00 AM/ }));

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(meeting as Event);
    expect(onTimeSlotClick).not.toHaveBeenCalled();
  });

  it("calls onEventClick for all-day events", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    const allDayEvent = buildEvent({ id: "holiday", title: "School holiday", date: "2026-06-06", ownerId: "lily", isAllDay: true });
    const onEventClick = vi.fn();
    eventsByDate["2026-06-06"] = [allDayEvent];

    renderWeekView({ onEventClick });

    fireEvent.click(screen.getByRole("button", { name: "School holiday" }));

    expect(onEventClick).toHaveBeenCalledWith(allDayEvent as Event);
  });

  it("applies the explicit member filter prop on top of store-provided events", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    eventsByDate["2026-06-04"] = [
      buildEvent({ id: "tyler-event", title: "Dad errand", date: "2026-06-04", ownerId: "tyler", attendeeIds: ["tyler"] }),
      buildEvent({ id: "erin-event", title: "Choir practice", date: "2026-06-04", ownerId: "erin", attendeeIds: ["erin", "heather"] }),
    ];

    renderWeekView({ filter: ["tyler"] });

    expect(screen.getByText("Dad errand")).toBeTruthy();
    expect(screen.queryByText("Choir practice")).toBeNull();
  });

  it("renders attendee metadata for timed events", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    eventsByDate["2026-06-04"] = [
      buildEvent({
        id: "dinner",
        title: "Family dinner",
        date: "2026-06-04",
        ownerId: "heather",
        attendeeIds: ["heather", "tyler", "erin"],
      }),
    ];

    renderWeekView();

    expect(screen.getByLabelText("Attendees: Heather, Tyler, Erin")).toBeTruthy();
  });
});
