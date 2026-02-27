---
phase: 19-device-lifecycle
plan: 01
subsystem: api
tags: [simctl, ios-simulator, device-lifecycle, keychain, ssl, rest-api, cli]

requires:
  - phase: 01-foundation
    provides: PlatformAdapter interface, DeviceManager, iOS adapter pattern
provides:
  - DeviceType and SimRuntime types
  - iOS adapter create/clone/rename/delete device methods
  - iOS adapter keychain add-cert/reset methods
  - 8 REST endpoints for lifecycle and keychain operations
  - 6 CLI subcommands (device create/clone/rename/delete, keychain add/reset)
affects: [19-device-lifecycle, 20-developer-utilities]

tech-stack:
  added: []
  patterns: [device-lifecycle-mutation-refresh, base64-cert-upload, temp-file-cert-install]

key-files:
  created: []
  modified:
    - packages/types/src/device.ts
    - packages/types/src/index.ts
    - packages/core/src/adapters/ios.ts
    - packages/modules/device-management/routes.ts
    - packages/modules/device-management/manifest.ts
    - packages/cli/src/commands/device.ts

key-decisions:
  - "Device lifecycle CLI subcommands placed in built-in CLI (packages/cli/src/commands/device.ts) not module manifest — built-in device command takes Commander precedence"
  - "Keychain CLI registered via module manifest as new top-level command group (no conflict)"
  - "Base64-encoded certificate upload for REST endpoint — avoids multipart complexity"

patterns-established:
  - "Mutation+refresh pattern: adapter mutation followed by deviceManager.refresh() for all lifecycle routes"
  - "Shutdown-state guard: validate device.state === shutdown before delete"

requirements-completed: [DLIF-01, DLIF-02, DLIF-03, DLIF-04, DLIF-06]

duration: 18min
completed: 2026-02-27
---

# Phase 19 Plan 01: Device Lifecycle Backend Summary

**iOS simulator create/clone/rename/delete + SSL keychain add/reset via simctl — types, adapter, 8 REST endpoints, 6 CLI commands**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-27T09:30:50Z
- **Completed:** 2026-02-27T09:49:15Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- DeviceType and SimRuntime types with full PlatformAdapter lifecycle/keychain method signatures
- All 8 simctl operations implemented in iOS adapter (listDeviceTypes, listRuntimes, createDevice, cloneDevice, renameDevice, deleteDevice, addKeychainCert, resetKeychain)
- 8 REST endpoints with proper validation (iOS-only guards, shutdown state checks, non-empty name validation)
- 6 CLI subcommands with --list-types and --list-runtimes convenience flags on create

## Task Commits

Each task was committed atomically:

1. **Task 1: Types and iOS adapter — lifecycle + keychain methods** - `b0bf0c1` (feat)
2. **Task 2: REST routes and CLI subcommands** - `280b5d7` (feat)

## Files Created/Modified
- `packages/types/src/device.ts` - DeviceType, SimRuntime interfaces, deviceLifecycle/keychain capabilities, 8 PlatformAdapter methods
- `packages/types/src/index.ts` - Export DeviceType and SimRuntime
- `packages/core/src/adapters/ios.ts` - 8 simctl method implementations with temp file cert handling
- `packages/modules/device-management/routes.ts` - 8 new REST endpoints for lifecycle and keychain
- `packages/modules/device-management/manifest.ts` - Keychain CLI group (removed duplicate device CLI)
- `packages/cli/src/commands/device.ts` - create/clone/rename/delete subcommands with --list-types/--list-runtimes

## Decisions Made
- Device lifecycle CLI goes in built-in device command (packages/cli) rather than module manifest — the built-in `device` Commander command takes precedence, module manifest device registration silently fails
- Keychain commands registered as new top-level `keychain` group via module manifest — no conflict with built-in commands
- Certificate upload uses base64 encoding in REST body rather than multipart — simpler API, certs are small

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CLI subcommands placed in built-in CLI instead of module manifest**
- **Found during:** Task 2 (CLI subcommands)
- **Issue:** Plan specified adding device create/clone/rename/delete to manifest.ts CLI, but built-in CLI already registers a `device` command via `registerDeviceCommand(program)` which takes Commander precedence — module manifest's device command registration silently fails
- **Fix:** Added 4 device subcommands to `packages/cli/src/commands/device.ts` (built-in CLI) where they actually execute; kept keychain commands in manifest as new top-level group (no conflict)
- **Files modified:** packages/cli/src/commands/device.ts, packages/modules/device-management/manifest.ts
- **Verification:** `simvyn device --help` shows create/clone/rename/delete, `simvyn keychain --help` shows add/reset
- **Committed in:** 280b5d7

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary architectural fix — commands wouldn't have worked in manifest due to Commander command name conflict.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All lifecycle and keychain backend operations complete
- Ready for dashboard UI (Phase 19 Plan 02 if applicable) or Phase 20 developer utilities

---
*Phase: 19-device-lifecycle*
*Completed: 2026-02-27*
