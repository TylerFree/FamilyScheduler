import type { Event, EventWithLane, LaneAssignment, LaneComputationInput } from "@/types/index";

const DEFAULT_VISIBLE_START = 7 * 60;

export type LaneComputedEvent<T extends LaneComputationInput = LaneComputationInput> = T & LaneAssignment;

function compareEvents(left: LaneComputationInput, right: LaneComputationInput): number {
  return (
    left.date.localeCompare(right.date) ||
    left.startMinutes - right.startMinutes ||
    left.id.localeCompare(right.id) ||
    left.endMinutes - right.endMinutes
  );
}

function splitIntoOverlapGroups<T extends LaneComputationInput>(events: T[]): T[][] {
  const groups: T[][] = [];
  let currentGroup: T[] = [];
  let currentGroupEnd = -Infinity;

  for (const event of events) {
    if (currentGroup.length === 0 || event.startMinutes < currentGroupEnd) {
      currentGroup.push(event);
      currentGroupEnd = Math.max(currentGroupEnd, event.endMinutes);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [event];
    currentGroupEnd = event.endMinutes;
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function assignOverlapGroup<T extends LaneComputationInput>(
  events: T[],
  groupId: string,
): Array<T & LaneAssignment> {
  const laneEndMinutes: number[] = [];
  const assigned: Array<T & { lane: number }> = [];

  for (const event of events) {
    let lane = 0;

    while (lane < laneEndMinutes.length && laneEndMinutes[lane] > event.startMinutes) {
      lane += 1;
    }

    if (lane === laneEndMinutes.length) {
      laneEndMinutes.push(event.endMinutes);
    } else {
      laneEndMinutes[lane] = event.endMinutes;
    }

    assigned.push({
      ...event,
      lane,
    });
  }

  const lanes = laneEndMinutes.length;

  return assigned.map((event) => ({
    ...event,
    lane: event.lane,
    lanes,
    groupId,
    "--lane": event.lane,
    "--lanes": lanes,
  }));
}

function toEventWithLane(event: Event & LaneAssignment, visibleStart: number): EventWithLane {
  const durationMinutes = Math.max(event.endMinutes - event.startMinutes, 0);

  return {
    ...event,
    durationMinutes,
    "--start": Math.max(event.startMinutes - visibleStart, 0),
    "--dur": durationMinutes,
  };
}

function toAllDayEventWithLane(event: Event): EventWithLane {
  return {
    ...event,
    lane: 0,
    lanes: 1,
    groupId: `${event.date}-all-day-${event.id}`,
    durationMinutes: Math.max(event.endMinutes - event.startMinutes, 0),
    "--lane": 0,
    "--lanes": 1,
    "--start": 0,
    "--dur": 0,
  };
}

export function assignEventLanes<T extends LaneComputationInput>(
  events: T[],
): Array<T & LaneAssignment> {
  const sortedEvents = [...events].sort(compareEvents);
  const eventsByDate = new Map<string, T[]>();

  for (const event of sortedEvents) {
    const dateEvents = eventsByDate.get(event.date);

    if (dateEvents) {
      dateEvents.push(event);
      continue;
    }

    eventsByDate.set(event.date, [event]);
  }

  const results: Array<T & LaneAssignment> = [];

  for (const [date, dateEvents] of eventsByDate) {
    const overlapGroups = splitIntoOverlapGroups(dateEvents);

    overlapGroups.forEach((groupEvents, groupIndex) => {
      results.push(...assignOverlapGroup(groupEvents, `${date}-${groupIndex + 1}`));
    });
  }

  return results;
}

export function assignLanes(events: Event[], visibleStart = DEFAULT_VISIBLE_START): EventWithLane[] {
  const sortedEvents = [...events].sort(compareEvents);
  const allDayEvents = sortedEvents.filter((event) => event.isAllDay).map(toAllDayEventWithLane);
  const timedEvents = assignEventLanes(sortedEvents.filter((event) => !event.isAllDay)).map((event) =>
    toEventWithLane(event, visibleStart),
  );

  return [...allDayEvents, ...timedEvents];
}

export function assignLanesForDate(
  events: Event[],
  date: string,
  visibleStart = DEFAULT_VISIBLE_START,
): EventWithLane[] {
  return assignLanes(
    events.filter((event) => event.date === date),
    visibleStart,
  );
}
