# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Phase 1 — Foundation & Device Management

## Current Position

**Phase:** 1 of 9 — Foundation & Device Management
**Plan:** 5 of 6 in Phase 1
**Status:** In progress
**Progress:** [███░░░░░░░] 33%

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | 🔄 In progress (3/6 plans) |
| 2. Location Module | ⬜ Not started |
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
| Phases completed | 0/9 |
| Plans completed | 3/6 (Phase 1) |
| Requirements delivered | 13/108 |
| Phase 01 P02 | 3min | 3 tasks | 10 files |
| Phase 01 P04 | 3min | 2 tasks | 15 files |

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

**Last session:** Completed 01-04-PLAN.md (Dashboard shell with layout, WS, stores)
**Next action:** Execute 01-05-PLAN.md (Device management module with dashboard panel)
**Context for next session:** Dashboard shell complete with Vite + React + Tailwind v4. WsProvider connects to /ws, device-store receives device-list, module-store fetches from /api/modules, panel-registry enables lazy-loaded module panels. Layout: TopBar + Sidebar + ModuleShell. Ready for first module panel.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26 (after 01-04 execution)*
