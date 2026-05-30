import type { Event, EventTimeGridVars } from "@/types/index";

export interface TimeGridOptions {
  visibleHoursStart?: number;
  visibleHoursEnd?: number;
}

type TimeGridEvent = Pick<Event, "startMinutes" | "endMinutes" | "isAllDay">;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getBounds({ visibleHoursStart = 7, visibleHoursEnd = 21 }: TimeGridOptions) {
  const startBoundary = visibleHoursStart * 60;
  const endBoundary = visibleHoursEnd * 60;

  return {
    totalVisibleMinutes: Math.max(endBoundary - startBoundary, 0),
    startBoundary,
    endBoundary,
  };
}

export function getEventTimeGridVars(
  event: TimeGridEvent,
  options: TimeGridOptions = {},
): EventTimeGridVars | null {
  if (event.isAllDay) {
    return null;
  }

  const { startBoundary, totalVisibleMinutes } = getBounds(options);
  const startOffset = clamp(event.startMinutes - startBoundary, 0, totalVisibleMinutes);
  const endOffset = clamp(event.endMinutes - startBoundary, 0, totalVisibleMinutes);

  return {
    "--start": startOffset,
    "--dur": Math.max(endOffset - startOffset, 0),
  };
}

export function isEventVisibleInTimeGrid(
  event: TimeGridEvent,
  options: TimeGridOptions = {},
): boolean {
  if (event.isAllDay) {
    return false;
  }

  const { startBoundary, endBoundary } = getBounds(options);

  if (event.startMinutes === event.endMinutes) {
    return event.startMinutes >= startBoundary && event.startMinutes <= endBoundary;
  }

  return event.endMinutes > startBoundary && event.startMinutes < endBoundary;
}
