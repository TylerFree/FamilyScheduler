"use client";

import React, { type CSSProperties, type MouseEvent, useEffect, useMemo, useState } from "react";
import { getEventTimeGridVars, isEventVisibleInTimeGrid } from "@/lib/calendar/timeGrid";
import { useEventsForDate, useHouseholdStore } from "@/store";
import type { Event, EventWithLane, IsoDateString, Member, MemberId } from "@/types/index";
import { formatTime } from "./EventChip";
import styles from "./WeekView.module.css";

const HOUR_HEIGHT = 36;
const MOBILE_VISIBLE_DAYS = 3;
const MOBILE_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });

type WeekColumnEvents = {
  date: IsoDateString;
  events: EventWithLane[];
};

type WeekColumn = WeekColumnEvents & {
  allDayEvents: EventWithLane[];
  timedEvents: EventWithLane[];
  isToday: boolean;
  isWeekend: boolean;
};

export interface WeekViewProps {
  startDate: string;
  members: Member[];
  filter?: MemberId[] | "all";
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: string, startMinutes: number) => void;
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getLocalIsoDate(date = new Date()): IsoDateString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDateString;
}

function addDays(date: string, days: number): IsoDateString {
  const parsedDate = parseIsoDate(date);
  parsedDate.setDate(parsedDate.getDate() + days);

  return getLocalIsoDate(parsedDate);
}

function getWeekDates(startDate: string): IsoDateString[] {
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

function useWeekEvents(startDate: string): WeekColumnEvents[] {
  const dates = useMemo(() => getWeekDates(startDate), [startDate]);
  const dayZeroEvents = useEventsForDate(dates[0]);
  const dayOneEvents = useEventsForDate(dates[1]);
  const dayTwoEvents = useEventsForDate(dates[2]);
  const dayThreeEvents = useEventsForDate(dates[3]);
  const dayFourEvents = useEventsForDate(dates[4]);
  const dayFiveEvents = useEventsForDate(dates[5]);
  const daySixEvents = useEventsForDate(dates[6]);

  return useMemo(
    () => [
      { date: dates[0], events: dayZeroEvents },
      { date: dates[1], events: dayOneEvents },
      { date: dates[2], events: dayTwoEvents },
      { date: dates[3], events: dayThreeEvents },
      { date: dates[4], events: dayFourEvents },
      { date: dates[5], events: dayFiveEvents },
      { date: dates[6], events: daySixEvents },
    ],
    [dates, dayZeroEvents, dayOneEvents, dayTwoEvents, dayThreeEvents, dayFourEvents, dayFiveEvents, daySixEvents],
  );
}

function formatWeekRange(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(start)} ${start.getDate()} – ${end.getDate()}`;
  }

  if (sameYear) {
    return `${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(end)}`;
  }

  return `${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(start)} – ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(end)}`;
}

function formatWeekMeta(startDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  })
    .format(parseIsoDate(startDate))
    .toUpperCase();
}

function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}

function formatDayLabel(date: string, isToday: boolean): string {
  const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short" })
    .format(parseIsoDate(date))
    .toUpperCase();

  return isToday ? `${dayLabel} · TODAY` : dayLabel;
}

function formatEventCount(count: number): string {
  return `${count} ${count === 1 ? "EVENT" : "EVENTS"}`;
}

function formatMobileDayRange(columns: WeekColumn[]): string {
  if (columns.length === 0) {
    return "";
  }

  const firstDay = MOBILE_WEEKDAY_FORMATTER.format(parseIsoDate(columns[0].date)).toUpperCase();
  const lastDay = MOBILE_WEEKDAY_FORMATTER.format(parseIsoDate(columns[columns.length - 1].date)).toUpperCase();

  return `${firstDay} – ${lastDay}`;
}

function formatHourLabel(hour: number): string {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour}${meridiem}`;
}

