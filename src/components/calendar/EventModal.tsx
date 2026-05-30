"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { FAMILY_MEMBERS, type Event, type MemberId, type RecurrenceRule } from "@/types/index";
import styles from "./EventModal.module.css";

const PARENT_IDS = new Set<MemberId>(["tyler", "heather"]);
const WHOLE_FAMILY = FAMILY_MEMBERS.map((member) => member.id);
const ADULTS = FAMILY_MEMBERS.filter((member) => member.role === "parent").map((member) => member.id);
const KIDS = FAMILY_MEMBERS.filter((member) => member.role === "child").map((member) => member.id);

type RepeatPreset = "none" | "weekly-until" | "weekly-forever" | "weekdays" | "custom";

type FormState = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  notes: string;
  ownerId: MemberId;
  attendeeIds: MemberId[];
  drivers: MemberId[];
  repeatPreset: RepeatPreset;
};

type FormErrors = {
  title?: string;
  time?: string;
};

export interface EventModalProps {
  event?: Event | null;
  defaultDate?: string;
  defaultStartMinutes?: number;
  onSave: (event: Omit<Event, "id" | "createdAt" | "createdBy" | "updatedAt"> & Partial<Pick<Event, "id">>) => void;
  onClose: () => void;
  onDelete?: (eventId: string) => void;
}

function getLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, 0), 23 * 60 + 59);
}

function roundToQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

