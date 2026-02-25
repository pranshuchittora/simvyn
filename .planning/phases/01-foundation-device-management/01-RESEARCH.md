# Phase 1: Foundation & Device Management - Research

**Researched:** 2026-02-26
**Domain:** TypeScript monorepo, Fastify server, module system, device management (simctl/adb)
**Confidence:** HIGH

## Summary

This phase builds the entire foundation for simvyn: a TypeScript monorepo with npm workspaces, a Fastify 5 server with WebSocket support, a module/plugin auto-discovery system, a CLI via commander.js, a React+Vite+Tailwind v4 dashboard shell, and complete iOS/Android device management. The existing `sim-location` project at `/Users/pranshu/github/sim-location` provides proven patterns for device adapters, WebSocket protocols, storage, and process lifecycle that can be directly evolved.

Fastify 5.7.4's encapsulation model is an excellent fit for the module system — each simvyn module becomes a Fastify plugin registered with `prefix`, getting its own encapsulated scope for routes, hooks, and decorators. The `@fastify/websocket` plugin (v11.2.0) supports per-route WebSocket handlers built on `ws@8`, which can be combined with an envelope-based multiplexing layer. npm workspaces handle the monorepo with zero extra tooling — the dependency graph flows `types → core → modules → server → cli`, with `dashboard` independent.

The device management layer should evolve sim-location's `PlatformAdapter` pattern into a richer model supporting device lifecycle (boot/shutdown/erase), not just location operations. The simctl JSON output has been verified on this machine — it includes `udid`, `name`, `state`, `isAvailable`, `deviceTypeIdentifier`, and runtime keys that encode OS version. Android emulators are available via `emulator -list-avds` and `adb devices`.

