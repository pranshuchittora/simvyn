# Architecture Patterns

**Domain:** Collections feature (reusable device action sets with batch execution) for Simvyn mobile devtool dashboard
**Researched:** 2026-03-04
**Confidence:** HIGH — based on direct codebase analysis, not external sources

## Existing Architecture Summary

Before designing Collections, here's how the existing system works:

```
┌─────────────────────────────────────────────────────────────────┐
│  CLI (Commander)          Dashboard (React + Zustand)           │
│  ├── simvyn start         ├── Sidebar (module icons)            │
│  ├── simvyn device ...    ├── ModuleShell (panel container)     │
│  └── simvyn location ...  ├── CommandPalette (cmdk actions)     │
│                           └── WsProvider (envelope-based WS)    │
├─────────────────────────────────────────────────────────────────┤
│  Server (Fastify)                                               │
│  ├── moduleLoaderPlugin → /api/modules/{name}/* routes          │
│  ├── wsBrokerPlugin → /ws (channel-based multiplexing)          │
│  ├── deviceManager → poll + cache + event-emit                  │
│  └── processManager → spawn/exec with cleanup                  │
├─────────────────────────────────────────────────────────────────┤
│  Modules (packages/modules/*)                                   │
│  ├── manifest.ts → { name, register, cli, capabilities }       │
│  ├── routes.ts → Fastify route handlers                        │
│  ├── ws-handler.ts → wsBroker.registerChannel()                │
│  └── cli.ts → Commander subcommands                            │
├─────────────────────────────────────────────────────────────────┤
│  Core (packages/core)                                           │
│  ├── PlatformAdapter (ios.ts, android.ts)                      │
│  ├── DeviceManager (polling, event emission)                   │
│  └── createModuleStorage() → ~/.simvyn/{module}/{key}.json     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Patterns Observed

1. **Actions are HTTP-first**: Every module action is a `POST /api/modules/{module}/{action}` endpoint that takes `{ deviceId, ...params }` and returns `{ success: true }` or error. This is the universal invocation contract.

2. **No cross-module dependency**: Modules never import from each other. They all independently use `fastify.deviceManager.getAdapter(platform)` to call PlatformAdapter methods.

3. **Command palette already does batch**: The `toggle-dark-mode` and `set-locale` actions in `actions.tsx` already loop over `ctx.selectedDeviceIds` and fire sequential HTTP requests per device. This is the exact pattern Collections will formalize.

4. **WS is for streaming feedback**: WS channels are used for real-time data (location playback position, device list updates, log streaming), not for request/response. HTTP handles request/response.

5. **Storage is simple JSON files**: `createModuleStorage("module-name")` → read/write/delete of `~/.simvyn/{module-name}/{key}.json`. No database, no indexing.

---

## Recommended Architecture for Collections

### Core Design Decision: How Collections References Other Modules' Actions

**Decision: Adapter-level action registry, not HTTP replays or code-level imports.**

Collections doesn't import or call other modules' routes. It defines an action registry that maps abstract action IDs directly to PlatformAdapter method calls. Each entry declares parameter schemas, platform compatibility, and labels. The execution engine uses `deviceManager.getAdapter(platform)` — the same primitive every module already uses.

**Why this works:**
- Every existing action is ultimately just an adapter method call wrapped in validation
- The PlatformAdapter interface IS the integration contract — it's typed, versioned, and platform-aware
- No coupling between Collections and other modules whatsoever
- New adapter methods automatically become composable by adding a registry entry
- Platform compatibility checks use the existing `!!adapter.methodName` pattern

**Why not internal HTTP calls (replaying routes):**
- Extra serialization/deserialization overhead per step per device
- Would need to parse HTTP error responses instead of direct try/catch
- Routes are thin wrappers around adapter calls anyway — calling routes is just indirection

**Why not auto-discovering routes:**
- Not all routes are composable (GET queries, file downloads, etc.)
- Route signatures don't carry param schemas or display labels
- Fragile coupling to route naming conventions

### Architecture: Action Registry + Execution Engine

```
┌──────────────────────────────────────────────────────────────────────┐
│                        COLLECTIONS MODULE                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │ Action        │  │ Collection       │  │ Execution              │ │
│  │ Registry      │  │ Storage          │  │ Engine                 │ │
│  │              │  │                  │  │                        │ │
│  │ Defines what │  │ Persists saved   │  │ Runs steps across      │ │
│  │ actions exist │  │ collections as   │  │ devices with WS        │ │
│  │ with schemas  │  │ JSON in          │  │ progress feedback      │ │
│  │ + platform   │  │ ~/.simvyn/       │  │                        │ │
│  │ compat info  │  │ collections/     │  │ Server-side             │ │
│  │              │  │                  │  │ orchestration           │ │
│  └──────┬───────┘  └──────┬───────────┘  └───────┬────────────────┘ │
│         │                 │                       │                  │
│         ▼                 ▼                       ▼                  │
│  GET /actions       CRUD /collections      POST /execute            │
│  (available         GET/POST/PUT/DELETE     WS: collections channel │
│   action catalog)   /collections/:id                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### New Components (Server)

