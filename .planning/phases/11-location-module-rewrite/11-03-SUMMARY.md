---
phase: 11-location-module-rewrite
plan: 03
subsystem: ui
tags: [location, glassmorphism, websocket, reverse-geocode, playback, favorites, emoji-picker, css]

requires:
  - phase: 11-location-module-rewrite
    provides: 14 location UI components and 4 zustand stores from plans 01+02
provides:
  - LocationPanel orchestrator with WS event handling, reverse geocode, device targeting
  - SaveLocationDialog with emoji picker and address preview
  - SaveRouteDialog with waypoint count preview
  - RouteActionBar with play/clear for idle routes
  - FavoritesPanel with open prop, load/delete for locations and routes
  - Full 1200-line glassmorphism CSS for all location overlays
affects: [11-04]

tech-stack:
  added: []
  patterns: [sendLocation wrapper pattern - parent wraps WS envelope, markerPosition effect drives set-location + reverse geocode]

key-files:
  created:
    - packages/dashboard/src/panels/location/SaveLocationDialog.tsx
    - packages/dashboard/src/panels/location/SaveRouteDialog.tsx
    - packages/dashboard/src/panels/location/RouteActionBar.tsx
  modified:
    - packages/dashboard/src/panels/LocationPanel.tsx
    - packages/dashboard/src/panels/location/FavoritesPanel.tsx
    - packages/dashboard/src/panels/location/location-panel.css

key-decisions:
  - "LocationPanel uses useWsListener for all 9 WS event types (location-set, playback-started/position/paused/resumed/stopped/complete/error, speed-changed)"
  - "markerPosition effect sends set-location with single deviceId from global device store (not broadcast array like sim-location)"
  - "Reverse geocode uses /api/modules/location/reverse (simvyn path prefix) with counter-based race condition prevention"
  - "Components use export default to match plan 04 formatting convention"

patterns-established:
  - "LocationPanel orchestrator pattern: subscribe on mount, listeners for all events, markerPosition effect for device + geocode"
  - "Save dialog overlay pattern: biome-ignore for a11y, overlay click closes, stopPropagation on dialog"

requirements-completed: [LOC-REWRITE-01, LOC-REWRITE-02, LOC-REWRITE-03]

duration: 7min
completed: 2026-02-26
---

# Phase 11 Plan 03: LocationPanel Orchestrator + CSS Summary

**LocationPanel rewritten with 9 WS event listeners, reverse geocode on marker move, 3 new dialog/action components, FavoritesPanel replacement, and full 1200-line glassmorphism CSS migrated from sim-location**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-26T14:39:44Z
- **Completed:** 2026-02-26T14:47:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Rewrote LocationPanel as full orchestrator: WS subscribe/unsubscribe, 9 event listeners with toast notifications, markerPosition effect triggers set-location + reverse geocode
- Added SaveLocationDialog with 12-emoji picker, name/coordinate/address preview, keyboard shortcuts
- Added SaveRouteDialog with waypoint count preview and save/cancel actions
- Added RouteActionBar with play route (SVG icon) + clear buttons, visible for 2+ waypoints when idle
- Replaced FavoritesPanel with open-prop-controlled version showing locations (with emoji) and routes, load/delete, save current route button
- Migrated full 1200-line glassmorphism CSS from sim-location, adapted for panel layout (no html/body reset, map-container uses width/height 100%)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SaveLocationDialog, SaveRouteDialog, RouteActionBar + replace FavoritesPanel** - `bf54489` (feat)
2. **Task 2: Rewrite LocationPanel.tsx orchestrator + migrate CSS** - `18e584b` (feat)

## Files Created/Modified
- `packages/dashboard/src/panels/location/SaveLocationDialog.tsx` - Modal with emoji picker, name input, coordinate/address preview
- `packages/dashboard/src/panels/location/SaveRouteDialog.tsx` - Modal with name input, waypoint count preview
- `packages/dashboard/src/panels/location/RouteActionBar.tsx` - Play Route + Clear buttons bar for idle routes
- `packages/dashboard/src/panels/location/FavoritesPanel.tsx` - Open-prop controlled panel with location/route lists and load/delete
- `packages/dashboard/src/panels/LocationPanel.tsx` - Full orchestrator with WS integration, reverse geocode, device targeting
- `packages/dashboard/src/panels/location/location-panel.css` - Complete glassmorphism stylesheet for all location overlays

## Decisions Made
- LocationPanel registers listeners for all 9 WS event types the server emits, including speed-changed (no-op acknowledgement)
- markerPosition effect sends set-location with single deviceId from global useDeviceStore (sim-location used multi-device Set, simvyn uses single selection)
- Reverse geocode requests use counter-based race condition prevention (same pattern as sim-location)
- Components use `export default` to match plan 04's formatting convention (plan 04 ran before plan 03)
- FavoritesPanel uses ✕ character instead of emoji trash can for delete button (consistent with simvyn no-emoji convention)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed named exports to default exports for consistency with plan 04**
- **Found during:** Task 2 (LocationPanel compilation)
- **Issue:** Plan 04 (which ran before plan 03) reformatted all location components to use `export default function` instead of `export function`. LocationPanel imports failed with TS2614 errors.
- **Fix:** Changed SaveLocationDialog, SaveRouteDialog, RouteActionBar to `export default function` and used default imports in LocationPanel
- **Files modified:** SaveLocationDialog.tsx, SaveRouteDialog.tsx, RouteActionBar.tsx, LocationPanel.tsx
- **Verification:** `npx tsc --noEmit` compiles with zero errors
- **Committed in:** 18e584b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Export convention aligned with plan 04's formatting. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All location components, stores, orchestrator, and CSS are now migrated from sim-location
- Phase 11 complete (plans 01-04 all executed), ready for transition
- Location panel should be visually and functionally identical to sim-location's standalone web app within simvyn's dashboard

---
*Phase: 11-location-module-rewrite*
*Completed: 2026-02-26*
