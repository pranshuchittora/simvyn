# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Phase 2 — Location Module

## Current Position

**Phase:** 2 of 9 — Location Module
**Plan:** 2 of 4 in Phase 2
**Status:** Executing Phase 2
**Progress:** [███████░░░] 73%

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | ✅ Complete (7/7 plans) |
| 2. Location Module | 🔄 In Progress (1/4 plans) |
| 3. App Management Module | ⬜ Not started |
| 4. Log Viewer Module | ⬜ Not started |
| 5. Dashboard UI | ⬜ Not started |
| 6. Quick-Action Modules | ⬜ Not started |
| 7. File System & Database Inspector | ⬜ Not started |
| 8. Device Settings & Accessibility | ⬜ Not started |
| 9. Utility Modules | ⬜ Not started |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 1/9 |
| Plans completed | 7/7 (Phase 1) |
| Requirements delivered | 21/108 |
| Phase 01 P02 | 3min | 3 tasks | 10 files |
| Phase 01 P03 | 5min | 3 tasks | 5 files |
| Phase 01 P04 | 3min | 2 tasks | 15 files |
| Phase 01 P05 | 3min | 3 tasks | 8 files |
| Phase 01 P06 | 5min | 3 tasks | 8 files |
| Phase 01 P07 | 1min | 1 task | 1 file |
| Phase 02 P01 | 2min | 2 tasks | 9 files |

## Accumulated Context

### Key Decisions
- `module: NodeNext` in tsconfig (not ESNext) — required by TypeScript 5.9 when using `moduleResolution: NodeNext`
- TypeScript monorepo with npm workspaces (types → core → modules → server → cli, dashboard independent)
- Fastify 5 for server (plugin encapsulation maps to module system)
- sim-location migrated directly (copy + refactor, not rewrite) as Phase 2 to validate module architecture
- CLI-first approach: features work headlessly before dashboard panels
- macOS + Linux only, no Windows-specific code paths
- Single WebSocket connection with envelope-based multiplexing and per-module subscription
- execFile (not exec) for all shell commands to prevent shell injection — argument arrays only
- Android AVD boot uses detached spawn + poll-based wait (60s) rather than event-based detection
- Device change detection via JSON serialization of id+state arrays (simple, effective at expected scale)
- Dashboard uses moduleResolution: bundler (not NodeNext) — Vite handles module resolution for browser target
- ModuleShell uses CSS display:none/block toggle to persist panel state across module switches
- Single WsProvider context for entire app with listener registration pattern (useWsListener hook)
- Stub DeviceManager/ProcessManager in server with dynamic import fallback — server works before @simvyn/core is ready
- WsBroker uses WeakMap for per-client subscription state — auto-cleanup on GC
- Module loader tries .js then .ts manifest — supports compiled and development modes
- Modules import `type {} from "@simvyn/server"` for Fastify decorator type augmentations
- CLI commands in modules are headless — create own adapters/DeviceManager without server
- Device ID prefix matching in CLI for convenience (short UUIDs)
- Commander isDefault for start command — avoids duplicate option conflicts between program and subcommand
- tsx for TypeScript execution in dev — Node 24 type-stripping doesn't rewrite .js import specifiers in NodeNext mode
- Android geo fix uses lon,lat order (not lat,lon) matching adb protocol — intentional
- PlatformAdapter location methods are optional (?) since not all adapters may support GPS

### Architecture Notes
- Module manifest contract: each module exports Fastify plugin, Commander subcommand, WS namespace, UI panel registration
- Platform adapters: `PlatformAdapter` interface with iOS and Android implementations
- DeviceManager singleton with polling + caching + event emission
- Process registry for child process lifecycle (prevents zombie processes)
- State persistence in `~/.simvyn/` (JSON files)
- Dashboard module panels lazy-loaded via `React.lazy()`

### Research Flags
- Phase 1: WebSocket multiplexing approach needs prototyping (single connection vs. multiple)
- Phase 4: `simctl spawn log stream` output varies by macOS version — needs defensive parsing
- Phase 7: better-sqlite3 WAL-mode locking behavior with actively-written databases

### TODOs
(None yet)

### Blockers
(None)

## Session Continuity

**Last session:** Completed 02-01-PLAN.md (Adapter extensions & module scaffold)
**Next action:** Execute 02-02-PLAN.md (Location server routes, WS, playback engine)
**Context for next session:** PlatformAdapter has setLocation/clearLocation on both iOS and Android adapters. @simvyn/module-location package exists with geo utilities (haversine, route interpolation) and storage helpers (favorites CRUD). Manifest skeleton ready for route/WS registration in Plan 02.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26*
