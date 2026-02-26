---
phase: 09-utility-modules
plan: 03
subsystem: clipboard
tags: [clipboard, simctl, adb, pbpaste, pbcopy, cli]

requires:
  - phase: 01-foundation
    provides: PlatformAdapter interface, DeviceManager, module loader
provides:
  - getClipboard adapter method for iOS (simctl pbpaste)
  - setClipboard adapter method for iOS (simctl pbcopy via stdin) and Android (cmd clipboard set-text with input text fallback)
  - REST API GET /get/:deviceId and POST /set/:deviceId
  - CLI commands simvyn clipboard get/set
  - "@simvyn/module-clipboard package"
affects: [dashboard]

tech-stack:
  added: []
  patterns: ["optional adapter method check for platform-specific capability support"]

key-files:
  created:
    - packages/modules/clipboard/manifest.ts
    - packages/modules/clipboard/routes.ts
    - packages/modules/clipboard/cli.ts
    - packages/modules/clipboard/package.json
    - packages/modules/clipboard/tsconfig.json
  modified:
    - packages/types/src/device.ts
    - packages/core/src/adapters/ios.ts
    - packages/core/src/adapters/android.ts

key-decisions:
  - "Android getClipboard set to undefined — no reliable adb-only clipboard read without helper app"
  - "Android setClipboard uses cmd clipboard set-text (Android 12+) with input text fallback for older versions"
  - "iOS setClipboard uses spawn + stdin pipe to pbcopy (not execFile) since pbcopy reads from stdin"

patterns-established:
  - "Clipboard bridge via adapter pattern: optional methods for asymmetric platform support"

requirements-completed: [CLIP-01, CLIP-02, CLIP-03, CLIP-04]

duration: 1min
completed: 2026-02-26
---

# Phase 9 Plan 3: Clipboard Bridge Module Summary

**Clipboard bridge module with iOS pbpaste/pbcopy and Android cmd clipboard set-text, REST API endpoints, and CLI subcommands**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T12:51:09Z
- **Completed:** 2026-02-26T12:52:56Z
- **Tasks:** 1
- **Files modified:** 8

## Accomplishments
- iOS adapter reads clipboard via `xcrun simctl pbpaste` and writes via `xcrun simctl pbcopy` with stdin pipe
- Android adapter writes clipboard via `adb shell cmd clipboard set-text` (Android 12+) with `input text` fallback; read is unsupported (returns 400)
- REST API GET `/get/:deviceId` returns `{ text }`, POST `/set/:deviceId` accepts `{ text }` body
- CLI `simvyn clipboard get <device>` outputs raw text (pipe-friendly), `simvyn clipboard set <device> <text>` writes to device

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clipboard adapter methods and create clipboard module with routes and CLI** - `151a8b0` (feat)

## Files Created/Modified
- `packages/modules/clipboard/manifest.ts` - Module registration with routes and CLI
- `packages/modules/clipboard/routes.ts` - REST API endpoints for clipboard get and set
- `packages/modules/clipboard/cli.ts` - CLI subcommands for clipboard get and set
- `packages/modules/clipboard/package.json` - Package config for @simvyn/module-clipboard
- `packages/modules/clipboard/tsconfig.json` - TypeScript config with project references
- `packages/types/src/device.ts` - Added getClipboard and setClipboard to PlatformAdapter
- `packages/core/src/adapters/ios.ts` - Added getClipboard (pbpaste) and setClipboard (pbcopy via stdin)
- `packages/core/src/adapters/android.ts` - Added setClipboard (cmd clipboard + input text fallback), getClipboard undefined, clipboard capability

## Decisions Made
- Android getClipboard set to undefined — no reliable adb-only clipboard read without a helper app installed on device
- Android setClipboard uses `cmd clipboard set-text` (Android 12+) with `input text` fallback for older versions
- iOS setClipboard uses spawn + stdin pipe to pbcopy since pbcopy reads from stdin (not a file argument)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Ready for 09-04. Clipboard module complete with both platform adapters (iOS read/write, Android write-only), REST API, and CLI.

---
*Phase: 09-utility-modules*
*Completed: 2026-02-26*
