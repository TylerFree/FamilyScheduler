import React from "react";
import { render, screen } from "@testing-library/react";
import DayView from "@/components/calendar/DayView";
import styles from "@/components/calendar/DayView.module.css";
import type { EventWithLane, Member } from "@/types/index";

function buildMember(overrides: Partial<Member> & Pick<Member, "id" | "name" | "color" | "role" | "permission">): Member {
  return {
    id: overrides.id,
    name: overrides.name,
    color: overrides.color,
    role: overrides.role,
    permission: overrides.permission,
    defaultView: overrides.defaultView ?? "day",
    meta: overrides.meta,
    order: overrides.order ?? 0,
  };
}

function buildEvent(overrides: Partial<EventWithLane> & Pick<EventWithLane, "id" | "title" | "ownerId">): EventWithLane {
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
    durationMinutes: overrides.durationMinutes ?? (overrides.endMinutes ?? 10 * 60) - (overrides.startMinutes ?? 9 * 60),
    lane: overrides.lane ?? 0,
    lanes: overrides.lanes ?? 1,
    groupId: overrides.groupId ?? "group-1",
    "--start": overrides["--start"] ?? ((overrides.startMinutes ?? 9 * 60) - 7 * 60),
    "--dur": overrides["--dur"] ?? ((overrides.endMinutes ?? 10 * 60) - (overrides.startMinutes ?? 9 * 60)),
    "--lane": overrides["--lane"] ?? 0,
    "--lanes": overrides["--lanes"] ?? 1,
  };
}

const members: Member[] = [
  buildMember({ id: "tyler", name: "Tyler", color: "#c2410c", role: "parent", permission: "owner" }),
  buildMember({ id: "heather", name: "Heather", color: "#7c2d6f", role: "parent", permission: "editor", order: 1 }),
];

describe("DayView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders one EventChip per visible event", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    render(
      <DayView
        date="2026-06-04"
        members={members}
        events={[
          buildEvent({ id: "breakfast", title: "Breakfast", ownerId: "tyler", startMinutes: 8 * 60, endMinutes: 8 * 60 + 30 }),
          buildEvent({ id: "pickup", title: "School pickup", ownerId: "heather", startMinutes: 15 * 60, endMinutes: 16 * 60 }),
        ]}
        onEventClick={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("renders hour labels for the full visible range", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));
    const { container } = render(<DayView date="2026-06-04" members={members} events={[]} />);

    const labels = Array.from(container.querySelectorAll(`.${styles.hourLabel}`));

    expect(labels).toHaveLength(14);
    expect(labels[0]?.textContent).toBe("7 AM");
    expect(labels.at(-1)?.textContent).toBe("8 PM");
  });

  it("renders a NOW line when the current time is inside the visible window", () => {
    vi.setSystemTime(new Date("2026-06-04T12:15:00"));
    const { container } = render(<DayView date="2026-06-04" members={members} events={[]} />);

    const nowLine = container.querySelector(`.${styles.nowLine}`);

    expect(nowLine).toBeTruthy();
    expect(nowLine?.getAttribute("data-label")).toBe("NOW · 12:15 PM");
  });

  it("does not render a NOW line outside the visible window", () => {
    vi.setSystemTime(new Date("2026-06-04T05:45:00"));
    const { container } = render(<DayView date="2026-06-04" members={members} events={[]} />);

    expect(container.querySelector(`.${styles.nowLine}`)).toBeNull();
  });

  it("maps each event owner to the matching member color", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    render(
      <DayView
        date="2026-06-04"
        members={members}
        events={[
          buildEvent({ id: "breakfast", title: "Breakfast", ownerId: "tyler" }),
          buildEvent({ id: "pickup", title: "School pickup", ownerId: "heather", startMinutes: 10 * 60, endMinutes: 11 * 60 }),
        ]}
      />,
    );

    expect(screen.getByLabelText(/Breakfast,/).getAttribute("style")).toContain("--c: #c2410c");
    expect(screen.getByLabelText(/School pickup,/).getAttribute("style")).toContain("--c: #7c2d6f");
  });

  it("renders zero-duration events that fall inside the visible window", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    render(
      <DayView
        date="2026-06-04"
        members={members}
        events={[buildEvent({ id: "marker", title: "Bell", ownerId: "tyler", startMinutes: 9 * 60, endMinutes: 9 * 60, durationMinutes: 0, "--dur": 0 })]}
      />,
    );

    const chip = screen.getByLabelText(/Bell,/);
    expect(chip.getAttribute("style")).toContain("--dur: 0");
  });

  it("skips all-day events from the time grid", () => {
    vi.setSystemTime(new Date("2026-06-04T12:00:00"));

    render(
      <DayView
        date="2026-06-04"
        members={members}
        events={[buildEvent({ id: "holiday", title: "Holiday", ownerId: "tyler", isAllDay: true })]}
      />,
    );

    expect(screen.queryByText("Holiday")).toBeNull();
  });
});
