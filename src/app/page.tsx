"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import DayView from "@/components/calendar/DayView";
import EventModal from "@/components/calendar/EventModal";
import FilterBar from "@/components/calendar/FilterBar";
import WeekView from "@/components/calendar/WeekView";
import { useEventsForDate, useEventsStore, useHouseholdStore, useMembersStore } from "@/store";
import type { Event, IsoDateString } from "@/types/index";

type SurfaceView = "day" | "week";

type ModalState = {
  open: boolean;
  event: Event | null;
  defaultDate?: IsoDateString;
  defaultStartMinutes?: number;
};

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getLocalIsoDate(date: Date = new Date()): IsoDateString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDateString;
}

function getWeekStart(date: string, weekStartsOn: 0 | 1): IsoDateString {
  const parsedDate = parseIsoDate(date);
  const dayOfWeek = parsedDate.getDay();
  const offset = weekStartsOn === 0 ? dayOfWeek : dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  parsedDate.setDate(parsedDate.getDate() - offset);

  return getLocalIsoDate(parsedDate);
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function shiftIsoDate(date: IsoDateString, days: number): IsoDateString {
  const nextDate = parseIsoDate(date);
  nextDate.setDate(nextDate.getDate() + days);

  return getLocalIsoDate(nextDate);
}

function formatDayLabel(date: IsoDateString): string {
  const parsedDate = parseIsoDate(date);
  return `${WEEKDAY_FORMATTER.format(parsedDate)} · ${MONTH_DAY_FORMATTER.format(parsedDate)}`.toUpperCase();
}

function formatWeekRangeLabel(startDate: IsoDateString): string {
  const parsedStartDate = parseIsoDate(startDate);
  const parsedEndDate = parseIsoDate(startDate);
  parsedEndDate.setDate(parsedEndDate.getDate() + 6);

  return `${MONTH_DAY_FORMATTER.format(parsedStartDate)} – ${MONTH_DAY_FORMATTER.format(parsedEndDate)}`.toUpperCase();
}

export default function Home() {
  const initializeEvents = useEventsStore((state) => state.initializeEvents);
  const addEvent = useEventsStore((state) => state.addEvent);
  const updateEvent = useEventsStore((state) => state.updateEvent);
  const deleteEvent = useEventsStore((state) => state.deleteEvent);
  const currentDate = useHouseholdStore((state) => state.currentDate);
  const activeFilter = useHouseholdStore((state) => state.activeFilter);
  const initializeHousehold = useHouseholdStore((state) => state.initializeHousehold);
  const setActiveFilter = useHouseholdStore((state) => state.setActiveFilter);
  const setCurrentDate = useHouseholdStore((state) => state.setCurrentDate);
  const visibleHoursStart = useHouseholdStore((state) => state.household.preferences.visibleHoursStart);
  const visibleHoursEnd = useHouseholdStore((state) => state.household.preferences.visibleHoursEnd);
  const weekStartsOn = useHouseholdStore((state) => state.household.preferences.weekStartsOn);
  const defaultView = useHouseholdStore((state) => state.household.preferences.defaultView);
  const initializeMembers = useMembersStore((state) => state.initializeMembers);
  const members = useMembersStore((state) => state.members);
  const events = useEventsForDate(currentDate);
  const [surfaceView, setSurfaceView] = useState<SurfaceView>(defaultView === "week" ? "week" : "day");
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    event: null,
    defaultDate: currentDate,
    defaultStartMinutes: visibleHoursStart * 60,
  });
  const weekStartDate = useMemo(() => getWeekStart(currentDate, weekStartsOn), [currentDate, weekStartsOn]);
  const todayDate = getLocalIsoDate();
  const dateLabel = surfaceView === "week" ? formatWeekRangeLabel(weekStartDate) : formatDayLabel(currentDate);
  const isCurrentPeriod = surfaceView === "week" ? weekStartDate === getWeekStart(todayDate, weekStartsOn) : currentDate === todayDate;
  const chromeButtonStyle: CSSProperties = {
    padding: "6px 12px",
    border: "1px solid var(--ink)",
    borderRadius: 0,
    background: "transparent",
    color: "var(--ink)",
    fontFamily: "var(--font-jetbrains-mono)",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    boxShadow: "var(--shadow)",
  };
  const dateLabelStyle: CSSProperties = {
    color: "var(--ink)",
    fontFamily: "var(--font-jetbrains-mono)",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.15em",
    textAlign: "center",
    textTransform: "uppercase",
  };

  useEffect(() => {
    initializeMembers();
    initializeHousehold();
    initializeEvents();
  }, [initializeEvents, initializeHousehold, initializeMembers]);

  useEffect(() => {
    setSurfaceView(defaultView === "week" ? "week" : "day");
  }, [defaultView]);

  const openCreateModal = (date: string = currentDate, startMinutes = visibleHoursStart * 60) => {
    setModalState({
      open: true,
      event: null,
      defaultDate: date as IsoDateString,
      defaultStartMinutes: startMinutes,
    });
  };

  const navigateDate = useCallback(
    (days: number) => {
      setCurrentDate(shiftIsoDate(currentDate, days));
    },
    [currentDate, setCurrentDate],
  );

  const jumpToToday = useCallback(() => {
    setCurrentDate(getLocalIsoDate());
  }, [setCurrentDate]);

  const openEditModal = (event: Event) => {
    setModalState({
      open: true,
      event,
      defaultDate: event.date,
      defaultStartMinutes: event.startMinutes,
    });
  };

  const closeModal = () => {
    setModalState((currentModalState) => ({
      ...currentModalState,
      open: false,
      event: null,
    }));
  };

  const handleSave = (savedEvent: Omit<Event, "id" | "createdAt" | "createdBy" | "updatedAt"> & Partial<Pick<Event, "id">>) => {
    if (savedEvent.id) {
      const { id, ...updates } = savedEvent;
      updateEvent(id, updates);
    } else {
      const now = new Date().toISOString();
      addEvent({
        ...savedEvent,
        id: crypto.randomUUID(),
        createdAt: now,
        createdBy: savedEvent.ownerId,
        updatedAt: now,
      });
    }

    closeModal();
  };

  const handleDelete = (eventId: string) => {
    deleteEvent(eventId);
    closeModal();
  };

  useEffect(() => {
    if (modalState.open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateDate(surfaceView === "week" ? -7 : -1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateDate(surfaceView === "week" ? 7 : 1);
      }

      if (event.key === "t" || event.key === "T") {
        event.preventDefault();
        jumpToToday();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jumpToToday, modalState.open, navigateDate, surfaceView]);

  return (
    <main style={{ padding: "var(--page-padding)", display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => openCreateModal(currentDate, visibleHoursStart * 60)} style={chromeButtonStyle}>
            Add Event
          </button>

          <Link
            href="/settings"
            style={{
              ...chromeButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Settings
          </Link>
        </div>

        <div style={{ display: "inline-flex", border: "1px solid var(--ink)" }}>
          {(["day", "week"] as const).map((view) => {
            const isActive = surfaceView === view;

            return (
              <button
                key={view}
                type="button"
                onClick={() => setSurfaceView(view)}
                style={{
                  padding: "6px 12px",
                  borderRight: view === "day" ? "1px solid var(--ink)" : "none",
                  background: isActive ? "var(--ink)" : "transparent",
                  color: isActive ? "var(--paper)" : "var(--ink)",
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {view}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigateDate(surfaceView === "week" ? -7 : -1)} style={chromeButtonStyle}>
            ← Prev
          </button>

          <button
            type="button"
            onClick={jumpToToday}
            style={{ ...dateLabelStyle, padding: "6px 8px" }}
            aria-label="Jump to today"
          >
            {dateLabel}
          </button>

          <button type="button" onClick={() => navigateDate(surfaceView === "week" ? 7 : 1)} style={chromeButtonStyle}>
            → Next
          </button>
        </div>

        {!isCurrentPeriod ? (
          <button type="button" onClick={jumpToToday} style={chromeButtonStyle}>
            Today
          </button>
        ) : null}
      </div>

      <FilterBar members={members} activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {surfaceView === "week" ? (
        <WeekView
          startDate={weekStartDate}
          members={members}
          filter={activeFilter}
          onEventClick={openEditModal}
          onTimeSlotClick={openCreateModal}
        />
      ) : (
        <DayView
          date={currentDate}
          events={events}
          members={members}
          visibleHoursStart={visibleHoursStart}
          visibleHoursEnd={visibleHoursEnd}
          onEventClick={openEditModal}
          onTimeSlotClick={openCreateModal}
        />
      )}

      {modalState.open ? (
        <EventModal
          event={modalState.event}
          defaultDate={modalState.defaultDate}
          defaultStartMinutes={modalState.defaultStartMinutes}
          weekStartsOn={weekStartsOn}
          onSave={handleSave}
          onClose={closeModal}
          onDelete={handleDelete}
        />
      ) : null}
    </main>
  );
}
