import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import EventModal from "@/components/calendar/EventModal";
import { FAMILY_MEMBERS, type Event } from "@/types/index";

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: overrides.id ?? "event-1",
    title: overrides.title ?? "Band rehearsal",
    startMinutes: overrides.startMinutes ?? 18 * 60,
    endMinutes: overrides.endMinutes ?? 19 * 60,
    date: overrides.date ?? "2026-06-10",
    isAllDay: overrides.isAllDay ?? false,
    location: overrides.location ?? "Band room",
    notes: overrides.notes ?? "Bring music stand",
    ownerId: overrides.ownerId ?? "heather",
    attendeeIds: overrides.attendeeIds ?? ["heather", "erin"],
    drivers: overrides.drivers ?? [],
    recurrence: overrides.recurrence,
    createdAt: overrides.createdAt ?? "2026-06-10T00:00:00.000Z",
    createdBy: overrides.createdBy ?? "heather",
    updatedAt: overrides.updatedAt ?? "2026-06-10T00:00:00.000Z",
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof EventModal>> = {}) {
  const onSave = props.onSave ?? vi.fn();
  const onClose = props.onClose ?? vi.fn();
  const onDelete = props.onDelete ?? vi.fn();

  return {
    onSave,
    onClose,
    onDelete,
    ...render(
      <EventModal
        defaultDate="2026-06-10"
        defaultStartMinutes={9 * 60 + 15}
        onSave={onSave}
        onClose={onClose}
        onDelete={onDelete}
        {...props}
      />,
    ),
  };
}

describe("EventModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders create mode with a new-event heading and save action", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("New Event")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Event" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete Event" })).toBeNull();
  });

  it("renders edit mode with the event title and delete action", () => {
    renderModal({ event: buildEvent({ id: "edit-me", title: "Dentist checkup" }) });

    expect(screen.getByText("Dentist checkup")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete Event" })).toBeTruthy();
  });

  it("prefills the default date and times in create mode", () => {
    renderModal({ defaultDate: "2026-06-12", defaultStartMinutes: 10 * 60 + 45 });

    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-06-12");
    expect((screen.getByLabelText("Start") as HTMLInputElement).value).toBe("10:45");
    expect((screen.getByLabelText("End") as HTMLInputElement).value).toBe("11:45");
  });

  it("updates the title input on change", () => {
    renderModal();

    const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Robotics club" } });

    expect(titleInput.value).toBe("Robotics club");
  });

  it("toggles all-day mode on and back off while restoring prior timed values", () => {
    renderModal();

    const allDayToggle = screen.getByRole("button", { name: /All Day/i });
    const startInput = screen.getByLabelText("Start") as HTMLInputElement;
    const endInput = screen.getByLabelText("End") as HTMLInputElement;

    fireEvent.click(allDayToggle);

    expect(allDayToggle.getAttribute("aria-pressed")).toBe("true");
    expect(startInput.value).toBe("00:00");
    expect(endInput.value).toBe("23:59");

    fireEvent.click(allDayToggle);

    expect(allDayToggle.getAttribute("aria-pressed")).toBe("false");
    expect(startInput.value).toBe("09:15");
    expect(endInput.value).toBe("10:15");
  });

  it("renders one owner selector button for each family member", () => {
    renderModal();

    for (const member of FAMILY_MEMBERS) {
      expect(screen.getByRole("button", { name: member.name })).toBeTruthy();
    }
  });

  it("closes when the backdrop is clicked", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId("event-modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when the dialog surface itself is clicked", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId("event-modal-dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when Escape is pressed", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a delete button in edit mode and calls onDelete with the event id", () => {
    const { onDelete } = renderModal({ event: buildEvent({ id: "delete-me" }) });

    fireEvent.click(screen.getByRole("button", { name: "Delete Event" }));

    expect(onDelete).toHaveBeenCalledWith("delete-me");
  });

  it("shows a validation error and blocks submit when the title is blank", () => {
    const { onSave } = renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));

    expect(screen.getByText("A title is required.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows a validation error and blocks submit when the end time is not later than the start time", () => {
    const { onSave } = renderModal();

    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "11:00" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "10:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));

    expect(screen.getByText("End time must be later than start time.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits the edited form values through onSave", () => {
    const { onSave } = renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Band rehearsal" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Cedarcrest Band Room" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Bring the black folder" } });
    fireEvent.click(screen.getByRole("button", { name: "Heather, add attendee" }));
    fireEvent.change(screen.getByLabelText("Repeats"), { target: { value: "weekly-forever" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      id: undefined,
      title: "Band rehearsal",
      date: "2026-06-10",
      startMinutes: 9 * 60 + 15,
      endMinutes: 10 * 60 + 15,
      isAllDay: false,
      location: "Cedarcrest Band Room",
      notes: "Bring the black folder",
      ownerId: "tyler",
      attendeeIds: ["tyler", "heather"],
      drivers: [],
      recurrence: { freq: "WEEKLY" },
    });
  });

  it("saves a configured custom weekly recurrence rule", () => {
    const { onSave } = renderModal();

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Robotics club" } });
    fireEvent.change(screen.getByLabelText("Repeats"), { target: { value: "custom" } });

    expect(screen.getByLabelText("Custom recurrence settings")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Repeat interval"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Mon" }));
    fireEvent.click(screen.getByRole("button", { name: "Fri" }));
    fireEvent.click(screen.getByRole("radio", { name: /After/i }));
    fireEvent.change(screen.getByLabelText("Repeat occurrence count"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Event" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: {
          freq: "WEEKLY",
          interval: 2,
          byDay: ["MO", "WE", "FR"],
          count: 10,
        },
      }),
    );
  });
});