| Component | Location | Responsibility | Communicates With |
|-----------|----------|----------------|-------------------|
| `action-registry.ts` | `packages/modules/collections/` | Declares all composable actions with schemas, platform compatibility, and parameter definitions. Maps action IDs to adapter method calls. | Routes, Execution Engine |
| `routes.ts` | `packages/modules/collections/` | CRUD for collections + execute endpoint + list available actions | Storage, Action Registry, Execution Engine |
| `execution-engine.ts` | `packages/modules/collections/` | Runs a collection's steps sequentially against target devices. Per-step parallel device execution. Reports progress via WS broadcasts. | wsBroker, deviceManager, PlatformAdapter |
| `ws-handler.ts` | `packages/modules/collections/` | WS channel `collections` for cancel messages. (Progress broadcasts come from execution engine.) | wsBroker, Execution Engine |
| `manifest.ts` | `packages/modules/collections/` | Standard SimvynModule manifest | Module loader |
| `cli.ts` | `packages/modules/collections/` | `simvyn collections list`, `simvyn collections apply <name> <device...>` | Execution Engine, Storage |

### New Components (Dashboard)

| Component | Location | Responsibility | Communicates With |
|-----------|----------|----------------|-------------------|
| `CollectionsPanel.tsx` | `packages/dashboard/src/panels/` | Main panel with list view + detail/editor view | collections-store |
| `stores/collections-store.ts` | `packages/dashboard/src/panels/collections/` | Zustand store for collections CRUD + execution state | REST API, WS |
| `StepBuilder.tsx` | `packages/dashboard/src/panels/collections/` | Visual step builder — pick action, configure params, reorder | action-registry data |
| `ExecutionView.tsx` | `packages/dashboard/src/panels/collections/` | Live execution progress display with per-step/per-device status | collections-store (WS) |
| `ActionPicker.tsx` | `packages/dashboard/src/panels/collections/` | Modal/popover to browse and add actions from the registry | action-registry data |
| `StepCard.tsx` | `packages/dashboard/src/panels/collections/` | Individual step display with platform badges, params, drag handle | StepBuilder |

### Modified Components

| Component | Change | Why |
|-----------|--------|-----|
| `packages/cli/src/all-modules.ts` | Add `collections` import + entry in `allModules` array | Register the new module |
| `packages/dashboard/src/App.tsx` | Add `import "./panels/CollectionsPanel"` | Side-effect panel registration |
| `packages/dashboard/src/stores/module-store.ts` | Add `"collections"` to `DOCK_ORDER` | Position in sidebar (before `device-settings`) |
| `packages/dashboard/src/components/icons/module-icons.tsx` | Add collections icon mapping (lucide `Layers` icon) | Sidebar icon |
| `packages/dashboard/src/components/command-palette/actions.tsx` | Add "Apply Collection" action | Quick-apply from palette |
| `packages/dashboard/src/components/command-palette/types.ts` | Add `"collection-select"` to `StepType` union | New step type for palette |

