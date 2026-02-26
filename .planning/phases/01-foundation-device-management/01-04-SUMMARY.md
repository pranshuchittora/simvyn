---
phase: 01-foundation-device-management
plan: 04
subsystem: ui
tags: [react, vite, tailwind, zustand, websocket, dashboard]

requires:
  - phase: 01-foundation-device-management/01
    provides: "Monorepo scaffold with @simvyn/types (Device, WsEnvelope, SimvynModule)"
provides:
  - "Vite + React + Tailwind v4 dashboard shell with dark glass-panel theme"
  - "WebSocket hook (useWs) with auto-reconnect and channel subscriptions"
  - "Zustand stores for devices, modules, and panel registry"
  - "Layout components: TopBar, Sidebar, ModuleShell, DeviceSelector"
  - "Module panel lazy-loading with CSS display toggle for state persistence"
affects: [01-05, 01-06, 02-location-module]

tech-stack:
  added: [react@19, react-dom@19, zustand@5, vite@7, "@vitejs/plugin-react@5", "@tailwindcss/vite@4", tailwindcss@4]
  patterns: ["Zustand stores with imperative access", "WS context provider with listener registration", "CSS display toggle for panel state persistence", "Glass-panel design system with oklch color tokens"]

key-files:
  created:
    - packages/dashboard/vite.config.ts
    - packages/dashboard/index.html
    - packages/dashboard/src/main.tsx
    - packages/dashboard/src/main.css
    - packages/dashboard/src/App.tsx
    - packages/dashboard/src/hooks/use-ws.ts
    - packages/dashboard/src/stores/device-store.ts
    - packages/dashboard/src/stores/module-store.ts
    - packages/dashboard/src/stores/panel-registry.ts
    - packages/dashboard/src/components/TopBar.tsx
    - packages/dashboard/src/components/Sidebar.tsx
    - packages/dashboard/src/components/ModuleShell.tsx
    - packages/dashboard/src/components/DeviceSelector.tsx
  modified:
    - packages/dashboard/package.json
    - packages/dashboard/tsconfig.json

key-decisions:
  - "Used moduleResolution: bundler (not NodeNext) for dashboard tsconfig — Vite handles resolution, browser target"
  - "CSS display toggle pattern for ModuleShell panel caching — keeps panel state alive when switching modules"
  - "Single WsProvider context with listener registration pattern instead of per-component WebSocket connections"

patterns-established:
  - "Glass-panel design system: oklch color tokens in @theme, .glass-panel utility class with backdrop-filter"
  - "Panel registry pattern: modules call registerPanel() at import time as side-effect registration"
  - "WS listener pattern: useWsListener(channel, type, handler) for declarative message handling"

requirements-completed: [INFRA-04, DEV-07]

duration: 3min
completed: 2026-02-26
---

# Phase 1 Plan 4: Dashboard Shell Summary

**React 19 + Vite 7 + Tailwind v4 dashboard shell with glass-panel dark theme, WebSocket device connectivity, Zustand stores for devices/modules, and lazy-loaded module panel routing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T01:01:29Z
- **Completed:** 2026-02-26T01:05:01Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Vite + React + Tailwind v4 scaffold with dark glass-panel theme using oklch color tokens
- WebSocket hook with auto-reconnect (2s delay, 10 max retries) and channel subscription pattern
- Three Zustand stores: device-store (device list/selection/broadcast), module-store (module list/active), panel-registry (lazy panel lookup)
- Full layout shell: TopBar (logo + device selector + connection indicator), Sidebar (module list), ModuleShell (cached panel rendering)
- DeviceSelector dropdown with platform grouping, state indicators, and broadcast mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Vite + React + Tailwind v4 scaffold** - `3e3e894` (feat)
2. **Task 2: Layout shell — TopBar, Sidebar, ModuleShell, DeviceSelector** - `4fea84c` (feat)

## Files Created/Modified
- `packages/dashboard/package.json` - Updated with react 19, zustand 5, vite 7, tailwind 4
- `packages/dashboard/tsconfig.json` - Updated for bundler resolution (Vite)
- `packages/dashboard/vite.config.ts` - Vite config with react/tailwind plugins and backend proxy
- `packages/dashboard/index.html` - HTML entry point with dark theme-color
- `packages/dashboard/src/main.tsx` - React root mount
- `packages/dashboard/src/main.css` - Tailwind v4 CSS-first theme tokens and glass-panel utility
- `packages/dashboard/src/App.tsx` - Root layout with WsProvider, WS listeners, and shell composition
- `packages/dashboard/src/hooks/use-ws.ts` - WebSocket context provider with auto-reconnect and listener registration
- `packages/dashboard/src/stores/device-store.ts` - Zustand store for device list, selection, and broadcast mode
- `packages/dashboard/src/stores/module-store.ts` - Zustand store for module list and active module
- `packages/dashboard/src/stores/panel-registry.ts` - Module panel component registry with Zustand reactivity
- `packages/dashboard/src/components/TopBar.tsx` - Fixed top bar with logo, device selector, connection indicator
- `packages/dashboard/src/components/Sidebar.tsx` - Fixed sidebar with module list and active highlighting
- `packages/dashboard/src/components/ModuleShell.tsx` - Panel renderer with CSS display toggle for state persistence
- `packages/dashboard/src/components/DeviceSelector.tsx` - Device dropdown with platform grouping and state dots

## Decisions Made
- Used `moduleResolution: bundler` instead of NodeNext for the dashboard tsconfig — the dashboard is a Vite browser project, not a Node.js package, so bundler resolution is appropriate
- Used CSS `display: none/block` toggle pattern in ModuleShell to keep panel component state alive when switching between modules, rather than unmounting/remounting
- Single WsProvider context for the whole app with listener registration pattern — avoids multiple WebSocket connections

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard shell complete, ready for module panels to register via `registerPanel()`
- WebSocket connectivity ready to receive device-list and device-updated messages from server
- Module sidebar ready to display modules from GET /api/modules endpoint
- Ready for 01-05 (Device management module with dashboard panel)

## Self-Check: PASSED

All 13 key files verified on disk. Both commit hashes (3e3e894, 4fea84c) found in git log.

---
*Phase: 01-foundation-device-management*
*Completed: 2026-02-26*