**Primary recommendation:** Build the monorepo skeleton first, then Fastify server with `@fastify/websocket`, then the module registry system using Fastify's native plugin encapsulation, then device adapters evolved from sim-location patterns, then CLI and dashboard shell.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | TypeScript monorepo with npm workspaces — shared types, core, server, dashboard, CLI packages | npm workspaces documented; dependency graph: types → core → server → cli, dashboard independent |
| INFRA-02 | Module/plugin system with auto-discovery — each module registers routes, WS handlers, CLI commands, and UI panel | Fastify 5 encapsulation + `register()` with prefix; auto-discovery via filesystem glob of module directories |
| INFRA-03 | Fastify server with WebSocket support (multi-channel envelope-based multiplexing) | Fastify 5.7.4 + @fastify/websocket 11.2.0; envelope pattern wraps channel/module in message frame |
| INFRA-04 | React + Vite + Tailwind v4 web dashboard with lazy-loaded module panels | React 19.2.4 + Vite 7.3.1 + Tailwind 4.2.1; lazy loading via React.lazy + Suspense |
| INFRA-05 | CLI entry point via commander.js — `simvyn` starts server + opens dashboard, subcommands for headless use | commander 14.0.3; sim-location CLI pattern proven |
| INFRA-06 | Published as `simvyn` npm package, invocable via `npx simvyn` | Package `bin` field + `files` field for dist; monorepo publishes CLI package only |
| INFRA-07 | State persistence in `~/.simvyn/` for module state, device preferences, favorites | sim-location's `createStorage()` pattern with JSON file read/write, evolved to namespace per module |
| INFRA-08 | Process lifecycle manager for safe child process spawning/cleanup (simctl, adb calls) | `node:child_process` execFile/spawn with cleanup on SIGINT/SIGTERM; sim-location patterns proven |
| INFRA-09 | Cross-platform support — macOS (full iOS+Android), Linux (Android-only, graceful degradation) | Adapter `isAvailable()` pattern from sim-location; skip iOS adapter registration when simctl unavailable |
| DEV-01 | Detect all iOS simulators via `simctl list devices --json` | Verified: JSON output has `devices` keyed by runtime, each with udid/name/state/isAvailable/deviceTypeIdentifier |
| DEV-02 | Detect all Android emulators via `emulator -list-avds` and `adb devices` | Verified: `emulator -list-avds` returns one AVD name per line; `adb devices` returns tab-separated serial+status |
| DEV-03 | Unified device model across iOS and Android platforms | sim-location's `Device` interface (id, name, platform, state) extended with osVersion, deviceType, capabilities |
| DEV-04 | Boot, shutdown, and erase iOS simulators from dashboard and CLI | `simctl boot <udid>`, `simctl shutdown <udid>`, `simctl erase <udid>` — verified in simctl help |
| DEV-05 | Boot and kill Android emulators from dashboard and CLI | `emulator @<avd_name>` to boot (spawns process), `adb -s <serial> emu kill` to stop |
| DEV-06 | Real-time device status updates via polling with configurable interval | Timer-based polling calling listDevices(), broadcasting diffs over WebSocket |
| DEV-07 | Device selector in UI — pick a single device or target all (broadcast mode) | sim-location's Zustand `useDeviceStore` pattern with selectedDeviceIds + broadcastMode |
| DEV-08 | Platform capability detection — report which features are available per device type | Per-adapter capability flags (e.g., canSetLocation, canPush, canScreenshot) based on platform |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.7.4 | HTTP server framework | Plugin encapsulation maps directly to module system; built-in schema validation, logging via pino |
| @fastify/websocket | 11.2.0 | WebSocket support for Fastify | Official plugin, built on ws@8, per-route WS handlers, integrates with Fastify hooks/lifecycle |
| @fastify/static | 9.0.0 | Serve dashboard build artifacts | Official plugin for serving static files from Fastify, production dashboard serving |
| commander | 14.0.3 | CLI framework | Already used by sim-location; lightweight, excellent TypeScript support, subcommand pattern |
| react | 19.2.4 | Dashboard UI library | Already used by sim-location; standard for complex UIs |
| vite | 7.3.1 | Dashboard build tool + dev server | Already used by sim-location; fast HMR, proxy support for WS during development |
| tailwindcss | 4.2.1 | CSS utility framework | Tailwind v4 uses CSS-first config, no PostCSS plugin required, lighter setup |
| zustand | 5.0.11 | Client state management | Already used by sim-location; minimal API, works with React hooks + imperative getState() |
| typescript | 5.9.3 | Type system | Project-wide type safety, monorepo with project references |
| open | 11.0.0 | Open browser from CLI | Already used by sim-location; cross-platform URL opening |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| fastify-plugin | 5.0.0 | Break Fastify encapsulation boundaries | For core decorators/hooks that must be visible across all plugins |
| @vitejs/plugin-react | 5.1.4 | Vite React integration | Required for JSX transform in dashboard |
| ws | 8.x | WebSocket client (for tests and potentially CLI) | Comes as dependency of @fastify/websocket; use for client-side WS in Node |
| pino | 9.x / 10.x | Logging | Comes as dependency of Fastify; use directly in core/adapters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fastify 5 | Express | Express lacks built-in plugin encapsulation, schema validation, and would require more glue code for module system |
| npm workspaces | turborepo/nx | Overkill for this project size; npm workspaces are zero-config and sufficient |
| Tailwind v4 | Hand-written CSS | sim-location's 1200-line single CSS file proves hand-rolled doesn't scale for 16+ modules |
| Zustand | Redux / Jotai | Zustand is simpler, already proven in sim-location, dual access pattern (hooks + getState) |
| commander | yargs | Commander is more explicit, better TypeScript support, already proven in sim-location |

**Installation (root):**
```bash
# Core server packages (packages/server)
npm install fastify @fastify/websocket @fastify/static fastify-plugin

# CLI packages (packages/cli)
npm install commander open

# Dashboard dev dependencies (packages/dashboard)
npm install react react-dom zustand
npm install -D vite @vitejs/plugin-react tailwindcss @types/react @types/react-dom

# Dev dependencies (root)
npm install -D typescript @biomejs/biome
```

## Architecture Patterns

