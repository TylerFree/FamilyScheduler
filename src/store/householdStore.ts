import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { FAMILY_MEMBER_IDS, FAMILY_MEMBERS, type Household, type IsoDateString, type MemberId } from "@/types/index";
import { getPersistentStorage, hasPersistedState } from "./storage";

export const HOUSEHOLD_STORAGE_KEY = "familyscheduler-household";

export interface HouseholdState {
  household: Household;
  activeFilter: MemberId[] | "all";
  currentDate: IsoDateString;
  initializeHousehold: () => void;
  updateHousehold: (updates: Partial<Pick<Household, "name" | "location">>) => void;
  updatePreferences: (prefs: Partial<Household["preferences"]>) => void;
  setActiveFilter: (filter: MemberId[] | "all") => void;
  setCurrentDate: (date: IsoDateString) => void;
}

function getLocalIsoDate(date = new Date()): IsoDateString {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}` as IsoDateString;
}

export const DEFAULT_HOUSEHOLD: Household = {
  id: "the-free-family",
  name: "The Free Family",
  location: "Duvall, WA",
  members: FAMILY_MEMBERS,
  preferences: {
    defaultView: "day",
    weekStartsOn: 0,
    visibleHoursStart: 7,
    visibleHoursEnd: 21,
    timeFormat: "12h",
    showWeather: false,
  },
};

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set, get) => ({
      household: DEFAULT_HOUSEHOLD,
      activeFilter: "all",
      currentDate: getLocalIsoDate(),
      initializeHousehold: () => {
        const persistedHousehold = get().household;

        if (!persistedHousehold.name || !hasPersistedState(HOUSEHOLD_STORAGE_KEY)) {
          set({ household: DEFAULT_HOUSEHOLD });
        }
      },
      updateHousehold: (updates) =>
        set((state) => ({
          household: {
            ...state.household,
            ...updates,
            id: state.household.id,
            members: state.household.members,
            preferences: state.household.preferences,
          },
        })),
      updatePreferences: (prefs) =>
        set((state) => ({
          household: {
            ...state.household,
            preferences: {
              ...state.household.preferences,
              ...prefs,
            },
          },
        })),
      setActiveFilter: (filter) =>
        set({
          activeFilter:
            filter === "all" || filter.length === 0 || filter.length === FAMILY_MEMBER_IDS.length
              ? "all"
              : FAMILY_MEMBER_IDS.filter((id) => filter.includes(id)),
        }),
      setCurrentDate: (date) => set({ currentDate: date }),
    }),
    {
      name: HOUSEHOLD_STORAGE_KEY,
      storage: createJSONStorage(getPersistentStorage),
      partialize: (state) => ({ household: state.household }),
    },
  ),
);
