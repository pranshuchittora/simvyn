---
phase: 01-foundation-device-management
plan: 03
subsystem: server
tags: [fastify, websocket, plugin-system, module-loader]

requires:
  - phase: 01-01
    provides: "Monorepo scaffold with @simvyn/types (WsEnvelope, SimvynModule, Device, PlatformAdapter)"
provides:
  - "Fastify app factory with WebSocket, static serving, and health endpoint"
  - "WsBroker plugin for envelope-based WebSocket routing with channel subscriptions"
  - "Module auto-discovery system that loads plugins from filesystem"
  - "Module registry accessible via REST (GET /api/modules) and Fastify decorator"
affects: [01-04, 01-05, 01-06, 02-01]

tech-stack:
  added: [fastify@5.7, "@fastify/websocket@11.2", "@fastify/static@9", fastify-plugin@5]
  patterns: ["fastify-plugin for shared decorators (break encapsulation)", "Envelope-based WebSocket multiplexing", "Dynamic module discovery via filesystem manifest convention"]

key-files:
  created:
    - packages/server/src/app.ts
    - packages/server/src/ws-broker.ts
    - packages/server/src/module-loader.ts
  modified:
    - packages/server/package.json
    - packages/server/src/index.ts

key-decisions:
  - "Stub DeviceManager/ProcessManager in server until @simvyn/core provides real implementations — dynamic import with fallback"
  - "WsBroker uses WeakMap for per-client subscription state — auto-cleanup on GC"
  - "Module loader tries .js then .ts manifest imports — supports both compiled and development modes"

patterns-established:
  - "Server decorator pattern: shared state (deviceManager, processManager, wsBroker, moduleRegistry) via fastify.decorate"
  - "Module prefix convention: /api/modules/<name> for HTTP routes, channel name for WS"
  - "Graceful degradation: invalid modules logged and skipped, missing core exports fall back to stubs"

requirements-completed: [INFRA-02, INFRA-03]

duration: 5min
completed: 2026-02-26
---

# Phase 1 Plan 3: Server, WebSocket Broker & Module Loader Summary

**Fastify 5 server with envelope-based WebSocket broker, module auto-discovery from filesystem manifests, and plugin-prefixed route registration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-26T01:01:25Z
- **Completed:** 2026-02-26T01:07:16Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Fastify app factory with WebSocket support, static file serving (SPA fallback), and GET /api/health endpoint
- WsBroker plugin providing envelope routing by channel, subscribe/unsubscribe, ping/pong, and broadcast to subscribed clients
- Module loader that auto-discovers modules from filesystem directories, validates manifests, registers as Fastify plugins with prefixed routes
- Module registry exposed via GET /api/modules and fastify.moduleRegistry decorator

## Task Commits

Each task was committed atomically:

1. **Task 1: Fastify app factory with WebSocket and static serving** - `719e57e` (feat)
2. **Task 2: WebSocket broker — envelope routing and connection management** - `0d52290` (feat)
3. **Task 3: Module loader — auto-discovery and registration** - `f001f7f` (feat)

## Files Created/Modified
- `packages/server/src/app.ts` - Fastify app factory: createApp() with WebSocket, static serving, decorators, health check
- `packages/server/src/ws-broker.ts` - WsBroker plugin: envelope routing, channel subscriptions, broadcast/send
- `packages/server/src/module-loader.ts` - Module loader plugin: filesystem discovery, manifest validation, plugin registration
- `packages/server/src/index.ts` - Barrel re-exports for createApp, types, getModuleCLIRegistrars
- `packages/server/package.json` - Added fastify, @fastify/websocket, @fastify/static, fastify-plugin dependencies

## Decisions Made
- Used stub DeviceManager/ProcessManager with dynamic import fallback — server starts and works even before @simvyn/core implements these services (01-02 dependency)
- WsBroker uses WeakMap for client subscription state tracking — subscriptions automatically garbage collected when WebSocket is closed
- Module loader tries .js manifest first, then .ts — supports both production (compiled) and development (tsx/ts-node) workflows
- pathToFileURL used for dynamic imports — required for ESM module resolution on all platforms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created stub DeviceManager/ProcessManager for @simvyn/core dependency**
- **Found during:** Task 1 (app.ts creation)
- **Issue:** Plan references DeviceManager and ProcessManager from @simvyn/core, but 01-02 (core library) hasn't been executed yet — core only exports Device type
- **Fix:** Created stub implementations with dynamic import fallback — server uses stubs by default, automatically switches to real @simvyn/core implementations when available
- **Files modified:** packages/server/src/app.ts
- **Verification:** Server starts and health endpoint works with stubs; will seamlessly upgrade when core is built
- **Committed in:** 719e57e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — server works independently of @simvyn/core build status. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server infrastructure complete, ready for 01-04 (CLI scaffold)
- Module system ready for location module migration in Phase 2
- WsBroker ready for dashboard WebSocket integration in 01-05

## Self-Check: PASSED

All key files verified on disk. All commit hashes found in git log.

---
*Phase: 01-foundation-device-management*
*Completed: 2026-02-26*