---

## Data Model

### Action Descriptor (what the registry provides to the UI)

```typescript
interface ActionDescriptor {
  id: string;                          // e.g. "set-appearance"
  label: string;                       // e.g. "Set Appearance"
  description: string;                 // e.g. "Switch between light and dark mode"
  module: string;                      // e.g. "device-settings" — for grouping in UI
  capabilities: PlatformCapability[];  // e.g. ["settings"] — for platform badge display
  params: ActionParam[];               // parameter schema for the action
}

interface ActionParam {
  key: string;           // e.g. "mode"
  label: string;         // e.g. "Mode"
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  options?: { value: string; label: string }[];  // for type "select"
  default?: unknown;
  placeholder?: string;
}
```

### Action Executor (server-side, not exposed to client)

```typescript
interface ActionExecutor extends ActionDescriptor {
  execute: (
    adapter: PlatformAdapter,
    deviceId: string,
    params: Record<string, unknown>
  ) => Promise<void>;
  isSupported: (adapter: PlatformAdapter) => boolean;
}
```

### Collection (what gets persisted)

```typescript
interface Collection {
  id: string;              // UUID
  name: string;            // "Dark Mode + Tokyo Location"
  description?: string;
  steps: CollectionStep[];
  createdAt: number;       // timestamp
  updatedAt: number;
}

interface CollectionStep {
  id: string;              // UUID per step
  actionId: string;        // references ActionDescriptor.id
  params: Record<string, unknown>;  // filled-in parameters
  label?: string;          // optional override label
}
```

**Storage location:** `~/.simvyn/collections/collections.json` (single file with array, consistent with push payloads and deep-links favorites patterns).

### Execution State (transient, in-memory + WS broadcast)

```typescript
interface ExecutionRun {
  runId: string;           // UUID per execution
  collectionId: string;
  collectionName: string;
  deviceIds: string[];     // target devices
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: number;
  currentStepIndex: number;
  steps: StepExecution[];
}

interface StepExecution {
  stepId: string;
  actionId: string;
  label: string;
  devices: DeviceStepResult[];
}

interface DeviceStepResult {
  deviceId: string;
  deviceName: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  error?: string;
  startedAt?: number;
  completedAt?: number;
}
```

---

## Data Flow: Collection Execution

### Execution Model Decision: Server-Side Orchestration

**Decision: Server-side sequential execution with WS progress streaming.**

The client sends `POST /execute` with `{ collectionId, deviceIds }`, and the server orchestrates the entire execution, broadcasting progress per step per device via the `collections` WS channel.

**Why server-side, not client-side:**

1. **Resilience**: If the browser tab closes during a 10-device batch, server continues. Client-side fetch loops would abort.
2. **Atomicity per step**: Server ensures one step completes on all devices before moving to the next, preventing inconsistent states.
3. **CLI support**: `simvyn collections apply` needs the same execution logic. Server-side means both UI and CLI call the same endpoint.
4. **Precedent**: The location playback engine uses this exact pattern — client sends `start-playback`, server runs the engine and broadcasts position updates via WS.

### Execution Flow Diagram

