# Architecture Research

**Domain:** Local-first developer tool — Node.js server + React web dashboard + CLI with modular plugin system
**Researched:** 2026-02-26
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLI Layer (commander.js)                        │
│  `simvyn` command → starts server OR runs headless module subcommands   │
├─────────────────────────────────────────────────────────────────────────┤
│                          Server Layer (Fastify)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐ │
│  │ @fastify/     │  │ @fastify/     │  │ Module Registry                │ │
│  │ static        │  │ websocket     │  │ (auto-discovers & registers    │ │
│  │ (Vite build)  │  │ (ws@8)        │  │  all modules at startup)       │ │
│  └──────────────┘  └──────────────┘  └────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    Per-Module Server Plugins                        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │ Location │ │ DevMgmt  │ │ Logs     │ │ Files    │ │ Push     │ │ │
│  │  │ routes   │ │ routes   │ │ routes   │ │ routes   │ │ routes   │ │ │
│  │  │ ws hdlrs │ │ ws hdlrs │ │ ws hdlrs │ │ ws hdlrs │ │ ws hdlrs │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                      Platform Adapter Layer                              │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ iOS Adapter (xcrun simctl)      │  │ Android Adapter (adb)        │  │
│  │ macOS only, graceful degrade    │  │ macOS / Linux / Windows      │  │
│  └─────────────────────────────────┘  └──────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                      Shared Core Layer                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐   │
│  │ Types    │  │ Storage  │  │ Device   │  │ WebSocket Protocol    │   │
│  │ package  │  │ (JSON    │  │ Manager  │  │ (discriminated unions │   │
│  │          │  │  ~/.sim  │  │ (polling │  │  ClientMsg/ServerMsg) │   │
│  │          │  │  vyn/)   │  │  + cache)│  │                       │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (React + Vite + Tailwind)              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Shell: Top Bar (device selector) + Sidebar (module list)          │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │                    Per-Module UI Panels                            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │ │
│  │  │ Location │ │ DevMgmt  │ │ Logs     │ │ Files    │  ...        │ │
│  │  │ Panel    │ │ Panel    │ │ Panel    │ │ Panel    │             │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │ Shared: Zustand stores, WS client, UI components (glass design)  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **CLI Entry** | Parse args, start server or dispatch to module subcommand | commander.js program with `.command()` per module |
| **Fastify Server** | HTTP routing, WebSocket upgrade, static file serving, plugin lifecycle | Fastify v5 instance with `register()` per module |
| **Module Registry** | Discover modules, validate manifests, register server + CLI + UI pieces | Glob `modules/*/index.ts`, call `register(fastify, opts)` |
| **Per-Module Server Plugin** | Own HTTP routes + WS message handlers for one feature | Fastify plugin with prefix, e.g., `/api/location/*` |
| **Platform Adapters** | Abstract `xcrun simctl` / `adb` behind unified interface | Factory functions returning `PlatformAdapter` objects |
| **Device Manager** | Poll adapters, cache device list, broadcast status changes | Singleton service, interval-based polling, emits events |
| **Storage** | Persist module state, user preferences, favorites | JSON files in `~/.simvyn/`, one file per module |
| **WebSocket Protocol** | Typed message passing between server and dashboard | Discriminated union types, single WS connection multiplexed by module namespace |
| **Web Dashboard Shell** | Layout, routing between modules, device selector, theme | React app with sidebar + topbar + content area |
| **Per-Module UI Panel** | Feature-specific UI rendered in content area | React component + Zustand store, lazy-loaded |
| **Shared Types** | TypeScript interfaces shared between server + client | Workspace package `@simvyn/types` |

## Recommended Project Structure

