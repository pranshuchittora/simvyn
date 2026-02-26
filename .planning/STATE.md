# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Phase 6 — Quick-Action Modules (Plan 3 of 4 complete)

## Current Position

**Phase:** 6 of 9 — Quick-Action Modules
**Plan:** 3 of 4 in Phase 6
**Status:** In progress
**Progress:** [████████░░] 78%

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | ✅ Complete (7/7 plans) |
| 2. Location Module | ✅ Complete (4/4 plans) |
| 3. App Management Module | ✅ Complete (4/4 plans) |
| 4. Log Viewer Module | ✅ Complete (4/4 plans) |
| 5. Dashboard UI | ✅ Complete (4/4 plans) |
| 6. Quick-Action Modules | 🔄 In Progress (3/4 plans) |
| 7. File System & Database Inspector | ⬜ Not started |
| 8. Device Settings & Accessibility | ⬜ Not started |
| 9. Utility Modules | ⬜ Not started |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 5/9 |
| Plans completed | 23/23 (Phase 1: 7, Phase 2: 4, Phase 3: 4, Phase 4: 4, Phase 5: 4) |
| Requirements delivered | 49/108 |
| Phase 01 P02 | 3min | 3 tasks | 10 files |
| Phase 01 P03 | 5min | 3 tasks | 5 files |
| Phase 01 P04 | 3min | 2 tasks | 15 files |
| Phase 01 P05 | 3min | 3 tasks | 8 files |
| Phase 01 P06 | 5min | 3 tasks | 8 files |
| Phase 01 P07 | 1min | 1 task | 1 file |
| Phase 02 P01 | 2min | 2 tasks | 9 files |
| Phase 02 P02 | 3min | 3 tasks | 5 files |
| Phase 02 P03 | 5min | 2 tasks | 4 files |
| Phase 02 P04 | 5min | 3 tasks | 19 files |
| Phase 03 P01 | 3min | 2 tasks | 4 files |
| Phase 03 P02 | 3min | 2 tasks | 5 files |
| Phase 03 P03 | 2min | 1 task | 1 file |
| Phase 03 P04 | 3min | 2 tasks | 6 files |
| Phase 04 P01 | 3min | 2 tasks | 5 files |
| Phase 04 P02 | 3min | 2 tasks | 3 files |
| Phase 04 P03 | 2min | 1 task | 1 file |
| Phase 04 P04 | 3min | 2 tasks | 5 files |
| Phase 05 P01 | 2min | 3 tasks | 4 files |
| Phase 05 P02 | 2min | 3 tasks | 3 files |
| Phase 05 P03 | 1min | 2 tasks | 3 files |
| Phase 05 P04 | 2min | 4 tasks | 6 files |
| Phase 06 P02 | 2min | 1 task | 7 files |
| Phase 06 P03 | 2min | 1 tasks | 5 files |

## Accumulated Context

