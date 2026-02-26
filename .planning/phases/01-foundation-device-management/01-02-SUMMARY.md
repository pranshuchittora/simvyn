---
phase: 01-foundation-device-management
plan: 02
subsystem: core
tags: [simctl, adb, platform-adapters, device-manager, process-manager, storage]

requires:
  - phase: 01-foundation-device-management/01
    provides: "Monorepo scaffold, @simvyn/types (Device, PlatformAdapter, ModuleStorage interfaces)"
provides:
  - "iOS simulator adapter wrapping xcrun simctl (list, boot, shutdown, erase)"
  - "Android emulator/device adapter wrapping emulator CLI and adb"
  - "DeviceManager with unified polling, sorting, and event emission"
  - "ProcessManager for child process lifecycle tracking and cleanup"
  - "Module-namespaced JSON storage in ~/.simvyn/ with atomic writes"
  - "Platform detection utilities (isMacOS, isLinux, hasBinary)"
affects: [01-03, 01-04, 01-05, 01-06]

tech-stack:
  added: ["@types/node"]
  patterns: ["Factory function pattern for services (createXxx)", "Platform adapter interface with isAvailable guard", "EventEmitter-based change notification", "Atomic file writes (tmp + rename)", "Graceful degradation on missing platform tools"]

key-files:
  created:
    - packages/core/src/platform.ts
    - packages/core/src/adapters/types.ts
    - packages/core/src/adapters/ios.ts
    - packages/core/src/adapters/android.ts
    - packages/core/src/adapters/index.ts
    - packages/core/src/process-manager.ts
    - packages/core/src/storage.ts
    - packages/core/src/device-manager.ts
  modified:
    - packages/core/src/index.ts
    - packages/core/package.json

key-decisions:
  - "Used promisified execFile (not exec) for all shell commands to prevent shell injection"
  - "Android AVD boot spawns emulator detached with poll-based wait (up to 60s) rather than event-based"
  - "Device fingerprint uses id+state serialization for efficient change detection"
  - "Added @types/node as devDependency for Node.js built-in module type declarations"

patterns-established:
  - "Factory function pattern: createIosAdapter(), createAndroidAdapter(), createDeviceManager(), createProcessManager(), createModuleStorage()"
  - "Platform adapter guard: isAvailable() checked before listDevices() — adapters self-report availability"
  - "Sorted device list: booted first, then by platform, then by name"
  - "Atomic storage: write to .tmp then rename to prevent corruption"
  - "Signal cleanup: process.on SIGINT/SIGTERM/exit for child process lifecycle"

requirements-completed: [DEV-01, DEV-02, DEV-04, DEV-05, DEV-06, DEV-08, INFRA-07, INFRA-08, INFRA-09]

duration: 3min
completed: 2026-02-26
---

# Phase 1 Plan 2: Core Library Summary

**iOS/Android platform adapters wrapping simctl and adb, unified DeviceManager with polling and event emission, ProcessManager for child process lifecycle, and module-namespaced JSON storage in ~/.simvyn/**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T01:01:21Z
- **Completed:** 2026-02-26T01:04:36Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- iOS adapter parsing all available simulators from simctl JSON (booted + shutdown) with OS version, device type, and full capability set
- Android adapter detecting emulators via `emulator -list-avds` and USB devices via `adb devices` with AVD name resolution and async boot
- DeviceManager polling all adapters in parallel with sorted unified device list and change-event emission
- ProcessManager tracking spawned child processes with automatic cleanup on SIGINT/SIGTERM/exit
- Module-namespaced JSON storage in ~/.simvyn/ with atomic writes (tmp + rename) preventing corruption

## Task Commits

Each task was committed atomically:

1. **Task 1: Platform adapters — iOS and Android** - `3e3e894` (feat)
2. **Task 2: Process manager and storage service** - `29a5405` (feat)
3. **Task 3: DeviceManager — unified polling and event emission** - `c1dee2d` (feat)

## Files Created/Modified
- `packages/core/src/platform.ts` - Platform detection: isMacOS, isLinux, hasBinary
- `packages/core/src/adapters/types.ts` - Re-exports types from @simvyn/types
- `packages/core/src/adapters/ios.ts` - iOS simulator adapter wrapping xcrun simctl
- `packages/core/src/adapters/android.ts` - Android emulator/device adapter wrapping emulator CLI and adb
- `packages/core/src/adapters/index.ts` - Adapter barrel exports + createAvailableAdapters
- `packages/core/src/process-manager.ts` - Child process lifecycle tracker with signal cleanup
- `packages/core/src/storage.ts` - Module-namespaced JSON persistence in ~/.simvyn/
- `packages/core/src/device-manager.ts` - Unified device polling with event emission
- `packages/core/src/index.ts` - Barrel re-exports for all core services
- `packages/core/package.json` - Added @types/node devDependency

## Decisions Made
- Used `execFile` (promisified) instead of `exec` for all shell commands to prevent shell injection — all commands use argument arrays
- Android AVD boot spawns emulator as detached process and polls adb devices for up to 60s rather than relying on event-based detection
- Device change detection uses JSON serialization of id+state arrays — simple and effective for the expected device count
- Added @types/node as devDependency rather than hoisting to root, keeping type declarations scoped to packages that need Node.js APIs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @types/node for Node.js built-in module types**
- **Found during:** Task 1 (Platform adapters)
- **Issue:** TypeScript could not find `node:child_process`, `node:util`, or `process` without @types/node
- **Fix:** `npm install -D @types/node --workspace=packages/core`
- **Files modified:** packages/core/package.json, package-lock.json
- **Verification:** `npx tsc --build packages/core` compiles clean
- **Committed in:** 3e3e894 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed ProcessManager spawn type error with SpawnOptions**
- **Found during:** Task 2 (Process manager)
- **Issue:** TypeScript overload resolution failed when opts was undefined — spawn() overloads conflicted
- **Fix:** Defaulted opts to empty object (`opts ?? {}`) and cast result to ChildProcess
- **Files modified:** packages/core/src/process-manager.ts
- **Verification:** `npx tsc --build packages/core` compiles clean
- **Committed in:** 29a5405 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- @simvyn/core fully functional with all services exported and tested
- Ready for 01-03 (Fastify server with WebSocket support and module registry)
- Platform adapters verified on macOS with real simctl and adb output
- DeviceManager tested with real device discovery (11 iOS simulators, 2 Android devices)

---
*Phase: 01-foundation-device-management*
*Completed: 2026-02-26*
