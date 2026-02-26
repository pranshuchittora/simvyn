---
phase: 01-foundation-device-management
verified: 2026-02-26T01:22:32Z
status: gaps_found
score: 16/17 must-haves verified
gaps:
  - truth: "WebSocket devices channel broadcasts device list updates in real-time to the dashboard"
    status: failed
    reason: "Dashboard sends subscribe message to wrong channel — sends {channel:'devices', type:'subscribe'} but ws-broker expects {channel:'system', type:'subscribe', payload:{channel:'devices'}}. Client never gets added to 'devices' subscription set, so wsBroker.broadcast() won't deliver updates."
    artifacts:
      - path: "packages/dashboard/src/hooks/use-ws.ts"
        issue: "Line 42: subscribe envelope uses channel 'devices' instead of 'system' with payload {channel:'devices'}"
    missing:
      - "Fix WS subscribe message in use-ws.ts to send {channel:'system', type:'subscribe', payload:{channel:'devices'}} instead of {channel:'devices', type:'subscribe', payload:null}"
---

# Phase 01: Foundation & Device Management Verification Report

**Phase Goal:** Developers can discover all connected simulators/emulators, manage device lifecycle, and the module system is ready to receive feature modules
**Verified:** 2026-02-26T01:22:32Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 6 workspace packages resolve via npm install | VERIFIED | `node_modules/@simvyn/` contains symlinks for types, core, server, dashboard, module-device-management. `packages/` has types, core, server, cli, dashboard, modules dirs. |
| 2 | TypeScript compiles across all packages with project references | VERIFIED | `npx tsc --build --dry` shows packages are up to date or would build cleanly. tsconfig.json has project references. |
| 3 | Device, Module, and WS types are importable from @simvyn/types | VERIFIED | `packages/types/src/index.ts` re-exports Device, PlatformAdapter, SimvynModule, WsEnvelope, ModuleStorage. Core, server, dashboard all import from @simvyn/types. |
| 4 | iOS adapter detects all available simulators with correct OS version parsing | VERIFIED | `packages/core/src/adapters/ios.ts` (130 lines) — parses `simctl list devices --json`, iterates all runtimes, maps state, parses OS version from runtime key, filters `isAvailable`. Returns `Device[]`. |
| 5 | Android adapter detects emulators and connected devices | VERIFIED | `packages/core/src/adapters/android.ts` (180 lines) — uses `emulator -list-avds` + `adb devices`, resolves AVD names, detects USB physical devices, merges booted + shutdown AVDs. |
| 6 | DeviceManager polls both adapters and emits unified sorted device list | VERIFIED | `packages/core/src/device-manager.ts` (89 lines) — polls adapters via Promise.all, sorts (booted first, then platform, then name), compares fingerprints, emits "devices-changed". |
| 7 | Process manager tracks spawned processes and cleans up on signals | VERIFIED | `packages/core/src/process-manager.ts` (52 lines) — Set<ChildProcess>, spawn/exec/cleanup, registers SIGINT/SIGTERM/exit handlers. |
| 8 | Storage creates ~/.simvyn/ and reads/writes namespaced JSON files | VERIFIED | `packages/core/src/storage.ts` (45 lines) — createModuleStorage with read/write/delete, atomic write (tmp + rename), ENOENT handling. |
| 9 | Fastify server starts and listens on configurable port | VERIFIED | `packages/server/src/app.ts` creates Fastify with WebSocket, static serving. `packages/server/src/start.ts` listens on configurable port/host. Health endpoint at /api/health. |
| 10 | WebSocket endpoint at /ws accepts connections and routes messages by channel | VERIFIED | `packages/server/src/ws-broker.ts` (130 lines) — fastify-plugin, /ws route, envelope parsing, system channel (ping/pong, subscribe/unsubscribe), channel handler dispatch, broadcast with subscription check. |
| 11 | Module loader discovers modules from filesystem and registers them as Fastify plugins | VERIFIED | `packages/server/src/module-loader.ts` (132 lines) — reads modulesDir, imports manifest.ts/.js, validates, registers with prefix `/api/modules/${name}`, GET /api/modules endpoint. |
| 12 | Dashboard renders with dark background and glass-panel layout shell | VERIFIED | `main.css` has oklch dark theme, glass-panel utility. `App.tsx` renders TopBar + Sidebar + ModuleShell. Vite config with proxy. Dashboard builds to dist/dashboard/. |
| 13 | Device selector dropdown shows connected devices from WebSocket | VERIFIED | `DeviceSelector.tsx` (111 lines) groups by platform, shows state indicator, OS version, broadcast mode toggle. Wired to device-store. |
| 14 | Module system proven: device management registers via manifest without core code changes | VERIFIED | `packages/modules/device-management/manifest.ts` exports SimvynModule. Module loader auto-discovers it. GET /api/modules returns it. No server source changes needed. |
| 15 | REST API exposes device lifecycle operations (boot, shutdown, erase, list, refresh) | VERIFIED | `packages/modules/device-management/routes.ts` (86 lines) — GET /list, POST /boot, /shutdown, /erase, /refresh. Uses fastify.deviceManager, proper error handling (404, 400, 500). |
| 16 | WebSocket devices channel broadcasts device list updates in real-time | FAILED | **Wiring bug:** Dashboard `use-ws.ts` line 42 sends `{channel:"devices", type:"subscribe", payload:null}` but ws-broker expects `{channel:"system", type:"subscribe", payload:{channel:"devices"}}`. Client never subscribes to "devices" channel, so broadcasts never arrive. Server-side ws-handler.ts correctly broadcasts on deviceManager "devices-changed" events, but no client will receive them. |
| 17 | CLI starts server, opens browser, and device subcommands work headlessly | VERIFIED | `packages/cli/src/index.ts` — Commander program with start (default), device subcommands. `device.ts` (162 lines) — list (table/JSON, platform filter), boot (with polling), shutdown, erase (iOS only with checks). Module CLI auto-discovery via getModuleCLIRegistrars. |

