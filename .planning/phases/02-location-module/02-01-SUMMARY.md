---
phase: 02-location-module
plan: 01
subsystem: location
tags: [gps, geolocation, haversine, simctl, adb, module-scaffold]

requires:
  - phase: 01-foundation-device-management
    provides: PlatformAdapter interface, createModuleStorage, workspace structure
provides:
  - setLocation/clearLocation methods on PlatformAdapter (iOS + Android)
  - @simvyn/module-location workspace package
  - Haversine distance and route interpolation utilities
  - Location/route favorites storage helpers
affects: [02-location-module, 03-app-management-module]

tech-stack:
  added: []
  patterns: [optional adapter methods for module-specific capabilities]

key-files:
  created:
    - packages/modules/location/package.json
    - packages/modules/location/tsconfig.json
    - packages/modules/location/manifest.ts
    - packages/modules/location/geo.ts
    - packages/modules/location/storage.ts
  modified:
    - packages/types/src/device.ts
    - packages/core/src/adapters/ios.ts
    - packages/core/src/adapters/android.ts

key-decisions:
  - "Android geo fix uses lon,lat order (not lat,lon) matching adb protocol"
  - "Location methods are optional on PlatformAdapter since not all adapters support GPS"

patterns-established:
  - "Module capabilities extend PlatformAdapter with optional methods"
  - "Module packages mirror device-management structure (package.json, tsconfig, manifest)"

requirements-completed: [LOC-01, LOC-02, LOC-03]

duration: 2min
completed: 2026-02-26
---

# Phase 2 Plan 01: Adapter Extensions & Module Scaffold Summary

**Extended PlatformAdapter with GPS setLocation/clearLocation and scaffolded @simvyn/module-location with haversine geo utils and favorites storage**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T08:06:11Z
- **Completed:** 2026-02-26T08:08:51Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- PlatformAdapter interface extended with optional setLocation/clearLocation methods
- iOS adapter implements GPS via `xcrun simctl location set/clear`
- Android adapter implements GPS via `adb emu geo fix` with correct lon-first argument order
- Location module package linked as workspace member with full tsconfig and manifest skeleton
- Haversine distance, route interpolation, and cumulative distance utilities ready for playback engine
- Location/route favorites CRUD helpers using ModuleStorage persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PlatformAdapter with setLocation/clearLocation** - `567f518` (feat)
2. **Task 2: Create location module package scaffold** - `a2f6f70` (feat)

## Files Created/Modified
- `packages/types/src/device.ts` - Added optional setLocation/clearLocation to PlatformAdapter
- `packages/core/src/adapters/ios.ts` - setLocation via simctl location set, clearLocation via simctl location clear
- `packages/core/src/adapters/android.ts` - setLocation via adb emu geo fix (lon before lat), clearLocation resets to 0,0
- `packages/modules/location/package.json` - @simvyn/module-location workspace package
- `packages/modules/location/tsconfig.json` - TypeScript config with NodeNext, references types and core
- `packages/modules/location/manifest.ts` - SimvynModule skeleton (routes added in Plan 02)
- `packages/modules/location/geo.ts` - haversine, interpolatePoint, cumulativeDistances, interpolateAlongRoute
- `packages/modules/location/storage.ts` - SavedLocation/SavedRoute types and CRUD helpers

## Decisions Made
- Android `geo fix` takes longitude before latitude — this is correct per adb protocol, not a bug
- setLocation/clearLocation are optional on PlatformAdapter to support future adapters that lack GPS capability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Adapter GPS methods ready for use by server routes (Plan 02)
- Geo utilities ready for playback engine (Plan 02)
- Storage helpers ready for favorites endpoints (Plan 02)
- Module manifest skeleton ready for route/WS registration (Plan 02)

## Self-Check: PASSED

All 8 key files verified on disk. Both task commits (567f518, a2f6f70) found in git history.

---
*Phase: 02-location-module*
*Completed: 2026-02-26*
