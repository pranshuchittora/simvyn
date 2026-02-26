---
phase: 02-location-module
plan: 02
subsystem: location
tags: [gps, nominatim, geocoding, playback, websocket, fastify-routes, simctl]

requires:
  - phase: 02-location-module
    provides: PlatformAdapter setLocation/clearLocation, geo utilities, storage helpers, manifest skeleton
provides:
  - HTTP routes for GPS set/clear, geocoding search/reverse, favorites CRUD
  - PlaybackEngine for iOS (simctl stdin pipe) and Android (tick-based setLocation)
  - WS channel "location" with real-time playback position broadcast
  - Fully wired location module manifest register()
affects: [02-location-module, 05-dashboard-ui]

tech-stack:
  added: []
  patterns: [SpawnCapable interface for server/core ProcessManager compatibility, rate-limited external API proxy]

key-files:
  created:
    - packages/modules/location/nominatim.ts
    - packages/modules/location/routes.ts
    - packages/modules/location/playback.ts
    - packages/modules/location/ws-handler.ts
  modified:
    - packages/modules/location/manifest.ts

key-decisions:
  - "PlaybackEngine uses SpawnCapable interface instead of core ProcessManager to avoid server/core type mismatch"
  - "Rate limiting uses simple lastRequestTime variable (sufficient for single-server deployment)"
  - "Android playback drives setLocation on each 200ms tick; iOS uses simctl stdin pipe for native route simulation"

patterns-established:
  - "Module WS handlers store engine instances in Map<deviceId, Engine> for stateful operations"
  - "External API proxies use rate-limited wrapper with configurable delay"

requirements-completed: [LOC-01, LOC-04, LOC-05, LOC-06, LOC-08, LOC-09]

duration: 3min
completed: 2026-02-26
---

# Phase 2 Plan 02: Location Server Routes, WS & Playback Engine Summary

**HTTP routes for GPS simulation and geocoding, PlaybackEngine with iOS stdin pipe and Android tick-based simulation, and WS channel for real-time playback control**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T08:11:39Z
- **Completed:** 2026-02-26T08:15:03Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Nominatim geocoding proxy with 1-second rate limiting and proper User-Agent
- 10 HTTP routes: POST /set, POST /clear, GET /search, GET /reverse, and CRUD for favorites locations and routes
- PlaybackEngine supporting both iOS (simctl stdin pipe via processManager.spawn) and Android (tick-based adapter.setLocation at 200ms)
- WS channel "location" handling set-location, start/pause/resume/stop-playback, and set-speed messages
- Manifest register() wired with routes and WS handler for auto-discovery

## Task Commits

Each task was committed atomically:

1. **Task 1: Nominatim proxy and HTTP routes** - `d442627` (feat)
2. **Task 2: PlaybackEngine for iOS and Android** - `cd62897` (feat)
3. **Task 3: WS channel handler and manifest wiring** - `d17523a` (feat)

## Files Created/Modified
- `packages/modules/location/nominatim.ts` - Rate-limited Nominatim forward/reverse geocoding proxy
- `packages/modules/location/routes.ts` - Fastify routes: /set, /clear, /search, /reverse, /favorites/*
- `packages/modules/location/playback.ts` - PlaybackEngine with iOS stdin pipe and Android tick-based simulation
- `packages/modules/location/ws-handler.ts` - WS channel "location" with playback control and position broadcast
- `packages/modules/location/manifest.ts` - Wired register() with routes and WS handler imports

## Decisions Made
- Used SpawnCapable interface instead of importing ProcessManager from @simvyn/core — the server's ProcessManager type doesn't include activeProcesses, so a minimal interface avoids the mismatch
- Rate limiting uses simple timestamp comparison (no external lib) — sufficient for single-server Nominatim proxy
- Android playback calls adapter.setLocation on each tick; iOS uses simctl's native stdin pipe for smoother simulation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ProcessManager type mismatch between server and core**
- **Found during:** Task 3 (WS handler creation)
- **Issue:** `fastify.processManager` is typed as server's `ProcessManager` (missing `activeProcesses`), but PlaybackEngine expected `@simvyn/core`'s `ProcessManager`
- **Fix:** Replaced `ProcessManager` import with minimal `SpawnCapable` interface matching what playback actually needs
- **Files modified:** packages/modules/location/playback.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** d17523a (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary type compatibility fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server-side location module fully functional — routes, WS channel, and playback engine ready
- Plan 03 (CLI commands) runs in parallel and has already added cli() to manifest
- Plan 04 (dashboard panel) can now connect to WS channel "location" and call HTTP routes

---
*Phase: 02-location-module*
*Completed: 2026-02-26*
