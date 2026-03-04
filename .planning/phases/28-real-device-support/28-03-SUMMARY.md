---
phase: 28-real-device-support
plan: 03
subsystem: api
tags: [capabilities, collections, device-manager, physical-device, file-system, database]

requires:
  - phase: 28-real-device-support
    provides: iOS physical device adapter (28-01), Android physical device refinement (28-02)
provides:
  - Device-type-aware capabilities endpoint with fileSystem/database flags
  - DeviceManager devices-disconnected event for physical device disconnect detection
  - Collections execution engine physical device skip logic
  - File-system and database route guards for iOS physical devices
affects: [dashboard, collections, device-settings]

tech-stack:
  added: []
  patterns:
    - "Physical device capability reduction via isPhysical flags in capabilities endpoint"
    - "Static action-ID sets for physical device skip logic in collections"
    - "resolveContainer/getContainerPath guard pattern for iOS physical device route rejection"

key-files:
  created: []
  modified:
    - packages/modules/device-settings/routes.ts
    - packages/core/src/device-manager.ts
    - packages/modules/collections/execution-engine.ts
    - packages/modules/file-system/routes.ts
    - packages/modules/database/routes.ts

key-decisions:
  - "statusBar and locale use !isPhysical (both platforms lack support on real devices)"
  - "Disconnect detection filtered to physical devices only — simulator state changes already handled by devices-changed"
  - "Static action-ID sets for physical device skip avoids changing ActionDescriptor type signature"
  - "File-system/database guards at resolveContainer/getContainerPath level — catches all routes in each module"

patterns-established:
  - "Physical device capability flags: isPhysical + isIosPhysical booleans in capabilities endpoint"
  - "PHYSICAL_UNSUPPORTED_IOS/ANDROID sets for collection step skipping"

requirements-completed: [RDEV-04, RDEV-07, RDEV-09, RDEV-10]

duration: 3min
completed: 2026-03-04
---

# Phase 28 Plan 03: Device-Type-Aware Capabilities & Collections Summary

**Capabilities endpoint returns reduced flags for physical devices, collections auto-skip unsupported actions, and file-system/database routes guard against iOS physical device access**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T22:01:09Z
- **Completed:** 2026-03-04T22:04:09Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Capabilities endpoint returns device-type-specific flags — iOS physical devices get false for appearance, statusBar, permissions, locale, contentSize, increaseContrast, fileSystem, database
- DeviceManager emits `devices-disconnected` event when physical devices disappear between polls
- Collections execution engine skips actions unsupported on physical devices using static action-ID sets
- File-system and database routes return 400 with descriptive error for physical iOS device IDs

## Task Commits

Each task was committed atomically:

1. **Task 1: Make capabilities endpoint device-type-aware** - `4a9acd4` (feat)
2. **Task 2: Add disconnect detection and device-aware collections skip** - `3d7710e` (feat)
3. **Task 3: Guard file-system and database routes against physical iOS devices** - `e49e68f` (feat)

## Files Created/Modified
- `packages/modules/device-settings/routes.ts` - Device-type-aware capabilities with isPhysical/isIosPhysical flags, fileSystem/database capabilities added
- `packages/core/src/device-manager.ts` - Physical-device-only disconnect detection with devices-disconnected event
- `packages/modules/collections/execution-engine.ts` - PHYSICAL_UNSUPPORTED_IOS/ANDROID sets and skip guard before action execution
- `packages/modules/file-system/routes.ts` - isPhysicalDevice guard in resolveContainer rejects iOS physical devices
- `packages/modules/database/routes.ts` - isPhysicalDevice guard in getContainerPath rejects iOS physical devices

## Decisions Made
- statusBar uses `!isPhysical` (neither platform supports status bar overrides on real devices), locale also uses `!isPhysical` (iOS: no simctl spawn on device; Android: requires root)
- Disconnect detection only fires for physical devices — simulators disappearing is already handled by the existing devices-changed event
- Used static action-ID sets (PHYSICAL_UNSUPPORTED_IOS/ANDROID) rather than modifying the ActionDescriptor type signature — simpler, no type changes needed
- File-system guard placed in resolveContainer (shared function) rather than each route handler — DRY
- Database guard placed in getContainerPath for same reason

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed disconnect detection to filter physical devices only**
- **Found during:** Task 2
- **Issue:** Prior partial implementation tracked ALL disconnected devices, but plan specifies only physical devices should trigger the event. Also had unused `previousIds` variable.
- **Fix:** Changed filter to `d.deviceType === "Physical" && !currentIds.has(d.id)`, removed unused variable
- **Files modified:** packages/core/src/device-manager.ts
- **Verification:** Tests pass (243/244, 1 pre-existing failure)
- **Committed in:** 3d7710e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor refinement to match plan specification. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 04 (device selector grouping and dashboard UI) is next
- All backend infrastructure for physical device support is complete
- Capabilities endpoint, collections engine, and file/database routes are device-type-aware

---
*Phase: 28-real-device-support*
*Completed: 2026-03-04*
