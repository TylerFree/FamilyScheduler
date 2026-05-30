import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { FAMILY_MEMBERS, type Member, type MemberId } from "@/types/index";

export const MEMBERS_STORAGE_KEY = "familyscheduler-members";
const MEMBER_COLOR_FALLBACK = "#888";

export interface MembersState {
  members: Member[];
  initializeMembers: () => void;
  updateMember: (id: MemberId, updates: Partial<Member>) => void;
  getMemberById: (id: MemberId) => Member | undefined;
  getMemberColor: (id: MemberId) => string;
  getVisibleMembers: (filter: MemberId[] | "all") => Member[];
}

function compareMembers(left: Member, right: Member): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

const initialMembers = [...FAMILY_MEMBERS].sort(compareMembers);

export const useMembersStore = create<MembersState>()(
  persist(
    (set, get) => ({
      members: initialMembers,
      initializeMembers: () => {
        const persistedMembers = get().members;

        if (persistedMembers.length === 0 || localStorage.getItem(MEMBERS_STORAGE_KEY) === null) {
          set({ members: [...FAMILY_MEMBERS].sort(compareMembers) });
        }
      },
      updateMember: (id, updates) =>
        set((state) => ({
          members: state.members
            .map((member) =>
              member.id === id
                ? {
                    ...member,
                    ...updates,
                    id: member.id,
                  }
                : member,
            )
            .sort(compareMembers),
        })),
      getMemberById: (id) => get().members.find((member) => member.id === id),
      getMemberColor: (id) =>
        get().members.find((member) => member.id === id)?.color ?? MEMBER_COLOR_FALLBACK,
      getVisibleMembers: (filter) => {
        const members = [...get().members].sort(compareMembers);

        if (filter === "all") {
          return members;
        }

        const visibleIds = new Set(filter);
        return members.filter((member) => visibleIds.has(member.id));
      },
    }),
    {
      name: MEMBERS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ members: state.members }),
    },
  ),
);
