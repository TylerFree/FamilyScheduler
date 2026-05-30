import type { Event, IsoDateString, RecurrenceByDay, RecurrenceWeekday } from "@/types/index";

const WEEKDAY_INDEX: Record<RecurrenceWeekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getLocalIsoDate(date: Date): IsoDateString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDateString;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getDateTime(date: string, minutes: number): Date {
  const parsedDate = parseIsoDate(date);
  parsedDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return parsedDate;
}

function getUntilDateTime(until?: string): Date | undefined {
  return until ? new Date(until) : undefined;
}

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getWeekdayFromByDay(byDay: RecurrenceByDay): RecurrenceWeekday {
  return byDay.slice(-2) as RecurrenceWeekday;
}

function getDaySpan(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  return Math.max(Math.round((end.getTime() - start.getTime()) / 86_400_000), 0);
}

function isSameOrAfterStart(eventDate: Date, startDate: Date): boolean {
  return getLocalIsoDate(eventDate) >= getLocalIsoDate(startDate);
}

function isOnOrBeforeUntil(event: Event, occurrenceDate: string): boolean {
  const until = getUntilDateTime(event.recurrence?.until);

  if (!until) {
    return true;
  }

  return getDateTime(occurrenceDate, event.isAllDay ? 0 : event.startMinutes) <= until;
}

function isMatchingDailyOccurrence(event: Event, occurrenceDate: Date): boolean {
  const recurrence = event.recurrence;
  const interval = recurrence?.interval ?? 1;
  const daysSinceStart = getDaySpan(event.date, getLocalIsoDate(occurrenceDate));

  if (daysSinceStart < 0 || daysSinceStart % interval !== 0) {
    return false;
  }

  const byDay = normalizeArray(recurrence?.byDay);
  if (byDay.length === 0) {
    return true;
  }

  const allowedWeekdays = new Set(byDay.map((day) => WEEKDAY_INDEX[getWeekdayFromByDay(day)]));
  return allowedWeekdays.has(occurrenceDate.getDay());
}

function isMatchingWeeklyOccurrence(event: Event, occurrenceDate: Date): boolean {
  const recurrence = event.recurrence;
  const interval = recurrence?.interval ?? 1;
  const startDate = parseIsoDate(event.date);
  const daysSinceStart = getDaySpan(event.date, getLocalIsoDate(occurrenceDate));

  if (daysSinceStart < 0 || Math.floor(daysSinceStart / 7) % interval !== 0) {
    return false;
  }

  const byDay = normalizeArray(recurrence?.byDay);
  if (byDay.length === 0) {
    return occurrenceDate.getDay() === startDate.getDay();
  }

  const allowedWeekdays = new Set(byDay.map((day) => WEEKDAY_INDEX[getWeekdayFromByDay(day)]));
  return allowedWeekdays.has(occurrenceDate.getDay());
}

function isMatchingMonthlyOccurrence(event: Event, occurrenceDate: Date): boolean {
  const recurrence = event.recurrence;
  const interval = recurrence?.interval ?? 1;
  const startDate = parseIsoDate(event.date);
  const monthsSinceStart = (occurrenceDate.getFullYear() - startDate.getFullYear()) * 12 + occurrenceDate.getMonth() - startDate.getMonth();

  return monthsSinceStart >= 0 && monthsSinceStart % interval === 0 && occurrenceDate.getDate() === startDate.getDate();
}

function isMatchingYearlyOccurrence(event: Event, occurrenceDate: Date): boolean {
  const recurrence = event.recurrence;
  const interval = recurrence?.interval ?? 1;
  const startDate = parseIsoDate(event.date);
  const yearsSinceStart = occurrenceDate.getFullYear() - startDate.getFullYear();

  return (
    yearsSinceStart >= 0 &&
    yearsSinceStart % interval === 0 &&
    occurrenceDate.getMonth() === startDate.getMonth() &&
    occurrenceDate.getDate() === startDate.getDate()
  );
}

function isMatchingOccurrence(event: Event, occurrenceDate: Date): boolean {
  switch (event.recurrence?.freq) {
    case "DAILY":
      return isMatchingDailyOccurrence(event, occurrenceDate);
    case "WEEKLY":
      return isMatchingWeeklyOccurrence(event, occurrenceDate);
    case "MONTHLY":
      return isMatchingMonthlyOccurrence(event, occurrenceDate);
    case "YEARLY":
      return isMatchingYearlyOccurrence(event, occurrenceDate);
    default:
      return getLocalIsoDate(occurrenceDate) === event.date;
  }
}

export function expandRecurringEventsForDateRange(
  events: Event[],
  startDate: string,
  endDate: string,
): Event[] {
  const rangeStart = parseIsoDate(startDate);
  const rangeEnd = parseIsoDate(endDate);
  const expandedEvents: Event[] = [];

  for (const event of events) {
    if (!event.recurrence) {
      if (event.date >= startDate && event.date <= endDate) {
        expandedEvents.push(event);
      }

      continue;
    }

    let occurrenceCount = 0;
    const eventStart = parseIsoDate(event.date);

    for (let cursor = eventStart; cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
      const occurrenceDate = getLocalIsoDate(cursor);

      if (!isMatchingOccurrence(event, cursor) || !isOnOrBeforeUntil(event, occurrenceDate)) {
        continue;
      }

      occurrenceCount += 1;
      if (event.recurrence.count && occurrenceCount > event.recurrence.count) {
        break;
      }

      if (!isSameOrAfterStart(cursor, rangeStart)) {
        continue;
      }

      expandedEvents.push({
        ...event,
        date: occurrenceDate,
      });
    }
  }

  return expandedEvents;
}

export function expandRecurringEventsForDate(events: Event[], date: string): Event[] {
  return expandRecurringEventsForDateRange(events, date, date);
}
