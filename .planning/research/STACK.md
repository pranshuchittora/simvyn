# Technology Stack — Collections + Getting Started Documentation

**Project:** Simvyn — Collections feature + Getting Started docs
**Researched:** 2026-03-04
**Scope:** Stack ADDITIONS only. Existing stack is validated and not re-researched.

## Verdict: Zero New Dependencies

The Collections feature and Getting Started documentation require **no new npm packages**. Every capability needed is already available in the existing stack. This is the strongest possible outcome for a feature addition — zero dependency growth, zero version compatibility risk, zero bundle size increase.

## Existing Stack Capabilities for Collections

### Drag-and-Drop Step Reordering: Framer Motion `Reorder`

| What | Details |
|------|---------|
| Package | `framer-motion` (already `^12.34.3` in dashboard) |
| Import | `import { Reorder, useDragControls } from "framer-motion"` |
| API | `Reorder.Group` + `Reorder.Item` — built-in vertical sortable list |
| Confidence | HIGH — verified at [motion.dev/docs/react-reorder](https://motion.dev/docs/react-reorder) |

**Why this, not @dnd-kit:** Framer Motion's `Reorder` is purpose-built for simple single-axis drag-to-reorder lists. It provides layout animations, exit animations via `AnimatePresence`, drag handle support via `useDragControls`, z-index management during drag, and auto-scrolling in scrollable containers — all out of the box. The Collections step list is a simple vertical reorder inside a builder panel. `Reorder` is explicitly designed for this use case. @dnd-kit would add ~30kB for multi-column/cross-list DnD capabilities we don't need.

**Usage pattern for step reordering:**
```tsx
import { Reorder, useDragControls } from "framer-motion"

function StepList({ steps, onReorder }) {
  return (
    <Reorder.Group axis="y" values={steps} onReorder={onReorder} as="div">
      {steps.map((step) => (
        <StepItem key={step.id} step={step} />
      ))}
    </Reorder.Group>
  )
}

function StepItem({ step }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={step}
      dragListener={false}
      dragControls={controls}
      as="div"
    >
      <div onPointerDown={(e) => controls.start(e)}>⠿</div>
      {/* step content */}
    </Reorder.Item>
  )
}
```

**Key details verified from official docs:**
- `dragListener={false}` + `useDragControls` restricts dragging to the handle only (prevents accidental drag when interacting with step parameters)
- `Reorder.Item` auto-sets `z-index` on dragged item (requires `position: relative`)
- `AnimatePresence` wrapping enables enter/exit animations for added/removed steps
- `Reorder.Group` auto-scrolls when dragging near container edges

### Real-Time Execution Feedback: WebSocket Broker

| What | Details |
|------|---------|
| Server | `WsBroker` (packages/server/src/ws-broker.ts) — channel-based pub/sub |
| Client | `useWsListener(channel, type, handler)` hook |
| Pattern | Existing `channel:type` envelope with `requestId` for correlation |

The execution feedback pattern (per-step spinner/check/fail/skip per device) maps directly to the existing WebSocket architecture:

1. Dashboard sends `{ channel: "collections", type: "execute", payload: { collectionId, deviceIds } }`
2. Server executes steps sequentially per device, broadcasting progress:
   ```json
   { "channel": "collections", "type": "step-progress", "payload": {
     "executionId": "...",
     "deviceId": "device-abc",
     "stepIndex": 2,
     "status": "running" | "success" | "failed" | "skipped",
     "error": "optional error message"
   }}
   ```
3. Dashboard subscribes via `useWsListener("collections", "step-progress", handler)` and updates a Zustand store

This is the exact same pattern used by location playback (ws-handler.ts broadcasts position updates) and log streaming (batched log entries). No new transport or protocol needed.

### Collection Persistence: `createModuleStorage`

| What | Details |
|------|---------|
| API | `createModuleStorage("collections")` from `@simvyn/core` |
| Storage | JSON files in `~/.simvyn/collections/` |
| Pattern | `storage.read<Collection[]>("collections")` / `storage.write("collections", data)` |

The existing `ModuleStorage` interface (`read<T>`, `write<T>`, `delete`) with atomic write (write to `.tmp` then rename) is exactly what's needed. The location module's `storage.ts` is the blueprint — it stores `SavedLocation[]` and `SavedRoute[]` the same way collections will store `Collection[]`.

**Collection data shape (JSON file at `~/.simvyn/collections/collections.json`):**
```typescript
interface CollectionStep {
  id: string
  actionId: string       // references a known action (e.g., "set-location", "toggle-dark-mode")
  params: Record<string, unknown>  // per-step parameter values
}

interface Collection {
  id: string
  name: string
  description?: string
  steps: CollectionStep[]
  createdAt: number
  updatedAt: number
}
```

### Collection Builder UI: Existing Component Patterns

| Need | Existing Pattern |
|------|-----------------|
| Modal/dialog for apply device picker | Command palette `DevicePicker` component (multi-select device list with checkboxes) |
| Step parameter configuration | Command palette `StepRenderer` + `ParameterStep` type (text inputs, dropdowns keyed by `paramKey`) |
| Card grid layout | Location `FavoritesPanel` (grid of cards with action buttons) |
| Action catalog with categories | Command palette `getActions()` returns typed `MultiStepAction[]` with icons |
| Toast feedback | `sonner` toast (already used throughout for success/error) |
| Platform compatibility | `PlatformCapability` type + `Device.platform` field for filtering |
| Unique IDs | `crypto.randomUUID()` (used in location storage, Node.js built-in) |

### Server-Side Module: Existing Module Architecture

| Need | Existing Pattern |
|------|-----------------|
| Module manifest | `SimvynModule` interface — `name`, `register`, `cli`, `capabilities` |
| Route prefix | Auto-registered at `/api/modules/collections/*` by module loader |
| CLI subcommands | `cli(program)` callback in manifest — `simvyn collections list/run/create` |
| WebSocket channel | `fastify.wsBroker.registerChannel("collections", handler)` |

The collections module follows the exact pattern of the location module: `manifest.ts` + `routes.ts` + `storage.ts` + `ws-handler.ts`.

### Dashboard Panel: Existing Registration

| Need | Existing Pattern |
|------|-----------------|
| Panel registration | `registerPanel("collections", CollectionsPanel)` in a side-effect import |
| Sidebar icon | Add to `moduleIconMap` and `moduleLabelMap` in `module-icons.tsx` |
| Route handling | Auto-handled — existing `/:moduleName` route in App.tsx matches "collections" |

## Existing Stack Capabilities for Documentation

### Getting Started Documentation: README.md Expansion

| What | Details |
|------|---------|
| Format | Markdown (existing `README.md` at repo root) |
| Tool | No tool needed — hand-authored Markdown with screenshot placeholders |
| Hosting | GitHub renders Markdown natively; npm shows README on package page |

No documentation generator (Docusaurus, VitePress, etc.) is needed. The Getting Started content is inline README expansion with per-feature walkthrough sections. This matches the project's existing documentation pattern and is the right approach for a CLI tool's README.

## What NOT to Add

| Library | Why Avoid |
|---------|-----------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | Framer Motion `Reorder` already handles vertical list reordering. @dnd-kit adds ~30kB for multi-column/cross-container DnD we don't need. |
| `react-beautiful-dnd` | Deprecated (archived by Atlassian in 2024). Don't use. |
| `uuid` | `crypto.randomUUID()` is built into Node.js 22+ and available in all modern browsers. Already used in the codebase. |
| `immer` | Zustand's `set((state) => ...)` with spread patterns is sufficient. The project already uses this pattern in 15+ stores. |
| `@tanstack/react-query` | REST calls for collection CRUD are simple fetch calls. The project already uses direct `fetch` + Zustand for the same pattern in favorites-store.ts. |
| `zod` | Listed in original STACK.md but never actually installed. Collection types are TypeScript interfaces validated by existing patterns. Don't add for this feature. |
| `Docusaurus` / `VitePress` / `Starlight` | Getting Started docs are README sections, not a docs site. A devtool CLI doesn't need a hosted documentation platform. |
| `mdx-bundler` / `remark` | No dynamic Markdown rendering. Static README.md only. |
| `p-limit` / `p-queue` | Batch execution can use a simple sequential `for...of` loop with `Promise.allSettled` per step across devices. No concurrency library needed for serial step execution. |
| Socket.io | WebSocket broker already handles real-time execution feedback. |

## Integration Points with Existing Stack

### 1. Collections Store ↔ Zustand Pattern

Follow the `favorites-store.ts` pattern exactly: Zustand store with async methods that call REST endpoints, then refetch from server to update local state. No optimistic updates needed — collections are not high-frequency operations.

```typescript
// Same pattern as useFavoritesStore
export const useCollectionsStore = create<CollectionsState>()((set, get) => ({
  collections: [],
  loading: false,
  async fetchCollections() { /* fetch /api/modules/collections */ },
  async saveCollection(data) { /* POST, then refetch */ },
  async deleteCollection(id) { /* DELETE, then refetch */ },
  async updateCollection(id, data) { /* PUT, then refetch */ },
}))
```

### 2. Execution Engine ↔ Server-Side Sequential Execution

The execution engine runs on the server (not the dashboard). It receives a collection ID + target device IDs, resolves each step to the corresponding adapter method call, and executes steps sequentially per device. This avoids race conditions on device state.

**Important:** Execution uses the same adapter methods the command palette actions use (e.g., `adapter.setLocation()`, `adapter.setAppearance()`), but driven server-side instead of client-side `fetch()` calls. This is intentional — the server has direct access to `fastify.deviceManager.getAdapter()`.

### 3. Action Registry ↔ Collections Builder

The command palette's `getActions()` function (actions.tsx) defines the available actions. The collections builder needs a **server-side action registry** — a list of available actions with their parameter schemas — so the builder knows what parameters each step type needs. This is a new concept but uses existing types:

```typescript
interface CollectionActionDef {
  id: string
  label: string
  category: string
  platforms: Platform[]  // which platforms support this action
  params: Array<{
    key: string
    label: string
    type: "string" | "number" | "boolean" | "select"
    options?: string[]  // for select type
    required: boolean
  }>
}
```

This replaces the client-side `MultiStepAction.execute` function with a server-side execution model. The builder UI renders parameter inputs based on `CollectionActionDef.params`, and the server maps `actionId` + `params` to actual adapter calls during execution.

### 4. Device Picker Modal ↔ Existing DevicePicker Component

The command palette already has a `DevicePicker.tsx` that renders a multi-select device list with checkboxes, platform grouping, and state indicators. The collections "Apply to devices" modal can reuse this component (or extract its core logic into a shared component) rather than building a new device selection UI.

### 5. Platform Compatibility ↔ PlatformCapability

Each `CollectionActionDef` declares `platforms: Platform[]`. When a user selects target devices for collection execution, the UI compares each step's platform requirements against each device's `device.platform`. Steps incompatible with a device get `status: "skipped"` in the execution feedback. This uses the existing `Platform` type (`"ios" | "android"`) and `PlatformCapability` enum.

## Version Compatibility

No new packages means no new version compatibility concerns. All existing packages remain at their current pinned versions. The features use only existing APIs from:

| Package | Version | API Used |
|---------|---------|----------|
| `framer-motion` | `^12.34.3` | `Reorder.Group`, `Reorder.Item`, `useDragControls`, `AnimatePresence` |
| `zustand` | `^5` | `create<State>()()` with async methods |
| `react` | `^19` | `useState`, `useCallback`, `useEffect` |
| `sonner` | `^2.0.7` | `toast.success()`, `toast.error()` |
| `lucide-react` | `^0.575.0` | Icons for action categories and collection cards |
| `@simvyn/core` | `*` | `createModuleStorage()` |
| `@simvyn/types` | `*` | `Device`, `Platform`, `PlatformCapability`, `WsEnvelope` |
| `fastify` | `^5.7.4` | Route registration, request validation |
| `@fastify/websocket` | `^11.2.0` | WsBroker channel for execution feedback |

## Sources

- Framer Motion Reorder docs: [motion.dev/docs/react-reorder](https://motion.dev/docs/react-reorder) — verified API: `Reorder.Group`, `Reorder.Item`, `useDragControls`, axis="y", auto-scroll, z-index management (HIGH confidence)
- @dnd-kit npm: [@dnd-kit/core v6.3.1](https://www.npmjs.com/package/@dnd-kit/core), [@dnd-kit/sortable v10.0.0](https://www.npmjs.com/package/@dnd-kit/sortable) — 9.2M weekly downloads, confirmed as alternative but unnecessary here (HIGH confidence)
- Codebase analysis: Direct inspection of existing stores (favorites-store.ts, device-store.ts), WebSocket broker (ws-broker.ts), module loader (module-loader.ts), storage system (storage.ts), command palette actions (actions.tsx, types.ts), module manifests (location/manifest.ts) (HIGH confidence)
- npm package.json files: All version numbers read directly from repository package.json files (HIGH confidence)

---
*Stack research for: Simvyn — Collections + Getting Started Documentation*
*Researched: 2026-03-04*
