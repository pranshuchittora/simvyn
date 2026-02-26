# Plan 04-02 Summary: Module Scaffold, Routes, WS Handler

**Duration:** ~3min | **Tasks:** 2 | **Files:** 3

## What Was Done

1. **Created log export route and WS handler with ref-counted streaming** —
   - `routes.ts`: Single `GET /export/:deviceId?format=json|text` endpoint serving log history from the active streamer. JSON returns structured object, text returns formatted plain text.
   - `ws-handler.ts`: Registers `"logs"` channel on WsBroker. Handles `start-stream` and `stop-stream` messages. Ref-counted streaming: multiple WS clients share a single child process per device. `StreamRef` tracks streamer + client set. `WeakMap<WebSocket, Set<string>>` tracks which devices each socket is streaming. Socket close listener auto-cleans up refs and stops streamer when last client disconnects.
   - Exported `getLogHistory(deviceId)` function for routes to access streamer history.

2. **Created module manifest** — `manifest.ts` with `register()` method wiring routes (with Fastify prefix) and WS handler. Module name `"logs"`, icon `"scroll-text"`, capability `["logs"]`.

## Key Decisions
- WS handler sends batches only to clients subscribed to that specific device (not broadcast)
- WeakSet tracks which sockets already have close listener attached (prevents duplicate listeners)
- Export route returns empty array/string if no active stream (not 404)

## Artifacts
- `packages/modules/log-viewer/routes.ts` — Log export REST endpoint
- `packages/modules/log-viewer/ws-handler.ts` — WS channel handler with ref-counted streaming
- `packages/modules/log-viewer/manifest.ts` — Module manifest with register()
