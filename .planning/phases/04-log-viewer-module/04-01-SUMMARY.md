# Plan 04-01 Summary: Shared Types + LogStreamer Class

**Duration:** ~3min | **Tasks:** 2 | **Files:** 5

## What Was Done

1. **Added LogLevel and LogEntry types to @simvyn/types** — `LogLevel` union type (`verbose` | `debug` | `info` | `warning` | `error` | `fatal`) and `LogEntry` interface with timestamp, level, message, processName, pid, and optional subsystem/category fields. Added to re-exports in index.ts.

2. **Created log-viewer module package and LogStreamer class** — Module scaffold at `packages/modules/log-viewer/` with package.json and tsconfig.json matching existing module patterns. `log-streamer.ts` implements:
   - `createLogStreamer()` factory function with SpawnCapable interface (same pattern as PlaybackEngine)
   - iOS spawn: `xcrun simctl spawn <device> log stream --style ndjson --level debug`
   - Android spawn: `adb -s <device> logcat -v json` with avd: prefix guard
   - ndjson parsing with `readline.createInterface` for line-by-line processing
   - Timed batch flush (default 150ms) with configurable interval
   - Capped history buffer (default 10,000 entries) to prevent memory leaks
   - Exported `parseIosLogLine`, `parseAndroidLogLine`, `mapIosLevel`, `mapAndroidPriority` for CLI reuse

## Key Decisions
- SpawnCapable interface rather than importing ProcessManager directly (avoids server/core type mismatch)
- Parse functions exported separately from LogStreamer for CLI reuse without batching overhead
- Android timestamp fallback: uses sec/nsec fields if present, otherwise `new Date().toISOString()`

## Artifacts
- `packages/types/src/device.ts` — LogLevel, LogEntry added
- `packages/types/src/index.ts` — re-exports updated
- `packages/modules/log-viewer/package.json` — module metadata
- `packages/modules/log-viewer/tsconfig.json` — TypeScript config
- `packages/modules/log-viewer/log-streamer.ts` — LogStreamer class + parse helpers
