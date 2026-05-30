"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./settings.module.css";
import {
  CALENDAR_VIEWS,
  MEMBER_PERMISSIONS,
  TIME_FORMATS,
  WEEK_STARTS_ON_VALUES,
  type CalendarView,
  type Household,
  type HouseholdPreferences,
  type Member,
  type MemberId,
  type MemberPermission,
} from "@/types/index";
import { useHouseholdStore, useMembersStore } from "@/store";

type SettingsDraft = {
  householdName: string;
  householdLocation: string;
  preferences: HouseholdPreferences;
  memberPermissions: Record<MemberId, MemberPermission>;
};

type SettingsSectionId = "family" | "display" | "additional";

type NavItem = {
  id: SettingsSectionId;
  label: string;
  count?: string;
};

const START_HOUR_OPTIONS = Array.from({ length: 18 }, (_, index) => index + 5);
const END_HOUR_OPTIONS = Array.from({ length: 19 }, (_, index) => index + 6);

function createDraft(household: Household, members: Member[]): SettingsDraft {
  return {
    householdName: household.name,
    householdLocation: household.location,
    preferences: { ...household.preferences },
    memberPermissions: members.reduce<Record<MemberId, MemberPermission>>((permissions, member) => {
      permissions[member.id] = member.permission;
      return permissions;
    }, {} as Record<MemberId, MemberPermission>),
  };
}

function formatViewLabel(view: CalendarView): string {
  return view === "month" ? "Month" : view === "week" ? "Week" : "Day";
}

function formatPermission(permission: MemberPermission): string {
  switch (permission) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "view":
      return "View";
    default:
      return "None";
  }
}

function formatWeekStartLabel(value: 0 | 1): string {
  return value === 0 ? "Sun" : "Mon";
}

function formatTimeFormatLabel(format: (typeof TIME_FORMATS)[number]): string {
  return format === "12h" ? "12h" : "24h";
}

function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) {
    return "12 AM";
  }

  if (hour === 12) {
    return "12 PM";
  }

  if (hour > 12) {
    return `${hour - 12} PM`;
  }

  return `${hour} AM`;
}

