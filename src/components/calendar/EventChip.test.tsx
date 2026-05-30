import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import EventChip from "@/components/calendar/EventChip";
import styles from "@/components/calendar/EventChip.module.css";
import type { EventWithLane } from "@/types/index";

function buildEvent(overrides: Partial<EventWithLane> = {}): EventWithLane {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Family dinner",
    startMinutes: overrides.startMinutes ?? 18 * 60,
    endMinutes: overrides.endMinutes ?? 19 * 60,
    date: overrides.date ?? "2026-06-04",
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location ?? "At home",
    notes: overrides.notes,
    ownerId: overrides.ownerId ?? "heather",
    attendeeIds: overrides.attendeeIds ?? ["heather", "tyler"],
    drivers: overrides.drivers ?? [],
    recurrence: overrides.recurrence,
    createdAt: overrides.createdAt ?? "2026-06-04T00:00:00.000Z",
    createdBy: overrides.createdBy ?? "heather",
    updatedAt: overrides.updatedAt ?? "2026-06-04T00:00:00.000Z",
    durationMinutes: overrides.durationMinutes ?? 60,
    lane: overrides.lane ?? 0,
    lanes: overrides.lanes ?? 1,
    groupId: overrides.groupId ?? "group-1",
    "--start": overrides["--start"] ?? 0,
    "--dur": overrides["--dur"] ?? 60,
    "--lane": overrides["--lane"] ?? 0,
    "--lanes": overrides["--lanes"] ?? 1,
  };
}

describe("EventChip", () => {
  it("renders the event title", () => {
    render(<EventChip event={buildEvent({ title: "School pickup" })} memberColor="#7c2d6f" />);

    expect(screen.getByText("School pickup")).toBeTruthy();
  });

  it("applies the inLane class when multiple lanes are present", () => {
    render(<EventChip event={buildEvent({ lanes: 2, "--lanes": 2 })} memberColor="#7c2d6f" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.classList.contains(styles.inLane)).toBe(true);
  });

  it("applies the short class when duration is under 45 minutes", () => {
    render(<EventChip event={buildEvent({ durationMinutes: 40, "--dur": 40 })} memberColor="#7c2d6f" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.classList.contains(styles.short)).toBe(true);
  });

  it("applies the short class when two or more lanes are present", () => {
    render(<EventChip event={buildEvent({ lanes: 2, "--lanes": 2, durationMinutes: 90, "--dur": 90 })} memberColor="#7c2d6f" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.classList.contains(styles.short)).toBe(true);
  });

  it("applies the tiny class when three or more lanes are present", () => {
    render(<EventChip event={buildEvent({ lanes: 3, "--lanes": 3, durationMinutes: 90, "--dur": 90 })} memberColor="#7c2d6f" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.classList.contains(styles.tiny)).toBe(true);
  });

  it("sets the member color CSS custom property", () => {
    render(<EventChip event={buildEvent()} memberColor="#1e5f74" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.getAttribute("style")).toContain("--c: #1e5f74");
  });

  it("includes a data-time attribute for hover reveal states", () => {
    render(<EventChip event={buildEvent({ startMinutes: 9 * 60, endMinutes: 10 * 60 + 30 })} memberColor="#7c2d6f" />);

    const chip = screen.getByLabelText(/Family dinner,/);
    expect(chip.getAttribute("data-time")).toBe("9:00 AM – 10:30 AM");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const event = buildEvent({ id: "click-target" });
    render(<EventChip event={event} memberColor="#7c2d6f" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: /Family dinner,/ }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it("does not throw when clicked without an onClick handler", () => {
    render(<EventChip event={buildEvent()} memberColor="#7c2d6f" />);

    expect(() => fireEvent.click(screen.getByLabelText(/Family dinner,/))).not.toThrow();
  });
});