### Recommended Monorepo Structure
```
simvyn/
├── package.json                    # Root: workspaces config, dev scripts
├── tsconfig.json                   # Root: base TS config
├── packages/
│   ├── types/                      # @simvyn/types — shared interfaces
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── device.ts           # Device, DeviceState, Platform types
│   │       ├── module.ts           # SimvynModule interface
│   │       ├── ws.ts               # WebSocket envelope types
│   │       └── index.ts
│   ├── core/                       # @simvyn/core — adapters, process manager, storage
│   │   ├── package.json            # depends on @simvyn/types
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── adapters/
│   │       │   ├── types.ts
│   │       │   ├── ios.ts
│   │       │   ├── android.ts
│   │       │   └── index.ts
│   │       ├── process-manager.ts  # Child process lifecycle
│   │       ├── storage.ts          # ~/.simvyn/ JSON persistence
│   │       ├── device-manager.ts   # Polling, unified device list
│   │       └── index.ts
│   ├── server/                     # @simvyn/server — Fastify app, module loader
│   │   ├── package.json            # depends on @simvyn/core, @simvyn/types
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts              # Fastify instance creation
│   │       ├── module-loader.ts    # Auto-discover and register modules
│   │       ├── ws-envelope.ts      # WebSocket multiplexing layer
│   │       ├── routes/
│   │       │   └── devices.ts      # Device management REST routes
│   │       └── index.ts
│   ├── modules/                    # Feature modules (Phase 2+)
│   │   └── device-management/      # Built-in device module
│   │       └── manifest.ts
│   ├── cli/                        # @simvyn/cli — entry point
│   │   ├── package.json            # depends on @simvyn/server, commander, open
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # CLI entry, `simvyn` command
│   │       └── commands/
│   │           └── device.ts       # `simvyn device` subcommands
│   └── dashboard/                  # @simvyn/dashboard — React SPA
│       ├── package.json            # depends on @simvyn/types (types only)
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── stores/
│           │   └── device-store.ts
│           ├── components/
│           │   ├── DeviceSelector.tsx
│           │   └── ModuleShell.tsx
│           └── hooks/
│               └── use-ws.ts
```

### Pattern 1: Fastify Plugin Encapsulation for Modules
**What:** Each simvyn module is a Fastify plugin registered with a prefix. Fastify's encapsulation ensures modules can't interfere with each other.
**When to use:** Every feature module (location, logs, screenshots, etc.)
**Example:**
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Encapsulation/
// Module manifest interface
interface SimvynModule {
  name: string;
  version: string;
  register: (fastify: FastifyInstance, opts: ModuleOptions) => Promise<void>;
  cli?: (program: Command) => void;
  panel?: () => Promise<{ default: React.ComponentType }>;  // lazy import path
  capabilities?: PlatformCapability[];
}

// Module loader discovers and registers all modules
async function loadModules(fastify: FastifyInstance, modulesDir: string) {
  const entries = await readdir(modulesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(modulesDir, entry.name, 'manifest.ts');
    const mod: SimvynModule = await import(manifestPath);
    fastify.register(mod.register, { prefix: `/api/${mod.name}` });
  }
}
```

### Pattern 2: WebSocket Envelope Multiplexing
**What:** Single WebSocket connection with envelope-based message routing. Each message carries a `channel` field that routes to the correct module handler.
**When to use:** All WebSocket communication between dashboard and server.
**Example:**
```typescript
// Envelope format — all WS messages wrapped in this
interface WsEnvelope {
  channel: string;     // "devices", "location", "logs", etc.
  type: string;        // message type within channel
  payload: unknown;    // channel-specific data
  requestId?: string;  // for request/response correlation
}

// Server-side: route incoming messages to module handlers
type WsHandler = (payload: unknown, socket: WebSocket, requestId?: string) => void;
const handlers = new Map<string, Map<string, WsHandler>>();

// Module registers its handlers
function registerWsHandler(channel: string, type: string, handler: WsHandler) {
  if (!handlers.has(channel)) handlers.set(channel, new Map());
  handlers.get(channel)!.set(type, handler);
}

