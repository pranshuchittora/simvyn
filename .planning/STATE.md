# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Phase 1 — Foundation & Device Management

## Current Position

**Phase:** 1 of 9 — Foundation & Device Management
**Plan:** 2 of 6 in Phase 1
**Status:** In progress
**Progress:** █░░░░░░░░░ 1/6 plans complete

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | 🔄 In progress (1/6 plans) |
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
| Plans completed | 1/6 (Phase 1) |
| Requirements delivered | 2/108 |

## Accumulated Context

### Key Decisions
- `module: NodeNext` in tsconfig (not ESNext) — required by TypeScript 5.9 when using `moduleResolution: NodeNext`
- TypeScript monorepo with npm workspaces (types → core → modules → server → cli, dashboard independent)
- Fastify 5 for server (plugin encapsulation maps to module system)
- sim-location migrated directly (copy + refactor, not rewrite) as Phase 2 to validate module architecture
- CLI-first approach: features work headlessly before dashboard panels
- macOS + Linux only, no Windows-specific code paths
- Single WebSocket connection with envelope-based multiplexing and per-module subscription

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

**Last session:** Completed 01-01-PLAN.md (Monorepo scaffold & shared types)
**Next action:** Execute 01-02-PLAN.md (Core library: adapters, services, DeviceManager)
**Context for next session:** Monorepo scaffold complete with 5 packages. @simvyn/types provides all foundational interfaces. Next plan builds the core library with platform adapters, device manager, process manager, and storage.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26 (after 01-01 execution)*
