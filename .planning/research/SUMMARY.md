# Project Research Summary

**Project:** Simvyn v1.6 — Collections & Getting Started Documentation
**Domain:** Batch-action orchestration system for multi-module mobile devtool + comprehensive onboarding docs
**Researched:** 2026-03-04
**Confidence:** HIGH

## Executive Summary

Simvyn v1.6 adds a Collections system — reusable sequences of device actions (set locale, set location, toggle dark mode, launch app, etc.) that can be applied to multiple devices at once — and comprehensive Getting Started documentation. The existing codebase is exceptionally well-suited for this: the 16-module architecture, PlatformAdapter abstraction, WebSocket broker, `createModuleStorage`, and Zustand + Framer Motion frontend provide every primitive needed. **Zero new dependencies required.** This is the strongest possible starting point for a feature addition.

The recommended approach is to build an **adapter-level action registry** as the foundation — a typed, in-process mapping from action IDs to PlatformAdapter method calls with parameter schemas and platform compatibility metadata. This registry serves both the collection builder UI (showing available actions with their parameter forms) and the server-side execution engine (running steps directly via adapter methods, not HTTP roundtrips). Execution is server-side with WebSocket progress streaming, following the exact pattern established by location playback. The dashboard gets a visual step builder with Framer Motion drag-to-reorder, and the CLI gets `simvyn collections list|apply` for automation.

The primary risks are: (1) coupling Collections to other modules via HTTP route calls instead of direct adapter invocations — causing 5-10x performance overhead and fragile coupling, (2) WebSocket message flooding during multi-device multi-step execution — requiring batched/coalesced progress broadcasts from day one, and (3) unversioned collection schemas becoming unmigratable as the system evolves. All three are preventable with upfront design decisions that the architecture research has already specified.

## Key Findings

### Recommended Stack

No new npm packages. Every capability maps to existing dependencies. See [STACK.md](./STACK.md) for full details.

**Core technologies (all existing):**
- **Framer Motion `Reorder`** (`^12.34.3`): Drag-to-reorder step lists — `Reorder.Group` + `Reorder.Item` with `useDragControls` for handle-only dragging. Purpose-built for single-axis sortable lists.
- **Zustand** (`^5`): Collections store following the `favorites-store.ts` pattern — async methods that fetch/post then refetch. Also holds transient execution state updated via WS.
- **WebSocket Broker** (`@fastify/websocket`): `collections` channel for execution progress streaming. Same envelope protocol as location playback.
- **`createModuleStorage("collections")`**: JSON persistence at `~/.simvyn/collections/collections.json`. Proven atomic-write pattern.
- **`crypto.randomUUID()`**: No `uuid` package needed. Already used in codebase.

**What NOT to add:** @dnd-kit (Framer Motion covers it), react-beautiful-dnd (deprecated), @tanstack/react-query (direct fetch + Zustand suffices), zod (never actually installed), Docusaurus/VitePress (README is the right format), p-limit/p-queue (simple `Promise.all` per step suffices), Socket.io (WS broker exists).

### Expected Features

See [FEATURES.md](./FEATURES.md) for complete landscape with reference systems analysis (Apple Shortcuts, Playwright fixtures).

**Must have (table stakes):**
- Create/edit/delete named collections with step sequences
- Add steps from categorized action catalog (15+ action types across modules)
- Configure parameters per step (reusing existing picker components)
- Platform badge per step showing iOS/Android compatibility
- Apply collection to selected device(s) with real-time per-step feedback
- Platform-incompatible steps gracefully skipped (not failed)
- Persist collections across sessions

**Should have (differentiators):**
- Visual step builder with drag-to-reorder (Apple Shortcuts-inspired)
- Multi-device parallel apply with per-device × per-step progress matrix
- Pre-apply compatibility summary
- Command palette integration ("Apply Collection" from Cmd+K)
- CLI subcommand (`simvyn collections list|apply|create`)
- Built-in starter collections (2-3 examples)
- Step execution timeout (30s default)

**Defer (v2+):**
- Conditional logic / branching (keep it linear)
- Variables / data passing between steps
- Collection import/export / sharing
- Scheduled/automatic execution
- Undo/rollback
- Nested collections
- Separate documentation site

### Architecture Approach

Collections is a **meta-module** — it orchestrates calls to existing modules' adapter methods without importing from them. The architecture has three core server-side components (action registry, collection storage, execution engine) and three dashboard components (step builder, execution view, action picker). Execution is server-side with a sequential-per-step, parallel-per-device model. See [ARCHITECTURE.md](./ARCHITECTURE.md) for full component boundaries, data models, and flow diagrams.

