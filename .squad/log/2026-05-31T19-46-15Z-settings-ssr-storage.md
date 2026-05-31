# Session Log — Settings SSR Storage Fix — 2026-05-31

Tyler reported `/settings` crashing in Chrome, followed by `chrome-error://chromewebdata/` and unsafe navigation errors after the initial 500. Diagnosis: the settings page imports persisted Zustand stores, and events, household, and members stores referenced bare `localStorage` during module evaluation, which is unsafe during Next.js SSR/RSC/prerender.

Yen added `src/store/storage.ts` with a `typeof window`-guarded storage shim and routed all persisted stores through `createJSONStorage(getPersistentStorage)`, with persisted-key checks using `hasPersistedState(...)`. Validation was clean: `npm run lint`, `npm test`, `npm run build`, and dev server curl for `/settings` returned HTTP 200.

**Decision inbox:** yen-settings-fix.md → merged to decisions.md
