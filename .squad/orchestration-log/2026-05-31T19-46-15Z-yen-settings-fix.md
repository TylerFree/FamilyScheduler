# Yen — Settings SSR Storage Fix — 2026-05-31T19:46:15Z

## Request Origin

**Requested by:** Tyler Free  
**Agent:** Yen (Frontend Dev)  
**Mode:** Background  
**Date:** 2026-05-31

## Outcome Summary

`/settings` is stable after replacing bare persisted-store `localStorage` access with an SSR-safe Zustand storage helper.

### Bug Report

- Chrome showed `chrome-error://chromewebdata/` after `/settings` returned 500.
- Subsequent navigation threw `Unsafe attempt to load URL... from frame with URL chrome-error://chromewebdata/`.

### Diagnosis

The settings page imports events, household, and members stores. Those persisted Zustand stores referenced bare `localStorage` in module-level `createJSONStorage` configuration and initialization key checks, which crashes during Next.js SSR/RSC/prerender when `window` is unavailable.

### Fix

- Added `src/store/storage.ts` with `getPersistentStorage()` and `hasPersistedState()`.
- Routed events, household, and members persistence through `createJSONStorage(getPersistentStorage)`.
- Guarded persisted-state key checks behind `typeof window !== "undefined"`.
- Captured the standard pattern in `.squad/skills/ssr-safe-zustand-persist/SKILL.md`.

### Validation Status

- ✅ `npm run lint`
- ✅ `npm test`
- ✅ `npm run build`
- ✅ Dev server `/settings` curl returns HTTP 200

### Decision Artifacts

- **Inbox file:** `.squad/decisions/inbox/yen-settings-fix.md`
- **Merged to:** `.squad/decisions.md`

### Cross-Agent Note

Basher owns the store layer: the SSR-safe storage helper is now the required pattern for any new persisted Zustand store.