// On message: unwrap envelope and dispatch
socket.on('message', (raw) => {
  const envelope: WsEnvelope = JSON.parse(raw.toString());
  const channelHandlers = handlers.get(envelope.channel);
  if (!channelHandlers) return;
  const handler = channelHandlers.get(envelope.type);
  if (handler) handler(envelope.payload, socket, envelope.requestId);
});
```

### Pattern 3: Platform Adapter with Extended Device Model
**What:** Factory functions returning adapter objects (no classes). Extended from sim-location to support device lifecycle.
**When to use:** All platform-specific operations.
**Example:**
```typescript
// Evolved from sim-location's PlatformAdapter
interface Device {
  id: string;
  name: string;
  platform: "ios" | "android";
  state: "booted" | "shutdown" | "creating" | "shutting-down";
  osVersion: string;         // "iOS 26.2", "Android 14"
  deviceType: string;        // "iPhone 17 Pro", "Pixel 6 Pro"
  isAvailable: boolean;
}

interface PlatformAdapter {
  platform: "ios" | "android";
  isAvailable(): Promise<boolean>;
  listDevices(): Promise<Device[]>;
  boot(deviceId: string): Promise<void>;
  shutdown(deviceId: string): Promise<void>;
  erase?(deviceId: string): Promise<void>;       // iOS only
  capabilities(): PlatformCapability[];
}

// Factory function pattern (proven in sim-location)
function createIosAdapter(): PlatformAdapter {
  return {
    platform: "ios",
    async isAvailable() {
      try {
        await execFile("xcrun", ["simctl", "list", "devices", "--json"]);
        return true;
      } catch { return false; }
    },
    async listDevices() {
      const { stdout } = await execFile("xcrun", ["simctl", "list", "devices", "--json"]);
      const data = JSON.parse(stdout);
      const devices: Device[] = [];
      for (const [runtime, runtimeDevices] of Object.entries(data.devices)) {
        const osVersion = runtime.replace(/.*SimRuntime\./, "").replace(/-/g, " ").replace(/ (\d)/, " $1");
        for (const d of runtimeDevices as any[]) {
          if (!d.isAvailable) continue;
          devices.push({
            id: d.udid,
            name: d.name,
            platform: "ios",
            state: d.state === "Booted" ? "booted" : "shutdown",
            osVersion,
            deviceType: d.deviceTypeIdentifier.split(".").pop() || d.name,
            isAvailable: d.isAvailable,
          });
        }
      }
      return devices;
    },
    async boot(deviceId) {
      await execFile("xcrun", ["simctl", "boot", deviceId]);
    },
    async shutdown(deviceId) {
      await execFile("xcrun", ["simctl", "shutdown", deviceId]);
    },
    async erase(deviceId) {
      await execFile("xcrun", ["simctl", "erase", deviceId]);
    },
    capabilities() {
      return ["setLocation", "push", "screenshot", "screenRecord", "erase", "statusBar", "privacy", "ui"];
    },
  };
}
```

### Pattern 4: Process Lifecycle Manager
**What:** Centralized tracker for all spawned child processes. Ensures cleanup on server shutdown.
**When to use:** Every simctl/adb/emulator call that spawns a long-running process.
**Example:**
```typescript
// Track all spawned processes for cleanup
const activeProcesses = new Set<ChildProcess>();

function spawnTracked(command: string, args: string[]): ChildProcess {
  const child = spawn(command, args);
  activeProcesses.add(child);
  child.on("exit", () => activeProcesses.delete(child));
  child.on("error", () => activeProcesses.delete(child));
  return child;
}

function cleanupAll() {
  for (const child of activeProcesses) {
    child.kill("SIGTERM");
  }
  activeProcesses.clear();
}

// Register cleanup on process exit
process.on("SIGINT", cleanupAll);
process.on("SIGTERM", cleanupAll);
```

### Pattern 5: Storage with Module Namespacing
**What:** JSON file storage in `~/.simvyn/` with per-module namespacing.
**When to use:** Any persistent state (device preferences, favorites, module state).
**Example:**
```typescript
// Evolved from sim-location's createStorage()
const SIMVYN_DIR = join(homedir(), ".simvyn");