**Major components:**
1. **Action Registry** (`action-registry.ts`) — Maps action IDs to PlatformAdapter method calls with typed parameter schemas. The root dependency for everything else.
2. **Execution Engine** (`execution-engine.ts`) — Server-side sequential step runner with parallel per-device execution, WS progress broadcasting, and per-step error strategies.
3. **Collection Storage** — CRUD via `createModuleStorage` with `schemaVersion` field from day one.
4. **Step Builder UI** (`StepBuilder.tsx` + `StepCard.tsx` + `ActionPicker.tsx`) — Visual builder with categorized action browsing, parameter configuration, and Framer Motion drag reorder.
5. **Execution View** (`ExecutionView.tsx`) — Live progress display driven by WS, showing per-step × per-device status matrix.
6. **Collections Store** (`collections-store.ts`) — Zustand store for CRUD + transient execution state, with both hook and imperative (`getState()`) access patterns.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md) for full analysis with detection signals and recovery strategies.

1. **HTTP route coupling instead of adapter-level calls** — Collections must invoke PlatformAdapter methods directly, not call other modules' HTTP endpoints. Routes are thin wrappers; calling them adds 5-10x overhead and fragile string-based coupling. Build the action registry first.
2. **Dual capability detection systems diverging** — Use `!!adapter.methodName` checks (per-method granularity), not the coarse `capabilities()` array. The `PlatformCapability` strings don't map 1:1 to adapter methods.
3. **WebSocket message flooding** — Multi-device multi-step execution can generate 100+ rapid WS messages. Design coalesced state broadcasts from day one (one message with full execution state per step completion, not per-device events).
4. **Unversioned collection schema** — Add `schemaVersion: 1` to the Collection interface in the first commit. Without it, schema evolution silently corrupts saved collections with no migration path.
5. **CLI/dashboard execution divergence** — Build a single shared executor function that both CLI and server import. Don't let two implementations drift apart.

## Implications for Roadmap

Based on dependency analysis from ARCHITECTURE.md and pitfall prevention from PITFALLS.md:

