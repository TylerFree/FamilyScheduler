import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { expandRecurringEventsForDate, expandRecurringEventsForDateRange } from "@/lib/calendar/recurrence";
import type { Event, IsoDateString } from "@/types/index";

export const EVENTS_STORAGE_KEY = "familyscheduler-events";
const DEFAULT_EVENT_TIMESTAMP = "07:00:00.000Z";
const SERIES_PREFIX_DELIMITERS = ["::", "__", "@", "#"] as const;

interface SampleEventInput {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
  ownerId: Event["ownerId"];
  attendeeIds: Event["attendeeIds"];
  drivers?: Event["drivers"];
  location?: string;
  notes?: string;
  isAllDay?: boolean;
}

export interface EventsState {
  events: Event[];
  initializeEvents: () => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  deleteEventSeries: (seriesId: string) => void;
  getEventsForDate: (date: string) => Event[];
  getEventsForDateRange: (startDate: string, endDate: string) => Event[];
  getEventsForWeek: (startDate: string) => Event[];
}

function getLocalIsoDate(date = new Date()): IsoDateString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDateString;
}

function addDays(date: string, days: number): IsoDateString {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day + days);

  return getLocalIsoDate(nextDate);
}

function compareEvents(left: Event, right: Event): number {
  return (
    left.date.localeCompare(right.date) ||
    left.startMinutes - right.startMinutes ||
    left.id.localeCompare(right.id) ||
    left.endMinutes - right.endMinutes
  );
}

function buildSampleEvent(date: IsoDateString, input: SampleEventInput): Event {
  return {
    id: input.id,
    title: input.title,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    date,
    isAllDay: input.isAllDay ?? false,
    location: input.location,
    notes: input.notes,
    ownerId: input.ownerId,
    attendeeIds: input.attendeeIds,
    drivers: input.drivers ?? [],
    createdAt: `${date}T${DEFAULT_EVENT_TIMESTAMP}`,
    createdBy: input.ownerId,
    updatedAt: `${date}T${DEFAULT_EVENT_TIMESTAMP}`,
  };
}