function createModuleStorage(moduleName: string) {
  const moduleDir = join(SIMVYN_DIR, moduleName);
  
  return {
    async read<T>(key: string): Promise<T | null> {
      try {
        const data = await readFile(join(moduleDir, `${key}.json`), "utf-8");
        return JSON.parse(data);
      } catch { return null; }
    },
    async write<T>(key: string, data: T): Promise<void> {
      await mkdir(moduleDir, { recursive: true });
      await writeFile(join(moduleDir, `${key}.json`), JSON.stringify(data, null, 2));
    },
  };
}
```

### Anti-Patterns to Avoid
- **God-module core:** Don't put business logic in `@simvyn/core`. Core provides adapters, process manager, and storage — modules own their features.
- **Breaking Fastify encapsulation unnecessarily:** Only use `fastify-plugin` for truly shared infrastructure (decorators, global hooks). Modules should be encapsulated.
- **Shared mutable state between modules:** Use Fastify decorators for shared read-only state (like device list). Modules should not mutate shared state directly.
- **WebSocket handler in HTTP routes:** Keep WS logic separate from REST routes. Use the envelope system to route WS messages.
- **Synchronous child process calls:** Always use `execFile` (Promise-wrapped) or `spawn` with async handling. Never `execFileSync`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP server + routing | Custom node:http server | Fastify 5 | sim-location's raw http.ts is 235 lines of manual routing; Fastify gives schema validation, hooks, encapsulation |
| WebSocket server setup | Manual ws + upgrade handling | @fastify/websocket | Handles upgrade, integrates with Fastify hooks/lifecycle, proper cleanup |
| Static file serving | Custom MIME type map + readFile | @fastify/static | sim-location's http.ts has manual MIME handling; @fastify/static handles caching, ETags, ranges |
| CLI argument parsing | Custom process.argv parsing | commander.js | Subcommands, help generation, type validation built-in |
| CSS utility system | Hand-written utility classes | Tailwind v4 | Will need consistent spacing/colors/responsive across 16+ module panels |
| Process-safe JSON file I/O | Raw readFile/writeFile | Atomic write helper | Partial writes on crash can corrupt JSON; use write-to-tmp + rename pattern |

**Key insight:** sim-location already proved that raw `node:http` + manual routing + hand-written CSS doesn't scale. The upgrade path is exactly Fastify + @fastify/websocket + @fastify/static + Tailwind.

## Common Pitfalls

### Pitfall 1: npm Workspace Dependency Resolution
**What goes wrong:** Packages can't find each other, or wrong versions resolve.
**Why it happens:** npm workspaces use symlinks in `node_modules`. If package names don't match `package.json` `name` fields, or if `dependencies` point to wrong versions, resolution fails.
**How to avoid:** Use consistent `@simvyn/` scope prefix for all packages. In workspace `package.json`, reference siblings as `"@simvyn/types": "workspace:*"` or `"@simvyn/types": "*"` (npm will resolve via workspace symlink). Always run `npm install` from root.
**Warning signs:** "Cannot find module '@simvyn/types'" errors.

### Pitfall 2: Fastify Plugin Registration Order
**What goes wrong:** Decorators or hooks aren't available when expected.
**Why it happens:** Fastify registers plugins asynchronously using avvio. Plugins registered later don't have access to decorators from sibling plugins (only parent and ancestor scopes).
**How to avoid:** Register shared infrastructure (device manager decorator, WS envelope handler) at the root level using `fastify-plugin`. Register module plugins after core infrastructure is ready.
**Warning signs:** "Cannot read properties of undefined" when accessing decorators.

### Pitfall 3: simctl JSON Output Parsing
**What goes wrong:** Device list is empty or misses devices.
**Why it happens:** The runtime key format is `com.apple.CoreSimulator.SimRuntime.iOS-26-2` — must parse correctly. Also `isAvailable: false` devices exist (e.g., old runtimes). `state` values are capitalized ("Booted", "Shutdown", "Creating", "ShuttingDown").
**How to avoid:** Filter on `isAvailable === true`. Map state strings to lowercase. Parse runtime key for OS version. Include ALL available devices (not just booted ones, as sim-location does — simvyn needs shutdown devices for boot commands).
**Warning signs:** Only seeing booted devices when shutdown devices should appear.

### Pitfall 4: Android Emulator Boot is Async and Long-Running
**What goes wrong:** `emulator @avd_name` spawns a process that takes 10-60 seconds to fully boot. The command doesn't exit — it runs the emulator.
**Why it happens:** Unlike `simctl boot` which returns quickly, Android emulator boot spawns a GUI process.
**How to avoid:** Spawn the emulator process in the background with `spawnTracked()`. Poll `adb devices` to detect when the emulator appears as "device" (vs "offline"). Use `adb -s <serial> wait-for-device` for blocking detection if needed.
**Warning signs:** Emulator process hangs the server, or boot appears to fail because the command didn't return.

### Pitfall 5: WebSocket Connection Lifecycle
**What goes wrong:** Messages sent to closed connections crash the server. Or: WS connections pile up on dashboard hot-reload.
**Why it happens:** WebSocket `readyState` must be checked before sending. During Vite HMR, the old connection may not close before the new one opens.
**How to avoid:** Always check `socket.readyState === WebSocket.OPEN` before sending. Implement connection tracking in the WS envelope layer. Handle `close` and `error` events to clean up subscriptions.
**Warning signs:** "WebSocket is not open" errors in server logs.

### Pitfall 6: TypeScript Monorepo Build Order
**What goes wrong:** Type errors because dependent packages aren't built yet.
**Why it happens:** TypeScript project references require packages to be built in dependency order.
**How to avoid:** Use TypeScript `references` in `tsconfig.json` and build with `tsc --build`. Or use `tsconfig.json` `paths` aliases for development and build each package independently. For development, consider `tsx` or `ts-node` with `--loader` for direct execution.
**Warning signs:** "Cannot find module" or stale types after changes.

### Pitfall 7: Tailwind v4 Configuration Differences
**What goes wrong:** Tailwind doesn't generate classes, or config doesn't work.
**Why it happens:** Tailwind v4 is a major departure from v3. It uses CSS-first configuration (`@theme` directive in CSS) instead of `tailwind.config.js`. The PostCSS plugin is no longer required — it's a standalone CLI or Vite plugin.
**How to avoid:** Use `@tailwindcss/vite` plugin for Vite integration. Configure themes in CSS using `@theme {}` blocks. Don't create `tailwind.config.js` — it's not used in v4.
**Warning signs:** No styles applied, "Unknown at-rule" warnings.

## Code Examples

Verified patterns from official sources and the reference project:

### simctl Device List Parsing (Verified on this machine)
```typescript
// Actual output structure from `xcrun simctl list devices --json`
// Keys like "com.apple.CoreSimulator.SimRuntime.iOS-26-2"
interface SimctlOutput {
  devices: Record<string, Array<{
    udid: string;
    name: string;
    state: "Shutdown" | "Booted" | "Creating" | "ShuttingDown";
    isAvailable: boolean;
    deviceTypeIdentifier: string;  // e.g. "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro"
    dataPath: string;
    lastBootedAt?: string;
  }>>;
}