function formatTimeRange(startMinutes: number, endMinutes: number): string {
  if (endMinutes <= startMinutes) {
    return formatTime(startMinutes);
  }

  return `${formatTime(startMinutes)} – ${formatTime(endMinutes)}`;
}

function roundToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

function applyFilter(events: EventWithLane[], filter?: MemberId[] | "all"): EventWithLane[] {
  if (!filter || filter === "all") {
    return events;
  }

  const visibleMembers = new Set(filter);
  return events.filter((event) => event.attendeeIds.some((attendeeId) => visibleMembers.has(attendeeId)));
}

export default function WeekView({ startDate, members, filter = "all", onEventClick, onTimeSlotClick }: WeekViewProps) {
  const isMobile = useIsMobile();
  const [mobileOffset, setMobileOffset] = useState(0);
  const visibleHoursStart = useHouseholdStore((state) => state.household.preferences.visibleHoursStart);
  const visibleHoursEnd = useHouseholdStore((state) => state.household.preferences.visibleHoursEnd);
  const weekData = useWeekEvents(startDate);
  const today = getLocalIsoDate();
  const totalMinutes = (visibleHoursEnd - visibleHoursStart) * 60;
  const totalHeight = (totalMinutes * HOUR_HEIGHT) / 60;
  const hourMarks = Array.from(
    { length: Math.max(visibleHoursEnd - visibleHoursStart, 0) },
    (_, index) => visibleHoursStart + index,
  );
  const lastVisibleHour = visibleHoursEnd;
  const currentTime = new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const nowOffset = currentMinutes - visibleHoursStart * 60;
  const showNowLine = nowOffset >= 0 && nowOffset <= totalMinutes;
  const memberNames = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member.name])) as Record<MemberId, string>,
    [members],
  );
  const memberColors = useMemo(
    () => Object.fromEntries(members.map((member) => [member.id, member.color])) as Record<MemberId, string>,
    [members],
  );

  const columns = useMemo<WeekColumn[]>(() => {
    return weekData.map(({ date, events }) => {
      const filteredEvents = applyFilter(events, filter);
      const allDayEvents = filteredEvents.filter((event) => event.isAllDay);
      const timedEvents = filteredEvents
        .filter((event) =>
          isEventVisibleInTimeGrid(event, {
            visibleHoursStart,
            visibleHoursEnd,
          }),
        )
        .map((event) => {
          const timeGridVars = getEventTimeGridVars(event, {
            visibleHoursStart,
            visibleHoursEnd,
          });

          if (!timeGridVars) {
            return null;
          }

          return {
            ...event,
            durationMinutes: timeGridVars["--dur"],
            "--start": timeGridVars["--start"],
            "--dur": timeGridVars["--dur"],
          };
        })
        .filter((event): event is EventWithLane => event !== null);
      const parsedDate = parseIsoDate(date);
      const dayOfWeek = parsedDate.getDay();

      return {
        date: date as IsoDateString,
        events: filteredEvents,
        allDayEvents,
        timedEvents,
        isToday: date === today,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      };
    });
  }, [filter, today, visibleHoursEnd, visibleHoursStart, weekData]);

  useEffect(() => {
    setMobileOffset(0);
  }, [startDate]);

  const maxMobileOffset = Math.max(0, columns.length - MOBILE_VISIBLE_DAYS);
  const visibleColumns = isMobile ? columns.slice(mobileOffset, mobileOffset + MOBILE_VISIBLE_DAYS) : columns;
  const colCount = visibleColumns.length;
  const allDayRows = Math.max(visibleColumns.reduce((largestCount, column) => Math.max(largestCount, column.allDayEvents.length), 0), 1);

  useEffect(() => {
    if (mobileOffset > maxMobileOffset) {
      setMobileOffset(maxMobileOffset);
    }
  }, [maxMobileOffset, mobileOffset]);

  const handleColumnClick = (columnDate: string) => (clickEvent: MouseEvent<HTMLDivElement>) => {
    if (!onTimeSlotClick) {
      return;
    }

    const target = clickEvent.target as HTMLElement | null;
    if (target?.closest('[data-event-chip="true"]')) {
      return;
    }

    const bounds = clickEvent.currentTarget.getBoundingClientRect();
    const offsetMinutes = ((clickEvent.clientY - bounds.top) / bounds.height) * totalMinutes;
    const slotStartMinutes = Math.min(
      Math.max(roundToQuarterHour(visibleHoursStart * 60 + offsetMinutes), visibleHoursStart * 60),
      visibleHoursEnd * 60,
    );

    onTimeSlotClick(columnDate, slotStartMinutes);
  };

  return (
    <section className={styles.weekView} aria-label={`Week view for ${formatWeekRange(startDate, columns[6]?.date ?? addDays(startDate, 6))}`}>
      <header className={styles.header}>
        <p className={styles.kicker}>Weekly Almanac</p>
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{formatWeekRange(startDate, columns[6]?.date ?? addDays(startDate, 6))}</h2>
          <p className={styles.meta}>{formatWeekMeta(startDate)}</p>
        </div>
      </header>

      <div className={styles.surface} style={{ "--col-count": colCount } as CSSProperties}>
        {isMobile ? (
          <div className={styles.mobileNav}>
            <div className={styles.mobileNavEdge}>
              {mobileOffset > 0 ? (
                <button
                  type="button"
                  className={styles.mobileNavBtn}
                  onClick={() => setMobileOffset((offset) => Math.max(0, offset - MOBILE_VISIBLE_DAYS))}
                >
                  ← PREV
                </button>
              ) : null}
            </div>
            <span className={styles.mobileNavLabel}>{formatMobileDayRange(visibleColumns)}</span>
            <div className={[styles.mobileNavEdge, styles.mobileNavEdgeEnd].join(" ")}>
              {mobileOffset < maxMobileOffset ? (
                <button
                  type="button"
                  className={styles.mobileNavBtn}
                  onClick={() => setMobileOffset((offset) => Math.min(maxMobileOffset, offset + MOBILE_VISIBLE_DAYS))}
                >
                  NEXT →
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={styles.headerRow}>
          <div className={styles.cornerCell} aria-hidden="true" />
          {visibleColumns.map((column) => (
            <div
              key={column.date}
              className={[
                styles.dayHeader,
                column.isToday ? styles.todayHeader : "",
                column.isWeekend ? styles.weekendHeader : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className={styles.dayLabel}>{formatDayLabel(column.date, column.isToday)}</div>
              <div className={styles.dayNumber}>{parseIsoDate(column.date).getDate()}</div>
              <div className={styles.dayCount}>{formatEventCount(column.events.length)}</div>
            </div>
          ))}
        </div>

        <div className={styles.allDayRow} style={{ "--all-day-rows": allDayRows } as CSSProperties}>
          <div className={styles.allDayLabel}>All Day</div>
          {visibleColumns.map((column) => (
            <div
              key={`${column.date}-all-day`}
              className={[
                styles.allDayCell,
                column.isToday ? styles.todayColumn : "",
                column.isWeekend ? styles.weekendColumn : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {column.allDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={styles.allDayEvent}
                  style={{ "--c": memberColors[event.ownerId], cursor: onEventClick ? "pointer" : undefined } as CSSProperties}
                  title={event.title}
                  data-event-chip="true"
                  role={onEventClick ? "button" : undefined}
                  tabIndex={onEventClick ? 0 : undefined}
                  onClick={() => onEventClick?.(event)}
                  onKeyDown={(keyboardEvent) => {
                    if (!onEventClick) {
                      return;
                    }

                    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                      keyboardEvent.preventDefault();
                      onEventClick(event);
                    }
                  }}
                >
                  <span className={styles.allDayEventTitle}>{event.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.scrollViewport}>
          <div className={styles.timeGrid}>
            <div
              className={styles.timeGutter}
              style={{ height: `${totalHeight}px` } satisfies CSSProperties}
              aria-hidden="true"
            >
              {hourMarks.map((hour, index) => (
                <div
                  key={hour}
                  className={styles.hourLabel}
                  style={{ top: `${index * HOUR_HEIGHT}px` } satisfies CSSProperties}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
              <div
                className={[styles.hourLabel, styles.hourLabelEnd].join(" ")}
                style={{ top: `${totalHeight}px` } satisfies CSSProperties}
              >
                {formatHourLabel(lastVisibleHour)}
              </div>
            </div>

            {visibleColumns.map((column) => (
              <div
                key={`${column.date}-column`}
                className={[
                  styles.dayColumn,
                  column.isToday ? styles.todayColumn : "",
                  column.isWeekend ? styles.weekendColumn : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ height: `${totalHeight}px`, cursor: onTimeSlotClick ? "crosshair" : undefined } satisfies CSSProperties}
                data-testid={`week-day-column-${column.date}`}
                onClick={handleColumnClick(column.date)}
              >
                {Array.from({ length: hourMarks.length + 1 }, (_, index) => (
                  <div
                    key={`${column.date}-rule-${index}`}
                    className={styles.rule}
                    style={{ top: `${index * HOUR_HEIGHT}px` } satisfies CSSProperties}
                    aria-hidden="true"
                  />
                ))}

                {column.isToday && showNowLine ? (
                  <div
                    className={styles.nowLine}
                    style={{ "--start": nowOffset } as CSSProperties}
                    data-testid={`week-now-line-${column.date}`}
                    aria-hidden="true"
                  />
                ) : null}

                {column.timedEvents.map((event) => {
                  const durationMinutes = event["--dur"];
                  const attendeeIds = [
                    event.ownerId,
                    ...event.attendeeIds.filter((attendeeId) => attendeeId !== event.ownerId),
                  ];
                  const sizeClass = event.lanes >= 3
                    ? styles.weekEventTiny
                    : durationMinutes < 45
                      ? styles.weekEventMicro
                      : durationMinutes < 60 || event.lanes >= 2
                        ? styles.weekEventShort
                        : "";
                  const timeRange = formatTimeRange(event.startMinutes, event.endMinutes);

                  return (
                    <article
                      key={event.id}
                      className={[
                        styles.weekEvent,
                        event.lanes > 1 ? styles.weekEventInLane : styles.weekEventSolo,
                        sizeClass,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        "--start": event["--start"],
                        "--dur": event["--dur"],
                        "--lane": event["--lane"],
                        "--lanes": event["--lanes"],
                        "--c": memberColors[event.ownerId],
                        cursor: onEventClick ? "pointer" : undefined,
                      } as CSSProperties}
                      data-time={timeRange}
                      data-event-chip="true"
                      aria-label={`${event.title}, ${timeRange}`}
                      role={onEventClick ? "button" : undefined}
                      tabIndex={onEventClick ? 0 : undefined}
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onEventClick?.(event);
                      }}
                      onKeyDown={(keyboardEvent) => {
                        if (!onEventClick) {
                          return;
                        }

                        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                          keyboardEvent.preventDefault();
                          onEventClick(event);
                        }
                      }}
                    >
                      <h3 className={styles.weekEventTitle}>{event.title}</h3>
                      <div
                        className={styles.weekEventDots}
                        aria-label={`Attendees: ${attendeeIds.map((attendeeId) => memberNames[attendeeId]).join(", ")}`}
                      >
                        {attendeeIds.map((attendeeId) => (
                          <span
                            key={`${event.id}-${attendeeId}`}
                            className={styles.weekEventDot}
                            style={{ "--dot-color": memberColors[attendeeId] } as CSSProperties}
                            title={memberNames[attendeeId]}
                          />
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