export function createSampleEvents(): Event[] {
  const today = getLocalIsoDate();
  const tomorrow = addDays(today, 1);
  const inTwoDays = addDays(today, 2);
  const inThreeDays = addDays(today, 3);

  return [
    buildSampleEvent(today, {
      id: "school-dropoff",
      title: "School drop-off",
      startMinutes: 7 * 60 + 35,
      endMinutes: 8 * 60,
      ownerId: "heather",
      attendeeIds: ["heather", "erin", "leo"],
      drivers: ["heather"],
      location: "Cedarcrest campus",
    }),
    buildSampleEvent(today, {
      id: "engineering-standup",
      title: "Engineering standup",
      startMinutes: 9 * 60,
      endMinutes: 9 * 60 + 30,
      ownerId: "tyler",
      attendeeIds: ["tyler"],
      location: "Home office",
    }),
    buildSampleEvent(today, {
      id: "pta-budget-call",
      title: "PTA budget call",
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      ownerId: "heather",
      attendeeIds: ["heather"],
      location: "Kitchen table",
    }),
    buildSampleEvent(today, {
      id: "soccer-physical",
      title: "Soccer physical",
      startMinutes: 9 * 60 + 15,
      endMinutes: 10 * 60 + 15,
      ownerId: "erin",
      attendeeIds: ["erin", "heather"],
      drivers: ["heather"],
      location: "Evergreen clinic",
    }),
    buildSampleEvent(today, {
      id: "team-planning",
      title: "Platform planning",
      startMinutes: 13 * 60,
      endMinutes: 14 * 60 + 30,
      ownerId: "tyler",
      attendeeIds: ["tyler"],
      location: "Teams",
    }),
    buildSampleEvent(today, {
      id: "soccer-practice",
      title: "Soccer practice",
      startMinutes: 16 * 60 + 30,
      endMinutes: 18 * 60,
      ownerId: "erin",
      attendeeIds: ["erin", "heather", "tyler"],
      drivers: ["heather"],
      location: "Big Rock Field",
    }),
    buildSampleEvent(today, {
      id: "family-dinner",
      title: "Family dinner — taco night",
      startMinutes: 18 * 60 + 15,
      endMinutes: 19 * 60 + 15,
      ownerId: "heather",
      attendeeIds: ["heather", "tyler", "erin", "leo", "anthony", "savannah", "lily"],
      location: "At home",
    }),
    buildSampleEvent(tomorrow, {
      id: "dentist-checkup",
      title: "Dentist checkup",
      startMinutes: 10 * 60,
      endMinutes: 11 * 60,
      ownerId: "leo",
      attendeeIds: ["leo", "heather"],
      drivers: ["heather"],
      location: "Duvall Family Dental",
    }),
    buildSampleEvent(tomorrow, {
      id: "piano-lesson",
      title: "Piano lesson",
      startMinutes: 16 * 60,
      endMinutes: 16 * 60 + 45,
      ownerId: "savannah",
      attendeeIds: ["savannah", "heather"],
      drivers: ["heather"],
      location: "Main Street Studio",
    }),
    buildSampleEvent(inTwoDays, {
      id: "youth-group",
      title: "Youth group",
      startMinutes: 18 * 60 + 30,
      endMinutes: 20 * 60,
      ownerId: "anthony",
      attendeeIds: ["anthony", "tyler"],
      drivers: ["tyler"],
      location: "Church gym",
    }),
    buildSampleEvent(inThreeDays, {
      id: "robotics-club",
      title: "Robotics club",
      startMinutes: 15 * 60 + 30,
      endMinutes: 17 * 60,
      ownerId: "leo",
      attendeeIds: ["leo", "tyler"],
      drivers: ["tyler"],
      location: "Cedarcrest makerspace",
    }),
    buildSampleEvent(inThreeDays, {
      id: "date-night",
      title: "Date night",
      startMinutes: 19 * 60,
      endMinutes: 21 * 60,
      ownerId: "heather",
      attendeeIds: ["heather", "tyler"],
      location: "Woodinville",
      notes: "Grandma covers bedtime.",
    }),
  ].sort(compareEvents);
}

function isEventInSeries(event: Event, seriesId: string): boolean {
  if (event.id === seriesId || event.recurrence?.dtstart === seriesId) {
    return true;
  }

  return SERIES_PREFIX_DELIMITERS.some((delimiter) => event.id.startsWith(`${seriesId}${delimiter}`));
}

const initialEvents = createSampleEvents();

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: initialEvents,
      initializeEvents: () => {
        const persistedEvents = get().events;

        if (persistedEvents.length === 0 || localStorage.getItem(EVENTS_STORAGE_KEY) === null) {
          set({ events: createSampleEvents() });
        }
      },
      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, event].sort(compareEvents),
        })),
      updateEvent: (id, updates) =>
        set((state) => ({
          events: state.events
            .map((event) =>
              event.id === id
                ? {
                    ...event,
                    ...updates,
                    id: event.id,
                    updatedAt: updates.updatedAt ?? new Date().toISOString(),
                  }
                : event,
            )
            .sort(compareEvents),
        })),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        })),
      deleteEventSeries: (seriesId) =>
        set((state) => ({
          events: state.events.filter((event) => !isEventInSeries(event, seriesId)),
        })),
      getEventsForDate: (date) => expandRecurringEventsForDate(get().events, date).sort(compareEvents),
      getEventsForDateRange: (startDate, endDate) =>
        expandRecurringEventsForDateRange(get().events, startDate, endDate).sort(compareEvents),
      getEventsForWeek: (startDate) => {
        const endDate = addDays(startDate, 6);

        return get().getEventsForDateRange(startDate, endDate);
      },
    }),
    {
      name: EVENTS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ events: state.events }),
    },
  ),
);