### Key Decisions
- `module: NodeNext` in tsconfig (not ESNext) — required by TypeScript 5.9 when using `moduleResolution: NodeNext`
- TypeScript monorepo with npm workspaces (types → core → modules → server → cli, dashboard independent)
- Fastify 5 for server (plugin encapsulation maps to module system)
- sim-location migrated directly (copy + refactor, not rewrite) as Phase 2 to validate module architecture
- CLI-first approach: features work headlessly before dashboard panels
- macOS + Linux only, no Windows-specific code paths
- Single WebSocket connection with envelope-based multiplexing and per-module subscription
- execFile (not exec) for all shell commands to prevent shell injection — argument arrays only
- Android AVD boot uses detached spawn + poll-based wait (60s) rather than event-based detection
- Device change detection via JSON serialization of id+state arrays (simple, effective at expected scale)
- Dashboard uses moduleResolution: bundler (not NodeNext) — Vite handles module resolution for browser target
- ModuleShell uses CSS display:none/block toggle to persist panel state across module switches
- Single WsProvider context for entire app with listener registration pattern (useWsListener hook)
- Stub DeviceManager/ProcessManager in server with dynamic import fallback — server works before @simvyn/core is ready
- WsBroker uses WeakMap for per-client subscription state — auto-cleanup on GC
- Module loader tries .js then .ts manifest — supports compiled and development modes
- Modules import `type {} from "@simvyn/server"` for Fastify decorator type augmentations
- CLI commands in modules are headless — create own adapters/DeviceManager without server
- Device ID prefix matching in CLI for convenience (short UUIDs)
- Commander isDefault for start command — avoids duplicate option conflicts between program and subcommand
- tsx for TypeScript execution in dev — Node 24 type-stripping doesn't rewrite .js import specifiers in NodeNext mode
- Android geo fix uses lon,lat order (not lat,lon) matching adb protocol — intentional
- PlatformAdapter location methods are optional (?) since not all adapters may support GPS
- PlaybackEngine uses SpawnCapable interface (not core ProcessManager) to avoid server/core type mismatch
- Per-registrar try/catch in CLI module discovery — prevents one module's conflict from blocking others
- CLI route command uses simple setInterval tick loop (not PlaybackEngine) for headless operation
- Four zustand stores per location feature domain (location, playback, route, favorites) — clean separation of concerns
- Custom CSS DivIcon factories for Leaflet markers — allows glass-panel aesthetic and CSS animations
- Client-side GPX/KML parsing with @tmcw/togeojson + browser DOMParser — avoids server round-trip
- iOS listapps outputs NeXT-step plist — pipe through `plutil -convert json` for reliable JSON parsing
- `@fastify/multipart` scoped to app-management module routes only (not global) — 500MB file limit for large APKs
- Android `monkey` for app launch — avoids needing to know the launcher activity name
- IPA install requires unzip to extract `Payload/*.app` — simctl only accepts `.app` bundles
- Android app commands guard against `avd:` prefix device IDs — these are synthetic and can't run adb shell
- LogStreamer uses SpawnCapable interface (same pattern as PlaybackEngine) to avoid server/core type mismatch
- iOS `--style ndjson` (not `--style json` or `--style default`) — ndjson streams one JSON object per line, json waits for completion, default text varies across macOS versions
- iOS log level mapping: Default→info, Info→info, Debug→debug, Error→error, Fault→fatal (no native verbose/warning)
- Server-side log batching at 150ms flush interval — prevents WS flooding while feeling real-time
- Ref-counted log streaming — multiple WS clients share a single child process per device
- CLI `simvyn logs` uses raw ANSI escape codes (not chalk) — 6 constants don't justify a dependency
- CLI log output processes each line immediately (no batching) for lowest latency
- Dashboard log buffer capped at 50K entries (server at 10K) for extended scrollback
- Client-side log filtering only — no server roundtrip for filter changes, instant response
- Liquid Glass design system uses oklch color space — perceptually uniform, CSS native
- Body background is a 4-stop diagonal gradient (not flat color) — deep blue-purple tones at 145deg
- Glass panels use backdrop-filter: blur(24px) saturate(1.3) — increased from initial 20px/1.2 for stronger effect
- Sidebar is macOS Dock-style (60px icon bar, not 224px text sidebar) — Lucide icons with hover tooltips
- Framer Motion AnimatedPanel uses useAnimationControls (not key-based remount) — re-animates on every switch without losing state
- Sonner toasts mounted at app root with inline oklch glass styles — no dependency on CSS classes for core toast appearance
- All emojis removed from dashboard — replaced with Lucide icons or plain text throughout
- Direct execFileAsync for simctl push — no adapter needed since push is iOS-simulator-only
- openUrl on PlatformAdapter is optional (?) — consistent with setLocation/listApps pattern, not all platforms may support all URL types
- Deep link history capped at 50 entries with LIFO ordering — recent-first display without unbounded growth
- No WS handler for deep-links module — fire-and-forget pattern, no streaming needed

### Architecture Notes
- Module manifest contract: each module exports Fastify plugin, Commander subcommand, WS namespace, UI panel registration
- Platform adapters: `PlatformAdapter` interface with iOS and Android implementations
- DeviceManager singleton with polling + caching + event emission
- Process registry for child process lifecycle (prevents zombie processes)
- State persistence in `~/.simvyn/` (JSON files)
- Dashboard module panels lazy-loaded via `React.lazy()`
- LogStreamer per-device with readline line-by-line ndjson parsing, timed flush, capped history buffer
- WS handler uses WeakMap<WebSocket, Set<string>> for socket-to-device tracking, WeakSet for close listener dedup
- Dashboard design system: oklch tokens in @theme, .glass-panel utility, .dock-sidebar/.dock-icon CSS classes
- Icon system: separate iconMap/labelMap objects in Sidebar for easy future swap from Lucide to custom SVGs

### Research Flags
- Phase 1: WebSocket multiplexing approach needs prototyping (single connection vs. multiple)
- ~~Phase 4: `simctl spawn log stream` output varies by macOS version — needs defensive parsing~~ RESOLVED: using `--style ndjson` eliminates this concern
- Phase 7: better-sqlite3 WAL-mode locking behavior with actively-written databases

### TODOs
(None)

### Blockers
(None)

## Session Continuity

**Last session:** 2026-02-26T10:49:30Z
**Stopped at:** Completed 06-02-PLAN.md
**Context for next session:** Phase 5 (Dashboard UI) complete — all 4 plans executed. Liquid Glass design system established with oklch tokens, 4-stop diagonal gradient background, enhanced glass panels (blur 24px, saturate 1.3), Inter font via Google Fonts, custom thin scrollbars. Sidebar rebuilt as macOS Dock-style icon bar (60px) with Lucide icons (MonitorSmartphone, MapPin, AppWindow, ScrollText), hover tooltips, scale-up animation, and glowing dot active indicator. TopBar polished with gradient text branding, pulsing connection indicator. DeviceSelector enhanced with glass dropdown, chevron rotation, shadow. ModuleShell has Framer Motion spring animations (fade+slide-up on every switch via useAnimationControls, display:none/block state persistence preserved). Sonner Toaster mounted at app root with glass styling. All module panels (device, app, log, location) polished for visual consistency — no emojis remain, consistent text-base font-medium headings, responsive grids, hover effects. lucide-react and framer-motion added as dependencies. Ready for Phase 6 planning.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26*
