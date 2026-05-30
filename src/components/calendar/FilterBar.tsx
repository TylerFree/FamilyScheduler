"use client";

import React, { type CSSProperties } from "react";
import type { Member, MemberId } from "@/types/index";
import styles from "./FilterBar.module.css";

export interface FilterBarProps {
  members: Member[];
  activeFilter: MemberId[] | "all";
  onFilterChange: (filter: MemberId[] | "all") => void;
}

function compareMembers(left: Member, right: Member): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

export default function FilterBar({ members, activeFilter, onFilterChange }: FilterBarProps) {
  const orderedMembers = [...members].sort(compareMembers);
  const allMemberIds = orderedMembers.map((member) => member.id);
  const activeMemberIds = activeFilter === "all" ? new Set<MemberId>() : new Set(activeFilter);

  const handleMemberToggle = (memberId: MemberId) => {
    const nextFilter =
      activeFilter === "all"
        ? allMemberIds.filter((id) => id !== memberId)
        : activeFilter.includes(memberId)
          ? activeFilter.filter((id) => id !== memberId)
          : [...activeFilter, memberId].sort(
              (leftId, rightId) => allMemberIds.indexOf(leftId) - allMemberIds.indexOf(rightId),
            );

    if (nextFilter.length === 0 || nextFilter.length === allMemberIds.length) {
      onFilterChange("all");
      return;
    }

    onFilterChange(nextFilter);
  };

  return (
    <div className={styles.bar} aria-label="Family member filters">
      <div className={styles.track}>
        <button
          type="button"
          className={[styles.chip, styles.allChip, activeFilter === "all" ? styles.activeAllChip : ""]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={activeFilter === "all"}
          onClick={() => onFilterChange("all")}
        >
          <span className={styles.label}>All</span>
        </button>

        {orderedMembers.map((member) => {
          const isActive = activeFilter !== "all" && activeMemberIds.has(member.id);

          return (
            <button
              key={member.id}
              type="button"
              className={[styles.chip, styles.memberChip, isActive ? styles.activeMemberChip : ""]
                .filter(Boolean)
                .join(" ")}
              style={{ "--c": member.color } as CSSProperties}
              aria-pressed={isActive}
              onClick={() => handleMemberToggle(member.id)}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.label}>{member.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
