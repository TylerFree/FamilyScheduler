import { formatTime } from "@/components/calendar/EventChip";

describe("formatTime", () => {
  it.each([
    [0, "12:00 AM"],
    [60, "1:00 AM"],
    [420, "7:00 AM"],
    [540, "9:00 AM"],
    [720, "12:00 PM"],
    [780, "1:00 PM"],
    [1260, "9:00 PM"],
    [1439, "11:59 PM"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatTime(minutes)).toBe(expected);
  });
});
