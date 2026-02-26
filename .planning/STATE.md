# Project State: Simvyn

## Project Reference

**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

**Current Focus:** Milestone v1.1 — Dashboard UX Polish

## Current Position

**Phase:** Not started (defining requirements)
**Plan:** —
**Status:** Defining requirements
**Progress:** [░░░░░░░░░░] 0%

## Phase Overview

| Phase | Status |
|-------|--------|
| 1. Foundation & Device Management | ✅ Complete (7/7 plans) |
| 2. Location Module | ✅ Complete (4/4 plans) |
| 3. App Management Module | ✅ Complete (4/4 plans) |
| 4. Log Viewer Module | ✅ Complete (4/4 plans) |
| 5. Dashboard UI | ✅ Complete (4/4 plans) |
| 6. Quick-Action Modules | ✅ Complete (4/4 plans) |
| 7. File System & Database Inspector | ✅ Complete (3/3 plans) |
| 8. Device Settings & Accessibility | ✅ Complete (2/2 plans) |
| 9. Utility Modules | ✅ Complete (4/4 plans) |
| 10. Post-v1 Bugfixes | ✅ Complete (1/1 plans) |
| 11. Location Module Rewrite | ✅ Complete (4/4 plans) |
| 12. Liquid Glass UI Refactor | 🔄 Executing (3/7 plans) |
| 12.1 Log Module Performance Overhaul | ✅ Complete (3/3 plans) |
| 12.2 Unified Device Selector | ✅ Complete (2/2 plans) |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 11/12 |
| Plans completed | 41/41 (Phase 1: 7, Phase 2: 4, Phase 3: 4, Phase 4: 4, Phase 5: 4, Phase 6: 4, Phase 7: 3, Phase 8: 2, Phase 9: 4, Phase 10: 1, Phase 11: 4) |
| Requirements delivered | 126/126 |
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
| Phase 06 P01 | 5min | 2 tasks | 9 files |
| Phase 06 P02 | 2min | 1 task | 7 files |
| Phase 06 P03 | 2min | 1 tasks | 5 files |
| Phase 06 P04 | 3min | 2 tasks | 8 files |
| Phase 07 P01 | 3min | 2 tasks | 7 files |
| Phase 07 P02 | 5min | 2 tasks | 7 files |
| Phase 07 P03 | 5min | 2 tasks | 12 files |
| Phase 08 P01 | 5min | 3 tasks | 9 files |
| Phase 08 P02 | 3min | 2 tasks | 6 files |
| Phase 09 P01 | 3min | 2 tasks | 9 files |
| Phase 09 P02 | 2min | 1 tasks | 7 files |
| Phase 09 P03 | 1min | 1 tasks | 8 files |
| Phase 09 P04 | 2min | 2 tasks | 5 files |
| Phase 10 P01 | 1min | 2 tasks | 3 files |
| Phase 11 P01 | 1min | 2 tasks | 5 files |
| Phase 11 P02 | 13min | 2 tasks | 14 files |
| Phase 11 P03 | 7min | 2 tasks | 6 files |
| Phase 11 P04 | 2min | 2 tasks | 4 files |
| Phase 12 P01 | 3min | 2 tasks | 2 files |
| Phase 12 P02 | 2min | 2 tasks | 5 files |
| Phase 12 P04 | 3min | 2 tasks | 8 files |
| Phase 12 P06 | 4min | 2 tasks | 4 files |
| Phase 12 P03 | 6min | 2 tasks | 6 files |
| Phase 12 P05 | 6min | 2 tasks | 8 files |
| Phase 12.1 P01 | 1min | 2 tasks | 2 files |
| Phase 12.1 P02 | 1min | 2 tasks | 5 files |
| Phase 12.1 P03 | 2min | 2 tasks | 3 files |
| Phase 12.2 P01 | 1min | 2 tasks | 2 files |
| Phase 12.2 P02 | 5min | 2 tasks | 13 files |

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
- Dashboard log buffer capped at 5K entries (reduced from 50K) with server-side pagination compensating
- INITIAL_INDEX at 100K for react-virtuoso reverse-infinite scroll headroom
- UNMOUNT_WHEN_HIDDEN Set pattern in ModuleShell — panels in this set return null when inactive (full unmount vs display:none)
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
- Recorder uses in-memory Map keyed by deviceId for active recording state — simple, avoids persistence for transient state
- Android stopRecording pulls file from /sdcard/ after killing adb process — screenrecord runs on-device
- CLI record command uses SIGINT handler to gracefully stop recording on Ctrl+C
- Separate captures/ and recordings/ subdirectories under ~/.simvyn/screenshot/ for organization
- Recording timer uses client-side Date.now() delta with setInterval — no server round-trip needed for elapsed display
- Push panel shows iOS-only badge when Android device selected — visual indicator before send attempt
- JSON textarea uses try/catch parse for real-time validation with red border on invalid JSON
- iOS plist read converts binary to XML via plutil for human-readable editing, converts back on write
- Android file staging uses /data/local/tmp/simvyn_transfer as intermediate path for run-as file transfer
- fileSystem (and database) added to PlatformCapability union type for module capability declarations
- better-sqlite3 with readonly:true for browsing, copy-on-write (copy db+wal+shm to temp, modify, copy back) for mutations
- Android databases pulled to temp via `adb shell run-as <pkg> cat`, operated locally with better-sqlite3, pushed back for writes
- SharedPreferences parsed from XML via regex — no XML library needed for well-defined Android format (6 element types)
- NSUserDefaults read via `plutil -convert json <path>` — direct file path (not stdin pipe) since file is on host filesystem
- Android database discovery uses `adb shell run-as <pkg> find` — simpler than recursive walk over adb