function parseOsVersion(runtimeKey: string): string {
  // "com.apple.CoreSimulator.SimRuntime.iOS-26-2" → "iOS 26.2"
  const match = runtimeKey.match(/SimRuntime\.(.+)$/);
  if (!match) return "Unknown";
  return match[1].replace(/-/g, ".").replace(/\.(\d)/, " $1").replace(".", " ");
}
```

### Android Device Detection (Verified on this machine)
```typescript
// `emulator -list-avds` returns one name per line:
// Pixel_6_Pro_API_34
// Small_Phone

// `adb devices` returns:
// List of devices attached
// emulator-5554	device
// emulator-5556	offline

async function listAndroidDevices(): Promise<Device[]> {
  // Get available (not-yet-booted) AVDs
  const { stdout: avdOutput } = await execFile("emulator", ["-list-avds"]);
  const availableAvds = avdOutput.trim().split("\n").filter(Boolean);

  // Get running devices
  const { stdout: adbOutput } = await execFile("adb", ["devices"]);
  const runningDevices = adbOutput.split("\n").slice(1)
    .map(line => line.split("\t"))
    .filter(parts => parts.length >= 2 && parts[1] === "device")
    .map(([serial]) => serial);

  // For running emulators, get their AVD names
  const devices: Device[] = [];
  for (const serial of runningDevices) {
    if (serial.startsWith("emulator-")) {
      let name = serial;
      try {
        const { stdout } = await execFile("adb", ["-s", serial, "emu", "avd", "name"]);
        name = stdout.trim().split("\n")[0];
      } catch {}
      devices.push({
        id: serial, name, platform: "android",
        state: "booted", osVersion: "Android", deviceType: name, isAvailable: true,
      });
    }
  }

  // Add available but not-booted AVDs
  const bootedNames = new Set(devices.map(d => d.name));
  for (const avd of availableAvds) {
    if (!bootedNames.has(avd)) {
      devices.push({
        id: `avd:${avd}`, name: avd, platform: "android",
        state: "shutdown", osVersion: "Android", deviceType: avd, isAvailable: true,
      });
    }
  }
  return devices;
}
```

### Fastify WebSocket with Envelope Pattern
```typescript
// Source: https://github.com/fastify/fastify-websocket README
import Fastify from "fastify";
import websocket from "@fastify/websocket";