```
simvyn/
├── package.json                    # root workspace config
├── tsconfig.base.json              # shared TS config
├── packages/
│   ├── types/                      # @simvyn/types — shared interfaces
│   │   ├── package.json
│   │   └── src/
│   │       ├── device.ts           # Device, DeviceState, Platform
│   │       ├── protocol.ts         # ClientMessage, ServerMessage unions
│   │       └── module.ts           # ModuleManifest, ModuleServerPlugin types
│   │
│   ├── core/                       # @simvyn/core — shared server utilities
│   │   ├── package.json
│   │   └── src/
│   │       ├── adapters/
│   │       │   ├── types.ts        # PlatformAdapter interface
│   │       │   ├── ios.ts          # createIosAdapter()
│   │       │   └── android.ts      # createAndroidAdapter()
│   │       ├── device-manager.ts   # polling, caching, event emission
│   │       ├── storage.ts          # JSON file persistence
│   │       └── process.ts          # child_process helpers for simctl/adb
│   │
│   ├── server/                     # @simvyn/server — Fastify app
│   │   ├── package.json
│   │   └── src/
│   │       ├── app.ts              # createApp() — Fastify instance setup
│   │       ├── module-loader.ts    # auto-discover + register module plugins
│   │       ├── ws-broker.ts        # WebSocket message router (namespace → handler)
│   │       └── plugins/
│   │           ├── static.ts       # @fastify/static for Vite build
│   │           └── websocket.ts    # @fastify/websocket setup
│   │
│   ├── cli/                        # @simvyn/cli — commander.js entry
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts            # CLI entry point, `simvyn` bin
│   │       └── module-commands.ts  # auto-register subcommands from modules
│   │
│   ├── dashboard/                  # @simvyn/dashboard — React + Vite app
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx             # shell layout
│   │       ├── stores/
│   │       │   ├── device-store.ts # global device state
│   │       │   └── ws-store.ts     # WebSocket connection + message dispatch
│   │       ├── components/
│   │       │   ├── shell/          # TopBar, Sidebar, ModuleContainer
│   │       │   └── ui/             # shared glass-design primitives
│   │       └── modules/            # UI panels (lazy-loaded)
│   │           ├── location/
│   │           ├── device-mgmt/
│   │           ├── logs/
│   │           └── ...
│   │
│   └── modules/                    # feature modules (each is self-contained)
│       ├── location/               # @simvyn/module-location
│       │   ├── package.json
│       │   └── src/
│       │       ├── index.ts        # module manifest + exports
│       │       ├── server.ts       # Fastify plugin (routes + WS handlers)
│       │       ├── cli.ts          # commander subcommand definition
│       │       └── types.ts        # module-specific message types
│       ├── device-mgmt/
│       ├── logs/
│       ├── files/
│       ├── push-notifications/
│       ├── deep-links/
│       ├── screenshots/
│       ├── device-settings/
│       ├── performance/
│       ├── accessibility/
│       ├── crash-reports/
│       ├── app-mgmt/
│       ├── user-defaults/
│       ├── media/
│       ├── clipboard/
│       ├── network/
│       └── database/
```

### Structure Rationale

- **`packages/types/`:** Shared TypeScript interfaces consumed by every other package. Zero runtime dependencies. Changes here ripple everywhere, so keep it minimal and stable.
- **`packages/core/`:** Platform adapters and device management logic shared between server and CLI. The only package that spawns child processes (simctl/adb).
- **`packages/server/`:** Fastify app construction and module plugin loading. Thin orchestration layer — the real logic lives in modules.
- **`packages/cli/`:** Entry point only. Delegates to server for `simvyn` (start dashboard) and to module CLI exports for subcommands like `simvyn location set 37.78 -122.41`.
- **`packages/dashboard/`:** React SPA. Module UI panels live inside `src/modules/` for co-location, but are lazy-loaded. The dashboard imports module manifests to build the sidebar dynamically.
- **`packages/modules/*/`:** Each module is a self-contained package exporting a server plugin, CLI subcommand, and type definitions. The dashboard's corresponding UI panel lives in `packages/dashboard/src/modules/` (not in the module package) because the dashboard builds as a single Vite bundle — you don't want to import server-side code into the browser build.

## Architectural Patterns

### Pattern 1: Module Manifest Contract

**What:** Every module exports a manifest object that describes its capabilities. The server, CLI, and dashboard all read this manifest to auto-register the module's contributions.
**When to use:** Every module, always. This is the core extensibility contract.
**Trade-offs:** Slightly more boilerplate per module, but enables auto-discovery and prevents the "register everything manually" problem at scale with 16+ modules.

**Example:**
```typescript
// packages/modules/location/src/index.ts
import type { ModuleManifest } from '@simvyn/types'
import { serverPlugin } from './server.js'
import { cliCommand } from './cli.js'

export const manifest: ModuleManifest = {
  id: 'location',
  name: 'Location',
  icon: 'map-pin',           // lucide icon name
  description: 'Mock GPS coordinates and simulate routes',
  serverPlugin,              // Fastify plugin function
  cliCommand,                // commander Command factory
  wsNamespace: 'location',   // WS messages prefixed with this
}
```