- Device+app selector is the standard panel pattern for modules that operate on a specific app's data container
- Database panel tab bar uses glass-panel segment control (bg-bg-surface/40 with rounded-xl)
- TableViewer inline cell editing with double-click — auto-detects number vs string on save
- PrefsViewer handles both iOS (flat key-value) and Android (grouped by file with type badges)
- Android permission prefix auto-prepended — short names (CAMERA) mapped to android.permission.CAMERA for ergonomic API
- Capabilities endpoint derives flags from adapter method presence (!!adapter?.method) — no hardcoded platform checks
- Settings adapter methods as optional on PlatformAdapter — undefined for unsupported platforms (e.g. setTalkBack on iOS)
- iOS crash logs parsed from filename pattern (ProcessName-YYYY-MM-DD-HHMMSS.ips) with fs.stat for timestamps
- Android logcat entries grouped by PID+TAG into crash groups, tombstones fetched via dumpsys dropbox
- Android crash log view returns preview text — logcat dumps are transient, no persistent log file to re-read
- Android getClipboard undefined — no reliable adb-only clipboard read without a helper app
- Android setClipboard uses `cmd clipboard set-text` (Android 12+) with `input text` fallback for older versions
- iOS setClipboard uses spawn + stdin pipe to `pbcopy` (reads from stdin, not file argument)
- Z-index stacking order: sidebar(20) < header(30) < tooltips/dropdowns(50+) — raise overlays rather than lower content
- AnimatedPanel motion.div needs h-full to maintain height chain for panels using height: 100% (e.g. LocationPanel)
- Store migration from sim-location: direct copy with only API path prefix changes (favorites: /api/favorites/* → /api/modules/location/favorites/*)
- Switched from oklch inline values to rgba glass values in shell components for visual parity with sim-location
- glass-panel uses inset highlight + deep shadow (blur(20px) saturate(1.4)) as standard across all components
- .top-bar CSS class for header instead of long Tailwind arbitrary value strings
- LocationPanel uses useWsListener for all 9 WS event types — markerPosition effect sends set-location with single deviceId + reverse geocode
- Full 1200-line sim-location CSS migrated as location-panel.css — removed html/body reset, map-container uses width/height 100% for panel embedding
- Lightened @theme oklch tokens by +0.04-0.06 — bg-base 0.05→0.10, body gradient 0.04-0.06→0.09-0.11, glass-panel uses rgba(40,40,55,0.50)
- 9 glass utility classes in main.css: glass-button-primary, glass-button-destructive, glass-tab-bar, glass-tab, glass-table, glass-badge, glass-drop-zone, glass-textarea, glass-empty-state
- prefers-reduced-motion reduces transitions to 0.01ms and backdrop-filter blur to 8px
- Dock sidebar transformed from full-height flush panel to floating pill shape (52px wide, 16px border-radius, 12px margin)
- Active module indicator dot moved from bottom-center to left-center per locked user decision
- Shell components (DeviceSelector, TopBar) inline styles removed — only ModuleShell display toggle remains (architectural)
- Log entries remain non-glass (content, not navigation) per Apple Liquid Glass guideline
- Badge color customization via glass-badge class + inline style for color/borderColor/background
- Level filter buttons use glass-button as base class with conditional Tailwind overrides for active state colors
- glass-textarea used for Clipboard read/write and Push JSON payload — mono font and transparent bg from utility
- Push JSON validation red border preserved as conditional class alongside glass-textarea
- Empty state pattern: glass-panel wrapper + glass-empty-state child (not inline p-12 text-center)
- Sticky table headers use opaque var(--color-bg-surface) instead of backdrop-filter — prevents glass-on-glass inside glass-panel container
- Inner database components (DatabaseBrowser, TableViewer, PrefsViewer) stripped of glass-panel — only outermost container uses glass-panel
- Android prefs file section headers use muted uppercase text (matching glass-table thead) instead of glass-panel dividers
- Cursor-based pagination for log history using buffer index (not timestamp) — simpler, no ambiguity with duplicate timestamps
- iOS clear-device-logs restarts the log stream (no equivalent to adb logcat -c) — stop/start cycle gives fresh output
- LogList reads from store directly (selectFilteredEntries) instead of receiving entries as props — avoids parent re-render on every log batch
- selectedDeviceId stored in ref for WS callbacks — prevents stale closure issues with useCallback dependencies
- selectedDeviceIds as string[] (empty = no selection) replaces nullable single selectedDeviceId — cleaner null-safety
- MULTI_SELECT_MODULES Set in DeviceSelector for extensible module-based mode switching (currently only "location")
- toggleDevice guards against removing last device — silent no-op, prevents empty selection state

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

### Roadmap Evolution
- Phase 11 added: Location module rewrite — migrate sim-location UI and logic into simvyn dashboard
- Phase 12 added: Liquid Glass UI refactor — refactor entire dashboard to match Apple's official Liquid Glass design across all module panels
- Phase 12.1 inserted after Phase 12: Log Module Performance Overhaul (URGENT) — paginated log fetching, virtual list, descending order, device log clearing, search revamp, unmount cleanup
- Phase 12.2 inserted after Phase 12: Unified Device Selector (URGENT) — remove duplicate per-panel selectors, single top-bar selector with multi-select for location, single-select elsewhere

### Research Flags
- Phase 1: WebSocket multiplexing approach needs prototyping (single connection vs. multiple)
- ~~Phase 4: `simctl spawn log stream` output varies by macOS version — needs defensive parsing~~ RESOLVED: using `--style ndjson` eliminates this concern
- ~~Phase 7: better-sqlite3 WAL-mode locking behavior with actively-written databases~~ RESOLVED: copy-on-write strategy avoids direct access to actively-written databases

### TODOs
(None)

### Blockers
(None)

## Session Continuity

**Last session:** 2026-02-26T20:37:22Z
**Stopped at:** Completed 12.2-02-PLAN.md (all panels wired to global device store)
**Context for next session:** Phase 12.2 complete (2/2 plans). All panels consume device selection from unified TopBar DeviceSelector.

---
*State initialized: 2026-02-26*
*Last updated: 2026-02-26T18:07:28Z*
