# Domain Pitfalls: Collections Feature + Getting Started Documentation

**Domain:** Batch-action execution system for existing multi-module mobile devtool
**Researched:** 2026-03-04
**Confidence:** HIGH (based on direct analysis of simvyn codebase — module-loader, ws-broker, adapter types, command palette, storage patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites or fundamental architecture problems.

### Pitfall 1: Collections Calling Module HTTP Routes Instead of Adapter Methods Directly

**What goes wrong:**
The natural-seeming approach is to have Collections invoke other modules' actions by calling their HTTP endpoints (e.g., `POST /api/modules/device-settings/appearance`). This seems clean — "just call the API like the dashboard does." But it creates a cascade of problems:
- Every HTTP call serializes/deserializes JSON, validates auth, looks up the device, resolves the adapter — duplicating work for every step in a multi-step collection
- HTTP calls within the same process add ~5-10ms of latency per step from Fastify's request lifecycle. A 10-step collection on 5 devices = 50 HTTP calls = 250-500ms of pure overhead
- Error handling becomes HTTP status codes instead of typed errors — you lose the stack trace and error type, getting only `{ error: "Device must be booted" }` strings
- If the server changes a route path, body schema, or response format, the Collections module silently breaks with 404s or 400s — there's no compile-time safety
- The module route handlers in simvyn (e.g., `settingsRoutes`, `locationRoutes`) each independently look up the device and adapter. Collections would repeat this lookup 10+ times per device per collection run

**Why it happens:**
Each existing module's routes (`device-settings/routes.ts`, `location/routes.ts`, `app-management/routes.ts`) are self-contained Fastify handlers that receive raw HTTP requests. There's no shared "action" abstraction — the route IS the action. The codebase has no internal API layer between "HTTP handler" and "business logic." When you need to invoke Module A's capability from Module B, the only visible interface is the HTTP endpoint.

**Consequences:**
- 5-10x slower collection execution than necessary
- Fragile coupling to URL paths and body schemas that aren't typed
- Impossible to implement atomic rollback — HTTP calls are fire-and-forget from the caller's perspective
- Every module route change requires updating Collections (and no compiler will catch it)

**Prevention:**
Extract an **action registry** — a typed, in-process function map that both HTTP routes and Collections call. Each module registers its actions as plain async functions:

```typescript
// Action signature: (deviceId: string, params: Record<string, unknown>, adapter: PlatformAdapter) => Promise<ActionResult>
type ActionFn = (deviceId: string, params: Record<string, unknown>, ctx: ActionContext) => Promise<ActionResult>;

interface ActionRegistry {
  register(moduleId: string, actionId: string, fn: ActionFn, meta: ActionMeta): void;
  execute(moduleId: string, actionId: string, deviceId: string, params: Record<string, unknown>): Promise<ActionResult>;
  listActions(): ActionMeta[];
}
```

Existing module routes become thin wrappers that call `actionRegistry.execute()`. Collections call the same registry. One lookup, one adapter resolution, typed params, typed errors.

**Detection (warning signs during implementation):**
- Collection executor importing `fetch()` or constructing URL strings
- Collection steps containing API paths like `/api/modules/...`
- Tests that need a running HTTP server to test collection execution
- Collections silently skipping steps after a module route refactor

**Phase to address:** First phase of Collections — the action registry must exist before any collection execution logic. Cannot be retrofitted without rewriting every module route.

---

### Pitfall 2: Dual Capability Detection Systems Diverging

**What goes wrong:**
Simvyn has TWO different capability detection mechanisms that don't agree:

1. **`PlatformAdapter.capabilities()`**: Returns a `PlatformCapability[]` array (e.g., `["setLocation", "push", "screenshot", ...]`). iOS returns 18 capabilities, Android returns 17. This is a static list.

2. **Runtime `!!adapter?.methodName` checks**: Every route handler checks the actual method existence. For example, `device-settings/routes.ts` line 16: `if (!adapter?.setAppearance)`. The `device-settings/capabilities` endpoint (line 230-251) checks each method individually and returns a dynamic map.

These two systems can diverge. The `capabilities()` array says `"settings"` is supported, but individual method checks like `!!adapter?.setStatusBar` give per-action granularity. If Collections uses the `capabilities()` array to decide "can this platform run this step?", it will claim steps are supported that actually fail at runtime because the capability array is coarse-grained (e.g., Android reports `"settings"` but doesn't have `setStatusBar`).

**Why it happens:**
`PlatformCapability` is a union of 22 string literals, but `PlatformAdapter` has 50+ optional methods. The mapping between capability strings and adapter methods is implicit — there's no formal registry linking `"settings"` to `[setAppearance, setStatusBar, setLocale, ...]`. The device-settings module already solved this with its `/capabilities` endpoint that checks each method individually, but this solution is module-local, not reusable.

**Consequences:**
- Collections shows a step as "compatible" with Android, but it fails at runtime
- Users create cross-platform collections that seem valid but produce confusing partial failures
- Platform skip logic ("skip this iOS-only step on Android") misclassifies steps
- The dashboard shows green checkmarks for steps that will actually error

**Prevention:**
Collections must check capability at the **adapter method level**, not the `PlatformCapability` array level. Define a mapping from collection step types to specific adapter method names:

```typescript
const STEP_REQUIREMENTS: Record<CollectionStepType, keyof PlatformAdapter> = {
  'set-appearance': 'setAppearance',
  'set-status-bar': 'setStatusBar',
  'set-location': 'setLocation',
  'launch-app': 'launchApp',
  'set-locale': 'setLocale',
  // ...
};

function canExecuteStep(step: CollectionStep, adapter: PlatformAdapter): boolean {
  const method = STEP_REQUIREMENTS[step.type];
  return typeof adapter[method] === 'function';
}
```

This reuses the same pattern that already works in individual module routes. Don't invent a third system.

**Detection:**
- Code that reads `adapter.capabilities()` to determine step compatibility
- Steps failing at execution time that were marked as "compatible" in the UI
- Platform compatibility checks that reference `PlatformCapability` strings instead of adapter methods

**Phase to address:** Step definition phase — when designing the collection step schema. The capability check function must be part of the step definition, not a separate system.

---

### Pitfall 3: WebSocket Message Flood During Multi-Device Multi-Step Execution

**What goes wrong:**
A collection with 8 steps applied to 5 devices generates 40 step-execution events. If each event broadcasts a WS message for "step-started", "step-completed" or "step-failed", and potentially "step-skipped" for incompatible steps, that's 80-160 messages in rapid succession. The existing `wsBroker.broadcast()` iterates all subscribed clients and sends each message individually — there's no batching. The dashboard's `useWsListener` hook fires a handler per message, each potentially triggering a React re-render.

For context, the location module's `set-location` WS handler (location/ws-handler.ts line 22-43) already does multi-device broadcasting — it sends a single `location-set` event with a `results` array after all devices complete. But if Collections naively broadcasts per-step per-device, it will overwhelm the client.

The `WsProvider` in `use-ws.ts` dispatches every message through `listenersRef.current.get(key)` (line 65-69), iterating handlers synchronously. 160 rapid messages = 160 synchronous handler invocations = 160 potential `setState` calls = serious React rendering jank.

**Why it happens:**
- The WS broker was designed for one-at-a-time operations (set a location, take a screenshot), not batch operations
- Each step logically wants to report its status, and it's natural to broadcast per-step
- Developer tests with 1-2 devices and 2-3 steps; the problem only manifests at realistic scale

**Consequences:**
- Dashboard freezes during collection execution on multiple devices
- Progress UI updates in a stuttery, unreadable burst instead of smooth progression
- Other WS channels (device status, log streaming) get delayed behind collection status messages
- Browser drops WS messages if they arrive faster than the client can process them (buffering → memory spike)

**Prevention:**
1. **Server-side batching**: Accumulate step results and broadcast at a fixed interval (every 200ms) or at logical boundaries (all steps for one device complete, or all devices complete one step). The location module's pattern of collecting results into an array and broadcasting once (ws-handler.ts line 22-42) is the right model.

2. **Single collection-status channel with coalesced state**: Instead of individual `step-completed` events, broadcast the full collection execution state as a single message:
```typescript
{
  channel: "collections",
  type: "execution-progress",
  payload: {
    collectionId: "...",
    executionId: "...",
    devices: {
      "device-1": { completedSteps: 5, totalSteps: 8, currentStep: "set-locale", status: "running" },
      "device-2": { completedSteps: 3, totalSteps: 8, currentStep: "set-location", status: "running", skippedSteps: ["set-status-bar"] }
    }
  }
}
```
This replaces N messages with 1 message containing the full state.

3. **Client-side throttling**: Use `requestAnimationFrame` or a 100ms debounce on the collection progress handler to coalesce rapid state updates into single renders.

**Detection:**
- WS message count spikes during collection execution (add server-side logging)
- Dashboard DevTools network tab shows >10 WS messages/second during collection run
- React Profiler shows cascading re-renders during collection execution
- Other modules becoming unresponsive while a collection runs

**Phase to address:** First phase — the WS protocol for collection execution must be designed with batching from the start. Adding batching to an event-per-step protocol later requires changing both server and client.

---

### Pitfall 4: Collection Schema Becomes Unversioned and Unmigratable

**What goes wrong:**
Collections are persisted as JSON files via `createModuleStorage("collections")`. A collection step references a module and action by name with specific parameters. When the schema evolves (new step types, renamed parameters, changed action signatures), saved collections become invalid. Users who created collections before the schema change see:
- Steps that silently do nothing (parameter name changed, old value is ignored)
- Entire collections that fail to deserialize (new required field missing)
- Steps referencing actions that were renamed or removed

The existing storage pattern (`location/storage.ts`, `push/routes.ts`, `deep-links/routes.ts`) stores data as plain JSON arrays with no schema version. `SavedLocation`, `SavedPayload`, and `Favorite` interfaces have simple flat structures. But collection schemas will be complex (nested steps with typed params per module) and will evolve as new step types are added.

**Why it happens:**
- The `createModuleStorage` API is a raw key-value JSON store with no versioning support
- Simple saved data (a location with lat/lon) rarely changes shape. But collections reference other modules' action signatures, which change when those modules evolve
- "We'll add versioning later" — but by then, users have saved collections that can't be migrated because there's no version field to detect old formats

**Consequences:**
- Silent data corruption — old collections look valid in storage but produce wrong behavior
- Users lose saved collections on upgrade (nuclear option: wipe all data)
- No automated migration path — manual intervention or support tickets
- Increasingly complex ad-hoc migration code that checks for field existence instead of version numbers

**Prevention:**
Add a `schemaVersion` field from day one:

```typescript
interface CollectionV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  steps: CollectionStepV1[];
  createdAt: number;
  updatedAt: number;
}
```

Include a migration function that runs on load:
```typescript
function migrateCollection(raw: unknown): Collection {
  const data = raw as any;
  if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
    return runMigrations(data, data.schemaVersion ?? 0, CURRENT_SCHEMA_VERSION);
  }
  return data as Collection;
}
```

Step parameter schemas should be validated at load time, not just at execution time. If a step references a module action that no longer exists, flag it immediately when the collection is opened, not when it's halfway through execution.

**Detection:**
- Collection interfaces without a `schemaVersion` field
- `storage.read<Collection[]>("collections")` without validation or migration
- Users reporting "my collections don't work after update" with no version info in the data to diagnose

**Phase to address:** Storage design phase — the schema must include a version field from the first commit. Migration logic can be simple initially (just check version and throw a helpful error) but the version field must exist.

---

## Moderate Pitfalls

Mistakes that cause significant rework but not full rewrites.

### Pitfall 5: All-or-Nothing Execution Without Configurable Error Strategy

**What goes wrong:**
A collection of 8 steps is running on a device. Step 3 (set locale) fails because the device just rebooted and isn't fully booted yet. The remaining 5 steps — which would have worked fine — never execute. The user has to fix the device state and re-run the entire collection. Worse, steps 1-2 already ran, so the device is in a partially-configured state.

Alternatively: the implementation goes full "continue on error" and step 5 (launch app) runs before step 4 (install app) has been confirmed successful. The launch fails, but now the error log shows both "install failed" and "launch failed" — the user can't tell which was the root cause.

**Why it happens:**
- The natural implementation is a for-loop over steps with `try/catch`
- Developers pick one error strategy (abort or continue) and hardcode it
- The real need is user-configurable: some steps are critical (install app before launch), others are optional (set status bar for screenshots)

**Prevention:**
Each step should have an `onFailure` strategy: `"abort"`, `"skip"`, or `"continue"`. The default should be `"continue"` for non-dependent steps and `"abort"` for steps with downstream dependencies. The executor should:
1. Execute steps in order
2. On step failure, check the step's `onFailure` strategy
3. Emit a `step-failed` status with the error and what strategy was applied
4. If `"abort"`, stop execution and mark remaining steps as `"cancelled"`
5. If `"skip"`, mark step as `"skipped-on-error"` and continue
6. If `"continue"`, mark step as `"failed"` and continue

The UI should show all three outcomes clearly: succeeded, failed-but-continued, skipped-incompatible, and cancelled-due-to-abort.

**Detection:**
- Collection executor has a single `catch` block that handles all errors the same way
- No per-step error configuration in the collection schema
- Users saying "I had to re-run the whole collection because one step failed"

**Phase to address:** Executor design phase — error handling must be part of the step schema, not bolted on later.

---

### Pitfall 6: Step Ordering Dependencies Not Encoded in Schema

**What goes wrong:**
A user creates a collection: (1) Set dark mode, (2) Set locale, (3) Launch app, (4) Set location. They reorder the steps in the UI to: (1) Set location, (2) Launch app, (3) Set locale, (4) Set dark mode. This works fine. But another user creates: (1) Install app, (2) Launch app. They reorder to (1) Launch app, (2) Install app — and the collection always fails.

The system treats all steps as independent and freely reorderable. But some steps have implicit dependencies: you can't launch an app that isn't installed, can't set permissions on an app that isn't running, can't clear app data for an app that doesn't exist.

**Why it happens:**
- Most devtool steps (dark mode, location, locale) ARE truly independent
- Only a few step combinations have ordering constraints
- The UI makes drag-and-drop reordering feel safe and universal
- There's no dependency metadata in the step schema

**Prevention:**
Add optional `requires` field to step definitions that specifies prerequisite step types (not specific instances, but categories):

```typescript
interface CollectionStep {
  type: 'launch-app';
  params: { bundleId: string };
  requires?: string[];  // e.g., ['install-app'] — only if the same bundleId is referenced
}
```

Validate ordering at save time, not execution time. If a step's `requires` aren't met earlier in the sequence, show a warning in the editor (not an error — the user might know the app is already installed). At execution time, if a prerequisite step failed, auto-skip dependent steps.

**Detection:**
- No `requires` or dependency field in step type definitions
- Users creating collections with install-then-launch that break when reordered
- Collection editor allows unrestricted drag reordering with no warnings

**Phase to address:** Step schema design. Warning validation in the editor comes later, but the schema must support dependencies from the start.

---

### Pitfall 7: CLI Collection Execution Diverging from Dashboard Execution

**What goes wrong:**
The CLI `simvyn collection run my-collection --device XYZ` uses a different code path than the dashboard's "Apply Collection" button. The CLI creates its own `DeviceManager` and adapters (like every existing CLI command in simvyn — see `device-settings/cli.ts` lines 15-17), while the dashboard goes through the server's HTTP/WS APIs. Behavior diverges:
- CLI runs steps sequentially in-process; dashboard runs them through the WS broker with async feedback
- CLI resolves device by ID prefix match (line 20: `d.id.startsWith(deviceId)`); dashboard uses exact device IDs from the device store
- CLI adapter instances are fresh (new connection to adb server); server adapter instances are shared (same adb connection pool)
- Error messages differ: CLI prints to stderr; dashboard shows toasts from HTTP response bodies
- Platform compatibility checks might use different logic (CLI checks adapter methods; dashboard might check the capabilities endpoint)

Over time, bugs get fixed in one path but not the other. The CLI becomes a second-class citizen.

**Why it happens:**
Every existing CLI command in simvyn (see `device-settings/cli.ts`, `location/manifest.ts` CLI section) independently creates adapters and a device manager. This is fine for one-shot commands, but Collections needs a complex executor with error handling, progress tracking, and state management. Duplicating this in CLI and server creates two implementations of the same complex logic.

**Consequences:**
- "Works in dashboard, fails in CLI" or vice versa
- Bug fixes applied to one path, forgotten in the other
- CLI collections missing features that dashboard has (progress tracking, error strategy)
- Different behavior erodes trust — users don't know which interface to trust

**Prevention:**
Build the collection executor as a standalone function in a shared package (e.g., in `@simvyn/core` or a new `@simvyn/collections` package) that accepts adapters, a device list, and a progress callback. Both CLI and server import the same executor:

```typescript
// Shared executor
async function executeCollection(
  collection: Collection,
  devices: Device[],
  getAdapter: (platform: Platform) => PlatformAdapter | undefined,
  onProgress: (event: ExecutionProgressEvent) => void,
  options?: { errorStrategy?: 'abort' | 'continue' }
): Promise<ExecutionResult> { ... }

// Server usage: onProgress broadcasts via WS
// CLI usage: onProgress prints to stdout with progress bars
```

**Detection:**
- Separate `executeCollection` implementations in CLI and server packages
- CLI collection command that imports from `@simvyn/server` (wrong direction)
- Bug reports that specify "this only happens in CLI" or "only in dashboard"

**Phase to address:** Executor implementation phase — the shared executor must be written once in a platform-agnostic way before being wired into CLI or server.

---

### Pitfall 8: Command Palette Collections Integration Creating a Tangled Third Interface

**What goes wrong:**
The command palette already has `MultiStepAction` with its own step system (`DeviceSelectStep`, `ParameterStep`, `ConfirmStep`, etc. in `types.ts`). Collections has its own step system (set-appearance, set-location, launch-app with typed params). Integrating "Apply Collection" into the command palette requires translating between these two step models, creating a third layer of complexity.

A developer might try to make collection steps extend `MultiStepAction` steps, or wrap collection execution in a `MultiStepAction.execute()` callback. Either way, you end up with:
- Collection steps that can't use the `device-select` step type (because devices are selected upfront, not per-step)
- Awkward parameter mapping between command palette's `StepContext.params` and collection step params
- The command palette's one-action-at-a-time model conflicting with collections' batch execution model

**Why it happens:**
The command palette was designed for individual actions with a simple flow: pick devices → set params → execute. Collections are a fundamentally different interaction: pick collection → pick devices → execute all steps. Trying to fit collections into the existing `MultiStepAction` framework is square-peg-round-hole.

**Prevention:**
Don't make "Apply Collection" a `MultiStepAction`. Instead, add it as a **navigation action** (like `open-deep-link` and `install-app` in `actions.tsx` lines 384-404) that navigates to the collections panel with the selected collection pre-loaded. The command palette's role is discovery and launching — "show me my collections" — not executing multi-step batch operations.

For individual collection steps that overlap with command palette actions (e.g., "set dark mode" exists in both), keep them separate. The command palette version is for quick one-off actions; the collection version is for batch automation. Don't try to unify them.

**Detection:**
- `MultiStepAction` definitions that reference collection schemas
- Command palette trying to render collection execution progress inline
- Collection execution logic inside `actions.tsx`
- Growing complexity in `StepRenderer.tsx` to handle collection-specific step types

**Phase to address:** Dashboard integration phase — decide the command palette's role (discovery/navigation) vs. the collections panel's role (editing/execution) before writing any UI code.

---

### Pitfall 9: Concurrent Collection Execution on Overlapping Device Sets

**What goes wrong:**
User starts "Dark Theme Setup" collection on devices A, B, C. Before it finishes, they start "Japanese Locale" collection on devices B, C, D. Devices B and C are now receiving commands from two concurrent collection executions. Dark mode and locale changes interleave in unpredictable order. The "set appearance: dark" from collection 1 might run after "launch app" from collection 2, producing a state neither collection intended.

For location-setting steps, concurrent location changes on the same device are especially bad — the device oscillates between two coordinates.

**Why it happens:**
- Each collection execution is an independent async operation
- There's no per-device lock or execution queue
- The dashboard doesn't prevent starting a new collection while one is running
- The server has no concept of "this device is currently being configured"

**Prevention:**
Implement a per-device execution lock. Before executing a collection on a device, acquire a lock. If the device is already locked by another execution, queue or reject. The lock should be lightweight — a `Map<string, ExecutionId>` on the server. The UI should show which devices are currently "busy" and prevent selecting them for new collections.

Don't block at the HTTP/WS level — block at the executor level. If two collections target the same device, the second collection's steps for that device should wait until the first completes (or the user can cancel the first).

**Detection:**
- No device-level locking in the executor
- Users reporting "my device ended up in a weird state after running two collections"
- Race condition bugs that only reproduce when running collections quickly in succession

**Phase to address:** Executor phase — device locking should be implemented alongside the core executor, not as an afterthought.

---

## Minor Pitfalls

### Pitfall 10: Parameter Validation Happening at Execution Time Instead of Save Time

**What goes wrong:**
A user creates a collection with a "set location" step and types `lat: 999, lon: -500` (invalid coordinates). The collection saves successfully. A week later they apply it and get a cryptic error mid-execution. Or they type a locale code `en-US` (wrong format — simvyn uses `en_US` with underscore). The step silently fails because the adapter doesn't validate locale format.

**Prevention:**
Validate step parameters when the collection is saved, not just when it's executed. Each step type should define a validation function. Show errors inline in the collection editor. For coordinates: `lat ∈ [-90, 90], lon ∈ [-180, 180]`. For locales: validate against a known locale list. For bundle IDs: validate format (`com.example.app`), though existence can only be checked at execution time.

**Detection:**
- No validation functions in step type definitions
- Validation errors only surfacing during `executeCollection()`
- The collection editor accepting any string in parameter fields

**Phase to address:** Step type definition phase, alongside the schema.

---

### Pitfall 11: Getting Started Documentation Assuming Fresh User Context

**What goes wrong:**
Getting Started docs written by the developer who built the tool assume:
- User has Xcode already installed and configured
- User has Android SDK with platform-tools in PATH
- User understands what "simulator" vs "emulator" means
- User knows how to boot a simulator from Xcode
- User has at least one device available when they first run `npx simvyn`

A significant percentage of users will hit the "No devices detected" empty state on first launch and not know what to do. They'll close the tool and never come back.

**Prevention:**
- Document prerequisites as a checklist with verification commands: `xcrun simctl list devices` → "you should see at least one device"
- Include a "Quick Start from Zero" section for users who haven't created any simulators
- The "no devices" empty state in the dashboard should link directly to the Getting Started docs' "create your first simulator" section
- Include platform-specific setup sections (macOS with Xcode, macOS with Android Studio, Linux with Android Studio)
- Add troubleshooting for the 5 most common first-run failures: Xcode CLI tools not installed, adb not in PATH, no booted devices, permission denied, port already in use

**Detection:**
- Getting Started docs that start with "Run `npx simvyn`" without prerequisites
- No mention of Xcode CLI tools setup
- No troubleshooting section
- Issue tracker receiving "no devices found" reports from new users

**Phase to address:** Documentation phase — Getting Started must be written from the perspective of someone who just installed Xcode for the first time, not from the perspective of the developer who's been using simctl for years.

---

### Pitfall 12: Documentation Showing CLI-Only or Dashboard-Only Examples

**What goes wrong:**
Getting Started docs show how to set dark mode via the dashboard with screenshots, but don't mention the CLI command. Or the CLI reference shows `simvyn settings dark-mode <device> on` but doesn't explain how to find the device ID. Collections docs show the dashboard editor but don't cover `simvyn collection run`. Users who prefer one interface don't realize the other exists, and can't switch when they need to.

**Prevention:**
Every Getting Started workflow should show both interfaces side by side: "From the Dashboard" and "From the CLI." The collection documentation specifically needs:
- Dashboard: creating, editing, applying collections with screenshots
- CLI: `simvyn collection list`, `simvyn collection run <name> --device <id>`, `simvyn collection create --from-file`
- How to export a collection from dashboard to a shareable JSON file that CLI can import

**Detection:**
- Documentation pages that only mention one interface
- No CLI examples for collection operations
- Users asking "how do I do X from the CLI?" when it's already supported but not documented

**Phase to address:** Documentation phase — write docs in parallel with implementation so both interfaces are documented from the start.

---

## Phase-Specific Warnings

Pitfalls mapped to the likely implementation phases for the Collections milestone.

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Collection step schema design | No schema versioning (#4) | CRITICAL | Add `schemaVersion: 1` from first commit |
| Collection step schema design | Dual capability detection (#2) | CRITICAL | Use adapter method checks, not `capabilities()` array |
| Collection step schema design | No ordering dependencies (#6) | MODERATE | Add optional `requires` field to step interface |
| Cross-module action invocation | Calling HTTP routes instead of adapter methods (#1) | CRITICAL | Build action registry; routes and collections both call it |
| Execution engine | No configurable error strategy (#5) | MODERATE | Per-step `onFailure: 'abort' | 'skip' | 'continue'` |
| Execution engine | No concurrent execution protection (#9) | MODERATE | Per-device execution lock in executor |
| Execution engine | CLI/dashboard divergence (#7) | MODERATE | Single shared executor in `@simvyn/core` |
| WS feedback | Message flooding (#3) | CRITICAL | Coalesced state broadcasts, not per-step events |
| Dashboard integration | Command palette tangling (#8) | MODERATE | Collections as navigation action, not `MultiStepAction` |
| Dashboard integration | No save-time validation (#10) | MINOR | Validation functions per step type |
| Getting Started docs | Assuming user context (#11) | MINOR | Prerequisites checklist with verification commands |
| Getting Started docs | Single-interface examples (#12) | MINOR | Dashboard + CLI side by side for every workflow |

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| HTTP route coupling (#1) | HIGH | Must extract action registry, refactor all module routes to be thin wrappers, update collection executor. Multi-day effort touching 16 modules |
| Capability detection divergence (#2) | LOW | Replace capability checks in executor with adapter method checks. Localized to executor code |
| WS message flooding (#3) | MEDIUM | Add server-side batching layer between executor and WS broker. Client needs debounced handler. Both sides need updates |
| Unversioned schema (#4) | MEDIUM-HIGH | Add migration code that guesses schema version from field presence. Lose collections that can't be migrated. Users angry about lost data |
| All-or-nothing execution (#5) | LOW | Add `onFailure` field with default value to existing step schema. Backward compatible |
| No ordering dependencies (#6) | LOW | Add optional `requires` field. Existing collections without it still work |
| CLI/dashboard divergence (#7) | HIGH | Must extract shared executor from wherever it was implemented (CLI or server). Rewrite the other to use shared code |
| Command palette tangling (#8) | MEDIUM | Rip out collection execution logic from command palette, move to dedicated panel. Requires UI restructuring |
| Concurrent execution (#9) | LOW | Add execution lock map to server. Client-side "busy" indicators. Non-breaking addition |
| No save-time validation (#10) | LOW | Add validation functions to step types. Run on existing saved collections to flag issues |
| Docs assuming context (#11) | LOW | Add prerequisites section. Can be done post-launch |
| Single-interface docs (#12) | LOW | Add missing interface examples. Incremental improvement |

## Simvyn-Specific Integration Risks

Issues unique to simvyn's architecture that generic "batch execution" research wouldn't cover.

### Risk: Module Registry Doesn't Track Action-Level Capabilities

The `moduleRegistry` (Map in `module-loader.ts`) stores module-level metadata: `name`, `version`, `description`, `icon`, `capabilities`. It does NOT store what actions each module supports. Collections needs to know "device-settings supports set-appearance, set-locale, set-status-bar, set-content-size, etc." but the registry only knows "device-settings exists and claims these PlatformCapability strings."

**Impact:** Collections can't programmatically discover what step types are available without hardcoding knowledge of every module's actions.

**Mitigation:** Extend `SimvynModule` manifest to declare actions, or build the action registry (Pitfall #1 prevention) as the source of truth.

### Risk: Storage Race Conditions on Collection Save/Update

The `createModuleStorage` pattern (read entire JSON → modify in memory → write back) has no file locking. If two operations modify the same collection list concurrently (e.g., user saves a collection while auto-save triggers), one write can overwrite the other. This hasn't been a problem for existing modules because saves are user-initiated and infrequent. But if collection execution updates a "last run" timestamp on each execution, and the user edits the collection simultaneously, data can be lost.

**Impact:** Rare but possible data loss of collection edits during concurrent operations.

**Mitigation:** Either use atomic read-modify-write with `proper-lockfile`, or separate execution metadata (last run, run history) from collection definitions (stored in different keys).

### Risk: Device State Changes During Multi-Step Execution

A collection starts executing on a booted device. Between step 3 and step 4, the device reboots (locale change triggers reboot, or user manually shuts it down). Step 4 fails because the device is no longer booted. Every subsequent step also fails. The executor doesn't re-check device state between steps.

**Impact:** Confusing cascade of failures that all stem from one device state change.

**Mitigation:** Re-check `device.state === "booted"` before each step execution. If the device has rebooted, wait for it to come back (with timeout) or skip remaining steps for that device. The `deviceManager` already polls device state every 5 seconds — use it to detect state changes between steps.

---

## Sources

- **simvyn codebase** — Direct analysis of module-loader.ts, ws-broker.ts, storage.ts, device-manager.ts, all module manifests and routes, command palette types and actions. HIGH confidence — this is the actual code, not documentation.
- **Platform adapter types** — `packages/types/src/device.ts` PlatformAdapter interface (171 lines, 50+ optional methods, 22 PlatformCapability strings). HIGH confidence.
- **iOS capabilities**: `["setLocation", "push", "screenshot", "screenRecord", "erase", "statusBar", "privacy", "ui", "clipboard", "addMedia", "logs", "deepLinks", "appManagement", "settings", "accessibility", "deviceLifecycle", "keychain", "bugReport"]` — 18 capabilities.
- **Android capabilities**: `["setLocation", "screenshot", "screenRecord", "logs", "deepLinks", "appManagement", "addMedia", "clipboard", "settings", "accessibility", "fileSystem", "database", "portForward", "displayOverride", "batterySimulation", "inputInjection", "bugReport"]` — 17 capabilities.
- **Existing pitfalls research** (`.planning/research/PITFALLS.md`, 2026-02-26) — Pitfalls #1-6 from initial project research remain relevant. This document focuses on Collections-specific additions. HIGH confidence.
- **location/ws-handler.ts** multi-device broadcast pattern — The `set-location` handler's approach of collecting results into an array before broadcasting is the correct pattern for Collections to follow. HIGH confidence.
- **Flipper deprecation** — Facebook's plugin-based mobile devtool's failure at scale (from initial pitfalls research) reinforces the risk of module-to-module coupling and over-complex plugin systems. MEDIUM confidence (indirect relevance).

---
*Pitfalls research for: Simvyn Collections Feature + Getting Started Documentation*
*Researched: 2026-03-04*
*Scope: Adding batch-action collection system to existing 16-module devtool architecture*