export default function SettingsPage() {
  const household = useHouseholdStore((state) => state.household);
  const initializeHousehold = useHouseholdStore((state) => state.initializeHousehold);
  const updateHousehold = useHouseholdStore((state) => state.updateHousehold);
  const updatePreferences = useHouseholdStore((state) => state.updatePreferences);
  const members = useMembersStore((state) => state.members);
  const initializeMembers = useMembersStore((state) => state.initializeMembers);
  const updateMember = useMembersStore((state) => state.updateMember);
  const snapshot = useMemo(() => createDraft(household, members), [household, members]);
  const navItems = useMemo<NavItem[]>(
    () => [
      { id: "family", label: "Family", count: String(members.length) },
      { id: "display", label: "Display", count: "4" },
      { id: "additional", label: "Additional", count: "1" },
    ],
    [members.length],
  );
  const [draft, setDraft] = useState<SettingsDraft>(() => createDraft(household, members));
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("family");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    initializeHousehold();
    initializeMembers();
  }, [initializeHousehold, initializeMembers]);

  useEffect(() => {
    setDraft(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (saveState !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => setSaveState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(snapshot);

  const setHouseholdField = (field: "householdName" | "householdLocation", value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setSaveState("idle");
  };

  const setPreference = <K extends keyof HouseholdPreferences>(field: K, value: HouseholdPreferences[K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      preferences: {
        ...currentDraft.preferences,
        [field]: value,
      },
    }));
    setSaveState("idle");
  };

  const setPermission = (memberId: MemberId, permission: MemberPermission) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      memberPermissions: {
        ...currentDraft.memberPermissions,
        [memberId]: permission,
      },
    }));
    setSaveState("idle");
  };

  const handleVisibleStartChange = (value: number) => {
    setDraft((currentDraft) => {
      const nextEnd = currentDraft.preferences.visibleHoursEnd <= value ? Math.min(24, value + 1) : currentDraft.preferences.visibleHoursEnd;

      return {
        ...currentDraft,
        preferences: {
          ...currentDraft.preferences,
          visibleHoursStart: value,
          visibleHoursEnd: nextEnd,
        },
      };
    });
    setSaveState("idle");
  };

  const handleVisibleEndChange = (value: number) => {
    setDraft((currentDraft) => {
      const nextStart = currentDraft.preferences.visibleHoursStart >= value ? Math.max(0, value - 1) : currentDraft.preferences.visibleHoursStart;

      return {
        ...currentDraft,
        preferences: {
          ...currentDraft.preferences,
          visibleHoursStart: nextStart,
          visibleHoursEnd: value,
        },
      };
    });
    setSaveState("idle");
  };

  const handleCancel = () => {
    setDraft(snapshot);
    setSaveState("idle");
  };

  const handleSave = () => {
    updateHousehold({
      name: draft.householdName.trim() || household.name,
      location: draft.householdLocation.trim() || household.location,
    });
    updatePreferences(draft.preferences);

    members.forEach((member) => {
      const nextPermission = draft.memberPermissions[member.id];
      if (nextPermission !== member.permission) {
        updateMember(member.id, { permission: nextPermission });
      }
    });

    setSaveState("saved");
  };

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.headerBar}>
          <div className={styles.brand}>
            The Free Family <span className={styles.amp}>&amp;</span> Co.
            <span className={styles.brandSub}>Settings · {draft.householdLocation || household.location}</span>
          </div>

          <div className={styles.pageTitle}>
            <span className={styles.eyebrow}>— App Settings —</span>
            Manage Your Household
          </div>

          <Link href="/" className={styles.backButton}>
            ‹ Back to Calendar
          </Link>
        </header>

        <div className={styles.settingsLayout}>
          <nav className={styles.settingsNav} aria-label="Settings sections">
            <div className={styles.navLabel}>Settings</div>
            {navItems.map((item) => {
              const isActive = activeSection === item.id;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className={styles.navItemLabel}>{item.label}</span>
                  {item.count ? <span className={styles.navItemCount}>{item.count}</span> : null}
                </a>
              );
            })}
          </nav>

          <div className={styles.settingsContent}>
            <section id="family" className={styles.section}>
              <div className={styles.sectionTitle}>Household</div>
              <div className={styles.prefBlock}>
                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <label htmlFor="household-name" className={styles.prefRowTitle}>
                      Household name
                    </label>
                    <p className={styles.prefRowDescription}>The masthead name used throughout the calendar.</p>
                  </div>
                  <input
                    id="household-name"
                    className={styles.textInput}
                    value={draft.householdName}
                    onChange={(event) => setHouseholdField("householdName", event.target.value)}
                  />
                </div>

                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <label htmlFor="household-location" className={styles.prefRowTitle}>
                      Location
                    </label>
                    <p className={styles.prefRowDescription}>Shown in the chrome and weather footer copy.</p>
                  </div>
                  <input
                    id="household-location"
                    className={styles.textInput}
                    value={draft.householdLocation}
                    onChange={(event) => setHouseholdField("householdLocation", event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionTitle}>Members</div>
              <div className={styles.memberList}>
                <div className={styles.listHeader}>
                  <div>Color</div>
                  <div>Name</div>
                  <div>Role</div>
                  <div>Permission</div>
                </div>

                {members.map((member) => (
                  <div key={member.id} className={styles.memberRow}>
                    <div className={styles.memberSwatch} style={{ backgroundColor: member.color }} aria-hidden="true" />

                    <div className={styles.memberNameBlock}>
                      <span className={styles.memberName}>{member.name}</span>
                      <span className={styles.memberMeta}>{member.meta ?? `${member.role} · family calendar`}</span>
                    </div>

                    <div className={styles.memberRole}>
                      <span className={`${styles.roleBadge} ${member.role === "parent" ? styles.parentBadge : ""}`.trim()}>
                        {member.role}
                      </span>
                    </div>

                    <label className={styles.permissionField}>
                      <span className={styles.srOnly}>{member.name} permission</span>
                      <select
                        className={styles.prefSelect}
                        value={draft.memberPermissions[member.id]}
                        onChange={(event) => setPermission(member.id, event.target.value as MemberPermission)}
                      >
                        {MEMBER_PERMISSIONS.map((permission) => (
                          <option key={permission} value={permission}>
                            {formatPermission(permission)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </section>

            <section id="display" className={styles.section}>
              <div className={styles.sectionTitle}>Display Preferences</div>
              <div className={styles.prefBlock}>
                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <div className={styles.prefRowTitle}>Default view</div>
                    <p className={styles.prefRowDescription}>Which view to open when launching the app.</p>
                  </div>
                  <div className={styles.segmented}>
                    {CALENDAR_VIEWS.map((view) => (
                      <button
                        key={view}
                        type="button"
                        className={draft.preferences.defaultView === view ? styles.segmentedActive : ""}
                        onClick={() => setPreference("defaultView", view)}
                        aria-pressed={draft.preferences.defaultView === view}
                      >
                        {formatViewLabel(view)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <div className={styles.prefRowTitle}>Week starts on</div>
                    <p className={styles.prefRowDescription}>First column of the weekly view.</p>
                  </div>
                  <div className={styles.segmented}>
                    {WEEK_STARTS_ON_VALUES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={draft.preferences.weekStartsOn === value ? styles.segmentedActive : ""}
                        onClick={() => setPreference("weekStartsOn", value)}
                        aria-pressed={draft.preferences.weekStartsOn === value}
                      >
                        {formatWeekStartLabel(value)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <div className={styles.prefRowTitle}>Visible hours</div>
                    <p className={styles.prefRowDescription}>Time range shown on day and week views.</p>
                  </div>
                  <div className={styles.rangeControls}>
                    <label className={styles.rangeField}>
                      <span className={styles.rangeLabel}>Start</span>
                      <select
                        className={styles.prefSelect}
                        value={draft.preferences.visibleHoursStart}
                        onChange={(event) => handleVisibleStartChange(Number(event.target.value))}
                      >
                        {START_HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>
                            {formatHourLabel(hour)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <span className={styles.rangeDivider}>—</span>

                    <label className={styles.rangeField}>
                      <span className={styles.rangeLabel}>End</span>
                      <select
                        className={styles.prefSelect}
                        value={draft.preferences.visibleHoursEnd}
                        onChange={(event) => handleVisibleEndChange(Number(event.target.value))}
                      >
                        {END_HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>
                            {formatHourLabel(hour)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <div className={styles.prefRowTitle}>Time format</div>
                    <p className={styles.prefRowDescription}>How times display throughout the app.</p>
                  </div>
                  <div className={styles.segmented}>
                    {TIME_FORMATS.map((format) => (
                      <button
                        key={format}
                        type="button"
                        className={draft.preferences.timeFormat === format ? styles.segmentedActive : ""}
                        onClick={() => setPreference("timeFormat", format)}
                        aria-pressed={draft.preferences.timeFormat === format}
                      >
                        {formatTimeFormatLabel(format)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section id="additional" className={styles.section}>
              <div className={styles.sectionTitle}>Additional Preferences</div>
              <div className={styles.prefBlock}>
                <div className={styles.prefRow}>
                  <div className={styles.prefRowText}>
                    <div className={styles.prefRowTitle}>Show weather in footer</div>
                    <p className={styles.prefRowDescription}>Display current conditions for {draft.householdLocation || household.location}.</p>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${draft.preferences.showWeather ? styles.toggleOn : ""}`.trim()}
                    aria-pressed={draft.preferences.showWeather}
                    onClick={() => setPreference("showWeather", !draft.preferences.showWeather)}
                  >
                    <span className={styles.toggleThumb} aria-hidden="true" />
                    <span className={styles.srOnly}>Toggle weather visibility</span>
                  </button>
                </div>
              </div>
            </section>

            <div className={styles.actionBar}>
              <div className={styles.actionMeta}>
                {saveState === "saved" ? <span className={styles.savedText}>Saved</span> : null}
                <span>Settings · Family of {members.length} · {draft.householdLocation || household.location}</span>
              </div>

              <div className={styles.actionButtons}>
                <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`.trim()} onClick={handleCancel} disabled={!isDirty}>
                  Cancel
                </button>
                <button type="button" className={`${styles.actionButton} ${styles.saveButton}`.trim()} onClick={handleSave} disabled={!isDirty}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <div>Settings · Family of {members.length} · {draft.householdLocation || household.location}</div>
          <div className={styles.ornament}>— ✦ —</div>
          <div>Default view · {formatViewLabel(draft.preferences.defaultView)}</div>
        </footer>
      </div>
    </main>
  );
}
