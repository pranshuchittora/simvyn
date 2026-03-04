---
phase: 28-real-device-support
plan: 02
subsystem: api
tags: [android, adb, physical-device, adapter]

requires:
  - phase: 22.2-test-suite
    provides: Android adapter tests for regression verification
provides:
  - isAndroidPhysical() helper exported from @simvyn/core
  - Physical device guards on 4 emulator-only Android methods
affects: [28-real-device-support, device-settings, collections]

tech-stack:
  added: []
  patterns: [isAndroidPhysical guard before emu commands]

key-files:
  created: []
  modified:
    - packages/core/src/adapters/android.ts
    - packages/core/src/adapters/index.ts
    - packages/core/src/index.ts

key-decisions:
  - "isAndroidPhysical checks !emulator- && !avd: prefix — correctly identifies USB serials and IP:port connections"
  - "shutdown returns silently (no-op) for physical devices instead of throwing — matches existing pattern for avd:"
  - "setLocale throws descriptive error mentioning root requirement — informative for users"

patterns-established:
  - "isAndroidPhysical guard pattern: check before any adb emu command"

requirements-completed: [RDEV-06]

duration: 2min
completed: 2026-03-04
---

# Phase 28 Plan 02: Android Physical Device Guards Summary

**Explicit guards on 4 emulator-only Android adapter methods (setLocation, clearLocation, shutdown, setLocale) with isAndroidPhysical helper exported from @simvyn/core**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T21:50:53Z
- **Completed:** 2026-03-04T21:53:07Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `isAndroidPhysical()` exported helper that identifies physical device serials (USB and WiFi)
- Guarded `setLocation` and `clearLocation` with descriptive error for physical devices (adb emu geo fix is emulator-only)
- Made `shutdown` a silent no-op for physical devices (avoids useless emu kill attempt)
- Guarded `setLocale` with error explaining root access requirement on physical devices
- All 243 Android/iOS adapter tests continue to pass (1 pre-existing iOS stopRecording failure unrelated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isAndroidPhysical helper and guard emulator-only methods** - `6ad943d` (feat)

## Files Created/Modified
- `packages/core/src/adapters/android.ts` - Added isAndroidPhysical/isEmulatorRunning helpers and guards on setLocation, clearLocation, shutdown, setLocale
- `packages/core/src/adapters/index.ts` - Re-exported isAndroidPhysical from adapter barrel
- `packages/core/src/index.ts` - Exported isAndroidPhysical from @simvyn/core package

## Decisions Made
- `isAndroidPhysical` uses negative logic (`!emulator- && !avd:`) — correct because physical serials have varied formats (alphanumeric USB serials, IP:port for WiFi) while emulator/AVD prefixes are fixed
- `shutdown` returns silently for physical devices (not throw) — consistent with the existing `avd:` guard pattern and semantically correct (shutting down a physical device isn't an error, just a no-op)
- `setLocale` gets a descriptive error mentioning root access — users need to know WHY it doesn't work, not just that it doesn't

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Android adapter fully guarded for physical device operations
- `isAndroidPhysical` exported and available for capabilities endpoint (plan 28-04)
- Ready for plan 28-03 (iOS real device adapter integration)

---
*Phase: 28-real-device-support*
*Completed: 2026-03-04*