**Score:** 16/17 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Root monorepo with workspaces | VERIFIED | 6 workspaces including `packages/modules/*` |
| `packages/types/src/device.ts` | Unified device model | VERIFIED | Exports Device, DeviceState, Platform, PlatformAdapter, PlatformCapability (38 lines) |
| `packages/types/src/module.ts` | Module manifest interface | VERIFIED | Exports SimvynModule (11 lines) |
| `packages/types/src/ws.ts` | WebSocket envelope types | VERIFIED | Exports WsEnvelope, WsServerMessage, WsClientMessage, DeviceChannel (18 lines) |
| `packages/types/src/storage.ts` | Module storage interface | VERIFIED | Exports ModuleStorage (5 lines) |
| `packages/core/src/adapters/ios.ts` | iOS simulator adapter | VERIFIED | Exports createIosAdapter (130 lines), full implementation |
| `packages/core/src/adapters/android.ts` | Android emulator/device adapter | VERIFIED | Exports createAndroidAdapter (180 lines), full implementation |
| `packages/core/src/device-manager.ts` | Unified device polling manager | VERIFIED | Exports DeviceManager interface + createDeviceManager (89 lines) |
| `packages/core/src/process-manager.ts` | Child process lifecycle tracker | VERIFIED | Exports ProcessManager + createProcessManager (52 lines) |
| `packages/core/src/storage.ts` | Module-namespaced JSON persistence | VERIFIED | Exports createModuleStorage + getSimvynDir (45 lines) |
| `packages/server/src/app.ts` | Fastify app factory | VERIFIED | Exports createApp (128 lines), registers WS, static, decorators |
| `packages/server/src/module-loader.ts` | Module auto-discovery | VERIFIED | Exports loadModules (moduleLoaderPlugin) + getModuleCLIRegistrars (132 lines) |
| `packages/server/src/ws-broker.ts` | WebSocket envelope routing | VERIFIED | Exports wsBrokerPlugin + WsBroker interface (130 lines) |
| `packages/server/src/start.ts` | Server startup with dashboard serving | VERIFIED | Exports startServer (62 lines) |
| `packages/modules/device-management/manifest.ts` | Device module manifest | VERIFIED | Default export SimvynModule (126 lines), register + cli + capabilities |
| `packages/modules/device-management/routes.ts` | Device REST API routes | VERIFIED | 86 lines (min_lines: 40 pass), all CRUD endpoints |
| `packages/modules/device-management/ws-handler.ts` | Device WebSocket handler | VERIFIED | 27 lines (min_lines: 20 pass), registerChannel + broadcast on changes |
| `packages/dashboard/src/App.tsx` | Root layout | VERIFIED | 58 lines (min_lines: 30 pass), WsProvider + TopBar + Sidebar + ModuleShell |
| `packages/dashboard/src/components/DeviceSelector.tsx` | Device dropdown | VERIFIED | 111 lines (min_lines: 20 pass), platform grouping, broadcast mode |
| `packages/dashboard/src/hooks/use-ws.ts` | WebSocket connection hook | VERIFIED | 126 lines, exports useWs + useWsListener + WsProvider. Auto-reconnect. |
| `packages/dashboard/src/stores/device-store.ts` | Zustand device store | VERIFIED | Exports useDeviceStore (39 lines), devices/selection/broadcast |
| `packages/dashboard/src/stores/panel-registry.ts` | Module panel component registry | VERIFIED | Exports registerPanel + getPanel + usePanelRegistry (30 lines) |
| `packages/dashboard/src/panels/DevicePanel.tsx` | Device management dashboard panel | VERIFIED | 265 lines (min_lines: 60 pass), device cards, boot/shutdown/erase, loading states |
| `packages/cli/src/index.ts` | CLI entry point | VERIFIED | 35 lines (min_lines: 20 pass), Commander, module discovery |
| `packages/cli/src/commands/start.ts` | Server start command | VERIFIED | Exports registerStartCommand (21 lines) |
| `packages/cli/src/commands/device.ts` | Device management CLI | VERIFIED | Exports registerDeviceCommand (162 lines) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/core/package.json` | `@simvyn/types` | workspace dependency | WIRED | `"@simvyn/types": "*"` in dependencies |
| `packages/server/package.json` | `@simvyn/core` | workspace dependency | WIRED | `"@simvyn/core": "*"` in dependencies |
| `packages/core/src/adapters/ios.ts` | `@simvyn/types` | import Device, PlatformAdapter | WIRED | Line 3: `import type { Device, DeviceState, PlatformAdapter, PlatformCapability } from "@simvyn/types"` |
| `packages/core/src/device-manager.ts` | adapters | uses adapters to poll | WIRED | Accepts `PlatformAdapter[]`, calls `listDevices()` on each via Promise.all |
| `packages/server/src/app.ts` | `@fastify/websocket` | plugin registration | WIRED | Line 77: `await fastify.register(fastifyWebsocket)` |
| `packages/server/src/ws-broker.ts` | `@simvyn/types` | WsEnvelope type | WIRED | Line 2: `import type { WsEnvelope } from "@simvyn/types"` |
| `packages/server/src/module-loader.ts` | `@simvyn/types` | SimvynModule interface | WIRED | Line 6: `import type { SimvynModule, PlatformCapability } from "@simvyn/types"` |
| `packages/modules/device-management/routes.ts` | `fastify.deviceManager` | Fastify decorator | WIRED | Lines 7, 11, 21, 28, 43, 47, 62, 69, 83: `fastify.deviceManager.*` |
| `packages/modules/device-management/ws-handler.ts` | `fastify.wsBroker` | channel registration | WIRED | Lines 6, 8, 10, 16, 23: `wsBroker.registerChannel`, `wsBroker.send`, `wsBroker.broadcast` |
| `packages/dashboard/src/hooks/use-ws.ts` | WebSocket server | connection | WIRED | Line 37: `new WebSocket(url)` to `/ws` endpoint |
| `packages/dashboard/src/hooks/use-ws.ts` | WS subscription | subscribe to devices channel | **NOT_WIRED** | Line 42: Sends `{channel:"devices", type:"subscribe"}` — should be `{channel:"system", type:"subscribe", payload:{channel:"devices"}}` |
| `packages/dashboard/src/stores/device-store.ts` | use-ws | receives device-list messages | WIRED | App.tsx uses `useWsListener("devices", "device-list", handleDeviceList)` |
| `packages/dashboard/src/components/ModuleShell.tsx` | panel-registry | looks up panel by active module | WIRED | Line 3: `usePanelRegistry()`, Line 37: `registry.getPanel(mod.name)` |
| `packages/dashboard/src/panels/DevicePanel.tsx` | REST API | fetch for boot/shutdown/erase | WIRED | Line 37: `fetch(\`/api/modules/devices/${action}\`)` with POST |
| `packages/cli/src/index.ts` | commander | CLI framework | WIRED | Line 6: `import { Command } from "commander"`, Line 14: `new Command()` |
| `packages/cli/src/commands/start.ts` | `@simvyn/server` | createApp + listen | WIRED | Line 2: `import { startServer } from "@simvyn/server"` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| INFRA-01 | 01-01 | TypeScript monorepo with npm workspaces | SATISFIED | Root package.json with 6 workspaces, @simvyn/ scope, TypeScript project references |
| INFRA-02 | 01-03 | Module/plugin system with auto-discovery | SATISFIED | module-loader.ts discovers manifests, registers as Fastify plugins, GET /api/modules endpoint. Device module proves the architecture. |
| INFRA-03 | 01-03 | Fastify server with WebSocket support (multi-channel envelope-based multiplexing) | SATISFIED | app.ts creates Fastify with @fastify/websocket. ws-broker.ts routes WsEnvelope messages by channel with subscribe/unsubscribe. |
| INFRA-04 | 01-04 | React + Vite + Tailwind v4 web dashboard with lazy-loaded module panels | SATISFIED | Vite + React 19 + Tailwind v4 CSS-first config. ModuleShell lazy-loads panels via panel-registry. Dashboard builds to dist/dashboard/. |
| INFRA-05 | 01-06 | CLI entry point via commander.js | SATISFIED | cli/src/index.ts with Commander, `simvyn` starts server, subcommands for headless use. |
| INFRA-06 | 01-06 | Published as `simvyn` npm package | SATISFIED | cli/package.json: name "simvyn", bin field, keywords, engines, license. |
| INFRA-07 | 01-02 | State persistence in ~/.simvyn/ | SATISFIED | core/src/storage.ts creates ~/.simvyn/<module>/<key>.json with atomic writes. |
| INFRA-08 | 01-02 | Process lifecycle manager for safe child process spawning/cleanup | SATISFIED | core/src/process-manager.ts tracks Set<ChildProcess>, SIGINT/SIGTERM/exit cleanup. |
| INFRA-09 | 01-02 | Cross-platform support — macOS full, Linux Android-only graceful degradation | SATISFIED | ios.ts isAvailable() returns false if xcrun fails. createAvailableAdapters() filters to available only. platform.ts exports isMacOS/isLinux. |
| DEV-01 | 01-02 | Detect all iOS simulators via simctl list | SATISFIED | ios.ts parses all runtimes, filters isAvailable, maps state/osVersion/deviceType. |
| DEV-02 | 01-02 | Detect all Android emulators and connected devices | SATISFIED | android.ts uses emulator -list-avds + adb devices, resolves AVD names, detects USB devices. |
| DEV-03 | 01-01 | Unified device model across platforms | SATISFIED | types/src/device.ts: Device interface with id, name, platform, state, osVersion, deviceType, isAvailable. |
| DEV-04 | 01-02, 01-05 | Boot, shutdown, erase iOS simulators from dashboard and CLI | SATISFIED | ios.ts has boot/shutdown/erase. routes.ts POST endpoints. DevicePanel.tsx buttons. device.ts CLI commands. |
| DEV-05 | 01-02, 01-05 | Boot and kill Android emulators from dashboard and CLI | SATISFIED | android.ts has boot (spawn emulator + poll) and shutdown (adb emu kill). Routes and CLI wired. |
| DEV-06 | 01-02, 01-05 | Real-time device status updates via polling with configurable interval | PARTIALLY SATISFIED | Server-side: DeviceManager polls at configurable interval, ws-handler broadcasts on changes. **Dashboard-side: WS subscription message is malformed (sends to wrong channel), so real-time broadcasts won't reach the client.** REST fallback works on manual refresh. |
| DEV-07 | 01-04 | Device selector in UI with broadcast mode | SATISFIED | DeviceSelector.tsx with platform grouping, state indicators, "All devices" broadcast toggle. Zustand device-store. |
| DEV-08 | 01-02, 01-05 | Platform capability detection | SATISFIED | ios.ts/android.ts return capability arrays. GET /api/modules/devices/capabilities route. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/server/src/app.ts` | 44-66 | Stub DeviceManager/ProcessManager fallback (used when @simvyn/core import fails) | Info | Defensive coding for when core isn't available. Correctly falls through to real implementation. Not a blocker. |
| `packages/dashboard/src/hooks/use-ws.ts` | 42 | Wrong channel for WS subscribe message | Blocker | Breaks real-time device updates. Client never subscribes to "devices" channel via system channel. |

No TODO/FIXME/PLACEHOLDER/HACK patterns found anywhere in the codebase.

### Human Verification Required

### 1. Full Startup Flow
**Test:** Run `npx tsx packages/cli/src/index.ts` and verify browser opens with dashboard
**Expected:** Server starts on 3847, browser opens, dashboard shows dark theme with TopBar (simvyn logo, device selector, green connection dot), Sidebar with "devices" module, and device cards on clicking devices
**Why human:** Visual appearance, browser opening, end-to-end UX flow

### 2. Device Lifecycle from Dashboard
**Test:** Click Boot on a shutdown simulator, then Shutdown on it
**Expected:** Loading spinner shows during operation, device state badge updates, buttons change accordingly
**Why human:** Real-time UI behavior, visual state transitions, button interaction

### 3. Glass Panel Visual Design
**Test:** Inspect dashboard panels for frosted glass effect
**Expected:** Panels have backdrop blur, semi-transparent backgrounds, dark theme with muted accent colors
**Why human:** Visual design quality, glass effect rendering

### Gaps Summary

**1 gap found, blocking real-time device updates:**

The WebSocket subscription wiring between the dashboard and server has a protocol mismatch. The `use-ws.ts` hook sends `{channel: "devices", type: "subscribe", payload: null}` on connect, but the ws-broker expects subscription messages on the `system` channel: `{channel: "system", type: "subscribe", payload: {channel: "devices"}}`.

This means the client's subscription set never includes "devices", so `wsBroker.broadcast("devices", ...)` calls (triggered by DeviceManager's "devices-changed" events) never deliver to any connected dashboard client.

**Impact:** DEV-06 (real-time device status updates) is partially broken. The polling and REST endpoints work correctly on the server side. The dashboard receives initial data via REST fetch on mount, and manual refresh works. But automatic real-time updates (e.g., booting a device from CLI while dashboard is open) won't appear until the user manually refreshes.

**Fix:** Single line change in `packages/dashboard/src/hooks/use-ws.ts` line 42 — change `{ channel: "devices", type: "subscribe", payload: null }` to `{ channel: "system", type: "subscribe", payload: { channel: "devices" } }`.

---

_Verified: 2026-02-26T01:22:32Z_
_Verifier: Claude (gsd-verifier)_
