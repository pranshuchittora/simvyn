---
phase: 28-real-device-support
plan: 01
subsystem: api
tags: [devicectl, ios, physical-device, xcrun, adapter]

requires:
  - phase: 01-foundation
    provides: PlatformAdapter interface, verboseExec/verboseSpawn utilities
provides:
  - devicectl JSON output helper for iOS physical device commands
  - Physical device discovery via devicectl list devices
  - App management (install/uninstall/launch/terminate/list) for physical iOS devices
  - Deep link support via devicectl process launch --payload-url
  - isPhysicalDevice/stripPhysicalPrefix discriminators exported from @simvyn/core
  - getDevicectlStatus diagnostic function for tool settings
  - Descriptive error guards on all simulator-only methods for physical device IDs
affects: [device-settings, collections, device-management, tool-settings]

tech-stack:
  added: [xcrun devicectl]
  patterns: [physical: prefix convention for device IDs, devicectlJson temp-file JSON parsing, isPhysicalDevice guard pattern]

key-files:
  created: []
  modified:
    - packages/core/src/adapters/ios.ts
    - packages/core/src/adapters/index.ts
    - packages/core/src/index.ts

key-decisions:
  - "physical: prefix on CoreDevice UUIDs for unambiguous simulator vs physical device branching"
  - "devicectlJson helper with temp file per Apple's mandated JSON output approach (no stdout parsing)"
  - "Lazy devicectl availability check cached after first call — no startup penalty if never needed"
  - "Bug report on physical devices throws unsupported (sysdiagnose is complex and unreliable via CLI)"
  - "terminateApp on physical devices uses two-step: list processes → find by bundleId → terminate by PID"

patterns-established:
  - "isPhysicalDevice guard: single-line check at method top routes to devicectl or simctl"
  - "devicectlJson<T>: generic temp-file-based JSON output wrapper for all devicectl commands"

requirements-completed: [RDEV-01, RDEV-02, RDEV-03, RDEV-05]

duration: 7min
completed: 2026-03-04
---

# Phase 28 Plan 01: iOS Physical Device Adapter Integration Summary

**devicectl integration for physical iOS device discovery, app management, deep links, and graceful degradation via isPhysicalDevice branching within the single iOS adapter**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-04T21:50:39Z
- **Completed:** 2026-03-04T21:57:51Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Physical iOS devices discovered via `xcrun devicectl list devices` with `physical:` prefix IDs alongside existing simulators
- App management (install, uninstall, launch, terminate, list, getAppInfo) routed through devicectl for physical devices
- Deep links open on physical devices via `devicectl process launch --payload-url`
- 20+ simulator-only methods guarded with descriptive error messages for physical device IDs
- `getDevicectlStatus()`, `isPhysicalDevice()`, `stripPhysicalPrefix()` exported from @simvyn/core for downstream use
- Graceful degradation: missing devicectl (Xcode < 15) silently returns empty physical device list, simulators unaffected

## Task Commits

Each task was committed atomically:

1. **Task 1: Add devicectl helpers, physical device discovery, and devicectl-backed methods** - `5149186` (feat)
2. **Task 2: Add throw-unsupported guards for simulator-only methods** - `19b5fcc` (feat)
3. **Task 3: Add devicectl availability check export for diagnostics** - `3edf45e` (feat)

## Files Created/Modified
- `packages/core/src/adapters/ios.ts` — devicectlJson helper, physical device discovery, devicectl-backed methods for physical devices, unsupported method guards
- `packages/core/src/adapters/index.ts` — re-export isPhysicalDevice, stripPhysicalPrefix, getDevicectlStatus
- `packages/core/src/index.ts` — barrel export of new physical device utilities and DevicectlStatus type

## Decisions Made
- Used `physical:` prefix on CoreDevice UUID identifiers to distinguish from simulator UDIDs — simple `startsWith` check, strips cleanly
- devicectlJson uses `mkdtemp` + `readFile` + `rm` in try/finally — matches Apple's mandated JSON output pattern (no stdout parsing)
- Lazy `checkDevicectl()` caches result after first call — avoids startup penalty when no physical devices involved
- Bug report collection throws unsupported for physical devices rather than attempting sysdiagnose (complex output path handling)
- `terminateApp` for physical devices uses two-step process: list running processes → find by bundleIdentifier → terminate by PID (devicectl requires PID, not bundle ID)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- iOS adapter fully supports physical device discovery and app management via devicectl
- Ready for Plan 02 (Android adapter refinement) and Plan 03 (capabilities endpoint device awareness)
- Exported utilities (isPhysicalDevice, getDevicectlStatus) ready for capabilities endpoint and tool settings diagnostics

---
*Phase: 28-real-device-support*
*Completed: 2026-03-04*
