---
phase: 09-utility-modules
plan: 01
subsystem: crash-logs
tags: [crash-logs, adb, logcat, diagnostic-reports, ios, android]

requires:
  - phase: 01-foundation
    provides: "PlatformAdapter interface, DeviceManager, module system, CLI framework"
provides:
  - "CrashLogEntry type in @simvyn/types"
  - "iOS crash log reader (DiagnosticReports scanner)"
  - "Android crash log reader (logcat + tombstones)"
  - "REST API for crash log listing and viewing"
  - "CLI simvyn crashes command"
affects: [dashboard-panels]

tech-stack:
  added: []
  patterns: ["adb logcat parsing grouped by PID+TAG", "DiagnosticReports filesystem scanning"]

key-files:
  created:
    - packages/modules/crash-logs/manifest.ts
    - packages/modules/crash-logs/routes.ts
    - packages/modules/crash-logs/cli.ts
    - packages/modules/crash-logs/ios-crashes.ts
    - packages/modules/crash-logs/android-crashes.ts
    - packages/modules/crash-logs/package.json
    - packages/modules/crash-logs/tsconfig.json
  modified:
    - packages/types/src/device.ts
    - packages/types/src/index.ts

key-decisions:
  - "iOS crash logs parsed from filename pattern (ProcessName-YYYY-MM-DD-HHMMSS.ips) with fs.stat for timestamps"
  - "Android logcat entries grouped by PID+TAG into crash groups, tombstones fetched via dumpsys dropbox"
  - "Android view returns preview text since logcat dumps are transient — no persistent log file to re-read"

patterns-established:
  - "Crash log module follows same manifest/routes/cli pattern as all other modules"

requirements-completed: [CRASH-01, CRASH-02, CRASH-03, CRASH-04]

duration: 3min
completed: 2026-02-26
---

# Phase 9 Plan 1: Crash Logs Module Summary

**iOS DiagnosticReports scanner and Android logcat/tombstone parser with REST API and CLI for crash log listing and viewing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T12:44:55Z
- **Completed:** 2026-02-26T12:47:57Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- CrashLogEntry type and crashLogs capability added to @simvyn/types
- iOS reader scans ~/Library/Logs/DiagnosticReports/ (including Retired/) for .ips/.crash files with app and time filtering
- Android reader parses adb logcat error output grouped by PID+TAG, plus dumpsys dropbox tombstones
- REST endpoints for listing (GET /list/:deviceId) and viewing (GET /view/:deviceId/:logId)
- CLI command `simvyn crashes <device>` with --app, --since, --view options

## Task Commits

Each task was committed atomically:

1. **Task 1: Create crash log reader utilities** - `12c060f` (feat)
2. **Task 2: Create crash logs module scaffold** - `a3e7a1f` (feat)

## Files Created/Modified
- `packages/types/src/device.ts` - Added CrashLogEntry interface and crashLogs capability
- `packages/types/src/index.ts` - Export CrashLogEntry type
- `packages/modules/crash-logs/ios-crashes.ts` - iOS DiagnosticReports reader with app/time filtering
- `packages/modules/crash-logs/android-crashes.ts` - Android logcat + tombstone parser
- `packages/modules/crash-logs/routes.ts` - REST API (list + view endpoints)
- `packages/modules/crash-logs/cli.ts` - CLI crashes command with table output
- `packages/modules/crash-logs/manifest.ts` - Module registration with crashLogs capability
- `packages/modules/crash-logs/package.json` - Workspace package definition
- `packages/modules/crash-logs/tsconfig.json` - TypeScript config with workspace references

## Decisions Made
- iOS crash logs parsed from filename pattern (ProcessName-YYYY-MM-DD-HHMMSS.ips) with fs.stat for modification timestamps
- Android logcat entries grouped by PID+TAG into crash groups, tombstones fetched via dumpsys dropbox --print
- Android view returns preview text since logcat dumps are transient (no persistent log file to re-read)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Crash logs module complete, ready for Plan 2 (media injection module)
- Module auto-discovery will pick up crash-logs via packages/modules/* workspace glob

## Self-Check: PASSED

All 9 files verified on disk. Both task commits (12c060f, a3e7a1f) confirmed in git history.

---
*Phase: 09-utility-modules*
*Completed: 2026-02-26*
