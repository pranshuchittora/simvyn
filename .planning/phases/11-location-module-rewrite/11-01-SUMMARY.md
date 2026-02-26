---
phase: 11-location-module-rewrite
plan: 01
subsystem: ui
tags: [zustand, location, playback, route, favorites, gpx, kml, togeojson]

requires:
  - phase: 02-location-module
    provides: Original location module scaffolds (stores, panels)
provides:
  - Full-featured location store with markerPosition, cursorPosition, myLocation, reverseGeocode, search
  - Playback store with real-world speed presets, multipliers, unit conversion
  - Route store with interactionMode and updateWaypoint
  - Favorites store with address/emoji support and simvyn API paths
  - GPX/KML route parsing utility
affects: [11-02, 11-03, 11-04]

tech-stack:
  added: []
  patterns: [sim-location store migration pattern - copy and adapt API paths]

key-files:
  created:
    - packages/dashboard/src/panels/location/utils/route-parser.ts
  modified:
    - packages/dashboard/src/panels/location/stores/location-store.ts
    - packages/dashboard/src/panels/location/stores/playback-store.ts
    - packages/dashboard/src/panels/location/stores/route-store.ts
    - packages/dashboard/src/panels/location/stores/favorites-store.ts

key-decisions:
  - "Direct copy from sim-location stores with minimal adaptation — only favorites-store API paths changed to /api/modules/location/ prefix"
  - "createdAt field changed from number to string (ISO format) to match sim-location convention"

patterns-established:
  - "Store migration: copy sim-location source exactly, only adapt API endpoint prefixes for simvyn routing"

requirements-completed: [LOC-REWRITE-01, LOC-REWRITE-02]

duration: 1min
completed: 2026-02-26
---

# Phase 11 Plan 01: Store & Utility Migration Summary

**Replaced 4 zustand location stores with full sim-location interfaces (markerPosition, SPEED_PRESETS, interactionMode, emoji favorites) and added GPX/KML route parser**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T13:58:57Z
- **Completed:** 2026-02-26T14:00:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced simplified location-store scaffold with full state: markerPosition, cursorPosition, myLocation, reverseGeocode, searchResults, searchQuery
- Replaced playback-store with real-world speed model: SPEED_PRESETS (Walking/Cycling/Driving/Train/Plane), MULTIPLIERS, speedUnit, kmhToMs/msToKmh
- Replaced route-store with interactionMode ('point'|'route'), updateWaypoint, clearRoute
- Replaced favorites-store with saveLocation/saveRoute (address/emoji fields), simvyn API paths, re-fetch-after-save pattern
- Added route-parser utility for GPX/KML file parsing via @tmcw/togeojson

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace all 4 zustand stores** - `d734c56` (feat)
2. **Task 2: Add route-parser utility** - `fd73f02` (feat)

## Files Created/Modified
- `packages/dashboard/src/panels/location/stores/location-store.ts` - Full location state with search and reverse geocode
- `packages/dashboard/src/panels/location/stores/playback-store.ts` - Speed presets, multipliers, unit conversion
- `packages/dashboard/src/panels/location/stores/route-store.ts` - InteractionMode and route waypoint management
- `packages/dashboard/src/panels/location/stores/favorites-store.ts` - CRUD with emoji/address, simvyn API paths
- `packages/dashboard/src/panels/location/utils/route-parser.ts` - GPX/KML parsing with @tmcw/togeojson

## Decisions Made
- Direct copy from sim-location with only API path changes in favorites-store (/api/favorites/* → /api/modules/location/favorites/*)
- createdAt type changed from number to string (ISO format) to match sim-location convention

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All store interfaces ready for component migration in plans 02 and 03
- Component files will show type errors against new store interfaces (expected — fixed in plan 02/03)
- Route parser ready for route import UI components

---
*Phase: 11-location-module-rewrite*
*Completed: 2026-02-26*
