# Project Research Summary

**Project:** Simvyn — Universal Mobile Device Devtool
**Domain:** Local-first developer tool (CLI + Node.js server + React web dashboard)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

Simvyn fills a clear gap left by Flipper's archival (Sep 2025): a unified, SDK-free mobile devtool that wraps `xcrun simctl` and `adb` from the host side. The zero-SDK constraint is the product's defining advantage — it works with any app (React Native, Flutter, native, KMP) without build-time integration. The recommended approach is a TypeScript monorepo with Fastify 5 as the server (its plugin encapsulation maps directly to Simvyn's module system), a Commander CLI as the primary interface, and a React 19 + Vite 7 dashboard as the visual layer. sim-location (the existing CLI at `/Users/pranshu/github/sim-location`) will be directly migrated — code copied and refactored into the monorepo module architecture, not rewritten from scratch. Platform support is macOS + Linux only; Windows users use WSL.

The architecture is module-based: a shared types package, a core platform adapter layer, and self-contained feature modules that each export a Fastify server plugin, Commander subcommand, and WebSocket message types. The dashboard UI panels live separately in the Vite bundle. This structure prevents the circular dependency and build complexity that killed Flipper. The build order flows: types → core → modules → server → cli, with the dashboard building independently against the types package.

The top risks are: (1) brittle CLI output parsing across Xcode/SDK versions — mitigate with defensive parsing, version detection, and fixture-based tests; (2) zombie child processes from long-running streams like `adb logcat` — mitigate with a process registry built into core from day one; (3) WebSocket bottleneck when log streaming saturates a single connection — mitigate with multi-channel WS architecture or hybrid WS/HTTP approach where binary/heavy data uses REST; (4) broken `npx` packaging from monorepo workspace resolution — mitigate by testing `npm pack` in CI from the first phase. All four risks must be addressed in the foundation phase, not retrofitted.

## Key Findings

### Recommended Stack

The stack centers on TypeScript 5.9 + Node.js 22 LTS across a monorepo managed by npm workspaces. Fastify 5 is the clear server choice — its plugin encapsulation model maps 1:1 to Simvyn's module architecture, and it's 2-3x faster than Express with built-in schema validation and Pino logging. The frontend uses React 19, Vite 7 (with Rolldown), Tailwind v4, and Zustand 5 — all proven in sim-location. Full details in [STACK.md](./STACK.md).

**Core technologies:**
- **Fastify 5:** HTTP server + module plugin host — encapsulation model isolates modules, built-in validation via AJV
- **React 19 + Vite 7 + Tailwind v4:** Dashboard SPA — instant HMR, CSS-first config, proven in sim-location
- **Zustand 5:** Client state — tiny, works both as React hooks and imperative access for WS handlers
- **Zod 4:** Shared schema validation — single source of truth for WS protocol, CLI args, config
- **Commander 14:** CLI framework — subcommand-per-module pattern fits naturally
- **tinyexec + node:child_process spawn:** Process execution — tinyexec for fire-and-get-output, raw spawn for streaming (logcat, screen recording)
- **better-sqlite3:** SQLite database browser module (v2+ feature)
- **Biome 2:** Lint + format replacing ESLint + Prettier — 20-100x faster

**Critical version constraint:** Minimum Node.js 22.12.0 (dictated by Vite 7). All major dependencies (Fastify 5, Commander 14, chokidar 5) have dropped Node 18.

### Expected Features

The feature landscape is well-defined. Everything wraps `simctl` and `adb` — no SDK integration, no app-side code. sim-location's location simulation code migrates directly as the first module. Full analysis in [FEATURES.md](./FEATURES.md).

**Must have (P1 — CLI-first MVP):**
- Device discovery & list (foundation for everything)
- Boot / shutdown / erase (basic lifecycle)
- App install / uninstall / launch / terminate (core workflow)
- Log viewer with real-time streaming + filtering (the #1 debugging tool)
- Screenshots (universal utility, low complexity)
- Deep links / URL opening (trivial, used constantly)
- Push notifications — iOS only (simctl's killer feature)
- Location simulation (migrated from sim-location)
- CLI interface wrapping all above

**Should have (P2 — dashboard + expanded features):**
- Web dashboard (visual UI layer over CLI capabilities)
- Screen recording, status bar override, dark mode toggle
- Permission control (grant/revoke/reset without reinstall)
- File management (browse containers, push/pull)
- Clipboard bridge, media injection, app info inspector

**Defer (P3/v2+):**
- Database inspector (high complexity, needs SQLite parsing)
- User defaults / SharedPrefs editor
- Multi-device view, crash logs, performance monitoring
- Network condition simulation (hard without SDK)

**Anti-features (explicitly excluded):**
- In-app SDK / bridge (violates zero-SDK principle — this is what killed Flipper)
- Network inspector (requires MITM proxy — recommend mitmproxy integration instead)
- Layout inspector, framework-specific devtools (let Xcode/Android Studio handle this)
- Screen mirroring (scrcpy exists and is unbeatable)
- Emulator creation / remote device access

**Platform parity note:** iOS has richer simctl support (push, keychain, status bar, clipboard). Android has gaps. Strategy: build with richer platform first, add Android where possible, clearly mark iOS-only features.

### Architecture Approach

The architecture is a layered monorepo: shared types at the bottom, platform adapters and device management in core, self-contained feature modules in the middle, and server/CLI/dashboard as the three entry points. Each module exports a manifest with its Fastify plugin, Commander subcommand, and WS namespace. The server auto-discovers and registers modules. A single WebSocket connection uses envelope-based multiplexing (with per-module subscription to control message volume), while binary/heavy data flows through HTTP. Full details in [ARCHITECTURE.md](./ARCHITECTURE.md).

**Major components:**
1. **Types package (`@simvyn/types`)** — Device model, WS protocol (discriminated unions), ModuleManifest interface. Zero runtime deps. The single source of truth.
2. **Core package (`@simvyn/core`)** — Platform adapters (iOS/Android), DeviceManager (polling + caching + events), Storage (JSON files in `~/.simvyn/`), process helpers.
3. **Module packages (`@simvyn/module-*`)** — Self-contained features. Each exports a manifest conforming to `ModuleManifest`. Contains server plugin + CLI command + module-specific types. **No cross-module imports**.
4. **Server (`@simvyn/server`)** — Fastify app, module loader, WS broker. Thin orchestration — real logic in modules.
5. **CLI (`@simvyn/cli`)** — Commander entry point. `simvyn` starts server; `simvyn <module> <command>` dispatches to module CLI exports (headless, no server needed).
6. **Dashboard (`@simvyn/dashboard`)** — React SPA with shell (topbar + sidebar) and lazy-loaded module UI panels. Module UIs live here, not in module packages (avoids bundling Node.js code into browser).

**Key patterns:**
- Module manifest contract for auto-discovery
- Fastify plugin encapsulation per module (route prefixing, state isolation)
- Namespaced WebSocket multiplexing with per-module subscription
- Lazy-loaded module UI panels via `React.lazy()`
- DeviceManager as shared singleton (decorate on Fastify instance)

### Critical Pitfalls

Top pitfalls from [PITFALLS.md](./PITFALLS.md), all requiring Phase 1 prevention:

1. **CLI output parsing brittleness** — `simctl` and `adb` change output across Xcode/SDK versions (ControlRoom, Appium have extensive issue histories). Prevent with: defensive JSON parsing, version detection at startup, fixture-based parser tests from multiple Xcode versions, isolated parser in platform adapter.

2. **Zombie child processes** — Long-running streams (`adb logcat`, `simctl io`) leak when users navigate away or close the browser. Prevent with: process registry tracking all spawned processes, AbortController-based cleanup, WS disconnect → process kill wiring, SIGTERM/SIGINT handlers.

3. **WebSocket bottleneck** — A single WS connection saturated by log streaming blocks device status and UI updates. Prevent with: hybrid WS/HTTP approach (logs stream via WS with server-side batching, binary data via HTTP), per-module subscription opt-in, backpressure handling.

4. **Circular dependency chains** — 16+ modules in a monorepo collapse into import spaghetti without strict boundaries. Prevent with: `@simvyn/types` as sole shared dependency, modules never import from other modules, lint rules enforcing boundaries.

5. **Broken `npx` packaging** — Workspace `workspace:*` protocol doesn't resolve after publish; dashboard assets missing from tarball. Prevent with: `tsup` bundling for distribution, `npm pack` test in CI from day one, dashboard pre-built as static assets.

## Implications for Roadmap

Based on combined research, the architecture's build dependency chain and feature dependency graph suggest the following phase structure:

### Phase 1: Foundation & Infrastructure
**Rationale:** Architecture research shows a strict build order (types → core → server → cli). Every pitfall marked "Phase 1" — CLI parsing, zombie processes, circular deps, WS architecture, npm packaging. This must be solid before any feature module exists.
**Delivers:** Monorepo skeleton with all packages stubbed, types package with Device/Protocol/ModuleManifest, core package with platform adapters (iOS + Android) and DeviceManager, server shell (Fastify + WS broker + module loader), CLI shell (Commander + start command), dashboard shell (React + Vite + Tailwind + sidebar + device selector). No feature modules yet, but the infrastructure to load them.
**Addresses:** Device discovery & list (P1 feature, foundation for everything)
**Avoids:** All 6 critical pitfalls — this phase establishes the defensive patterns

### Phase 2: First Module — Location (sim-location Migration)
**Rationale:** sim-location is existing, proven code. Migrating it validates the entire module system (manifest contract, Fastify plugin registration, CLI subcommand, WS messaging). If the module system works for location, it works for all modules. This is the cheapest way to prove the architecture.
**Delivers:** `@simvyn/module-location` with set/clear/route simulation, `simvyn location` CLI commands, location WS handlers. Location dashboard panel migrated from sim-location.
**Addresses:** Location simulation (P1), validates module architecture end-to-end
**Migration note:** Code copied from sim-location and refactored to fit module interfaces. Not a rewrite.

### Phase 3: Core Device Modules (CLI-First)
**Rationale:** After the module system is proven, build the remaining P1 table-stakes features. These are all low-complexity wrappers around simctl/adb commands. Group them because they share the same pattern: call adapter → return result. CLI-first — dashboard panels come later.
**Delivers:** App management (install/uninstall/launch/terminate), screenshots, deep links, push notifications (iOS), boot/shutdown/erase. All available via `simvyn <module> <command>`.
**Addresses:** All remaining P1 features except log viewer
**Avoids:** Shell injection (all commands via execFile), cross-platform failures (all behind platform capability checks)

### Phase 4: Log Viewer
**Rationale:** Log streaming is the highest-value debugging feature but is architecturally distinct — it's a long-running streaming process (logcat/log stream), not a fire-and-get-output command. Needs server-side batching, virtual scrolling on client, process lifecycle management for the stream. Pitfalls research explicitly warns: ship search + level filtering in the same release as streaming.
**Delivers:** Real-time log streaming for iOS (simctl spawn log stream) and Android (adb logcat), with search, log level filtering, device scoping. CLI output + WS streaming to dashboard.
**Addresses:** Log viewer (P1), validates streaming architecture
**Avoids:** Log flooding (server-side batching), zombie logcat processes (process registry), WS bottleneck (dedicated log channel or batched delivery)

### Phase 5: Web Dashboard
**Rationale:** All P1 features now exist as CLI commands and server endpoints. The dashboard is the visual layer over capabilities that already work. Building it after the backend is solid means the dashboard is pure UI — no backend debugging needed.
**Delivers:** Full React dashboard with glass-morphism design, sidebar navigation, device selector, lazy-loaded module panels for all existing modules, real-time WS updates.
**Addresses:** Web dashboard (P2), unified cross-platform UI (key differentiator)
**Uses:** React 19, Vite 7, Tailwind v4, Zustand 5, motion (framer-motion), lucide-react, xterm.js

### Phase 6: Expanded Features
**Rationale:** With the dashboard live, add the P2 features that enhance the product beyond MVP. These are mostly low-complexity simctl/adb wrappers with straightforward UI panels.
**Delivers:** Screen recording, status bar override, dark mode toggle, permission control, file management, clipboard bridge, media injection, app info inspector.
**Addresses:** All P2 features
**Avoids:** File path traversal (validate against container root in file browser)

### Phase 7: Advanced Inspection (v2)
**Rationale:** Database inspector, user defaults editor, and crash logs require more complex parsing (SQLite, plist, XML) and are lower priority. Multi-device view is a significant UI challenge. These are v2 features.
**Delivers:** SQLite database browser, user defaults/SharedPrefs editor, crash log viewer, multi-device view.
**Uses:** better-sqlite3 for database browsing
**Addresses:** P3 features

### Phase Ordering Rationale

- **Foundation first:** Every pitfall and every architecture dependency points to getting the monorepo structure, types, core adapters, and module loading right before writing any features. Recovery cost for these is HIGH if deferred.
- **Location module second:** sim-location migration is the cheapest path to validating the module system end-to-end. It's existing code, not new development.
- **CLI before dashboard:** The CLI is the primary interface (scriptable, CI-friendly). Building backend features as CLI commands first means the dashboard is pure UI work with no backend debugging.
- **Logs separated:** Log streaming is architecturally distinct from request/response commands and exercises the hardest parts of the system (streaming, batching, process lifecycle). It deserves its own phase.
- **Dashboard after backend is complete:** Avoids the trap of building UI for half-working features.
- **P2 and P3 features last:** These build on the proven module system and add incremental value.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Foundation):** Multi-channel WebSocket architecture design needs more specifics — single connection with envelope multiplexing vs. multiple connections? Pitfalls research flags risks on both approaches. Need to prototype.
- **Phase 4 (Log Viewer):** `simctl spawn log stream` output format and filtering capabilities vary by macOS version. `adb logcat` has many format options (`-v threadtime`, `--pid`). Research specific parsing approaches.
- **Phase 7 (Database Inspector):** better-sqlite3 with WAL-mode databases that apps are actively writing to. Need to understand read-only access patterns and locking behavior.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Location Migration):** sim-location is existing working code. Migration is mechanical refactoring.
- **Phase 3 (Core Device Modules):** Straightforward simctl/adb wrappers. Commands are well-documented.
- **Phase 5 (Dashboard):** Standard React SPA patterns. sim-location dashboard provides reference implementation.
- **Phase 6 (Expanded Features):** Same pattern as Phase 3 — simctl/adb wrappers with UI panels.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry (2026-02-26). Compatibility matrix validated. sim-location proves React 19 + Vite 7 + Zustand combination works. |
| Features | HIGH | simctl subcommands verified locally. Flipper post-mortem and competitor analysis provide clear feature boundaries. Android adb shell commands are MEDIUM confidence (no device to verify). |
| Architecture | HIGH | Fastify plugin system and monorepo patterns are well-documented. Module manifest pattern synthesized from Fastify plugins + Flipper plugin architecture. Build dependency chain is straightforward. |
| Pitfalls | HIGH | Based on real issue trackers (ControlRoom, Appium node-simctl, appium-adb) with specific issue numbers. Flipper archival provides high-confidence cautionary tale. Process lifecycle issues are well-documented in Node.js ecosystem. |

**Overall confidence:** HIGH

### Gaps to Address

- **Android adb shell commands:** Feature research notes MEDIUM confidence on some `adb shell` commands (no device available to verify). Validate during Phase 3 implementation with actual Android device/emulator.
- **WebSocket architecture specifics:** Single multiplexed connection vs. multiple connections is debated in pitfalls and architecture research. Phase 1 should prototype both approaches for log streaming performance before committing. The architecture research recommends single connection with envelope multiplexing; the pitfalls research warns this becomes a bottleneck. Resolution: use single connection with per-module subscription opt-in and server-side batching, but route binary data through HTTP.
- **npm packaging strategy:** Whether to publish workspace packages individually or bundle into a single distributable needs to be decided in Phase 1. Research recommends bundling via tsup for the user-facing `simvyn` package, with internal packages as implementation details.
- **macOS + Linux only:** Platform detection and adapter code should only target macOS and Linux. No Windows-specific code paths — Windows users use WSL. This simplifies the platform adapter layer (no Windows path handling, no `where` command, no NTFS case-sensitivity issues).

## Sources

### Primary (HIGH confidence)
- npm registry (registry.npmjs.org) — all package versions verified 2026-02-26
- Fastify v5 official docs — plugin system, encapsulation, WebSocket integration
- sim-location codebase (`/Users/pranshu/github/sim-location`) — proven patterns for React 19 + Vite 7 + Zustand + ws
- `xcrun simctl help` — local verification of all simctl subcommands
- `adb help` — local verification of adb commands
- Flipper GitHub (facebook/flipper) — archived Sep 2025, cautionary post-mortem
- ControlRoom issues (#162, #170, #156) — simctl version breakage documentation
- Appium node-simctl issues (#145, #138, #5) — CLI parsing and process management issues
- Appium appium-adb issues (#150, #44, #147, #175) — Android SDK integration issues

### Secondary (MEDIUM confidence)
- Android `adb shell` commands (am, pm, settings, dumpsys) — based on documentation, not device-verified
- Module manifest pattern — synthesized from Fastify plugins + Flipper plugin architecture
- "Why you don't need Flipper" (Jamon Holmgren, Infinite Red) — Flipper UX post-mortem

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
