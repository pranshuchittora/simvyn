# Phase 2: Location Module (sim-location Migration) - Research

**Researched:** 2026-02-26
**Domain:** sim-location → simvyn module migration, GPS simulation, Leaflet maps, GPX parsing
**Confidence:** HIGH

## Summary

This phase migrates the existing `sim-location` standalone app into simvyn's module architecture. The source code is complete and working — the migration is structural (refactoring into module manifests, Fastify routes, WS channels, dashboard panels) rather than functional (building new GPS features from scratch).

The sim-location codebase consists of: platform adapters (iOS `simctl location set/start`, Android `adb emu geo fix`), a playback engine with tick-based interpolation, a Nominatim geocoding proxy, JSON file persistence, WebSocket message handlers, and a full Leaflet-based React UI with zustand stores. All of this maps cleanly onto simvyn's existing module contract (Fastify plugin, WS channel handler, Commander subcommand, dashboard panel registration).

The key challenge is not technology — it's architectural adaptation. sim-location uses its own raw `http.createServer` + `ws` server and standalone WebSocket protocol. simvyn uses Fastify with `@fastify/websocket` and an envelope-based WS broker with channel subscriptions. sim-location's UI is a standalone Vite app with its own CSS; simvyn's dashboard uses Tailwind v4 and a panel registry with `React.lazy()`. Every sim-location component needs reshaping to fit these contracts.