const fastify = Fastify({ logger: true });
await fastify.register(websocket);

// Single WebSocket endpoint with envelope routing
fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    socket.on("message", (raw) => {
      const envelope = JSON.parse(raw.toString());
      // Route to module handler based on envelope.channel
      const handler = channelHandlers.get(envelope.channel);
      if (handler) {
        handler(envelope, socket);
      }
    });
  });
});
```

### npm Workspaces package.json (Root)
```json
{
  "name": "simvyn-monorepo",
  "private": true,
  "workspaces": [
    "packages/types",
    "packages/core",
    "packages/server",
    "packages/cli",
    "packages/dashboard"
  ],
  "scripts": {
    "dev": "npm run dev -w @simvyn/cli",
    "build": "npm run build --workspaces",
    "typecheck": "tsc --build",
    "lint": "biome check ."
  }
}
```

### Workspace Package (packages/core/package.json)
```json
{
  "name": "@simvyn/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@simvyn/types": "*"
  }
}
```

### Vite Config for Dashboard with Tailwind v4
```typescript
// Source: Tailwind v4 + Vite integration
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist/dashboard",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:3847" },
      "/ws": { target: "ws://127.0.0.1:3847", ws: true },
    },
  },
});
```

### Tailwind v4 CSS Setup
```css
/* src/main.css — Tailwind v4 CSS-first config */
@import "tailwindcss";