function minutesToTimeString(minutes: number): string {
  const safeMinutes = clampMinutes(minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function timeStringToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return clampMinutes(hours * 60 + minutes);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(year, month - 1, day + days);

  return getLocalIsoDate(nextDate);
}

function orderMemberIds(memberIds: MemberId[], ownerId: MemberId): MemberId[] {
  const memberSet = new Set<MemberId>([ownerId, ...memberIds]);

  return [
    ownerId,
    ...FAMILY_MEMBERS.map((member) => member.id).filter((memberId) => memberId !== ownerId && memberSet.has(memberId)),
  ];
}

function getRepeatPreset(recurrence?: RecurrenceRule): RepeatPreset {
  if (!recurrence) {
    return "none";
  }

  if (recurrence.freq === "WEEKLY" && recurrence.until) {
    return "weekly-until";
  }

  if (recurrence.freq === "WEEKLY") {
    return "weekly-forever";
  }

  const byDay = Array.isArray(recurrence.byDay) ? recurrence.byDay : recurrence.byDay ? [recurrence.byDay] : [];
  if (recurrence.freq === "DAILY" && byDay.join(",") === "MO,TU,WE,TH,FR") {
    return "weekdays";
  }

  return "custom";
}

function buildRecurrence(preset: RepeatPreset, date: string, existing?: RecurrenceRule): RecurrenceRule | undefined {
  switch (preset) {
    case "none":
      return undefined;
    case "weekly-until":
      return {
        freq: "WEEKLY",
        until: existing?.until ?? `${addDays(date, 14)}T23:59:59.000Z`,
      };
    case "weekly-forever":
      return {
        freq: "WEEKLY",
      };
    case "weekdays":
      return {
        freq: "DAILY",
        byDay: ["MO", "TU", "WE", "TH", "FR"],
      };
    case "custom":
      return existing ?? { freq: "WEEKLY" };
    default:
      return undefined;
  }
}

function buildInitialState(event?: Event | null, defaultDate?: string, defaultStartMinutes?: number): FormState {
  const ownerId = event?.ownerId ?? FAMILY_MEMBERS[0].id;
  const attendeeIds = orderMemberIds(event?.attendeeIds ?? [ownerId], ownerId);
  const defaultStart = roundToQuarterHour(defaultStartMinutes ?? 9 * 60);
  const defaultEnd = clampMinutes(defaultStart + 60);

  return {
    title: event?.title ?? "",
    date: event?.date ?? defaultDate ?? getLocalIsoDate(),
    startTime: minutesToTimeString(event?.isAllDay ? 0 : event?.startMinutes ?? defaultStart),
    endTime: minutesToTimeString(event?.isAllDay ? 23 * 60 + 59 : event?.endMinutes ?? defaultEnd),
    isAllDay: event?.isAllDay ?? false,
    location: event?.location ?? "",
    notes: event?.notes ?? "",
    ownerId,
    attendeeIds,
    drivers: (event?.drivers ?? []).filter((memberId) => attendeeIds.includes(memberId) && PARENT_IDS.has(memberId)),
    repeatPreset: getRepeatPreset(event?.recurrence),
  };
}

export default function EventModal({ event, defaultDate, defaultStartMinutes, onSave, onClose, onDelete }: EventModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const timedValuesRef = useRef<{ startTime: string; endTime: string } | null>(null);
  const titleId = useId();
  const [formState, setFormState] = useState<FormState>(() => buildInitialState(event, defaultDate, defaultStartMinutes));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setFormState(buildInitialState(event, defaultDate, defaultStartMinutes));
    setErrors({});
  }, [defaultDate, defaultStartMinutes, event]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = "hidden";
    titleInputRef.current?.focus();

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        onClose();
        return;
      }

      if (keyboardEvent.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          !element.hasAttribute("hidden") &&
          element.getAttribute("aria-hidden") !== "true" &&
          !element.closest('[aria-hidden="true"]'),
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (keyboardEvent.shiftKey && document.activeElement === firstElement) {
        keyboardEvent.preventDefault();
        lastElement.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === lastElement) {
        keyboardEvent.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const selectedAttendees = useMemo(
    () => FAMILY_MEMBERS.filter((member) => formState.attendeeIds.includes(member.id)),
    [formState.attendeeIds],
  );

  const handleFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
  };

  const handleAllDayToggle = () => {
    setFormState((currentState) => {
      if (!currentState.isAllDay) {
        timedValuesRef.current = {
          startTime: currentState.startTime,
          endTime: currentState.endTime,
        };

        return {
          ...currentState,
          isAllDay: true,
          startTime: minutesToTimeString(0),
          endTime: minutesToTimeString(23 * 60 + 59),
        };
      }

      const previousTimedValues = timedValuesRef.current;
      return {
        ...currentState,
        isAllDay: false,
        startTime: previousTimedValues?.startTime ?? minutesToTimeString(roundToQuarterHour(defaultStartMinutes ?? 9 * 60)),
        endTime: previousTimedValues?.endTime ?? minutesToTimeString(clampMinutes(roundToQuarterHour(defaultStartMinutes ?? 9 * 60) + 60)),
      };
    });
  };

  const handleOwnerChange = (ownerId: MemberId) => {
    setFormState((currentState) => ({
      ...currentState,
      ownerId,
      attendeeIds: orderMemberIds(currentState.attendeeIds, ownerId),
      drivers: currentState.drivers.filter((memberId) => memberId !== ownerId || PARENT_IDS.has(ownerId)),
    }));
  };

  const handleToggleAttendee = (memberId: MemberId) => {
    setFormState((currentState) => {
      if (memberId === currentState.ownerId) {
        return currentState;
      }

      const isSelected = currentState.attendeeIds.includes(memberId);
      const nextAttendees = isSelected
        ? currentState.attendeeIds.filter((attendeeId) => attendeeId !== memberId)
        : orderMemberIds([...currentState.attendeeIds, memberId], currentState.ownerId);

      return {
        ...currentState,
        attendeeIds: nextAttendees,
        drivers: currentState.drivers.filter((driverId) => nextAttendees.includes(driverId)),
      };
    });
  };

  const handleToggleDriver = (memberId: MemberId) => {
    setFormState((currentState) => {
      if (!currentState.attendeeIds.includes(memberId) || !PARENT_IDS.has(memberId)) {
        return currentState;
      }

      const isDriver = currentState.drivers.includes(memberId);
      return {
        ...currentState,
        drivers: isDriver
          ? currentState.drivers.filter((driverId) => driverId !== memberId)
          : [...currentState.drivers, memberId],
      };
    });
  };

  const applyAttendeePreset = (memberIds: MemberId[]) => {
    setFormState((currentState) => {
      const nextAttendees = orderMemberIds(memberIds, currentState.ownerId);

      return {
        ...currentState,
        attendeeIds: nextAttendees,
        drivers: currentState.drivers.filter((driverId) => nextAttendees.includes(driverId)),
      };
    });
  };

  const handleSubmit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    const nextErrors: FormErrors = {};
    const title = formState.title.trim();
    const startMinutes = formState.isAllDay ? 0 : timeStringToMinutes(formState.startTime);
    const endMinutes = formState.isAllDay ? 23 * 60 + 59 : timeStringToMinutes(formState.endTime);

    if (!title) {
      nextErrors.title = "A title is required.";
    }

    if (!formState.isAllDay && endMinutes <= startMinutes) {
      nextErrors.time = "End time must be later than start time.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave({
      id: event?.id,
      title,
      date: formState.date as Event["date"],
      startMinutes,
      endMinutes,
      isAllDay: formState.isAllDay,
      location: formState.location.trim() || undefined,
      notes: formState.notes.trim() || undefined,
      ownerId: formState.ownerId,
      attendeeIds: orderMemberIds(formState.attendeeIds, formState.ownerId),
      drivers: formState.drivers.filter((memberId) => formState.attendeeIds.includes(memberId) && PARENT_IDS.has(memberId)),
      recurrence: buildRecurrence(formState.repeatPreset, formState.date, event?.recurrence),
    });
  };

  const headingText = event ? event.title || "Editing Event" : "New Event";

  return (
    <div className={styles.overlay} data-testid="event-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        data-testid="event-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{event ? "— Editing Event —" : "— New Event —"}</p>
            <h2 id={titleId} className={styles.heading}>
              {headingText}
            </h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close event modal">
            ✕
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.body}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${titleId}-input`}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                ref={titleInputRef}
                id={`${titleId}-input`}
                type="text"
                className={styles.titleInput}
                value={formState.title}
                onChange={(changeEvent) => handleFieldChange("title", changeEvent.target.value)}
                placeholder="Band rehearsal — dress"
              />
              {errors.title ? <p className={styles.errorText}>{errors.title}</p> : null}
            </div>

            <div className={styles.field}>
              <p className={styles.label}>
                When <span className={styles.required}>*</span>
              </p>
              <div className={styles.inputGrid}>
                <label className={styles.subField}>
                  <span className={styles.subLabel}>Date</span>
                  <input
                    type="date"
                    className={[styles.input, styles.monoInput].join(" ")}
                    value={formState.date}
                    onChange={(changeEvent) => handleFieldChange("date", changeEvent.target.value)}
                  />
                </label>
                <div className={[styles.timeRow, formState.isAllDay ? styles.timeRowHidden : ""].filter(Boolean).join(" ")} aria-hidden={formState.isAllDay}>
                  <label className={styles.subField}>
                    <span className={styles.subLabel}>Start</span>
                    <input
                      type="time"
                      className={[styles.input, styles.monoInput].join(" ")}
                      value={formState.startTime}
                      onChange={(changeEvent) => handleFieldChange("startTime", changeEvent.target.value)}
                    />
                  </label>
                  <label className={styles.subField}>
                    <span className={styles.subLabel}>End</span>
                    <input
                      type="time"
                      className={[styles.input, styles.monoInput].join(" ")}
                      value={formState.endTime}
                      onChange={(changeEvent) => handleFieldChange("endTime", changeEvent.target.value)}
                    />
                  </label>
                </div>
              </div>
              <button
                type="button"
                className={[styles.toggle, formState.isAllDay ? styles.toggleOn : ""].filter(Boolean).join(" ")}
                onClick={handleAllDayToggle}
                aria-pressed={formState.isAllDay}
              >
                <span className={styles.toggleTrack} aria-hidden="true">
                  <span className={styles.toggleThumb} />
                </span>
                <span className={styles.toggleLabel}>All Day</span>
              </button>
              {errors.time ? <p className={styles.errorText}>{errors.time}</p> : null}
            </div>

            <div className={styles.field}>
              <label className={[styles.label, styles.labelWithIcon].join(" ")} htmlFor={`${titleId}-location`}>
                <span className={styles.icon} aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M8 14s4-4.2 4-7.4A4 4 0 1 0 4 6.6C4 9.8 8 14 8 14Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="8" cy="6.5" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </span>
                Location
              </label>
              <input
                id={`${titleId}-location`}
                type="text"
                className={styles.input}
                value={formState.location}
                onChange={(changeEvent) => handleFieldChange("location", changeEvent.target.value)}
                placeholder="Cedarcrest Middle · Band Room"
              />
            </div>

            <div className={styles.field}>
              <p className={styles.label}>
                Who&apos;s In <span className={styles.required}>*</span>
              </p>
              <div className={styles.attendeeGrid}>
                {FAMILY_MEMBERS.map((member) => {
                  const isSelected = formState.attendeeIds.includes(member.id);
                  const isOwner = member.id === formState.ownerId;
                  const isDriver = formState.drivers.includes(member.id);
                  const showDriveToggle = isSelected && PARENT_IDS.has(member.id);

                  return (
                    <div
                      key={member.id}
                      className={[
                        styles.attendeeTile,
                        isSelected ? styles.selected : "",
                        isOwner ? styles.ownerLocked : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ "--c": member.color } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className={styles.attendeeButton}
                        onClick={() => handleToggleAttendee(member.id)}
                        aria-pressed={isSelected}
                        aria-label={isOwner ? `${member.name}, owner and included` : `${member.name}, ${isSelected ? "remove" : "add"} attendee`}
                      >
                        <span className={styles.attendeeStripe} aria-hidden="true" />
                        <span className={styles.attendeeName}>{member.name}</span>
                        {isOwner ? <span className={styles.attendeeMeta}>Owner</span> : null}
                      </button>
                      {showDriveToggle ? (
                        <button
                          type="button"
                          className={[styles.driveButton, isDriver ? styles.driveActive : ""].filter(Boolean).join(" ")}
                          onClick={() => handleToggleDriver(member.id)}
                          aria-pressed={isDriver}
                        >
                          Drive
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className={styles.bulkActions}>
                <button type="button" onClick={() => applyAttendeePreset(WHOLE_FAMILY)}>
                  Whole Family
                </button>
                <button type="button" onClick={() => applyAttendeePreset(KIDS)}>
                  Just Kids
                </button>
                <button type="button" onClick={() => applyAttendeePreset(ADULTS)}>
                  Just Adults
                </button>
                <button type="button" onClick={() => applyAttendeePreset([])}>
                  Clear All
                </button>
              </div>

              <div className={styles.preview}>
                <span className={styles.previewLabel}>Going:</span>
                {selectedAttendees.map((member) => (
                  <span key={member.id} className={styles.previewChip}>
                    <span className={styles.previewDot} style={{ backgroundColor: member.color }} />
                    {member.name}
                    {formState.drivers.includes(member.id) ? <span className={styles.roleTag}>drive</span> : null}
                  </span>
                ))}
              </div>

              <p className={styles.helperText}>Use DRIVE on Tyler or Heather to mark transportation without adding conflict UI.</p>
            </div>

            <div className={styles.field}>
              <p className={styles.label}>Owner</p>
              <div className={styles.ownerRow}>
                {FAMILY_MEMBERS.map((member) => {
                  const isSelected = member.id === formState.ownerId;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={[styles.ownerButton, isSelected ? styles.ownerSelected : ""].filter(Boolean).join(" ")}
                      style={{ "--c": member.color } as React.CSSProperties}
                      onClick={() => handleOwnerChange(member.id)}
                      aria-pressed={isSelected}
                    >
                      <span className={styles.ownerSwatch} aria-hidden="true" />
                      {member.name}
                    </button>
                  );
                })}
              </div>
              <p className={styles.helperText}>Owner sets the event stripe color and is always included as an attendee.</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${titleId}-repeat`}>
                Repeats
              </label>
              <select
                id={`${titleId}-repeat`}
                className={[styles.input, styles.monoInput, styles.selectInput].join(" ")}
                value={formState.repeatPreset}
                onChange={(changeEvent) => handleFieldChange("repeatPreset", changeEvent.target.value as RepeatPreset)}
              >
                <option value="none">Does Not Repeat</option>
                <option value="weekly-until">Weekly — Until Two Weeks Out</option>
                <option value="weekly-forever">Weekly — Forever</option>
                <option value="weekdays">Every Weekday</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${titleId}-notes`}>
                Notes
              </label>
              <textarea
                id={`${titleId}-notes`}
                className={styles.textarea}
                value={formState.notes}
                onChange={(changeEvent) => handleFieldChange("notes", changeEvent.target.value)}
                placeholder="Dress code, reminders, pickup notes…"
              />
            </div>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              {event?.id && onDelete ? (
                <button
                  type="button"
                  className={[styles.button, styles.deleteButton].join(" ")}
                  onClick={() => onDelete(event.id)}
                >
                  Delete Event
                </button>
              ) : null}
            </div>
            <div className={styles.footerRight}>
              <button type="button" className={[styles.button, styles.cancelButton].join(" ")} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={[styles.button, styles.saveButton].join(" ")}>
                {event ? "Save Changes" : "Save Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
