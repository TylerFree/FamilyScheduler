# SSR-Safe Zustand Persist

Use this pattern when a Next.js App Router route imports a persisted Zustand store.

## Problem

Client components and shared modules can still be evaluated during SSR/RSC/prerender. Bare `localStorage` references in Zustand `persist` configuration or store actions can crash when `window` is unavailable.

## Pattern

Create one shared storage helper:

```ts
import type { StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export function getPersistentStorage(): StateStorage {
  return typeof window === "undefined" ? noopStorage : window.localStorage;
}

export function hasPersistedState(storageKey: string): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(storageKey) !== null;
}
```

Then configure stores with `storage: createJSONStorage(getPersistentStorage)` and avoid direct `localStorage.getItem(...)` calls outside guarded helpers.

## Validation

Run `npm run build` to exercise prerender/SSR paths, then `npm run dev` and curl the route that imports the store.
