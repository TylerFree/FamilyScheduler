import type { Event } from "@/types/index";

const RELOAD_DATE = "2031-01-01";

async function importEventsStore() {
  vi.resetModules();
  return import("@/store/eventsStore");
}

async function importMembersStore() {
  vi.resetModules();
  return import("@/store/membersStore");
}

async function importHouseholdStore() {
  vi.resetModules();
  return import("@/store/householdStore");
}

describe("persisted stores", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("persists seeded events and CRUD updates across reloads", async () => {
    const { EVENTS_STORAGE_KEY, useEventsStore } = await importEventsStore();

    useEventsStore.getState().initializeEvents();

    expect(localStorage.getItem(EVENTS_STORAGE_KEY)).toBeTruthy();
    expect(useEventsStore.getState().events.length).toBeGreaterThanOrEqual(10);

    const addedEvent: Event = {
      id: "store-test-event",
      title: "Store persistence test",
      startMinutes: 12 * 60,
      endMinutes: 13 * 60,
      date: useEventsStore.getState().events[0]!.date,
      isAllDay: false,
      ownerId: "tyler",
      attendeeIds: ["tyler", "heather"],
      drivers: [],
      location: "Home office",
      createdAt: "2026-06-04T00:00:00.000Z",
      createdBy: "tyler",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };

    useEventsStore.getState().addEvent(addedEvent);

    const persistedEvents = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) ?? "{}");
    expect(persistedEvents.state.events.some((event: Event) => event.id === addedEvent.id)).toBe(true);

    const reloadedModule = await importEventsStore();
    expect(reloadedModule.useEventsStore.getState().events.some((event) => event.id === addedEvent.id)).toBe(true);
  });

  it("returns virtual occurrences for recurring events in date and week selectors", async () => {
    const { useEventsStore } = await importEventsStore();
    const weeklyEvent: Event = {
      id: "weekly-forever-test",
      title: "Weekly forever test",
      startMinutes: 15 * 60,
      endMinutes: 16 * 60,
      date: "2026-06-04",
      isAllDay: false,
      ownerId: "tyler",
      attendeeIds: ["tyler"],
      drivers: [],
      recurrence: { freq: "WEEKLY" },
      createdAt: "2026-06-04T00:00:00.000Z",
      createdBy: "tyler",
      updatedAt: "2026-06-04T00:00:00.000Z",
    };

    useEventsStore.setState({ events: [weeklyEvent] });

    expect(useEventsStore.getState().getEventsForDate("2026-06-18")).toEqual([
      expect.objectContaining({
        id: "weekly-forever-test",
        date: "2026-06-18",
        recurrence: { freq: "WEEKLY" },
      }),
    ]);
    expect(useEventsStore.getState().getEventsForWeek("2026-06-15")).toEqual([
      expect.objectContaining({
        id: "weekly-forever-test",
        date: "2026-06-18",
      }),
    ]);
  });

  it("persists seeded family members across reloads", async () => {
    const { MEMBERS_STORAGE_KEY, useMembersStore } = await importMembersStore();

    useMembersStore.getState().initializeMembers();
    useMembersStore.getState().updateMember("erin", { meta: "11th grade · Cedarcrest HS" });

    const persistedMembers = JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY) ?? "{}");
    expect(localStorage.getItem(MEMBERS_STORAGE_KEY)).toBeTruthy();
    expect(persistedMembers.state.members).toHaveLength(7);
    expect(persistedMembers.state.members.find((member: { id: string }) => member.id === "erin")?.meta).toBe(
      "11th grade · Cedarcrest HS",
    );

    const reloadedModule = await importMembersStore();
    expect(reloadedModule.useMembersStore.getState().members).toHaveLength(7);
    expect(reloadedModule.useMembersStore.getState().getMemberById("erin")?.meta).toBe(
      "11th grade · Cedarcrest HS",
    );
  });

  it("persists household settings while keeping date and member filters session-only", async () => {
    const { HOUSEHOLD_STORAGE_KEY, useHouseholdStore } = await importHouseholdStore();

    useHouseholdStore.getState().initializeHousehold();
    useHouseholdStore.getState().updateHousehold({ name: "The Busy Free Family" });
    useHouseholdStore.getState().updatePreferences({ showWeather: true, visibleHoursStart: 6 });
    useHouseholdStore.getState().setActiveFilter(["tyler", "erin"]);
    useHouseholdStore.getState().setCurrentDate(RELOAD_DATE);

    const persistedHousehold = JSON.parse(localStorage.getItem(HOUSEHOLD_STORAGE_KEY) ?? "{}");
    expect(localStorage.getItem(HOUSEHOLD_STORAGE_KEY)).toBeTruthy();
    expect(persistedHousehold.state.household.name).toBe("The Busy Free Family");
    expect(persistedHousehold.state.household.preferences.showWeather).toBe(true);
    expect(persistedHousehold.state.activeFilter).toBeUndefined();
    expect(persistedHousehold.state.currentDate).toBeUndefined();

    const reloadedModule = await importHouseholdStore();
    expect(reloadedModule.useHouseholdStore.getState().household.name).toBe("The Busy Free Family");
    expect(reloadedModule.useHouseholdStore.getState().household.preferences.visibleHoursStart).toBe(6);
    expect(reloadedModule.useHouseholdStore.getState().activeFilter).toBe("all");
    expect(reloadedModule.useHouseholdStore.getState().currentDate).not.toBe(RELOAD_DATE);
  });
});