```typescript
// packages/types/src/module.ts
import type { FastifyPluginAsync } from 'fastify'
import type { Command } from 'commander'

export interface ModuleManifest {
  id: string
  name: string
  icon: string
  description: string
  serverPlugin: FastifyPluginAsync
  cliCommand?: (program: Command) => void
  wsNamespace: string
}
```

### Pattern 2: Namespaced WebSocket Multiplexing

**What:** A single WebSocket connection carries messages for all modules. Each message includes a `module` field that the WS broker uses to dispatch to the correct module handler. This avoids N WebSocket connections for N modules.
**When to use:** Always. The dashboard opens one WS connection; all modules share it.
**Trade-offs:** Slightly more complex message routing than per-module WS endpoints, but dramatically simpler client-side management and lower overhead.

**Example:**
```typescript
// Shared protocol (packages/types/src/protocol.ts)
export interface WsEnvelope {
  module: string      // e.g., 'location', 'logs', 'device-mgmt'
  type: string        // module-specific message type
  payload: unknown    // module-specific payload
}

// Module defines its own message types
// packages/modules/location/src/types.ts
export type LocationClientMsg =
  | { type: 'set-location'; lat: number; lon: number; deviceIds?: string[] }
  | { type: 'clear-location'; deviceIds?: string[] }
  | { type: 'start-playback'; waypoints: [number, number][]; speedMs: number; loop: boolean }
  | { type: 'stop-playback' }

export type LocationServerMsg =
  | { type: 'location-set'; lat: number; lon: number; results: DeviceResult[] }
  | { type: 'location-cleared'; results: DeviceResult[] }
  | { type: 'playback-position'; lat: number; lon: number; progress: number }
  | { type: 'playback-stopped' }
```

```typescript
// Server-side WS broker (packages/server/src/ws-broker.ts)
import type { WebSocket } from 'ws'
import type { WsEnvelope } from '@simvyn/types'

type WsHandler = (ws: WebSocket, msg: { type: string; payload: unknown }) => void

export function createWsBroker() {
  const handlers = new Map<string, WsHandler>()

  return {
    register(namespace: string, handler: WsHandler) {
      handlers.set(namespace, handler)
    },

    dispatch(ws: WebSocket, raw: string) {
      const envelope: WsEnvelope = JSON.parse(raw)
      const handler = handlers.get(envelope.module)
      if (handler) {
        handler(ws, { type: envelope.type, payload: envelope.payload })
      }
    },
  }
}
```

### Pattern 3: Fastify Plugin Encapsulation Per Module

**What:** Each module's server-side code is a Fastify plugin registered with a route prefix. Fastify's encapsulation ensures modules can't interfere with each other's decorators or hooks.
**When to use:** Every module's server plugin.
**Trade-offs:** Fastify's encapsulation is a strength here — it prevents module A from accidentally breaking module B. The only downside is that shared decorators (like device manager access) must be registered at the root level using `fastify-plugin` to bubble up.

**Example:**
```typescript
// packages/modules/location/src/server.ts
import type { FastifyPluginAsync } from 'fastify'

export const serverPlugin: FastifyPluginAsync = async (fastify, opts) => {
  // Routes are auto-prefixed: /api/location/...
  fastify.get('/favorites', async (req, reply) => {
    const storage = fastify.storage  // decorated at root level
    return storage.read('location', 'favorites')
  })

  fastify.post('/favorites', async (req, reply) => {
    const storage = fastify.storage
    const body = req.body as { name: string; lat: number; lon: number }
    return storage.write('location', 'favorites', body)
  })
}

// Registration in module loader:
// fastify.register(module.serverPlugin, { prefix: `/api/${module.id}` })
```

### Pattern 4: Lazy-Loaded Module UI Panels

**What:** Each module's React panel is code-split via `React.lazy()` and only loaded when the user navigates to that module. This keeps initial bundle small despite 16+ modules.
**When to use:** Every module UI panel in the dashboard.
**Trade-offs:** Slight loading delay on first navigation to a module (mitigate with skeleton/spinner). Worth it — a monolithic bundle with 16+ feature panels would be enormous.

