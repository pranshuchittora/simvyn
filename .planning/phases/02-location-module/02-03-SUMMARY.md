---
phase: 02-location-module
plan: 03
subsystem: location
tags: [cli, gpx, kml, togeojson, xmldom, route-playback, gps]

requires:
  - phase: 02-location-module
    provides: PlatformAdapter setLocation/clearLocation, geo utilities, module scaffold
provides:
  - CLI subcommands: simvyn location set/route/clear
  - Server-side GPX/KML parser (parseRouteFile, detectFormat)
affects: [02-location-module]

tech-stack:
  added: ["@xmldom/xmldom", "@tmcw/togeojson"]
  patterns: [dynamic import for headless CLI commands, tick-based CLI route playback]

key-files:
  created:
    - packages/modules/location/parse-route.ts
  modified:
    - packages/modules/location/manifest.ts
    - packages/modules/location/package.json
    - packages/cli/src/index.ts

key-decisions:
  - "Per-registrar try/catch in CLI module discovery to prevent one module's conflict from blocking others"
  - "CLI route command uses simple setInterval tick loop (not PlaybackEngine) since it creates own adapters"

patterns-established:
  - "Module CLI commands use dynamic import for @simvyn/core to stay headless"
  - "GPX/KML parsing via xmldom + togeojson with GeoJSON [lon,lat] to [lat,lon] flip"

requirements-completed: [LOC-10, LOC-04]

duration: 5min
completed: 2026-02-26
---

# Phase 2 Plan 03: CLI Subcommands Summary

**GPX/KML parser with xmldom + togeojson and headless CLI commands for location set, route playback, and clear**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T08:11:30Z
- **Completed:** 2026-02-26T08:16:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server-side GPX/KML parser using @xmldom/xmldom for DOM and @tmcw/togeojson for coordinate extraction
- `simvyn location set <device> <lat> <lng>` sets GPS coordinates headlessly with device ID prefix matching
- `simvyn location route <device> <file>` parses GPX/KML files and runs tick-based route playback with progress output
- `simvyn location clear <device>` clears GPS override
- Fixed CLI module discovery to isolate per-registrar errors (preventing device-management conflict from blocking location)

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-side GPX/KML parser** - `ef08ef5` (feat)
2. **Task 2: CLI subcommands in manifest.ts** - `bb8312f` (feat)

## Files Created/Modified
- `packages/modules/location/parse-route.ts` - GPX/KML to [lat,lon][] parser using xmldom + togeojson
- `packages/modules/location/manifest.ts` - cli() method with set, route, clear subcommands
- `packages/modules/location/package.json` - Added @xmldom/xmldom and @tmcw/togeojson dependencies
- `packages/cli/src/index.ts` - Per-registrar try/catch in module CLI discovery loop

## Decisions Made
- CLI route command implements its own setInterval tick loop instead of using PlaybackEngine (which needs processManager/server context)
- Per-registrar try/catch in module discovery — the device-management module's CLI conflicts with the hardcoded device command, but this shouldn't block other modules from registering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed module CLI discovery silently failing**
- **Found during:** Task 2 (CLI subcommand verification)
- **Issue:** CLI module discovery wrapped all registrars in a single try/catch — device-management module's duplicate "device" command threw, preventing location module from registering
- **Fix:** Changed to per-registrar try/catch so each module's CLI failure is isolated
- **Files modified:** packages/cli/src/index.ts
- **Verification:** `npx tsx packages/cli/src/index.ts location --help` shows set, route, clear subcommands
- **Committed in:** bb8312f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix — without it, the location CLI would never be discoverable.

## Issues Encountered
- Parallel agent (02-02) committed manifest.ts with cli() changes already present (picked up in-progress edits) — no conflict since changes were identical

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI subcommands fully functional for headless GPS control
- parse-route.ts ready for reuse by WS handler (route file uploads)
- Ready for 02-04 (React panel) as final plan in phase 2

## Self-Check: PASSED

All 3 key files verified on disk. Both task commits (ef08ef5, bb8312f) found in git history.

---
*Phase: 02-location-module*
*Completed: 2026-02-26*
