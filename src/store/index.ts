"use client";

import { useMemo } from "react";
import { assignLanesForDate } from "@/lib/calendar/laneAlgorithm";
import { expandRecurringEventsForDate } from "@/lib/calendar/recurrence";
import { FAMILY_MEMBER_IDS } from "@/types/index";
import type { EventWithLane, IsoDateString, MemberId } from "@/types/index";
import { useEventsStore } from "./eventsStore";
import { useHouseholdStore } from "./householdStore";

export { useEventsStore } from "./eventsStore";
export { useHouseholdStore } from "./householdStore";
export { useMembersStore } from "./membersStore";

export function useEventsForDate(date: string): EventWithLane[] {
  const events = useEventsStore((state) => state.events);
  const activeFilter = useHouseholdStore((state) => state.activeFilter);
  const visibleStart = useHouseholdStore((state) => state.household.preferences.visibleHoursStart * 60);

  return useMemo(() => {
    const expandedEvents = expandRecurringEventsForDate(events, date);
    const filteredEvents = expandedEvents.filter((event) => {
      if (activeFilter === "all") {
        return true;
      }

      return event.attendeeIds.some((attendeeId) => activeFilter.includes(attendeeId));
    });

    return assignLanesForDate(filteredEvents, date, visibleStart);
  }, [activeFilter, date, events, visibleStart]);
}

export function useDateFilter(): {
  currentDate: IsoDateString;
  setCurrentDate: (date: IsoDateString) => void;
} {
  const currentDate = useHouseholdStore((state) => state.currentDate);
  const setCurrentDate = useHouseholdStore((state) => state.setCurrentDate);

  return { currentDate, setCurrentDate };
}

export function useMemberFilter(): {
  activeFilter: MemberId[] | "all";
  toggleMember: (memberId: MemberId) => void;
  setFilter: (memberIds: MemberId[] | "all") => void;
} {
  const activeFilter = useHouseholdStore((state) => state.activeFilter);
  const setActiveFilter = useHouseholdStore((state) => state.setActiveFilter);

  return useMemo(
    () => ({
      activeFilter,
      toggleMember: (memberId: MemberId) => {
        const nextFilter =
          activeFilter === "all"
            ? FAMILY_MEMBER_IDS.filter((id) => id !== memberId)
            : activeFilter.includes(memberId)
              ? activeFilter.filter((activeMemberId) => activeMemberId !== memberId)
              : FAMILY_MEMBER_IDS.filter((id) => [...activeFilter, memberId].includes(id));

        if (nextFilter.length === 0 || nextFilter.length === FAMILY_MEMBER_IDS.length) {
          setActiveFilter("all");
          return;
        }

        setActiveFilter(nextFilter);
      },
      setFilter: (memberIds: MemberId[] | "all") => setActiveFilter(memberIds),
    }),
    [activeFilter, setActiveFilter],
  );
}