**Example:**
```typescript
// packages/dashboard/src/modules/index.ts
import { lazy } from 'react'

export const moduleUIs: Record<string, React.LazyExoticComponent<any>> = {
  location: lazy(() => import('./location/LocationPanel.js')),
  'device-mgmt': lazy(() => import('./device-mgmt/DeviceMgmtPanel.js')),
  logs: lazy(() => import('./logs/LogsPanel.js')),
  // ...
}
```

```typescript
// packages/dashboard/src/components/shell/ModuleContainer.tsx
import { Suspense } from 'react'
import { moduleUIs } from '../../modules/index.js'
import { useModuleStore } from '../../stores/module-store.js'
import { ModuleSkeleton } from '../ui/ModuleSkeleton.js'

export function ModuleContainer() {
  const activeModule = useModuleStore(s => s.activeModule)
  const Panel = moduleUIs[activeModule]

  if (!Panel) return <div>Module not found</div>

  return (
    <Suspense fallback={<ModuleSkeleton />}>
      <Panel />
    </Suspense>
  )
}
```

### Pattern 5: Device Manager as Shared Service

**What:** A singleton DeviceManager polls platform adapters at an interval, caches the device list, and emits events when devices appear/disappear/change state. Both the server (to broadcast device updates via WS) and modules (to target specific devices) consume it.
**When to use:** Core infrastructure — built once, used everywhere.
**Trade-offs:** Polling adds slight CPU overhead, but simctl/adb have no push-based notification mechanism, so polling is the only option. Keep interval reasonable (2-5s).

**Example:**
```typescript
// packages/core/src/device-manager.ts
import { EventEmitter } from 'node:events'
import type { Device, PlatformAdapter } from '@simvyn/types'

export function createDeviceManager(adapters: PlatformAdapter[], pollIntervalMs = 3000) {
  const emitter = new EventEmitter()
  let devices: Device[] = []
  let timer: ReturnType<typeof setInterval> | null = null

  async function poll() {
    const next: Device[] = []
    for (const adapter of adapters) {
      if (await adapter.isAvailable()) {
        next.push(...await adapter.listDevices())
      }
    }
    const changed = JSON.stringify(next) !== JSON.stringify(devices)
    devices = next
    if (changed) emitter.emit('devices', devices)
  }

  return {
    start() {
      poll() // immediate first poll
      timer = setInterval(poll, pollIntervalMs)
    },
    stop() {
      if (timer) clearInterval(timer)
    },
    getDevices(): Device[] { return devices },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
  }
}
```

## Data Flow

### Request Flow (HTTP)

```
[Dashboard UI]
    │ fetch('/api/location/favorites')
    ↓
[Fastify Router] → matches /api/location/* prefix
    ↓
[Location Module Plugin] → handler executes
    ↓
[Storage Service] → reads ~/.simvyn/location/favorites.json
    ↓
[JSON Response] ← returns to dashboard
```

### WebSocket Message Flow

```
[Dashboard UI]
    │ ws.send({ module: 'location', type: 'set-location', payload: { lat, lon } })
    ↓
[Single WebSocket Connection]
    ↓
[@fastify/websocket route handler at /ws]
    ↓
[WS Broker] → reads `module` field → dispatches to location handler
    ↓
[Location WS Handler]
    │ → calls DeviceManager.getDevices()
    │ → calls adapter.setLocation() for each targeted device
    ↓
[Broadcast to all connected clients]
    │ ws.send({ module: 'location', type: 'location-set', payload: { results } })
    ↓
[Dashboard ws-store] → routes by `module` to location Zustand store
    ↓
[Location Zustand Store] → updates state → React re-renders
```

### Device Status Flow

```
[DeviceManager] (polls every 3s)
    │ calls iosAdapter.listDevices() + androidAdapter.listDevices()
    ↓
[Device list changed?]
    │ YES → emits 'devices' event
    ↓
[Server WS broadcast hook]
    │ sends { module: 'system', type: 'device-list', payload: devices }
    ↓
[Dashboard device-store] → updates global device state
    ↓
[TopBar DeviceSelector] re-renders with new device list
[All module panels] react to device changes via shared store
```

### State Management