```
Client (Dashboard or CLI)
  │
  ├── POST /api/modules/collections/execute
  │   Body: { collectionId, deviceIds }
  │   Response: { runId }
  │
  │   ┌─────────────── Server Execution Engine ──────────────────┐
  │   │                                                          │
  │   │  for each step in collection.steps:                      │
  │   │    resolve ActionExecutor from registry                  │
  │   │                                                          │
  │   │    for each deviceId in deviceIds (parallel):            │
  │   │      1. Lookup device from deviceManager                 │
  │   │      2. Get adapter for device.platform                  │
  │   │      3. Check isSupported(adapter)                       │
  │   │         → if false: mark "skipped", broadcast, continue  │
  │   │      4. Broadcast WS: step-started                       │
  │   │      5. Execute adapter method with step.params          │
  │   │      6. Broadcast WS: step-completed (success/failed)    │
  │   │                                                          │
  │   │    Wait for all devices to finish this step               │
  │   │    (before starting next step)                           │
  │   │                                                          │
  │   │  On all complete: broadcast WS: run-completed            │
  │   │  On cancel (WS message): stop after current step         │
  │   └──────────────────────────────────────────────────────────┘
  │
  └── WS subscribe to "collections" channel
      ├── step-started    { runId, stepId, deviceId }
      ├── step-completed  { runId, stepId, deviceId, success, error? }
      ├── step-skipped    { runId, stepId, deviceId, reason }
      ├── run-completed   { runId, summary: StepExecution[] }
      └── run-failed      { runId, error, completedSteps }
```

### Parallel Execution Within a Step

For a single step running on multiple devices, execute **all devices in parallel** (Promise.all), then wait for all to complete before the next step. This matches the location WS handler which uses `Promise.all` for multi-device location setting.

```
Step 1: Set Dark Mode
  ├── Device A (parallel) ──► success
  ├── Device B (parallel) ──► success
  └── Device C (parallel) ──► success
  All done → proceed to Step 2

Step 2: Set Location (Tokyo)
  ├── Device A (parallel) ──► success
  ├── Device B (parallel) ──► skipped (Android, no setLocation? — actually both support it)
  └── Device C (parallel) ──► success
  All done → run-completed
```

### Why Direct Adapter Calls (Not Internal HTTP)

The execution engine calls PlatformAdapter methods directly via `deviceManager.getAdapter(platform)`:

1. **Performance**: No HTTP serialization overhead per step per device
2. **Error handling**: Direct try/catch, not HTTP status code parsing
3. **Consistency**: Every existing route is a thin wrapper doing `find device → get adapter → call method`. The execution engine does exactly this with added progress tracking.
4. **Precedent**: The location WS handler calls `adapter.setLocation()` directly — not `fetch("/api/modules/location/set")`.

---

## Patterns to Follow

### Pattern 1: Module Manifest Contract

Collections follows the exact same manifest structure as every other module:

```typescript
// packages/modules/collections/manifest.ts
const collectionsModule: SimvynModule = {
  name: "collections",
  version: "0.1.0",
  description: "Reusable device action sets with batch execution",
  icon: "layers",

  async register(fastify, _opts) {
    await fastify.register(collectionsRoutes);
    registerCollectionsWsHandler(fastify);
  },

  cli(program) {
    registerCollectionsCli(program);
  },

  capabilities: [],  // Collections doesn't own platform capabilities
};
```

### Pattern 2: Zustand Store with Dual Access

Follow the existing pattern of hooks + `getState()` for imperative access:

```typescript
// Imperative access from WS listener callbacks
useCollectionsStore.getState().setStepProgress(runId, stepId, deviceId, "success");

// Hook access from components
const collections = useCollectionsStore((s) => s.collections);
```

### Pattern 3: Panel Registration Side-Effect

```typescript
// Bottom of CollectionsPanel.tsx
registerPanel("collections", CollectionsPanel);
```

Then import as side-effect in `App.tsx`:
```typescript
import "./panels/CollectionsPanel";
```

### Pattern 4: WS Channel for Streaming Feedback

Following the location playback pattern:

```typescript
// Server: ws-handler.ts
wsBroker.registerChannel("collections", (type, payload, socket, requestId) => {
  if (type === "cancel") {
    const { runId } = payload as { runId: string };
    cancelRun(runId);
    wsBroker.send(socket, "collections", "run-cancelled", { runId }, requestId);
  }
});

// Execution engine broadcasts progress:
wsBroker.broadcast("collections", "step-completed", {
  runId, stepId, deviceId, success: true
});
```

```typescript
// Client: WS listeners in collections-store.ts or CollectionsPanel.tsx
useWsListener("collections", "step-completed", useCallback((payload) => {
  const data = payload as StepCompletedPayload;
  useCollectionsStore.getState().updateStepResult(data);
}, []));
```

