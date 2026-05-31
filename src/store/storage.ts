import type { StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export function getPersistentStorage(): StateStorage {
  if (typeof window === "undefined") {
    return noopStorage;
  }

  return window.localStorage;
}

export function hasPersistedState(storageKey: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(storageKey) !== null;
}