```
[Zustand Stores] (one per module + shared global stores)
    │
    ├── device-store (global — selected devices, device list)
    ├── ws-store (global — WS connection, message dispatch)
    ├── module-store (global — which module is active)
    ├── theme-store (global — dark mode, accent color)
    │
    ├── location-store (module — current location, playback state)
    ├── logs-store (module — log entries, filters, search)
    ├── files-store (module — file tree, selected file)
    └── ... (one per module)

Access patterns:
  React components → useStore(selector)      // reactive subscriptions
  WS message handlers → store.getState()     // imperative reads
  Module-to-module → import shared stores     // cross-module data
```

### Key Data Flows

1. **Module discovery at startup:** CLI loads all `packages/modules/*/src/index.ts` → reads manifests → registers Fastify plugins with prefixes → registers CLI subcommands → server starts
2. **Dashboard initialization:** Browser loads SPA → opens single WS connection → sends `{ module: 'system', type: 'init' }` → server responds with module list + device list → dashboard builds sidebar from manifests, pre-selects first module
3. **Device command execution:** User clicks "Set Location" → location store dispatches WS message → broker routes to location handler → handler calls adapter → adapter spawns `simctl location set` → result broadcast back → UI updates

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 modules (early) | Monolithic structure fine, can skip workspace packages initially. Single `src/` with module folders. |
| 5-16 modules (target) | Full workspace structure needed. Module isolation prevents one module's changes from breaking others. Lazy-loading essential for dashboard performance. |
| 16+ modules (future) | Consider extracting module packages to separate repos if independent teams contribute. The manifest contract makes this possible without changing the core. |

### Scaling Priorities

1. **First bottleneck: Dashboard bundle size.** With 16+ modules each having rich UI panels, the JS bundle grows fast. Lazy-loading via `React.lazy()` is non-negotiable from day one.
2. **Second bottleneck: WebSocket message volume.** Log streaming and performance monitoring can generate hundreds of messages/second. Use per-module subscription opt-in — only send messages for modules the user has opened. Don't broadcast log stream to all clients if nobody's viewing the Logs panel.
3. **Third bottleneck: Device polling overhead.** 16 modules all calling `listDevices()` independently would hammer simctl/adb. The DeviceManager singleton with shared polling solves this — poll once, distribute to all consumers.

## Anti-Patterns

### Anti-Pattern 1: Per-Module WebSocket Connections

**What people do:** Each module opens its own WebSocket endpoint (`/ws/location`, `/ws/logs`, etc.).
**Why it's wrong:** With 16+ modules, the dashboard opens 16+ WS connections. Browsers cap concurrent connections per origin (typically 6 for HTTP/1.1, unlimited for WS but still wasteful). More importantly, the dashboard needs ONE place to manage connection lifecycle (reconnect, auth, heartbeat).
**Do this instead:** Single WS connection with envelope-based multiplexing. One connection, one reconnect handler, messages routed by namespace.

### Anti-Pattern 2: Module UI Inside Module Server Package

**What people do:** Co-locate React components inside the same package as the Fastify server plugin (`packages/modules/location/src/LocationPanel.tsx` next to `server.ts`).
**Why it's wrong:** The dashboard builds as a single Vite bundle. If a module's UI imports from a package that also exports server code, Vite will try to bundle Node.js APIs (`child_process`, `fs`) into the browser bundle. You'll fight bundler errors constantly.
**Do this instead:** Module UI panels live in `packages/dashboard/src/modules/`. Module packages export only server + CLI + types. The "link" is the module ID string matching in both places.

### Anti-Pattern 3: Direct Adapter Calls from Modules

**What people do:** Each module directly imports and calls `createIosAdapter()` and `createAndroidAdapter()`.
**Why it's wrong:** Every module creates its own adapter instances, each spawning their own child processes. No shared device cache, no coordinated polling, duplicate work.
**Do this instead:** DeviceManager is a singleton created at startup and made available to modules via Fastify's `decorate` API. Modules call `fastify.deviceManager.getDevices()`, never instantiate adapters themselves.

### Anti-Pattern 4: Monolithic WebSocket Handler

