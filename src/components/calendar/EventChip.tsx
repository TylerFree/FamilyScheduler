"use client";

import React, { type CSSProperties, type KeyboardEvent } from "react";
import { FAMILY_MEMBER_DIRECTORY, type EventWithLane } from "@/types/index";
import styles from "./EventChip.module.css";

export interface EventChipProps {
  event: EventWithLane;
  memberColor: string;
  onClick?: (event: EventWithLane) => void;
}

export function formatTime(minutes: number): string {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${mins.toString().padStart(2, "0")} ${meridiem}`;
}

function formatTimeRange(startMinutes: number, endMinutes: number): string {
  if (endMinutes <= startMinutes) {
    return formatTime(startMinutes);
  }

  return `${formatTime(startMinutes)} – ${formatTime(endMinutes)}`;
}

export default function EventChip({ event, memberColor, onClick }: EventChipProps) {
  const durationMinutes = event["--dur"];
  const isMicro = durationMinutes < 30;
  const sizeClass = isMicro
    ? styles.micro
    : event.lanes >= 3
      ? styles.tiny
      : durationMinutes < 45 || event.lanes >= 2
        ? styles.short
        : "";
  const attendeeDetails = event.attendeeIds.map((attendeeId) => {
    const member = FAMILY_MEMBER_DIRECTORY[attendeeId];

    return {
      id: attendeeId,
      name: member.name,
      color: member.color,
      isDriver: event.drivers.includes(attendeeId),
    };
  });
  const timeLabel = formatTimeRange(event.startMinutes, event.endMinutes);
  const isInteractive = typeof onClick === "function";

  const handleClick = () => {
    onClick?.(event);
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) {
      return;
    }

    if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      onClick(event);
    }
  };

  return (
    <div
      className={[
        styles.event,
        event.lanes > 1 ? styles.inLane : styles.solo,
        sizeClass,
        isInteractive ? styles.interactive : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--start": event["--start"],
        "--dur": event["--dur"],
        "--lane": event["--lane"],
        "--lanes": event["--lanes"],
        "--c": memberColor,
      } as CSSProperties}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      data-time={timeLabel}
      data-event-chip="true"
      aria-label={`${event.title}, ${timeLabel}`}
    >
      <div className={styles.eventRow}>
        <h3 className={styles.title}>{event.title}</h3>
        <span className={styles.time}>{timeLabel}</span>
      </div>

      {event.location ? <p className={styles.location}>{event.location}</p> : null}

      {attendeeDetails.length > 0 ? (
        <div
          className={styles.attendees}
          aria-label={`Attendees: ${attendeeDetails.map((attendee) => attendee.name).join(", ")}`}
        >
          {attendeeDetails.map((attendee) => (
            <span
              key={attendee.id}
              className={styles.attendee}
              title={attendee.isDriver ? `${attendee.name} (drive)` : attendee.name}
              aria-label={attendee.isDriver ? `${attendee.name}, drive` : attendee.name}
            >
              <span
                className={styles.dot}
                style={{ backgroundColor: attendee.color } satisfies CSSProperties}
              />
              {attendee.isDriver && !isMicro ? (
                <span className={styles.drive}>drive</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