### Phase 1: Collections Foundation (Server)
**Rationale:** Action registry is the root dependency — everything else (builder UI, execution engine, CLI) depends on knowing what actions exist and their parameter schemas. Storage with versioned schema must be established before any collections can be created.
**Delivers:** Server-side module with CRUD endpoints, action registry with 5-6 core actions, typed collection schema with `schemaVersion`.
**Addresses:** Collection schema + storage, action catalog registry (FEATURES table stakes)
**Avoids:** HTTP route coupling (#1), unversioned schema (#4), dual capability detection (#2)

### Phase 2: Execution Engine (Server)
**Rationale:** Execution logic must exist before any UI can show progress or CLI can run collections. Building execution as a shared, platform-agnostic function prevents CLI/dashboard divergence.
**Delivers:** Sequential step runner with parallel per-device execution, WS progress broadcasting with coalesced messages, per-step error strategies, per-device execution locking.
**Addresses:** Apply collection to devices, real-time feedback, platform skip logic (FEATURES table stakes)
**Avoids:** WS flooding (#3), all-or-nothing execution (#5), concurrent execution conflicts (#9), CLI divergence (#7)

### Phase 3: Dashboard UI — Collections CRUD & Builder
**Rationale:** With server-side CRUD and action registry serving data, the dashboard can render the builder. Step builder depends on action descriptors from registry; collection list depends on storage CRUD.
**Delivers:** Collections panel with list view, visual step builder with drag reorder (Framer Motion), action picker with categories, step cards with platform badges and parameter forms.
**Addresses:** Step-by-step visual builder, reorder via drag-and-drop, platform badges (FEATURES differentiators)
**Avoids:** Save-time parameter validation (#10)

### Phase 4: Execution Visualization & Integration
**Rationale:** Execution view depends on both the execution engine (WS events) and the collections store (state management). Command palette integration should come after the core panel works.
**Delivers:** Live execution progress display, command palette "Apply Collection" action, CLI `collections list|apply` subcommands.
**Addresses:** Multi-device progress matrix, command palette integration, CLI automation (FEATURES differentiators)
**Avoids:** Command palette tangling (#8) — uses navigation action pattern, not MultiStepAction

### Phase 5: Polish & Documentation
**Rationale:** Built-in starter collections require the full system to exist. Documentation requires screenshots of working features. Both are polish that shouldn't block core development.
**Delivers:** 2-3 starter collections, comprehensive README restructure with per-feature sections, Getting Started guide, CLI reference, screenshot placeholders.
**Addresses:** Built-in starters, execution history, all documentation features
**Avoids:** Docs assuming user context (#11), single-interface examples (#12)

### Phase Ordering Rationale

- **Registry → Storage → Engine → UI → Polish** follows the dependency graph directly: you can't build a builder without knowing what actions exist, can't show execution without an engine, can't write docs without working features.
- **Server before dashboard** in each phase ensures the UI always has real APIs to connect to, preventing mock/stub buildup.
- **Execution engine as a standalone shared function** (Phase 2) before any UI or CLI prevents the #7 divergence pitfall — the most expensive to fix retroactively.
- **WS protocol designed in Phase 2** with batching prevents the #3 flooding pitfall — adding batching later requires changing both server and client.
- **Documentation last** because it needs screenshots of working features and should capture the final UX, not a moving target.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Action Registry):** The registry design is novel for this codebase — no existing cross-module action abstraction exists. Needs careful type design to cover all 15+ adapter methods with their varying parameter signatures.
- **Phase 2 (Execution Engine):** Per-device locking, error strategies, and device-state-change detection between steps are implementation details that may need iteration.

Phases with standard patterns (skip research):
- **Phase 3 (Dashboard UI):** Follows established patterns exactly — `registerPanel`, Zustand store, Framer Motion `Reorder`, existing picker components. Well-documented in codebase.
- **Phase 5 (Documentation):** README expansion with standard devtool doc patterns. No technical research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All APIs verified against official docs (Framer Motion Reorder) and existing codebase usage. |
| Features | HIGH | Reference systems studied (Apple Shortcuts, Playwright fixtures). Feature scope well-bounded by anti-features list. |
| Architecture | HIGH | Based entirely on direct codebase analysis. Every pattern cited has an existing precedent in the codebase. |
| Pitfalls | HIGH | All pitfalls derived from actual code inspection (adapter types, WS broker, module loader). Recovery costs assessed realistically. |

**Overall confidence:** HIGH

### Gaps to Address

- **Action registry parameter schemas for all 15+ actions:** STACK.md and ARCHITECTURE.md show the pattern for 5-6 actions. The remaining actions (media, screenshot, deep links, permissions, etc.) need their parameter schemas fully specified during Phase 1 implementation.
- **Execution timeout implementation:** Mentioned in FEATURES.md as a differentiator (30s default), but no implementation pattern researched. Standard `AbortController` or `Promise.race` with timeout should work.
- **Device state recovery between steps:** PITFALLS.md identifies the risk of devices rebooting mid-execution but the recovery strategy (wait for reboot with timeout) needs implementation-time experimentation.
- **Storage race condition during concurrent save/execute:** PITFALLS.md flags the risk. Mitigation (separate execution metadata from collection definitions) needs validation during Phase 1 storage design.
- **README final structure:** FEATURES.md recommends a 10-section structure. Exact section content depends on which features ship and what screenshots are available. Finalize during Phase 5.

## Sources

### Primary (HIGH confidence)
- **Simvyn codebase** — Direct analysis of 20+ files: module-loader.ts, ws-broker.ts, storage.ts, device-manager.ts, all module manifests/routes, command palette types/actions, PlatformAdapter interface (171 lines, 50+ methods), panel registry, Zustand stores
- **Framer Motion Reorder docs** — [motion.dev/docs/react-reorder](https://motion.dev/docs/react-reorder) — verified API: `Reorder.Group`, `Reorder.Item`, `useDragControls`, axis="y", auto-scroll, z-index management
- **@dnd-kit npm** — [@dnd-kit/core v6.3.1](https://www.npmjs.com/package/@dnd-kit/core), [@dnd-kit/sortable v10.0.0](https://www.npmjs.com/package/@dnd-kit/sortable) — confirmed as unnecessary for this use case
- **Apple Shortcuts User Guide** — [support.apple.com/guide/shortcuts](https://support.apple.com/guide/shortcuts/welcome/ios) — action-based sequential execution model, categorized action list
- **Playwright Test Fixtures docs** — [playwright.dev/docs/test-fixtures](https://playwright.dev/docs/test-fixtures) — composable environment setup, parallel execution model

### Secondary (MEDIUM confidence)
- **awesome-readme curated list** — [github.com/matiassingers/awesome-readme](https://github.com/matiassingers/awesome-readme) — README best practices and patterns from highly-starred devtool repos
- **Flipper deprecation** — Plugin-based mobile devtool's failure at scale reinforces module isolation concerns

---
*Research completed: 2026-03-04*
*Ready for roadmap: yes*