### Pattern 5: Storage via createModuleStorage

```typescript
const storage = createModuleStorage("collections");
const collections = await storage.read<Collection[]>("collections") ?? [];
await storage.write("collections", collections);
```

### Pattern 6: Action Registry Entry Structure

Each composable action follows this template:

```typescript
{
  id: "set-appearance",
  label: "Set Appearance",
  description: "Switch between light and dark mode",
  module: "device-settings",
  capabilities: ["settings"],
  params: [
    {
      key: "mode",
      label: "Mode",
      type: "select",
      required: true,
      options: [
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ],
    },
  ],
  execute: async (adapter, deviceId, params) => {
    await adapter.setAppearance!(deviceId, params.mode as "light" | "dark");
  },
  isSupported: (adapter) => !!adapter.setAppearance,
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Cross-Module Imports

**What:** Importing from `packages/modules/location/routes.ts` or any other module directly.

**Why bad:** Breaks the module isolation contract. Modules are loaded dynamically. Direct imports create build-time coupling and make modules non-removable.

**Instead:** The action registry maps action IDs to adapter method calls. Collections has zero knowledge of other modules' internal structure.

### Anti-Pattern 2: Client-Side Sequential Fetch Loops for Execution

**What:** Having the dashboard fire individual `fetch()` calls per step per device (like the current command palette does for simple actions).

**Why bad:** Browser tab close = incomplete execution. No central state. CLI can't reuse. Race conditions with concurrent executions. The palette's existing loops work for 1-3 actions, but collections could have 10+ steps across 5+ devices.

**Instead:** Single `POST /execute` → server orchestrates → WS progress.

### Anti-Pattern 3: Auto-Discovering Actions from Route Definitions

**What:** Scanning Fastify route tables to automatically build the action registry.

**Why bad:** Not all routes are composable (GET endpoints, file downloads, etc.). Route signatures don't carry param schemas or labels. Fragile coupling to naming conventions.

**Instead:** Explicit, curated action registry with hand-written param schemas. More work upfront, but correct, maintainable, and provides good UX with labels/descriptions.

### Anti-Pattern 4: Storing Execution State in Persistent Storage

**What:** Writing `ExecutionRun` state to `~/.simvyn/collections/` on every progress update.

**Why bad:** Execution is transient. Writing to disk on every step progress update is wasteful I/O. If the server crashes, the execution is lost regardless.

**Instead:** In-memory state on the server, streamed to clients via WS. Optionally persist a run summary after completion (execution history).

### Anti-Pattern 5: Singleton Execution State

**What:** Using a single `activeRun` variable that prevents concurrent executions.

**Why bad:** CLI and UI might trigger executions simultaneously. Two users (if dashboard is accessed by multiple people) would conflict.

**Instead:** Track runs by `runId` in a Map. Route WS progress by `runId`. Allow concurrent runs.

---

## Integration Points with Existing Modules

### How Collections References Other Modules' Capabilities

Collections references **PlatformAdapter methods** and **PlatformCapability constants** — not modules. The existing `PlatformCapability` type and adapter method signatures ARE the integration contract.

| Action ID | Adapter Method | Capability | iOS | Android |
|-----------|---------------|------------|-----|---------|
| `set-appearance` | `setAppearance(id, mode)` | `settings` | ✓ | ✓ |
| `set-location` | `setLocation(id, lat, lon)` | `setLocation` | ✓ | ✓ |
| `clear-location` | `clearLocation(id)` | `setLocation` | ✓ | ✓ |
| `set-clipboard` | `setClipboard(id, text)` | `clipboard` | ✓ | ✓ |
| `set-locale` | `setLocale(id, locale)` | `settings` | ✓ | ✓ |
| `set-status-bar` | `setStatusBar(id, overrides)` | `statusBar` | ✓ | ✗ |
| `clear-status-bar` | `clearStatusBar(id)` | `statusBar` | ✓ | ✗ |
| `grant-permission` | `grantPermission(id, bundleId, perm)` | `privacy` | ✓ | ✓ |
| `open-deep-link` | `openUrl(id, url)` | `deepLinks` | ✓ | ✓ |
| `add-media` | `addMedia(id, filePath)` | `addMedia` | ✓ | ✓ |
| `launch-app` | `launchApp(id, bundleId)` | `appManagement` | ✓ | ✓ |
| `terminate-app` | `terminateApp(id, bundleId)` | `appManagement` | ✓ | ✓ |
| `set-content-size` | `setContentSize(id, size)` | `accessibility` | ✓ | ✓ |
| `set-increase-contrast` | `setIncreaseContrast(id, enabled)` | `accessibility` | ✓ | ✓ |

Platform compatibility is determined at runtime by `isSupported: (adapter) => !!adapter.methodName` — matching how every existing route checks capabilities. The UI gets this info from `GET /actions` which includes capabilities, allowing the StepBuilder to show platform badges.

### Command Palette Integration

Add a new "Apply Collection" action to `actions.tsx`:

```typescript
{
  id: "apply-collection",
  label: "Apply Collection",
  description: "Run a saved collection on devices",
  icon: <Layers size={18} />,
  steps: [
    { id: "pick-collection", type: "collection-select", label: "Select Collection" },
    { id: "pick-devices", type: "device-select", label: "Select Devices", multi: true },
  ],
  execute: async (ctx) => {
    const collectionId = ctx.params.collectionId as string;
    const res = await fetch("/api/modules/collections/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId, deviceIds: ctx.selectedDeviceIds }),
    });
    if (res.ok) toast.success("Collection started");
    else toast.error("Failed to start collection");
  },
}
```

This requires:
- Adding `"collection-select"` to the `StepType` union in `types.ts`
- Creating a `CollectionPicker.tsx` in `command-palette/` (matching the pattern of `LocalePicker`, `LocationPicker`)
- Adding the picker rendering in `StepRenderer.tsx`

---

## Module File Structure

```
packages/modules/collections/
├── manifest.ts           # SimvynModule definition
├── action-registry.ts    # ActionExecutor[] — all composable actions with schemas
├── routes.ts             # CRUD endpoints + execute + list actions
├── execution-engine.ts   # Sequential step runner with parallel per-device execution
├── ws-handler.ts         # WS channel registration for cancel messages
└── cli.ts                # CLI: list, apply, create