**Primary recommendation:** Copy sim-location source files into the module, then refactor layer by layer: adapters first (reuse simvyn's existing `PlatformAdapter` + add `setLocation`/`clearLocation` methods), then server logic (Fastify routes + WS channel handlers), then CLI subcommands, then dashboard panel. Do NOT rewrite — adapt.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOC-01 | Migrate sim-location codebase into simvyn monorepo as Location module | Module manifest contract is well-defined (see Architecture Patterns). sim-location maps cleanly: adapters → core methods, server → routes + ws-handler, CLI → manifest.cli(), UI → dashboard panel |
| LOC-02 | Set GPS on iOS via `simctl location set` | sim-location already implements this in `src/adapters/ios.ts:62-72`. Command: `xcrun simctl location <udid> set <lat>,<lon>`. Needs migration to simvyn's `PlatformAdapter` interface |
| LOC-03 | Set GPS on Android via `adb emu geo fix` | sim-location already implements in `src/adapters/android.ts:62-74`. Command: `adb -s <serial> emu geo fix <lon> <lat>` (note: longitude first). Needs migration to simvyn's `PlatformAdapter` |
| LOC-04 | Route simulation from GPX/KML with playback controls | sim-location has full playback engine (`src/server/playback.ts`) with play/pause/resume/stop/speed. GPX/KML parsing via `@tmcw/togeojson` in `src/web/utils/route-parser.ts`. Server-side parsing also needed for CLI |
| LOC-05 | iOS route via `simctl location start` (pipe waypoints to stdin) | sim-location implements in `playback.ts:36-67`. Spawns `xcrun simctl location <udid> start --speed=<ms> --interval=1 -` and pipes `lat,lon\n` waypoints to stdin. Uses `spawn` (not `execFile`) — must use simvyn's `processManager.spawn()` |
| LOC-06 | Android route via tick-based `geo fix` calls | sim-location implements in `playback.ts:146-161`. 200ms tick interval, calls `setLocation` per tick. The playback engine handles interpolation via haversine distance (`utils/geo.ts`) |
| LOC-07 | Interactive map UI (Leaflet) | sim-location has full Leaflet UI: MapView, LocationMarker, RouteLayer, PlaybackMarker, BookmarkMarkers, DeviceMarkers, SearchBar, PlaybackControls. Uses `leaflet` + `react-leaflet`. Dashboard needs `leaflet`, `react-leaflet`, `@types/leaflet` added as dependencies |
| LOC-08 | Geocoding via Nominatim proxy with rate limiting | sim-location has `src/server/nominatim.ts` with 1-second rate limiting. Forward search and reverse geocoding. Migrates to Fastify routes at `/api/modules/location/search` and `/api/modules/location/reverse` |
| LOC-09 | Save favorite locations and routes with persistence | sim-location uses `~/.config/sim-location/*.json`. simvyn uses `~/.simvyn/<module>/*.json` via `createModuleStorage()`. Storage interface matches: `read<T>(key)`, `write<T>(key, data)`, `delete(key)` |
| LOC-10 | CLI subcommands: `simvyn location set`, `simvyn location route` | sim-location has no CLI subcommands (only `sim-location` server start). New Commander subcommands needed in manifest `cli()` method, following device-management pattern: headless with own adapters/DeviceManager |
</phase_requirements>

## Standard Stack

### Core (already in simvyn or sim-location)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| leaflet | ^1.9.4 | Map rendering engine | Industry standard, already used by sim-location |
| react-leaflet | ^5.0.0 | React bindings for Leaflet | Official React wrapper, already used by sim-location |
| @tmcw/togeojson | ^7.1.2 | GPX/KML → GeoJSON parsing | Lightweight, maintained by Mapbox engineer, already used |
| zustand | ^5 | State management for UI stores | Already used by both codebases |
| sonner | ^2.0.7 | Toast notifications | Already used by sim-location for user feedback |

### Supporting (need to add to simvyn dashboard)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/leaflet | ^1.9.21 | TypeScript types for Leaflet | Dev dependency for dashboard |

### New Dependencies Required
The dashboard (`@simvyn/dashboard`) currently has NO map dependencies. These must be added:
```
npm install -w @simvyn/dashboard leaflet react-leaflet @tmcw/togeojson sonner
npm install -w @simvyn/dashboard -D @types/leaflet
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leaflet | Mapbox GL JS / MapLibre | Heavier, requires API token (Mapbox) or more setup. sim-location already uses Leaflet — no reason to switch |
| @tmcw/togeojson | fast-xml-parser + manual | togeojson handles GPX/KML edge cases. Don't hand-roll XML parsing |
| Nominatim | Google Maps Geocoding / Mapbox | Nominatim is free and requires no API key. sim-location already uses it |

## Architecture Patterns

### Recommended Module Structure
```
packages/modules/location/
├── manifest.ts           # SimvynModule: register(), cli(), name, version
├── routes.ts             # Fastify plugin: /search, /reverse, /favorites/*, /set, /route
├── ws-handler.ts         # WS channel "location": set-location, playback-*, list-devices
├── playback.ts           # PlaybackEngine (from sim-location, adapted to use simvyn's ProcessManager)
├── nominatim.ts          # Geocoding proxy with rate limiting (from sim-location)
├── storage.ts            # Favorites persistence via createModuleStorage("location")
├── geo.ts                # Haversine distance, route interpolation (from sim-location)
├── package.json          # @simvyn/module-location
└── tsconfig.json
```

Dashboard panel (in `packages/dashboard/src/panels/`):
```
packages/dashboard/src/panels/
├── LocationPanel.tsx      # Main panel component (lazy-loaded)
├── location/
│   ├── MapView.tsx        # Leaflet map container
│   ├── SearchBar.tsx      # Geocoding search with autocomplete
│   ├── PlaybackControls.tsx
│   ├── FavoritesPanel.tsx
│   ├── RouteLayer.tsx     # Polyline + draggable waypoint markers
│   ├── LocationMarker.tsx
│   ├── PlaybackMarker.tsx
│   ├── ModeSelector.tsx   # Point vs Route mode toggle
│   ├── FileImportButton.tsx # GPX/KML import
│   ├── markers.ts         # Custom Leaflet DivIcon factories
│   └── stores/
│       ├── location-store.ts
│       ├── playback-store.ts
│       ├── route-store.ts
│       └── favorites-store.ts
```

### Pattern 1: Module Manifest (follow device-management exactly)
**What:** Each module exports a `SimvynModule` with `register()`, `cli()`, and metadata
**When to use:** Every module
**Example:**
```typescript
// packages/modules/location/manifest.ts
import type { SimvynModule } from "@simvyn/types";
import { locationRoutes } from "./routes.js";
import { registerLocationWsHandler } from "./ws-handler.js";

const locationModule: SimvynModule = {
  name: "location",
  version: "0.1.0",
  description: "GPS location simulation with interactive map",
  icon: "map-pin",

  async register(fastify, _opts) {
    await fastify.register(locationRoutes);
    registerLocationWsHandler(fastify);
  },

  cli(program) {
    const location = program.command("location").description("GPS location commands");
    // ... subcommands
  },

  capabilities: ["setLocation"],
};

export default locationModule;
```

### Pattern 2: WS Channel Handler (envelope-based, not raw)
**What:** Register a channel handler on `wsBroker` instead of raw WebSocket message handling
**Critical difference from sim-location:** sim-location uses flat `{ type: "set-location", ... }` messages. simvyn uses enveloped `{ channel: "location", type: "set-location", payload: {...} }`.
**Example:**
```typescript
// packages/modules/location/ws-handler.ts
export function registerLocationWsHandler(fastify: FastifyInstance) {
  const { wsBroker, deviceManager } = fastify;

  wsBroker.registerChannel("location", (type, payload, socket, requestId) => {
    if (type === "set-location") {
      const { lat, lon, deviceIds } = payload as { lat: number; lon: number; deviceIds?: string[] };
      // ... set location on devices, then:
      wsBroker.send(socket, "location", "location-set", { lat, lon, results }, requestId);
      return;
    }
    if (type === "start-playback") {
      // ... start playback engine
      return;
    }
    // ... etc
  });

  // Broadcast playback position to all subscribed clients
  engine.onPosition((data) => {
    wsBroker.broadcast("location", "playback-position", data);
  });
}
```

### Pattern 3: Dashboard Panel Registration
**What:** Panel files import `registerPanel()` and call it as a side-effect. `App.tsx` imports the panel file.
**Example:**
```typescript
// packages/dashboard/src/panels/LocationPanel.tsx
import { registerPanel } from "../stores/panel-registry";

function LocationPanel() {
  // ... map + controls
}

registerPanel("location", LocationPanel);
export default LocationPanel;
```

Then in `App.tsx`:
```typescript
import "./panels/DevicePanel";
import "./panels/LocationPanel";  // Add this line
```

### Pattern 4: CLI Subcommands (headless, own adapters)
**What:** CLI commands create their own adapter instances and DeviceManager — they don't connect to the server
**Why:** CLI-first approach from Phase 1 decisions. Commands work without server running.
**Example:**
```typescript
cli(program) {
  const location = program.command("location").description("GPS location commands");

  location
    .command("set <device> <lat> <lng>")
    .description("Set GPS coordinates on a device")
    .action(async (deviceId: string, latStr: string, lngStr: string) => {
      const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
      const adapters = await createAvailableAdapters();
      const dm = createDeviceManager(adapters);
      const devices = await dm.refresh();
      const target = devices.find(d => d.id === deviceId || d.id.startsWith(deviceId));
      if (!target) { console.error(`Device not found: ${deviceId}`); process.exit(1); }

      // Need setLocation on the adapter — this is a new method to add
      const adapter = dm.getAdapter(target.platform);
      // ... call setLocation
      dm.stop();
    });
}
```

### Pattern 5: Storage via ModuleStorage (NOT raw fs)
**What:** Use `createModuleStorage("location")` from `@simvyn/core` for favorites persistence
**Why:** Consistent `~/.simvyn/location/` directory, atomic writes (write-tmp-rename pattern), JSON serialization
**Difference from sim-location:** sim-location uses `~/.config/sim-location/locations.json`. simvyn stores at `~/.simvyn/location/locations.json` and `~/.simvyn/location/routes.json`.

### Pattern 6: Leaflet in Dashboard Panel (CSS handling)
**What:** sim-location uses a standalone CSS file (`map.css`) with absolute positioning. The simvyn dashboard uses Tailwind v4.
**Approach:** The location panel needs both Leaflet's CSS (`leaflet/dist/leaflet.css`) and custom map styling. Import Leaflet CSS in the panel component. For custom styles, create a `location-panel.css` alongside the panel or use Tailwind utilities where possible. The map must fill the panel's `flex-1 overflow-hidden` container (set by ModuleShell), not the entire viewport.
**Critical:** sim-location's CSS assumes full-viewport layout (`position: absolute; inset: 0`). The dashboard panel is a child of ModuleShell's `absolute inset-0 overflow-auto` div. Map container must use `width: 100%; height: 100%` within that container.

### Anti-Patterns to Avoid
- **Don't keep sim-location's standalone WS protocol:** All messages must go through the envelope-based `wsBroker.registerChannel("location", ...)` pattern
- **Don't duplicate device listing:** sim-location has its own device stores and adapters. simvyn already has `deviceManager` on the Fastify instance — use it
- **Don't add `setLocation` to the central `PlatformAdapter` interface yet:** The current `PlatformAdapter` doesn't have `setLocation`. Adding it would require changing `@simvyn/types` (shared package). Better approach: the location module imports the platform-specific adapters directly or extends them. OR add `setLocation`/`clearLocation` to `PlatformAdapter` in `@simvyn/types` since `setLocation` is already listed as a `PlatformCapability`
- **Don't build server-side GPX parsing for the dashboard:** The dashboard already handles GPX/KML parsing client-side via `@tmcw/togeojson` using the browser's `DOMParser`. Keep client-side parsing for file imports. Server-side parsing is only needed for the CLI `route` command
- **Don't use `spawn`/`execFile` directly:** Use `fastify.processManager.spawn()` and `fastify.processManager.exec()` for all child processes in server code. CLI commands can use `execFile` directly (they don't have Fastify context)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPX/KML parsing | XML parser + manual coordinate extraction | `@tmcw/togeojson` | Handles all GPX/KML variants, tracks vs routes vs waypoints, coordinate system differences |
| Geocoding | Direct Nominatim API calls from client | Server-side Nominatim proxy with rate limiting | Nominatim's usage policy requires max 1 req/sec and proper User-Agent; client-side can't rate limit |
| Haversine distance | Euclidean approximation | sim-location's `geo.ts` (haversine formula) | Euclidean is wrong for lat/lon — distances distort with latitude |
| Map tile rendering | Canvas-based custom map | Leaflet with OpenStreetMap tiles | Leaflet handles zoom, pan, tile loading, projections, retina displays |
| Route interpolation | Linear lat/lon interpolation | sim-location's `interpolateAlongRoute` (distance-based) | Distance-based interpolation gives constant speed; naive lat/lon interpolation varies speed by segment length |

**Key insight:** sim-location already solved all the hard geo/map problems. The migration is about reshaping, not reimplementing.

## Common Pitfalls

### Pitfall 1: Longitude/Latitude Argument Order
**What goes wrong:** Android's `adb emu geo fix` takes `longitude, latitude` (reversed from standard). iOS takes `lat,lon`.
**Why it happens:** Different platforms use different conventions. GeoJSON uses `[lon, lat]`, Leaflet uses `[lat, lng]`.
**How to avoid:** sim-location already handles this correctly. During migration, preserve the existing adapter logic exactly: iOS `${lat},${lon}` (line 65 of ios.ts), Android `String(lon), String(lat)` (line 66 of android.ts).
**Warning signs:** Coordinates appearing in the ocean, or in the wrong hemisphere.

### Pitfall 2: WS Protocol Mismatch
**What goes wrong:** Copying sim-location's flat WS protocol (`{ type: "set-location", lat, lon }`) instead of using simvyn's envelope protocol (`{ channel: "location", type: "set-location", payload: { lat, lon } }`).
**Why it happens:** Direct copy-paste of sim-location's ws.ts without understanding simvyn's broker pattern.
**How to avoid:** The location module must NOT create its own WebSocketServer. It registers a channel handler on `fastify.wsBroker.registerChannel("location", handler)`. Dashboard sends enveloped messages and subscribes to the "location" channel.
**Warning signs:** Dashboard not receiving location updates, WS errors about unknown channels.

### Pitfall 3: CSS Conflicts Between Leaflet and Tailwind
**What goes wrong:** Leaflet's CSS (leaflet.css) can conflict with Tailwind's reset/base styles. Map controls may look broken.
**Why it happens:** Tailwind's preflight resets padding, margins, borders. Leaflet's controls rely on specific default styles.
**How to avoid:** Import `leaflet/dist/leaflet.css` before any custom styles. Leaflet's CSS uses specific class selectors that generally win over Tailwind's resets, but map control buttons may need explicit styling overrides. sim-location already has these overrides in `map.css` — port them as-is.
**Warning signs:** Map controls invisible, markers misaligned, tiles not rendering.

### Pitfall 4: Playback Engine Process Lifecycle
**What goes wrong:** iOS route simulation spawns `xcrun simctl location <device> start` as a child process that pipes waypoints. If the process isn't properly tracked and killed on stop/pause, zombie processes accumulate.
**Why it happens:** sim-location uses raw `spawn()`. simvyn has `processManager.spawn()` which tracks child processes.
**How to avoid:** Use `fastify.processManager.spawn()` for the `simctl location start` command. Store the returned `ChildProcess` and kill it on pause/stop. The processManager's cleanup handles any orphans on server shutdown.
**Warning signs:** Multiple `simctl` processes in Activity Monitor, device location keeps changing after stopping playback.

### Pitfall 5: ModuleStorage Key Design
**What goes wrong:** Using too many small keys or one monolithic key for favorites storage.
**Why it happens:** sim-location uses separate files (`locations.json`, `routes.json`). simvyn's `ModuleStorage.write(key, data)` creates `~/.simvyn/location/<key>.json`.
**How to avoid:** Use exactly two keys: `"locations"` and `"routes"`. Each stores an array. This matches sim-location's existing storage model perfectly.
**Warning signs:** Storage reads returning null, files appearing in wrong directory.

### Pitfall 6: Dashboard WS Subscription
**What goes wrong:** Location panel doesn't receive WS updates because it never subscribes to the "location" channel.
**Why it happens:** simvyn's WsBroker only broadcasts to clients that have subscribed to a channel. The dashboard's `WsProvider` currently only subscribes to "devices" on connect (hardcoded in `use-ws.ts:42`).
**How to avoid:** The location panel must send a subscribe envelope when mounted: `send({ channel: "system", type: "subscribe", payload: { channel: "location" } })`. Either add this as a `useEffect` in the LocationPanel, or create a `useWsSubscribe("location")` hook.
**Warning signs:** Location set via HTTP works but WS events (playback position, etc.) never arrive at dashboard.

### Pitfall 7: PlatformAdapter Interface Gap
**What goes wrong:** sim-location's `PlatformAdapter` has `setLocation()` and `clearLocation()` methods. simvyn's `PlatformAdapter` in `@simvyn/types` does NOT have these methods.
**Why it happens:** Phase 1 built the adapter interface for device management only. Location capabilities weren't included.
**How to avoid:** Extend `PlatformAdapter` in `@simvyn/types` to include `setLocation?(deviceId: string, lat: number, lon: number): Promise<void>` and `clearLocation?(deviceId: string): Promise<void>` as optional methods. Then implement them in the iOS and Android adapters in `@simvyn/core`. This is a core code change but is the clean approach — `setLocation` is already listed as a `PlatformCapability`.
**Warning signs:** Type errors when trying to call `adapter.setLocation()`.

## Code Examples

### Setting iOS Location (verified from sim-location source)
```typescript
// xcrun simctl location <udid> set <lat,lon>
await execFile("xcrun", ["simctl", "location", deviceId, "set", `${lat},${lon}`]);
```

### Setting Android Location (verified from sim-location source)
```typescript
// adb -s <serial> emu geo fix <LONGITUDE> <LATITUDE>
// NOTE: longitude comes FIRST for adb
await execFile("adb", ["-s", deviceId, "emu", "geo", "fix", String(lon), String(lat)]);
```

### iOS Route Simulation (verified from sim-location source)
```typescript
// Pipe waypoints to simctl location start via stdin
const child = spawn("xcrun", [
  "simctl", "location", device.id, "start",
  `--speed=${speedMs}`, "--interval=1", "-",
]);
child.stdin.write(`${waypoints.map(([lat, lon]) => `${lat},${lon}`).join("\n")}\n`);
child.stdin.end();
```

### WS Envelope Pattern (from simvyn ws-broker.ts)
```typescript
// Client sends:
{ channel: "location", type: "set-location", payload: { lat: 37.7749, lon: -122.4194, deviceIds: ["..."] } }

// Server responds via broker:
wsBroker.send(socket, "location", "location-set", { lat, lon, results }, requestId);

// Server broadcasts playback position:
wsBroker.broadcast("location", "playback-position", { lat, lon, progress, speedMs });
```

### Dashboard Panel Registration (from simvyn DevicePanel.tsx)
```typescript
import { registerPanel } from "../stores/panel-registry";

function LocationPanel() {
  // ... component
}

registerPanel("location", LocationPanel);
```

### Dashboard WS Subscription (from simvyn use-ws.ts)
```typescript
// Subscribe to location channel on panel mount
const { send } = useWs();
useEffect(() => {
  send({ channel: "system", type: "subscribe", payload: { channel: "location" } });
  return () => {
    send({ channel: "system", type: "unsubscribe", payload: { channel: "location" } });
  };
}, [send]);
```

### Module Storage Usage (from simvyn core/storage.ts)
```typescript
import { createModuleStorage } from "@simvyn/core";

const storage = createModuleStorage("location");

// Read all saved locations
const locations = await storage.read<SavedLocation[]>("locations") ?? [];

// Save a new location
locations.push(newLocation);
await storage.write("locations", locations);
```

### GPX Parsing (from sim-location, client-side)
```typescript
import { gpx, kml } from "@tmcw/togeojson";

function parseRouteFile(text: string, format: "gpx" | "kml"): [number, number][] {
  const dom = new DOMParser().parseFromString(text, "text/xml");
  const fc = format === "gpx" ? gpx(dom) : kml(dom);
  const coords: [number, number][] = [];
  for (const feature of fc.features) {
    // GeoJSON uses [lon, lat] → flip to [lat, lon]
    if (feature.geometry?.type === "LineString") {
      for (const coord of feature.geometry.coordinates) {
        coords.push([coord[1], coord[0]]);
      }
    }
  }
  return coords;
}
```

### Server-side GPX Parsing (needed for CLI route command)
```typescript
// Server-side (Node.js) — no DOMParser, use xmldom or similar
import { DOMParser } from "@xmldom/xmldom";
import { gpx } from "@tmcw/togeojson";

function parseGpxFile(content: string): [number, number][] {
  const dom = new DOMParser().parseFromString(content, "text/xml");
  const fc = gpx(dom);
  // ... same extraction logic
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sim-location raw `http.createServer` | Fastify 5 with plugins | Phase 1 decision | Routes become Fastify plugins with prefix, validation, logging |
| sim-location raw `ws` WebSocketServer | `@fastify/websocket` + wsBroker | Phase 1 decision | Envelope-based multiplexing, channel subscriptions, no standalone WS |
| sim-location standalone Vite app | Dashboard panel in ModuleShell | Phase 1 decision | Panel registered via `registerPanel()`, lazy-loaded, state persists across module switches |
| sim-location `bun build` | `tsx` for dev, Vite for dashboard | Phase 1 decision | No bun dependency, npm workspaces |
| `~/.config/sim-location/` storage | `~/.simvyn/location/` via ModuleStorage | Phase 1 decision | Unified storage directory, atomic writes |

**Deprecated/outdated:**
- sim-location's `open` package for browser launching — simvyn already handles this in `start.ts`
- sim-location's `ws` direct dependency — simvyn uses `@fastify/websocket` which wraps ws internally

## Open Questions

1. **Should `setLocation`/`clearLocation` be added to the core `PlatformAdapter` interface?**
   - What we know: `setLocation` is already listed as a `PlatformCapability` in `@simvyn/types`. The existing ios and android adapters in `@simvyn/core` don't implement it. sim-location has its own adapter implementations with `setLocation`.
   - What's unclear: Whether to add optional methods to the shared interface (cleaner but modifies core package) or keep them module-local (avoids core changes but duplicates adapter logic).
   - Recommendation: Add optional `setLocation?()` and `clearLocation?()` to `PlatformAdapter` in `@simvyn/types`, implement in `@simvyn/core` adapters. This is justified because `setLocation` is already a declared capability, and future modules (deep links, push) will similarly need platform-specific operations. The alternative (module-local adapters) would mean the location module can't use `fastify.deviceManager.getAdapter()` and would need its own adapter creation — defeating the purpose of the unified adapter system.

2. **Server-side GPX parsing for CLI `route` command — which XML parser?**
   - What we know: Client-side uses browser's native `DOMParser`. Node.js doesn't have `DOMParser`. `@tmcw/togeojson` expects a DOM Document.
   - What's unclear: Best Node.js XML parser that produces a DOM compatible with `@tmcw/togeojson`.
   - Recommendation: Use `@xmldom/xmldom` — it provides a `DOMParser` compatible with togeojson. It's lightweight and the recommended approach per togeojson docs. Alternative: `linkedom`.

3. **Should the location panel's CSS use Tailwind or keep sim-location's custom CSS?**
   - What we know: sim-location has 1200+ lines of custom CSS in `map.css`. The simvyn dashboard uses Tailwind v4. The map UI has very specific glassmorphism styles that would be verbose in Tailwind.
   - What's unclear: Whether to port all CSS to Tailwind utilities or keep a dedicated CSS file.
   - Recommendation: Keep a dedicated `location-panel.css` for Leaflet-specific overrides and glass styles (zoom controls, popups, tooltips, playback controls). Use Tailwind for layout and standard components. This hybrid approach avoids fighting Tailwind for things it's not good at (complex Leaflet control styling) while staying consistent with the dashboard's Tailwind foundation.

## Sources

### Primary (HIGH confidence)
- sim-location source code at `/Users/pranshu/github/sim-location/src/` — complete implementation read
- simvyn source code at `/Users/pranshu/github/simvyn/packages/` — all packages fully read
- sim-location's `src/adapters/ios.ts:65` — verified `simctl location set` command format
- sim-location's `src/adapters/android.ts:66` — verified `adb emu geo fix` command format (lon before lat)
- sim-location's `src/server/playback.ts:51-61` — verified `simctl location start` stdin piping approach
- simvyn's `packages/server/src/ws-broker.ts` — verified envelope protocol and channel subscription
- simvyn's `packages/modules/device-management/manifest.ts` — verified module manifest contract
- simvyn's `packages/dashboard/src/stores/panel-registry.ts` — verified panel registration pattern
- simvyn's `packages/core/src/storage.ts` — verified ModuleStorage interface and file paths

### Secondary (MEDIUM confidence)
- Nominatim Usage Policy (https://operations.osmfoundation.org/policies/nominatim/) — 1 request/second, proper User-Agent required
- `@tmcw/togeojson` README — DOMParser requirement, supports GPX and KML
- Apple `simctl location` man page — `set` for single point, `start` for route with `--speed` and stdin

### Tertiary (LOW confidence)
- None — all findings verified against actual source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already used in sim-location, versions verified from package.json
- Architecture: HIGH — module contract verified against existing device-management module implementation
- Pitfalls: HIGH — identified from analyzing actual code differences between sim-location and simvyn architectures

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain, no fast-moving dependencies)
