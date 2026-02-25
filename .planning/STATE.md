# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Phase 1 — Foundation & Device Management

## Current Position

**Phase:** 1 of 9 — Foundation & Device Management
**Plan:** Not yet planned
**Status:** Not started
**Progress:** ░░░░░░░░░░ 0%

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | ⬜ Not started |
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
| Plans completed | 0/? |
| Requirements delivered | 0/108 |

## Accumulated Context

### Key Decisions
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

**Last session:** Initial roadmap creation
**Next action:** Plan Phase 1 via `/gsd-plan-phase 1`
**Context for next session:** Foundation phase sets up the entire monorepo, module system, server, CLI, dashboard shell, and device management. Research recommends addressing all 5 critical pitfalls (CLI parsing brittleness, zombie processes, WS bottleneck, circular deps, broken npx packaging) in this phase. sim-location at `/Users/pranshu/github/sim-location` provides reference patterns.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26*