packages/dashboard/src/panels/
├── CollectionsPanel.tsx   # Panel registration + main view (list ↔ editor toggle)
└── collections/
    ├── stores/
    │   └── collections-store.ts   # Zustand store for CRUD + execution state
    ├── StepBuilder.tsx            # Visual step editor with drag reorder
    ├── ExecutionView.tsx          # Live run progress grid
    ├── ActionPicker.tsx           # Action browser/selector
    ├── StepCard.tsx               # Individual step card with params + platform badges
    └── CollectionList.tsx         # Saved collections list
```

---

## Suggested Build Order

Based on dependency analysis:

### Phase 1: Foundation (server-side, no UI)

1. **Action Registry** (`action-registry.ts`) — Define types, implement 5-6 core actions
2. **Collection Storage + CRUD routes** (`routes.ts`) — Standard CRUD with `createModuleStorage`
3. **Module Manifest** (`manifest.ts`) — Wire up, add to `all-modules.ts`

### Phase 2: Execution Engine (server-side)

4. **Execution Engine** (`execution-engine.ts`) — Sequential steps, parallel devices, progress callbacks
5. **WS Handler** (`ws-handler.ts`) — Register `collections` channel, wire engine callbacks to broadcasts
6. **Execute Endpoint** (add to `routes.ts`) — `POST /execute` triggers engine, returns `runId`

### Phase 3: Dashboard UI — Collections CRUD

7. **Collections Store** (`collections-store.ts`) — REST CRUD + WS execution state
8. **CollectionsPanel + CollectionList** — Panel registration, list view with create/delete
9. **ActionPicker + StepBuilder + StepCard** — Build/edit step sequences with param configuration

### Phase 4: Execution Visualization + Integration

10. **ExecutionView** — WS-driven progress display with per-step per-device status
11. **Command Palette Integration** — `collection-select` step type + "Apply Collection" action
12. **CLI Support** (`cli.ts`) — `list`, `apply`, headless execution with progress output

### Phase 5: Polish + Expansion

13. **Remaining Actions** — Expand registry to cover all adapter methods
14. **Execution History** — Persist completed run summaries
15. **Collection Import/Export** — JSON sharing
16. **Collection Templates** — Pre-built collections for common workflows

### Dependency Graph

```
Action Registry (what's composable)
     │
     ├── Collection Storage (stores composed sequences)
     │         │
     │         ├── UI: List + Builder (create/edit collections)
     │         │
     │         └── Execution Engine (runs collections)
     │                   │
     │                   ├── WS Handler (streams progress)
     │                   │        │
     │                   │        └── UI: ExecutionView (visualizes progress)
     │                   │
     │                   ├── Execute Endpoint (triggers execution)
     │                   │
     │                   └── CLI: apply (headless execution)
     │
     └── Command Palette: "Apply Collection" action
```

The action registry is the root dependency. Storage comes next because both UI and execution need persisted collections. The execution engine must exist before any execution UI or CLI. WS enables live feedback. CLI and command palette are polish.

---

## Scalability Considerations

| Concern | At 1-5 devices | At 20+ devices | Mitigation |
|---------|---------------|-----------------|------------|
| Execution time | Negligible (seconds) | Could be 30+ seconds for 10-step collection | Parallel-per-device within each step (Promise.all). Steps themselves are sequential. |
| WS message volume | ~15 messages per run | ~600+ messages (10 steps × 20 devices × 3 events) | Batch WS: broadcast one `step-all-completed` message with all device results per step, rather than individual per-device messages. UI can still render per-device. |
| Concurrent runs | Unlikely | Possible from CLI + UI simultaneously | Track runs by `runId` in a Map. Allow concurrent runs with clear WS routing. |
| Collection file size | Trivial | Still trivial — collections are metadata | No concern. A collection with 20 steps is ~2KB of JSON. |

---

## Sources

All findings from direct codebase analysis — no external sources needed:

- `packages/types/src/device.ts` — PlatformAdapter interface (171 lines), PlatformCapability union
- `packages/types/src/module.ts` — SimvynModule interface
- `packages/types/src/ws.ts` — WsEnvelope protocol
- `packages/types/src/storage.ts` — ModuleStorage interface
- `packages/server/src/module-loader.ts` — Module loading, route prefix registration
- `packages/server/src/ws-broker.ts` — Channel-based WS multiplexing
- `packages/server/src/app.ts` — Server setup, deviceManager/processManager decorators
- `packages/core/src/storage.ts` — `createModuleStorage()` implementation
- `packages/core/src/device-manager.ts` — DeviceManager polling, event emission, adapter access
- `packages/modules/device-settings/routes.ts` — Typical route pattern (find device → get adapter → call method → return)
- `packages/modules/location/ws-handler.ts` — WS-based execution pattern (playback engine with progress broadcasts)
- `packages/dashboard/src/components/command-palette/actions.tsx` — Multi-device action execution pattern, existing "batch" approach
- `packages/dashboard/src/components/command-palette/types.ts` — MultiStepAction, AnyStep, StepType union
- `packages/dashboard/src/hooks/use-ws.ts` — Client-side WS subscription and listener pattern
- `packages/dashboard/src/stores/panel-registry.ts` — `registerPanel()` pattern
- `packages/dashboard/src/stores/module-store.ts` — DOCK_ORDER, module info
- `packages/dashboard/src/components/ModuleShell.tsx` — Panel rendering with `display:none/block`
- `packages/cli/src/all-modules.ts` — Module registration array