**What people do:** One giant `switch` statement in the WS handler that grows with every module (like sim-location's current `ws.ts` — fine for one module, disastrous for 16+).
**Why it's wrong:** A single file handling all 16+ modules' message types becomes unmaintainable. Every module change touches the same file. No encapsulation.
**Do this instead:** WS broker with per-module handler registration. Each module registers its own handler for its namespace. The broker dispatches, modules handle.

### Anti-Pattern 5: God Store on the Frontend

**What people do:** One giant Zustand store with all application state for all modules.
**Why it's wrong:** Every state update triggers subscriber checks across all modules. Module state shapes conflict. Impossible to code-split.
**Do this instead:** Small, focused stores. Global stores for truly global state (devices, WS connection, active module). Per-module stores for module-specific state. Modules can import shared global stores but never each other's stores.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `xcrun simctl` | Child process via `execFile` in iOS adapter | macOS-only. Graceful degradation: adapter's `isAvailable()` returns false on non-macOS. JSON output parsing (`simctl list -j`). |
| `adb` | Child process via `execFile` in Android adapter | Cross-platform. Must handle ADB server not running (`adb start-server`). Multiple device selection via `-s <serial>`. |
| Vite dev server | In development: Vite middleware or proxy. In production: `@fastify/static` serves built files. | During dev, run Vite dev server separately on port 5173, Fastify proxies to it or dashboard connects directly. |
| File system (`~/.simvyn/`) | Direct `fs` read/write through Storage service | One JSON file per module per data type. Atomic writes (write to temp file, rename). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI → Server | `start` subcommand creates Fastify app + binds to port | CLI owns process lifecycle (SIGINT, SIGTERM). Server is embedded, not a separate process. |
| CLI → Module (headless) | CLI imports module's `cliCommand` directly | For `simvyn location set 37.78 -122.41`, CLI creates adapters and calls module logic directly, no server needed. |
| Server → Module Plugins | `fastify.register(plugin, { prefix })` | Fastify plugin encapsulation. Module gets scoped Fastify instance. |
| Server → DeviceManager | Fastify `decorate('deviceManager', dm)` | Modules access via `fastify.deviceManager`. Shared singleton. |
| Server → WS Broker | WS route handler calls `broker.dispatch()` | Central dispatch. Modules register handlers at startup. |
| Dashboard → Server (HTTP) | `fetch('/api/{moduleId}/...')` | Standard REST for CRUD operations. |
| Dashboard → Server (WS) | Single WS at `/ws`, envelope protocol | Real-time: device updates, log streams, playback positions. |
| Dashboard → Module UI | `React.lazy()` dynamic import | Code-split. Dashboard knows module IDs from manifest list (fetched at init or bundled). |

## Build Order Dependencies

The following order reflects actual dependency chains — each layer depends on the ones above it:

```
1. @simvyn/types          ← no dependencies, build first
       ↓
2. @simvyn/core           ← depends on types
       ↓
3. @simvyn/modules/*      ← depends on types + core
       ↓
4. @simvyn/server          ← depends on types + core + modules (loads them)
       ↓
5. @simvyn/cli             ← depends on server + modules
       ↓
6. @simvyn/dashboard       ← depends on types (for protocol), independent of server at build time
```

**Key implication for phased development:**
- Phase 1 must deliver `types` + `core` + `server` (shell with no modules) + `dashboard` (shell with no module panels) + `cli` (start command only)
- Phase 2 can then add the first module (location) by filling in `modules/location` + `dashboard/src/modules/location/`
- Subsequent phases add more modules independently — each module is self-contained once the infrastructure exists

## Sources

- Fastify v5.7.x Plugin Documentation — https://fastify.dev/docs/latest/Reference/Plugins/ (HIGH confidence, official docs)
- Fastify Encapsulation Reference — https://fastify.dev/docs/latest/Reference/Encapsulation/ (HIGH confidence, official docs)
- Fastify Getting Started / Plugin Loading Order — https://fastify.dev/docs/latest/Guides/Getting-Started/ (HIGH confidence, official docs)
- @fastify/websocket (v11.2.0) — https://github.com/fastify/fastify-websocket (HIGH confidence, official repo)
- @fastify/static (v9.0.0) — https://github.com/fastify/fastify-static (HIGH confidence, official repo)
- npm Workspaces documentation — https://docs.npmjs.com/cli/v10/using-npm/workspaces (HIGH confidence, official docs)
- sim-location reference implementation — `/Users/pranshu/github/sim-location/` (HIGH confidence, existing codebase)
- Discriminated union WS protocol pattern — from sim-location `ws.ts` (HIGH confidence, proven pattern)
- Module manifest pattern — synthesized from Fastify plugin system + Flipper plugin architecture (MEDIUM confidence, architectural synthesis)

---
*Architecture research for: Simvyn — modular local developer tool with web dashboard*
*Researched: 2026-02-26*
