"use client";

import React, { type CSSProperties, type MouseEvent, useEffect, useState } from "react";
import { getEventTimeGridVars, isEventVisibleInTimeGrid } from "@/lib/calendar/timeGrid";
import type { Event, EventWithLane, Member } from "@/types/index";
import EventChip from "./EventChip";
import styles from "./DayView.module.css";

export interface DayViewProps {
  date: string;
  events: EventWithLane[];
  members: Member[];
  visibleHoursStart?: number;
  visibleHoursEnd?: number;
  onEventClick?: (event: Event) => void;
  onTimeSlotClick?: (date: string, startMinutes: number) => void;
}

function parseIsoDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatHeaderDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parseIsoDate(date));
}

function formatMetaDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(parseIsoDate(date))
    .toUpperCase();
}

function formatHourLabel(hour: number): string {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour} ${meridiem}`;
}

function formatNowLabel(now: Date): string {
  const hours24 = now.getHours();
  const minutes = now.getMinutes();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const normalizedHour = hours24 % 12 || 12;

  return `NOW · ${normalizedHour}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
}

function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function roundToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export default function DayView({
  date,
  events,
  members,
  visibleHoursStart = 7,
  visibleHoursEnd = 21,
  onEventClick,
  onTimeSlotClick,
}: DayViewProps) {
  const totalMinutes = (visibleHoursEnd - visibleHoursStart) * 60;
  const startBoundary = visibleHoursStart * 60;
  const memberColors = Object.fromEntries(
    members.map((member) => [member.id, member.color]),
  ) as Record<Member["id"], Member["color"]>;
  const displayEvents = events
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
  const hourMarks = Array.from(
    { length: visibleHoursEnd - visibleHoursStart },
    (_, index) => visibleHoursStart + index,
  );
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const isCurrentDay = getLocalIsoDate(now) === date;
  const nowOffset = now.getHours() * 60 + now.getMinutes() - startBoundary;
  const showNowLine = isCurrentDay && nowOffset >= 0 && nowOffset <= totalMinutes;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60_000);

    return () => clearInterval(intervalId);
  }, []);

  const handleTimelineClick = (clickEvent: MouseEvent<HTMLDivElement>) => {
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
      Math.max(roundToQuarterHour(startBoundary + offsetMinutes), startBoundary),
      visibleHoursEnd * 60,
    );

    onTimeSlotClick(date, slotStartMinutes);
  };

  return (
    <section className={styles.dayView} aria-label={`Day view for ${formatHeaderDate(date)}`}>
      <header className={styles.header}>
        <p className={styles.kicker}>Daily Almanac</p>
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{formatHeaderDate(date)}</h2>
          <p className={styles.meta}>{formatMetaDate(date)}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div
          className={styles.timeGutter}
          style={{ height: `${totalMinutes}px` } satisfies CSSProperties}
          aria-hidden="true"
        >
          {hourMarks.map((hour, index) => (
            <div
              key={hour}
              className={styles.hourLabel}
              style={{ top: `${index * 60}px` } satisfies CSSProperties}
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        <div
          className={styles.timeline}
          style={{ height: `${totalMinutes}px`, cursor: onTimeSlotClick ? "crosshair" : undefined } satisfies CSSProperties}
          onClick={handleTimelineClick}
        >
          {hourMarks.map((hour, index) => (
            <div
              key={hour}
              className={styles.rule}
              style={{ top: `${index * 60}px` } satisfies CSSProperties}
              aria-hidden="true"
            />
          ))}

          {showNowLine && mounted ? (
            <div
              className={styles.nowLine}
              style={{ top: `${nowOffset}px` } satisfies CSSProperties}
              data-label={formatNowLabel(now)}
              aria-hidden="true"
            />
          ) : null}

          {displayEvents.map((event) => (
            <EventChip
              key={event.id}
              event={event}
              memberColor={memberColors[event.ownerId]}
              onClick={onEventClick}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