@theme {
  --color-glass: oklch(0.2 0.02 260);
  --color-glass-border: oklch(0.35 0.02 260 / 0.3);
  --color-accent-blue: oklch(0.7 0.1 240);
  --color-accent-purple: oklch(0.65 0.12 290);
  --color-accent-teal: oklch(0.72 0.1 190);
  --radius-panel: 14px;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 (JS config, PostCSS) | Tailwind v4 (CSS-first config, Vite plugin) | 2025 | No tailwind.config.js, use `@theme` in CSS, `@tailwindcss/vite` plugin |
| Fastify 4 | Fastify 5 (5.7.4) | 2024 | ESM-first, improved TypeScript, some plugin API changes |
| @fastify/websocket 10.x | @fastify/websocket 11.x | 2025 | Requires Fastify 5, per-route WS handlers more ergonomic |
| React 18 | React 19 (19.2.4) | 2024 | `use()` hook, server components (not relevant for SPA), improved ref forwarding |
| Vite 6 | Vite 7 (7.3.1) | 2025 | Node 22+ required, faster builds |

**Deprecated/outdated:**
- `tailwind.config.js`: Not used in Tailwind v4. Use CSS `@theme` blocks instead.
- `postcss.config.js` for Tailwind: Not needed with `@tailwindcss/vite` plugin.
- `@fastify/websocket` < 11: Not compatible with Fastify 5.
- `ws` WebSocketServer with manual upgrade: Use `@fastify/websocket` per-route handlers instead.

## Open Questions

1. **Module manifest format — TypeScript or JSON?**
   - What we know: TypeScript manifests allow type-safe registration functions. JSON manifests are simpler but can't contain code.
   - What's unclear: Whether the build step for modules should compile manifests or use dynamic imports.
   - Recommendation: Use TypeScript manifests with `export default` and dynamic `import()` for auto-discovery. This matches Fastify's async plugin pattern.

2. **Dashboard module panel loading strategy**
   - What we know: React.lazy + Suspense works for code splitting. Vite handles chunk generation.
   - What's unclear: Whether module panels should be separate Vite entries or all bundled into the dashboard.
   - Recommendation: Single Vite build for dashboard, with dynamic `import()` for each module panel. Module panels live in `packages/dashboard/src/modules/` (not in the server-side module directories). The module manifest on the server provides metadata (name, icon) but doesn't reference React components.

3. **Emulator boot: foreground vs background process**
   - What we know: `emulator @avd_name` is a long-running foreground process.
   - What's unclear: Whether to detach the process or keep it tracked.
   - Recommendation: Use `spawn("emulator", ["@" + avdName], { detached: true, stdio: "ignore" })` and unref. The emulator runs as its own process. Track it only for the boot phase, then rely on `adb devices` for status.

## Sources

### Primary (HIGH confidence)
- Fastify 5.7.4 official docs (https://fastify.dev/docs/latest/) — Plugin system, Encapsulation, Plugin registration
- @fastify/websocket GitHub README (https://github.com/fastify/fastify-websocket) — v11.2.0 API, per-route WS handlers
- @fastify/static GitHub README (https://github.com/fastify/fastify-static) — v9.0.0 API, Fastify 5 compatibility
- npm workspaces docs (https://docs.npmjs.com/cli/v10/using-npm/workspaces) — Workspace definition, dependency installation
- `xcrun simctl list devices --json` — Verified locally, actual JSON structure confirmed
- `xcrun simctl help` — Verified locally, boot/shutdown/erase commands confirmed
- `emulator -list-avds` — Verified locally, returns AVD names
- `adb devices` — Verified locally, returns device serials with status
- sim-location source code at `/Users/pranshu/github/sim-location` — Reference patterns for adapters, WS protocol, storage, CLI

### Secondary (MEDIUM confidence)
- Fastify 5.7.4 package.json (https://raw.githubusercontent.com/fastify/fastify/main/package.json) — Version confirmed
- npm registry version queries — All library versions verified via `npm view`
- Tailwind v4 — CSS-first configuration approach (verified via version 4.2.1 on npm)

### Tertiary (LOW confidence)
- Tailwind v4 `@theme` syntax — based on training data, needs verification against official v4 docs during implementation
- `@tailwindcss/vite` plugin — exists in npm (part of the Tailwind v4 ecosystem), but exact API details should be verified during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All versions verified on npm, Fastify docs confirmed, sim-location patterns proven
- Architecture: HIGH — Fastify encapsulation model well-documented, monorepo pattern standard, adapter pattern proven
- Pitfalls: HIGH — simctl/adb outputs verified locally, Fastify plugin gotchas documented in official docs
- Tailwind v4 specifics: MEDIUM — Version confirmed, CSS-first approach known, but exact `@theme` syntax should be validated during implementation

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (30 days — stack is stable, no major releases expected)
