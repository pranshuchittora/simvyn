# Roadmap: Simvyn

**Created:** 2026-02-26
**Depth:** Comprehensive
**Phases:** 31 (13 v1.0 + 5 v1.1 + 1 v1.2 + 2 v1.3 + 2 v1.4 + 3 v1.5 + 5 v1.6 + 1 v1.7)
**Coverage:** 108/108 v1.0, 20/20 v1.1, 8/8 v1.2, 14/14 v1.3, 9/9 v1.4, 10/10 v1.5, 22/22 v1.6, 12/12 v1.7 requirements mapped

## Phases

- [x] **Phase 1: Foundation & Device Management** — Monorepo, module system, server, dashboard shell, CLI, device discovery and lifecycle
- [x] **Phase 2: Location Module (sim-location Migration)** — Migrate sim-location into module architecture, validating the module system end-to-end
- [x] **Phase 3: App Management Module** — Install, uninstall, launch, terminate, inspect apps on both platforms
- [x] **Phase 4: Log Viewer Module** — Real-time log streaming with filtering, search, and export
- [x] **Phase 5: Dashboard UI** — Apple Liquid Glass design system, layout shell, responsive panels, animations
- [x] **Phase 6: Quick-Action Modules** — Screenshots, screen recording, deep links, and push notifications
- [x] **Phase 7: File System & Database Inspector** — Browse app files, SQLite tables, SharedPreferences, and NSUserDefaults
- [x] **Phase 8: Device Settings & Accessibility** — Dark mode, permissions, locale, status bar, accessibility toggles
- [x] **Phase 9: Utility Modules** — Crash logs, media injection, and clipboard bridge
- [x] **Phase 11: Location Module Rewrite** — Replace generated location panel with production sim-location code (completed 2026-02-26)
- [x] **Phase 12: Liquid Glass UI Refactor** — Refactor entire dashboard to match Apple's official Liquid Glass design across all module panels
- [x] **Phase 12.1: Log Module Performance Overhaul** — Paginated fetching, virtual list, descending order, device clearing, search revamp, unmount cleanup (INSERTED) (completed 2026-02-26)
- [x] **Phase 12.2: Unified Device Selector** — Single top-bar selector with per-module multi/single select (INSERTED) (completed 2026-02-26)

### Milestone v1.1 — Dashboard UX Polish

- [x] **Phase 13: URL Routing** — URL-based module navigation with browser history, refresh persistence, and direct URL access
- [x] **Phase 14: Module Icons** — Custom liquid glass SVG icons for every module, replacing Lucide icons in sidebar, palette, and home screen (completed 2026-02-26)
- [x] **Phase 15: Command Palette** — Cmd+K spotlight-style search with fuzzy module/action navigation and Liquid Glass styling (completed 2026-02-26)
- [x] **Phase 16: Home Screen & Capture Management** — Welcome landing page with quick-start tips, device summary, recent modules; plus capture history deletion (completed 2026-02-26)
- [x] **Phase 17: Tool Settings** — Dedicated settings page for server port, auto-open, data wipe, and storage usage (completed 2026-02-26)
- [x] **Phase 17.1: Typography Update** — Cascadia Code for branding, adjust all dashboard text styling (INSERTED) (completed 2026-02-26)
- [x] **Phase 18: Interactive Command Palette** — Multi-step actions with parameter selection, device targeting, and inline autocomplete (completed 2026-02-26)

### Milestone v1.3 — Platform Capabilities

- [x] **Phase 19: Device Lifecycle** — Create, clone, rename iOS simulators; SSL certificate management for proxy testing (completed 2026-02-27)
- [x] **Phase 20: Developer Utilities** — Port forwarding, display overrides, battery simulation, input injection, bug reports (completed 2026-02-27)
- [x] **Phase 20.1: Liquid Glass Module Icons** — Redesign all 15 sidebar icons with SVG gradient glass fills (INSERTED) (completed 2026-02-27)

### Milestone v1.4 — Quality of Life

- [x] **Phase 21: Settings Consolidation & Dock Polish** — Merge Dev Utils and Device Settings into unified panel; remove dock hover scale (completed 2026-02-27)
- [x] **Phase 22: CLI & Build DX** — Verbose command logging with colored output; open source friendly build (completed 2026-02-27)

### Milestone v1.5 — Public Release

- [x] **Phase 22.1: Code Audit** — Security audit commit-by-commit for credentials, secrets, and sensitive data (INSERTED) (completed 2026-02-27)
- [x] **Phase 22.2: Test Suite** — Extensive tests for adapter commands verifying correct adb/xcrun invocations (INSERTED) (completed 2026-02-27)
- [x] **Phase 22.3: NPM Package & README** — README with logo and tagline, npx simvyn support, npm publish CI, make package public (INSERTED) (completed 2026-02-27)

### Milestone v1.6 — Collections & Documentation

- [x] **Phase 23: Collections Foundation** — Action registry, collection schema with versioning, storage, CRUD endpoints, CLI subcommands (completed 2026-03-04)
- [x] **Phase 24: Execution Engine** — Server-side sequential step runner with parallel per-device execution, WS progress streaming, shared executor for CLI/dashboard parity (completed 2026-03-04)
- [x] **Phase 25: Collection Builder UI** — Visual step builder with categorized action picker, drag-to-reorder, platform badges, per-step parameter configuration (completed 2026-03-04)
- [x] **Phase 26: Apply Modal & Integration** — Execution visualization with per-step per-device feedback, command palette collections, CLI subcommands, starter collections (completed 2026-03-04)
- [x] **Phase 27: Documentation** — README restructure with visual-first layout, per-feature showcase sections, collections walkthrough, expanded CLI reference (completed 2026-03-04)

### Milestone v1.7 — Real Device Support

- [x] **Phase 28: Real Device Support** — iOS physical devices via devicectl, Android adapter refinement, device-aware capabilities, grouped selector (completed 2026-03-04)
- [x] **Phase 28.1: Favourite Devices** — Persist favourite devices so they appear at the top of the device selector (INSERTED) (completed 2026-03-05)

## Phase Details

### Phase 1: Foundation & Device Management
**Goal:** Developers can discover all connected simulators/emulators, manage device lifecycle, and the module system is ready to receive feature modules
**Depends on:** Nothing (first phase)
**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, INFRA-09, DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-07, DEV-08
**Success Criteria** (what must be TRUE):
  1. Running `npx simvyn` starts a Fastify server, opens the web dashboard in a browser, and shows a device selector listing all detected iOS simulators and Android emulators/devices
  2. User can boot, shutdown, and erase an iOS simulator or Android emulator from the dashboard and from `simvyn device` CLI commands
  3. Device list updates in real-time — booting a simulator outside simvyn is reflected in the dashboard within the polling interval
  4. A new module folder dropped into the modules directory is auto-discovered and its routes, CLI commands, and WS handlers are registered without modifying core code
  5. Running on Linux gracefully hides iOS-specific features and shows only Android device management
**Plans:** 7 plans (6 executed, 1 gap closure pending)

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold & shared types
- [x] 01-02-PLAN.md — Core library: adapters, services, DeviceManager
- [x] 01-03-PLAN.md — Fastify server, WebSocket & module system
- [x] 01-04-PLAN.md — Dashboard shell (React + Vite + Tailwind v4)
- [x] 01-05-PLAN.md — Device management module
- [x] 01-06-PLAN.md — CLI entry point & packaging
- [ ] 01-07-PLAN.md — Fix WS subscribe envelope for real-time device updates (gap closure)

### Phase 2: Location Module (sim-location Migration)
**Goal:** Developers can set GPS coordinates and simulate routes on any simulator/emulator, proving the module architecture works end-to-end
**Depends on:** Phase 1
**Requirements:** LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, LOC-06, LOC-07, LOC-08, LOC-09, LOC-10
**Success Criteria** (what must be TRUE):
  1. User can set a GPS coordinate on a selected iOS simulator or Android emulator from the dashboard's interactive map or via `simvyn location set <device> <lat> <lng>`
  2. User can load a GPX file and play back a route with play/pause/stop controls, seeing the simulated device move along the path
  3. User can search for a location by name (geocoding), pick it on the map, and save it as a favorite that persists across sessions
  4. The location module registers its Fastify routes, WS handlers, CLI subcommands, and dashboard panel entirely through the module manifest — no core code changes were needed to add it
**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md — Core adapter extensions + location module scaffold
- [x] 02-02-PLAN.md — Server routes, WS handler, playback engine, Nominatim proxy
- [x] 02-03-PLAN.md — CLI subcommands (location set, route, clear) + GPX/KML parser
- [x] 02-04-PLAN.md — Dashboard panel with Leaflet map, search, playback, favorites

### Phase 3: App Management Module
**Goal:** Developers can manage the full app lifecycle — list, install, uninstall, launch, terminate, and inspect apps on any device
**Depends on:** Phase 1
**Requirements:** APP-01, APP-02, APP-03, APP-04, APP-05, APP-06, APP-07, APP-08, APP-09
**Success Criteria** (what must be TRUE):
  1. User can see all installed apps on a selected device in the dashboard, with bundle IDs, versions, and container paths
  2. User can drag an IPA or APK into the dashboard (or use `simvyn app install`) to install it, then launch it from the app list
  3. User can terminate a running app and clear its data (Android) from the dashboard or CLI
  4. All app management operations work via CLI subcommands (`simvyn app list`, `simvyn app install`, `simvyn app launch`, etc.) without the server running
**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md — AppInfo type + iOS/Android adapter app management methods
- [x] 03-02-PLAN.md — Module scaffold, Fastify routes, WS handler, @fastify/multipart
- [x] 03-03-PLAN.md — CLI subcommands (simvyn app list/install/launch/...)
- [x] 03-04-PLAN.md — Dashboard panel with app list, drag-and-drop install, action buttons

### Phase 4: Log Viewer Module
**Goal:** Developers can stream, search, and filter device logs in real-time for debugging
**Depends on:** Phase 1
**Requirements:** LOG-01, LOG-02, LOG-03, LOG-04, LOG-05, LOG-06, LOG-07, LOG-08
**Success Criteria** (what must be TRUE):
  1. User can open the log viewer panel and immediately see real-time logs from the selected device, with log levels color-coded (verbose through fatal)
  2. User can filter logs by level, by app/process name, and by text pattern (including regex), and the filter applies instantly to both incoming and existing logs
  3. User can export the current log buffer to a file (plain text or JSON) from the dashboard
  4. Log streaming doesn't degrade device status updates or other module WebSocket traffic — server-side batching prevents flooding
  5. User can stream logs headlessly via `simvyn logs <device> --level <level> --filter <pattern>` with output to stdout
**Plans:** 4 plans

Plans:
- [x] 04-01-PLAN.md — Shared types (LogLevel, LogEntry) + LogStreamer class with iOS/Android ndjson parsing and batched flush
- [x] 04-02-PLAN.md — Module scaffold, Fastify export route, WS handler with ref-counted streaming
- [x] 04-03-PLAN.md — CLI subcommand: `simvyn logs <device>` with level/regex filtering and ANSI colors
- [x] 04-04-PLAN.md — Dashboard panel with real-time log list, level/search/process filters, and export

### Phase 5: Dashboard UI
**Goal:** The web dashboard delivers the Apple Liquid Glass aesthetic with a polished, responsive layout that makes every module feel native
**Depends on:** Phase 1 (shell exists), Phase 2+ (module panels to render)
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09
**Success Criteria** (what must be TRUE):
  1. Dashboard renders with dark gradient background, frosted glass panels (backdrop-filter blur + saturate), muted accent colors, and spring animations on panel transitions
  2. Top bar shows the device selector dropdown with connection status; sidebar lists all discovered modules with icons; clicking a module renders its panel in the main content area
  3. Switching between modules preserves each module's state — navigating away from logs and back shows the same scroll position and filters
  4. Layout adapts to different screen widths without breaking, and toast notifications appear for async operations (screenshot captured, location set, etc.)
**Plans:** 4 plans (4 executed)

Plans:
- [x] 05-01-PLAN.md — Liquid Glass design system, Inter font, macOS Dock sidebar with Lucide icons
- [x] 05-02-PLAN.md — TopBar polish, DeviceSelector glass dropdown, ModuleShell loading/empty states
- [x] 05-03-PLAN.md — Framer Motion spring animations + Sonner toast notifications
- [x] 05-04-PLAN.md — Polish all module panels (device, app, log, location) for visual consistency

### Phase 6: Quick-Action Modules
**Goal:** Developers can capture screenshots, record screens, open deep links, and send push notifications as one-click actions
**Depends on:** Phase 1
**Requirements:** SCRN-01, SCRN-02, SCRN-03, SCRN-04, SCRN-05, SCRN-06, SCRN-07, LINK-01, LINK-02, LINK-03, LINK-04, LINK-05, PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05
**Success Criteria** (what must be TRUE):
  1. User can capture a screenshot of any device from the dashboard or CLI and it appears in a history panel with timestamp and device info; user can copy it to host clipboard
  2. User can start/stop screen recording on iOS or Android from the dashboard, with the resulting video saved and downloadable
  3. User can type a URL or custom scheme into the deep links panel and launch it on the selected device; frequently used links can be saved as favorites per app
  4. User can compose a push notification payload in a JSON editor (or pick from a template library), send it to an iOS simulator, and save the payload for reuse
  5. All three modules expose CLI subcommands (`simvyn screenshot`, `simvyn record`, `simvyn link`, `simvyn push`) that work headlessly
**Plans:** 4 plans (4 executed)

Plans:
- [x] 06-01-PLAN.md — Screenshot/recording module (adapters, routes, WS, CLI)
- [x] 06-02-PLAN.md — Deep links module (open URLs, favorites, CLI)
- [x] 06-03-PLAN.md — Push notifications module (send, templates, saved payloads, CLI)
- [x] 06-04-PLAN.md — Dashboard panels for all 3 modules + Sidebar integration

### Phase 7: File System & Database Inspector
**Goal:** Developers can browse app files, inspect SQLite databases, and view key-value stores without leaving the dashboard
**Depends on:** Phase 1, Phase 3 (app containers)
**Requirements:** FS-01, FS-02, FS-03, FS-04, FS-05, FS-06, DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08
**Success Criteria** (what must be TRUE):
  1. User can browse an app's sandbox file tree in the dashboard, navigate directories, and download any file to the host
  2. User can upload a file from the host to a specific path in the app's sandbox, and edit text files inline in the dashboard with save-back
  3. User can open a SQLite database from an app container, browse tables with schema/types/row counts, view paginated data, edit cell values, and run arbitrary SQL queries
  4. User can view SharedPreferences (Android) and NSUserDefaults (iOS) as key-value tables in the dashboard
  5. File and database operations are available via CLI (`simvyn fs ls`, `simvyn fs pull`, `simvyn db query`, etc.)
**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md — File system module backend (iOS/Android adapters, routes, CLI)
- [x] 07-02-PLAN.md — Database inspector module backend (SQLite, prefs, routes, CLI)
- [x] 07-03-PLAN.md — Dashboard panels for both modules + sidebar integration

### Phase 8: Device Settings & Accessibility
**Goal:** Developers can toggle device settings and accessibility configurations for testing without leaving the dashboard
**Depends on:** Phase 1
**Requirements:** SET-01, SET-02, SET-03, SET-04, SET-05, SET-06, SET-07, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05
**Success Criteria** (what must be TRUE):
  1. User can toggle dark/light mode on iOS and Android from the dashboard with one click, and the device UI updates immediately
  2. User can override the iOS status bar (time, battery, network) and grant/revoke/reset app permissions on both platforms from the dashboard
  3. User can change accessibility content size, increase contrast (iOS), and toggle TalkBack (Android) from a quick-preset panel
  4. All settings and accessibility operations are available via CLI subcommands (`simvyn settings`, `simvyn a11y`)
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md — Settings & accessibility module backend (types, adapters, routes, CLI)
- [x] 08-02-PLAN.md — Dashboard panel with appearance, status bar, permissions, accessibility sections

### Phase 9: Utility Modules
**Goal:** Developers can view crash logs, inject media into devices, and bridge the clipboard between host and device
**Depends on:** Phase 1
**Requirements:** CRASH-01, CRASH-02, CRASH-03, CRASH-04, MED-01, MED-02, MED-03, MED-04, CLIP-01, CLIP-02, CLIP-03, CLIP-04
**Success Criteria** (what must be TRUE):
  1. User can list and view crash logs filtered by app and time range, from both iOS diagnostic reports and Android logcat/tombstones
  2. User can drag-and-drop photos or videos into the dashboard to inject them into the device's camera roll (or use `simvyn media add` CLI)
  3. User can read the current device clipboard contents and write text to the device clipboard from the dashboard or via `simvyn clipboard get/set`
  4. All three modules expose CLI subcommands that work headlessly without the dashboard
**Plans:** 4 plans

Plans:
- [x] 09-01-PLAN.md — Crash logs module (iOS DiagnosticReports + Android logcat, routes, CLI)
- [x] 09-02-PLAN.md — Media injection module (addMedia adapters, multipart upload route, CLI)
- [x] 09-03-PLAN.md — Clipboard bridge module (get/set adapters, routes, CLI)
- [x] 09-04-PLAN.md — Dashboard panels for all 3 modules + sidebar icons

### Phase 13: URL Routing
**Goal:** Users can navigate between modules via URL, refresh without losing their place, and share direct links to specific module views
**Depends on:** Phase 5 (dashboard shell), Phase 12 (current UI)
**Requirements:** ROUTE-01, ROUTE-02, ROUTE-03
**Success Criteria** (what must be TRUE):
  1. Clicking a module in the sidebar updates the browser URL to reflect the active module (e.g., `/logs`, `/location`, `/settings`)
  2. Refreshing the browser re-opens the exact module that was active before the refresh
  3. Typing a module URL directly into the browser address bar (e.g., `localhost:3000/logs`) navigates to that module without first showing the home screen
**Plans:** 1 plan

Plans:
- [x] 13-01-PLAN.md — Install react-router, wire BrowserRouter with URL-synced module navigation, update Sidebar and ModuleShell

### Phase 14: Module Icons
**Goal:** Every module has a distinctive, colorful liquid glass SVG icon that reinforces the Apple aesthetic and aids module recognition
**Depends on:** Phase 5 (sidebar), Phase 12 (glass design system)
**Requirements:** ICON-01, ICON-02
**Success Criteria** (what must be TRUE):
  1. Each module displays a custom colorful liquid glass SVG icon (not a Lucide generic icon) in the sidebar dock
  2. The same custom icons appear in the command palette module list and home screen module grid
  3. Icons are visually consistent with the Liquid Glass aesthetic — translucent fills, soft gradients, rounded forms
**Plans:** 1/1 plans complete

Plans:
- [ ] 14-01-PLAN.md — Create 13 custom liquid glass SVG icons and wire into Sidebar

### Phase 15: Command Palette
**Goal:** Users can discover and navigate to any module or device action instantly via keyboard-driven spotlight search
**Depends on:** Phase 13 (routing for navigation), Phase 14 (icons for display)
**Requirements:** CMDK-01, CMDK-02, CMDK-03, CMDK-04, CMDK-05
**Success Criteria** (what must be TRUE):
  1. Pressing Cmd+K (macOS) or Ctrl+K (Linux) opens a centered search palette overlay from any screen
  2. The palette lists all available modules with their custom icons and descriptions, and the user can fuzzy-search by typing partial module names
  3. Pressing Enter on a search result navigates to that module (URL updates, panel renders)
  4. The palette includes device actions (e.g., "screenshot", "set location", "toggle dark mode") that the user can search and trigger
  5. The palette uses Liquid Glass styling — frosted glass backdrop with blur, dark theme, consistent with the rest of the dashboard
**Plans:** 1/1 plans complete

Plans:
- [ ] 15-01-PLAN.md — Cmd+K command palette with module navigation, device actions, and Liquid Glass styling

### Phase 16: Home Screen & Capture Management
**Goal:** Users see a welcoming, informative landing page on first load, and can manage their screenshot/recording history
**Depends on:** Phase 13 (routing — home at `/`), Phase 14 (icons for module grid)
**Requirements:** HOME-01, HOME-02, HOME-03, CAP-01, CAP-02
**Success Criteria** (what must be TRUE):
  1. When no module is selected (or on first load at `/`), a home/welcome screen is displayed instead of a blank content area
  2. The home screen shows keyboard shortcuts, quick-start tips, and a grid of recently used modules the user can click to navigate
  3. The home screen displays a connected device summary — count of connected devices, their names, and current states (booted/shutdown)
  4. User can delete individual screenshots or recordings from the capture history panel
  5. User can clear all capture history at once with a single action
**Plans:** 1/1 plans complete

Plans:
- [ ] 16-01-PLAN.md — Home screen welcome page + capture delete/clear-all functionality

### Phase 17: Tool Settings
**Goal:** Users can configure simvyn's behavior and manage stored data from a dedicated settings page
**Depends on:** Phase 13 (routing — settings at `/settings`)
**Requirements:** TSET-01, TSET-02, TSET-03, TSET-04, TSET-05
**Success Criteria** (what must be TRUE):
  1. A dedicated settings page is accessible from the sidebar, rendering as a full module panel
  2. User can wipe all saved data (favorites, history, preferences) from the settings page with confirmation
  3. User can configure the server port and toggle whether the browser auto-opens on launch
  4. User can see total storage usage (disk space consumed by `~/.simvyn/`) displayed on the settings page
**Plans:** 1/1 plans complete

Plans:
- [ ] 17-01-PLAN.md — Tool settings API endpoints, sidebar panel with config, storage usage, and data wipe

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Device Management | 7/7 | Complete | 2026-02-26 |
| 2. Location Module | 4/4 | Complete | 2026-02-26 |
| 3. App Management Module | 4/4 | Complete | 2026-02-26 |
| 4. Log Viewer Module | 4/4 | Complete | 2026-02-26 |
| 5. Dashboard UI | 4/4 | Complete | 2026-02-26 |
| 6. Quick-Action Modules | 4/4 | Complete | 2026-02-26 |
| 7. File System & Database Inspector | 3/3 | Complete | 2026-02-26 |
| 8. Device Settings & Accessibility | 2/2 | Complete | 2026-02-26 |
| 9. Utility Modules | 4/4 | Complete | 2026-02-26 |
| 11. Location Module Rewrite | 4/4 | Complete | 2026-02-26 |
| 12. Liquid Glass UI Refactor | 7/7 | Complete | 2026-03-19 |
| 12.1 Log Module Performance Overhaul | 3/3 | Complete | 2026-02-26 |
| 12.2 Unified Device Selector | 2/2 | Complete | 2026-02-26 |
| **v1.1 — Dashboard UX Polish** | | | |
| 13. URL Routing | 1/1 | Complete | 2026-02-27 |
| 14. Module Icons | 1/1 | Complete   | 2026-02-26 |
| 15. Command Palette | 1/1 | Complete   | 2026-02-26 |
| 16. Home Screen & Capture Management | 1/1 | Complete   | 2026-02-26 |
| 17. Tool Settings | 1/1 | Complete   | 2026-02-26 |
| 17.1 Typography Update | 1/1 | Complete | 2026-02-26 |
| **v1.2 — Interactive Command Palette** | | | |
| 18. Interactive Command Palette | 2/2 | Complete | 2026-02-26 |
| **v1.3 — Platform Capabilities** | | | |
| 19. Device Lifecycle | 2/2 | Complete    | 2026-02-27 |
| 20. Developer Utilities | 2/2 | Complete    | 2026-02-27 |
| 20.1 Liquid Glass Module Icons | 1/1 | Complete | 2026-02-27 |
| **v1.4 — Quality of Life** | | | |
| 21. Settings Consolidation & Dock Polish | 1/1 | Complete    | 2026-02-27 |
| 22. CLI & Build DX | 1/1 | Complete    | 2026-02-27 |
| **v1.5 — Public Release** | | | |
| 22.1 Code Audit | 1/1 | Complete    | 2026-02-27 |
| 22.2 Test Suite | 3/3 | Complete    | 2026-02-27 |
| 22.3 NPM Package & README | 3/3 | Complete    | 2026-02-27 |
| **v1.6 — Collections & Documentation** | | | |
| 23. Collections Foundation | 2/2 | Complete    | 2026-03-04 |
| 24. Execution Engine | 2/2 | Complete    | 2026-03-04 |
| 25. Collection Builder UI | 2/2 | Complete    | 2026-03-04 |
| 26. Apply Modal & Integration | 2/2 | Complete   | 2026-03-04 |
| 27. Documentation | 1/1 | Complete   | 2026-03-04 |
| **v1.7 — Real Device Support** | | | |
| 28. Real Device Support | 4/4 | Complete    | 2026-03-04 |
| 28.1 Favourite Devices | 2/2 | Complete   | 2026-03-05 |
| 29. Sidebar Expand-on-Hover | 0/0 | Complete | 2026-03-19 |
| 30. Log Controls, Release & Updates | 3/3 | Complete | 2026-03-19 |
| 30.1 Log Clear Preserves Pause | 1/1 | Complete | 2026-03-13 |
| 30.2 Log Search | 1/1 | Complete | 2026-03-13 |
| 30.3 Active Device Filter | 1/1 | Complete | 2026-03-13 |

## Coverage Map

```
INFRA-01 → Phase 1    DEV-01 → Phase 1     LOC-01 → Phase 2
INFRA-02 → Phase 1    DEV-02 → Phase 1     LOC-02 → Phase 2
INFRA-03 → Phase 1    DEV-03 → Phase 1     LOC-03 → Phase 2
INFRA-04 → Phase 1    DEV-04 → Phase 1     LOC-04 → Phase 2
INFRA-05 → Phase 1    DEV-05 → Phase 1     LOC-05 → Phase 2
INFRA-06 → Phase 1    DEV-06 → Phase 1     LOC-06 → Phase 2
INFRA-07 → Phase 1    DEV-07 → Phase 1     LOC-07 → Phase 2
INFRA-08 → Phase 1    DEV-08 → Phase 1     LOC-08 → Phase 2
INFRA-09 → Phase 1                          LOC-09 → Phase 2
                                             LOC-10 → Phase 2

APP-01 → Phase 3      LOG-01 → Phase 4     UI-01 → Phase 5
APP-02 → Phase 3      LOG-02 → Phase 4     UI-02 → Phase 5
APP-03 → Phase 3      LOG-03 → Phase 4     UI-03 → Phase 5
APP-04 → Phase 3      LOG-04 → Phase 4     UI-04 → Phase 5
APP-05 → Phase 3      LOG-05 → Phase 4     UI-05 → Phase 5
APP-06 → Phase 3      LOG-06 → Phase 4     UI-06 → Phase 5
APP-07 → Phase 3      LOG-07 → Phase 4     UI-07 → Phase 5
APP-08 → Phase 3      LOG-08 → Phase 4     UI-08 → Phase 5
APP-09 → Phase 3                            UI-09 → Phase 5

SCRN-01 → Phase 6     FS-01 → Phase 7      SET-01 → Phase 8
SCRN-02 → Phase 6     FS-02 → Phase 7      SET-02 → Phase 8
SCRN-03 → Phase 6     FS-03 → Phase 7      SET-03 → Phase 8
SCRN-04 → Phase 6     FS-04 → Phase 7      SET-04 → Phase 8
SCRN-05 → Phase 6     FS-05 → Phase 7      SET-05 → Phase 8
SCRN-06 → Phase 6     FS-06 → Phase 7      SET-06 → Phase 8
SCRN-07 → Phase 6     DB-01 → Phase 7      SET-07 → Phase 8
LINK-01 → Phase 6     DB-02 → Phase 7      A11Y-01 → Phase 8
LINK-02 → Phase 6     DB-03 → Phase 7      A11Y-02 → Phase 8
LINK-03 → Phase 6     DB-04 → Phase 7      A11Y-03 → Phase 8
LINK-04 → Phase 6     DB-05 → Phase 7      A11Y-04 → Phase 8
LINK-05 → Phase 6     DB-06 → Phase 7      A11Y-05 → Phase 8
PUSH-01 → Phase 6     DB-07 → Phase 7
PUSH-02 → Phase 6     DB-08 → Phase 7
PUSH-03 → Phase 6
PUSH-04 → Phase 6     CRASH-01 → Phase 9
PUSH-05 → Phase 6     CRASH-02 → Phase 9
                       CRASH-03 → Phase 9
                       CRASH-04 → Phase 9
                       MED-01 → Phase 9
                       MED-02 → Phase 9
                       MED-03 → Phase 9
                       MED-04 → Phase 9
                       CLIP-01 → Phase 9
                       CLIP-02 → Phase 9
                       CLIP-03 → Phase 9
                       CLIP-04 → Phase 9
```

**v1.0 Mapped: 108/108 ✓ — No orphaned requirements**

### v1.1 Coverage

```
ROUTE-01 → Phase 13   CMDK-01 → Phase 15   HOME-01 → Phase 16
ROUTE-02 → Phase 13   CMDK-02 → Phase 15   HOME-02 → Phase 16
ROUTE-03 → Phase 13   CMDK-03 → Phase 15   HOME-03 → Phase 16
                       CMDK-04 → Phase 15
ICON-01 → Phase 14    CMDK-05 → Phase 15   CAP-01 → Phase 16
ICON-02 → Phase 14                          CAP-02 → Phase 16

TSET-01 → Phase 17
TSET-02 → Phase 17
TSET-03 → Phase 17
TSET-04 → Phase 17
TSET-05 → Phase 17
```

**v1.1 Mapped: 20/20 — No orphaned requirements**

### v1.2 Coverage

```
IPAL-01 → Phase 18   IPAL-05 → Phase 18
IPAL-02 → Phase 18   IPAL-06 → Phase 18
IPAL-03 → Phase 18   IPAL-07 → Phase 18
IPAL-04 → Phase 18   IPAL-08 → Phase 18
```

**v1.2 Mapped: 8/8 — No orphaned requirements**

### v1.3 Coverage

```
DLIF-01 → Phase 19    DUTIL-01 → Phase 20
DLIF-02 → Phase 19    DUTIL-02 → Phase 20
DLIF-03 → Phase 19    DUTIL-03 → Phase 20
DLIF-04 → Phase 19    DUTIL-04 → Phase 20
DLIF-05 → Phase 19    DUTIL-05 → Phase 20
DLIF-06 → Phase 19    DUTIL-06 → Phase 20
DLIF-07 → Phase 19    DUTIL-07 → Phase 20
```

**v1.3 Mapped: 14/14 — No orphaned requirements**

### Phase 18: Interactive Command Palette

**Goal:** Transform one-shot command palette actions into multi-step interactive flows with parameter selection, device targeting, and inline autocomplete
**Depends on:** Phase 15 (command palette), Phase 8 (settings/accessibility APIs)
**Requirements:** IPAL-01, IPAL-02, IPAL-03, IPAL-04, IPAL-05, IPAL-06, IPAL-07, IPAL-08
**Plans:** 2/2 plans complete

Plans:
- [ ] 18-01-PLAN.md — Multi-step flow architecture, device picker, simple actions (screenshot, dark mode, erase)
- [ ] 18-02-PLAN.md — Complex actions (set locale, set location with geocoding), expanded action catalog

### Phase 19: Device Lifecycle
**Goal:** Developers can create, clone, and rename iOS simulators and manage SSL certificates for proxy testing — all from the dashboard and CLI
**Depends on:** Phase 1 (device management foundation)
**Requirements:** DLIF-01, DLIF-02, DLIF-03, DLIF-04, DLIF-05, DLIF-06, DLIF-07
**Success Criteria** (what must be TRUE):
  1. User can create a new iOS simulator by selecting a device type and runtime from the available options in the dashboard
  2. User can clone an existing iOS simulator to create an identical copy, and rename any simulator from the dashboard or CLI
  3. User can add SSL root certificates to an iOS simulator for MITM proxy testing and reset the keychain to defaults
  4. All device lifecycle and keychain operations are available via CLI (`simvyn device create/clone/rename`, `simvyn keychain add/reset`)
  5. Command palette includes create, clone, and rename device actions
**Plans:** 2/2 plans complete

Plans:
- [ ] 19-01-PLAN.md — Backend: types, iOS adapter, routes, CLI for lifecycle + keychain
- [ ] 19-02-PLAN.md — Dashboard: DevicePanel UI, command palette actions, CreateSimulatorPicker

### Phase 20: Developer Utilities
**Goal:** Developers can forward ports, override display settings, simulate battery states, inject input events, and collect bug reports — expanding platform-specific capabilities
**Depends on:** Phase 1 (device management foundation), Phase 8 (settings module pattern)
**Requirements:** DUTIL-01, DUTIL-02, DUTIL-03, DUTIL-04, DUTIL-05, DUTIL-06, DUTIL-07
**Success Criteria** (what must be TRUE):
  1. User can set up port forwarding and reverse forwarding on Android devices, with a panel showing active forwards and one-click teardown
  2. User can override display resolution and density on Android devices, with one-click reset to defaults
  3. User can simulate battery level and charging state on Android for testing low-battery and charging scenarios
  4. User can inject tap, swipe, text input, and key events on Android devices from the dashboard
  5. User can collect and download bug reports from iOS (simctl diagnose) and Android (adb bugreport)
  6. All operations available via CLI subcommands (`simvyn forward`, `simvyn display`, `simvyn battery`, `simvyn input`, `simvyn bugreport`)
**Plans:** 2/2 plans complete

Plans:
- [ ] 20-01-PLAN.md — Backend: types, adapter implementations, dev-utils module (routes + CLI)
- [ ] 20-02-PLAN.md — Dashboard: DevUtilsPanel with 5 capability-gated sections + module icon

### Phase 20.1: Liquid Glass Module Icons (INSERTED)

**Goal:** Redesign all 15 module icons with Apple Liquid Glass SVG technique — translucent gradient fills, inner highlights, soft glowing edges
**Depends on:** Phase 20
**Requirements:** GLASS-ICONS-01
**Success Criteria** (what must be TRUE):
  1. Every module icon in the sidebar has a visible liquid glass effect — translucent gradient fill, inner highlight, soft glow
  2. Icons remain visually distinct from each other with unique accent colors
  3. Icons render correctly at dock size (24px) without losing clarity
  4. Dashboard compiles without errors
**Plans:** 1/1 plans complete

Plans:
- [x] 20.1-01-PLAN.md — Redesign all 15 module icons with liquid glass SVG gradients

### Phase 17.1: Typography Update — Cascadia Code for branding, font adjustments across dashboard (INSERTED)

**Goal:** Use Cascadia Code as the branding font for simvyn identity, adjust dashboard text styling for consistency
**Depends on:** Phase 17
**Requirements:** TYPO-01, TYPO-02
**User Notes:**
- TopBar "simvyn" text should be white (not gradient) and use the branding font (Cascadia Code)
- Branding font should be used wherever "simvyn" appears (TopBar, HomeScreen title)
**Success Criteria** (what must be TRUE):
  1. "simvyn" text in the TopBar uses Cascadia Code font and is white (not gradient)
  2. "simvyn" text on the HomeScreen uses Cascadia Code font
**Plans:** 1/1 plans complete

Plans:
- [ ] 17.1-01-PLAN.md — Add Cascadia Code branding font and apply to simvyn text

### Phase 11: Location Module Rewrite
**Goal:** Replace the generated location dashboard panel with production-quality code migrated from sim-location, preserving exact UI and all working functionality
**Depends on:** Phase 2 (existing location module backend)
**Requirements:** LOC-REWRITE-01, LOC-REWRITE-02, LOC-REWRITE-03
**Success Criteria** (what must be TRUE):
  1. Location panel renders the exact same UI as sim-location's web app — dark map tiles, glass-panel toolbar, search with geocoding, favorites sidebar, mode selector, playback controls
  2. Map renders correctly with OpenStreetMap tiles, click-to-set-location works, route waypoints are interactive
  3. GPX/KML file import, route playback with speed controls, and favorites persistence all work end-to-end
**Plans:** 4/4 plans complete

Plans:
- [ ] 11-01-PLAN.md — Replace stores with full sim-location versions + add route-parser utility
- [ ] 11-02-PLAN.md — Replace/add all 14 map components (MapView, SearchBar, PlaybackControls, markers, overlays)
- [ ] 11-03-PLAN.md — Rewrite LocationPanel orchestrator + CSS migration + dialog components

### Phase 12: Liquid Glass UI Refactor
**Goal:** Refactor the entire dashboard to match Apple's official Liquid Glass design specification — all module panels, shell components, and shared CSS updated to a unified glass aesthetic
**Depends on:** Phase 5 (existing dashboard UI), Phase 11 (location panel glass reference)
**Requirements:** GLASS-01 (design tokens & shared CSS), GLASS-02 (shell components), GLASS-03 (all module panels), GLASS-04 (visual consistency audit)
**Success Criteria** (what must be TRUE):
  1. Every module panel (Device, App, Log, Screenshot, Deep Links, Push, File System, Database, Settings, Crash Logs, Media, Clipboard) uses the Liquid Glass aesthetic — frosted glass cards, blur/saturate backdrop, oklch color tokens, inset highlights, deep shadows
  2. Shell components (TopBar, Sidebar, DeviceSelector, ModuleShell) are visually consistent with the glass panels and match the location panel's quality level
  3. main.css design tokens are the single source of truth — no hardcoded colors or backdrop-filter values in individual panel files
  4. The dashboard looks and feels like a native Apple Liquid Glass application with consistent spacing, typography, and animation patterns across all modules
**Plans:** 7/7 plans complete

Plans:
- [x] 12-01-PLAN.md — Design tokens (lighter palette), 8 new glass utility classes, location-panel.css cleanup
- [x] 12-02-PLAN.md — Floating macOS Liquid Glass dock + shell components polish
- [x] 12-03-PLAN.md — Screenshot, CrashLogs, Media, Clipboard, DeepLinks, Push panels
- [x] 12-04-PLAN.md — Device, App, Log panels (tables, drop zones, toolbars)
- [x] 12-05-PLAN.md — FileSystem + Database panels (tab bars, SQL editor, tables)
- [x] 12-06-PLAN.md — Settings panel (forms, toggles, permissions)
- [x] 12-07-PLAN.md — Visual consistency audit + human verification

### Phase 12.2: Unified Device Selector (INSERTED)

**Goal:** Remove duplicate device selectors — single top-bar DeviceSelector becomes the global source of truth, with per-module multi-select (location) vs single-select (everything else)
**Depends on:** Phase 5 (TopBar + DeviceSelector), Phase 1 (device management)
**Requirements:** DEVSEL-01 (remove per-panel selectors), DEVSEL-02 (top-bar single source of truth), DEVSEL-03 (multi-select for location module), DEVSEL-04 (single-select for all other modules)
**Success Criteria** (what must be TRUE):
  1. Only one device selector exists in the entire dashboard — in the top bar
  2. All module panels consume the selected device from a shared global store, not their own selector
  3. Location module supports multi-device select (set location on multiple devices at once)
  4. All other modules use single-device select
**Plans:** 2/2 plans complete

Plans:
- [ ] 12.2-01-PLAN.md — Upgrade device store + DeviceSelector for adaptive single/multi mode
- [ ] 12.2-02-PLAN.md — Remove all per-panel device selectors + wire LocationPanel multi-device

### Phase 12.1: Log Module Performance Overhaul (INSERTED)

**Goal:** Overhaul the log module for production-grade performance — paginated fetching (500 logs at a time), descending order (newest first), virtual list rendering, device log clearing (adb/simctl), UI-only clear, revamped search for smaller datasets, and full unmount cleanup to reduce memory footprint
**Depends on:** Phase 4 (existing log module), Phase 12 (glass UI)
**Requirements:** LOGPERF-01 (paginated fetching), LOGPERF-02 (descending order), LOGPERF-03 (virtual list), LOGPERF-04 (infinite scroll pagination), LOGPERF-05 (device log clearing), LOGPERF-06 (UI clear), LOGPERF-07 (search revamp), LOGPERF-08 (unmount cleanup)
**Success Criteria** (what must be TRUE):
  1. Log panel initially fetches ~500 most recent logs in descending order (newest at top), not the entire stream
  2. Scrolling down triggers pagination — fetches next batch of older logs seamlessly
  3. Log list uses a virtual/recycler list library — only visible rows are rendered in the DOM regardless of total log count
  4. User can clear device logs via dashboard button (runs `adb logcat -c` / equivalent) and separately clear UI-only logs
  5. Search works efficiently on the current paginated dataset without needing all logs loaded
  6. Navigating away from the Logs panel unmounts the component and releases all log data from memory
**Plans:** 3/3 plans complete

Plans:
- [x] 12.1-01-PLAN.md — Server-side paginated history retrieval + device log clearing WS handlers
- [ ] 12.1-02-PLAN.md — Client log store redesign for paginated model + ModuleShell unmount + install react-virtuoso
- [ ] 12.1-03-PLAN.md — LogList react-virtuoso rewrite + LogPanel pagination wiring + LogToolbar device-clear + search revamp

### Phase 21: Settings Consolidation & Dock Polish
**Goal:** Single "Device Settings" panel combines all device-level operations; dock hover behavior refined
**Depends on:** Phase 20 (Dev Utils panel exists)
**Requirements:** SCON-01, SCON-02, SCON-03, DOCK-01
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a single "Device Settings" module in the sidebar containing all device-level settings (appearance, permissions, locale, accessibility, status bar) and all developer utilities (port forwarding, display overrides, battery simulation, input injection, bug reports)
  2. No separate "Settings" or "Dev Utils" entries appear in sidebar, command palette, or home screen
  3. All existing API endpoints from both modules continue to function (no regression)
  4. Dock icons show tooltip label on hover without any scale animation
**Plans:** 1/1 plans complete

Plans:
- [x] 21-01-PLAN.md — Combined DeviceSettingsPanel, module store merge, icon/label update, dock CSS fix

### Phase 22: CLI & Build DX
**Goal:** Every adb/simctl command is visible in verbose mode with colored output; builds are readable for open source contributors
**Depends on:** Phase 21 (independent, can run in parallel)
**Requirements:** VCLI-01, VCLI-02, VCLI-03, OSBLD-01, OSBLD-02
**Success Criteria** (what must be TRUE):
  1. Running `simvyn --verbose` logs every adb and simctl command with full argument arrays before execution
  2. adb commands show green-colored prefix, simctl commands show blue-colored prefix, errors show red
  3. Dashboard `npm run build` produces unminified JavaScript output (readable function names, no mangled variables)
  4. Source maps are generated alongside the build and error stack traces in browser console point to original TypeScript source
**Plans:** 1/1 plans complete

Plans:
- [x] 22-01-PLAN.md — Verbose exec wrapper, adapter refactor, CLI --verbose flag, unminified build with source maps

### Phase 28: Real Device Support

**Goal:** Developers can control and inspect physical Android and iOS devices from the simvyn dashboard and CLI, with the same experience as simulators/emulators minus hardware-limited features
**Depends on:** Phase 27
**Requirements:** RDEV-01, RDEV-02, RDEV-03, RDEV-04, RDEV-05, RDEV-06, RDEV-07, RDEV-08, RDEV-09, RDEV-10, RDEV-11, RDEV-12
**Success Criteria** (what must be TRUE):
  1. Physical iOS devices connected via USB or WiFi appear in the device selector alongside simulators, with model names and grouped under "Physical Devices" section
  2. App management (install, uninstall, launch, terminate, list) works on physical iOS devices via devicectl
  3. Android physical devices work for all adb shell operations; emulator-only operations (location, shutdown) throw descriptive errors
  4. Capabilities endpoint returns device-type-specific flags — physical devices get reduced capabilities
  5. Collections auto-skip steps unsupported on physical devices
  6. Tool settings page shows devicectl availability and Xcode version for diagnostics
**Plans:** 4/4 plans complete

Plans:
- [ ] 28-01-PLAN.md — iOS adapter devicectl integration (discovery, app mgmt, deep links, file ops, graceful degradation)
- [ ] 28-02-PLAN.md — Android adapter physical device guards (emu-only method protection)
- [ ] 28-03-PLAN.md — Device-aware capabilities, disconnect detection, collections skip
- [ ] 28-04-PLAN.md — Dashboard UI (grouped selector, disconnect toast, disabled tooltips, diagnostics)

### Phase 29: Sidebar Expand-on-Hover

**Goal:** Animated dock expansion with labels on hover
**Depends on:** Phase 28
**Status:** Complete
**Plans:** 0 plans (completed without formal plans)

### Phase 30: Log Controls, Release Automation & Update Notifications

**Goal:** Users can pause/resume log streaming, releases are automated via GitHub Actions workflow dispatch with commit-based changelogs, and the dashboard shows update notifications when newer versions are published
**Depends on:** Phase 29
**Requirements:** LOGCTL-01, LOGCTL-02, REL-01, REL-02, REL-03, UPD-01, UPD-02
**Success Criteria** (what must be TRUE):
  1. User can click a pause button in the log toolbar to stop incoming logs, and a play button to resume with fresh history loaded
  2. Running the release-dispatch workflow from GitHub Actions UI with a version number bumps package.json, commits, tags, and pushes — triggering npm publish
  3. GitHub Releases page shows a commit-based changelog listing all commits since the previous release
  4. Dashboard shows a dismissible glass-panel banner when a newer version of simvyn is available on npm, linking to GitHub releases
**Plans:** 3 plans

Plans:
- [x] 30-01-PLAN.md — Log pause/resume toggle (store, toolbar button, LogPanel WS wiring)
- [x] 30-02-PLAN.md — Release dispatch GHA workflow + commit-based changelog in releases
- [x] 30-03-PLAN.md — Dashboard update banner (server endpoint + dismissible component)

---
*Roadmap created: 2026-02-26*
*Last updated: 2026-03-04 — v1.6 milestone phases 23-27 added*

### Phase 30.5: Fix iOS Clear App Data (INSERTED)

**Goal:** Clear App Data works on iOS simulators by deleting data container contents via host filesystem, with proper toast error feedback in dashboard
**Requirements:** IOSCLR-01
**Depends on:** Phase 30
**Success Criteria** (what must be TRUE):
  1. Clicking "Clear Data" on an iOS simulator app deletes the app's data container contents
  2. Failed actions show a toast notification (not silent console.error)
  3. Physical iOS devices get a descriptive error
  4. CLI `simvyn app clear-data` works for iOS devices
**Plans:** 1/1 plans complete

Plans:
- [ ] 30.5-01-PLAN.md — Implement iOS clearAppData + toast errors + tests

### Phase 30.4: Device Font Size Control (INSERTED)

**Goal:** Users can adjust font/text size on Android devices from the device settings panel — the existing iOS content size feature auto-enables for Android once the adapter method is implemented
**Requirements:** FONTSZ-01
**Depends on:** Phase 30
**Success Criteria** (what must be TRUE):
  1. Content Size dropdown appears in the Accessibility section of Device Settings when an Android device is selected
  2. Selecting a content size changes the Android device's font scale immediately via `adb shell settings put system font_scale`
  3. CLI `simvyn a11y content-size` works for Android devices
  4. Collections `set-content-size` action works for Android devices
**Plans:** 1/1 plans complete

Plans:
- [x] 30.4-01-PLAN.md — Implement Android setContentSize with font_scale mapping + tests

### Phase 30.3: Active Device Filter (INSERTED)

**Goal:** DeviceSelector dropdown shows only active (booted) devices by default with a toggle to reveal shutdown/inactive devices — reduces noise for users with many simulators/emulators
**Requirements:** ADFILT-01, ADFILT-02, ADFILT-03
**Depends on:** Phase 30
**Success Criteria** (what must be TRUE):
  1. DeviceSelector dropdown shows only booted/active devices by default — shutdown simulators and emulators are hidden
  2. A toggle at the bottom of the dropdown reveals all devices including shutdown/inactive ones
  3. Currently selected devices remain visible regardless of filter state
**Plans:** 1/1 plans complete

Plans:
- [ ] 30.3-01-PLAN.md — Active device filtering with toggle in DeviceSelector dropdown

### Phase 30.2: Log Search (INSERTED)

**Goal:** VS Code-style find-in-page search for log entries — highlight matches in-place, navigate between them, show surrounding context. Distinct from filter which hides non-matching entries.
**Depends on:** Phase 30
**Requirements:** LOGSRCH-01, LOGSRCH-02, LOGSRCH-03, LOGSRCH-04, LOGSRCH-05
**Success Criteria** (what must be TRUE):
  1. User can press Cmd+F in the Logs panel to open a floating search overlay
  2. Search highlights matching text in log entries without hiding non-matching entries
  3. User can navigate between matches with Enter/Shift+Enter and arrow buttons, with a "3 of 47" counter
  4. Search and filter work independently — filter hides entries, search highlights within filtered results
  5. Three-dot menu in the log toolbar provides a "Search" option for discoverability
**Plans:** 1/1 plans complete

Plans:
- [ ] 30.2-01-PLAN.md — Search store, overlay, text highlighting, match navigation, three-dot menu

### Phase 30.1: Log Clear Preserves Pause State (INSERTED)

**Goal:** Clicking "Clear" or "Purge Device" in the log toolbar no longer resets the pause/resume state — if logs were paused, they stay paused after clearing
**Depends on:** Phase 30
**Requirements:** LOGFIX-01
**Success Criteria** (what must be TRUE):
  1. User can pause logs, click "Clear", and logs remain paused — no new entries stream in
  2. User can pause logs, click "Purge Device", and logs remain paused after device clears
  3. Resuming after a clear still works correctly — fresh logs are fetched
**Plans:** 1/1 plans complete

Plans:
- [ ] 30.1-01-PLAN.md — Fix clear action to preserve isPaused state

### Phase 28.1: Favourite Devices (INSERTED)

**Goal:** Users can star devices as favourites so they appear at the top of the DeviceSelector dropdown, persisted across sessions, manageable from dashboard and CLI
**Depends on:** Phase 28
**Requirements:** FAV-01, FAV-02, FAV-03, FAV-04, FAV-05, FAV-06, FAV-07
**Success Criteria** (what must be TRUE):
  1. User can click a star icon on any device row to toggle it as a favourite — filled star for favourites, outline for non-favourites
  2. Favourite devices appear in a dedicated "Favourites" section at the top of the DeviceSelector dropdown, grouped by iOS/Android sub-headers
  3. Favourite devices are removed from their original group (no duplicates) and the Favourites section is always visible (hint text when empty)
  4. Right-click context menu on any device row offers "Add to Favourites" or "Remove from Favourites"
  5. CLI supports `simvyn device favourite <id>`, `simvyn device unfavourite <id>`, and `simvyn device favourites`
  6. Favourite device IDs persist in `~/.simvyn/favourites/favourites.json` across server restarts
  7. Stale favourite IDs (devices no longer existing after multiple polls) are silently cleaned up
**Plans:** 2/2 plans complete

Plans:
- [ ] 28.1-01-PLAN.md — Core favourites storage, API routes, CLI commands
- [ ] 28.1-02-PLAN.md — DeviceSelector UI with star icons, context menu, Favourites group

### Phase 22.1: Code Audit (INSERTED)

**Goal:** Verify no credentials, secrets, API keys, or sensitive data are committed in the repository history before making it public
**Depends on:** Phase 22
**Success Criteria** (what must be TRUE):
  1. Every commit in the repository has been audited for secrets (env files, API keys, tokens, credentials)
  2. No `.env` files, credential JSON files, or hardcoded secrets exist in the codebase or git history
  3. `.gitignore` covers all sensitive patterns (`.env*`, `*.pem`, `credentials.*`, `~/.simvyn/`)
**Plans:** 1/1 plans complete

Plans:
- [ ] 22.1-01-PLAN.md — Git history security audit + harden .gitignore

### Phase 22.2: Test Suite (INSERTED)

**Goal:** Comprehensive test coverage verifying correct adb/xcrun/simctl commands are invoked for each adapter method
**Depends on:** Phase 22.1
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Every iOS adapter method has tests verifying the correct `xcrun simctl` command and arguments are constructed
  2. Every Android adapter method has tests verifying the correct `adb` / `emulator` command and arguments are constructed
  3. Tests mock the exec/spawn layer and assert on command strings — no real devices needed to run tests
  4. `npm test` passes from a clean checkout with zero external dependencies
  5. Core utilities (device-manager, storage, verbose-exec) have unit tests
**Plans:** 3/3 plans complete

Plans:
- [ ] 22.2-01-PLAN.md — Test infrastructure (node:test + npm script) + iOS adapter tests
- [ ] 22.2-02-PLAN.md — Android adapter tests
- [ ] 22.2-03-PLAN.md — Core utility tests (device-manager, storage, verbose-exec)

### Phase 22.3: NPM Package & README (INSERTED)

**Goal:** Package is published on npm, installable via `npx simvyn`, with professional README and automated release CI
**Depends on:** Phase 22.2
**Success Criteria** (what must be TRUE):
  1. Running `npx simvyn` installs and launches the tool correctly
  2. README.md has the simvyn logo (large, centered), package name, tagline, feature list, installation instructions, usage examples, and screenshots
  3. GitHub Actions workflow publishes to npm on version tag push (matching react-native-duckdb pattern)
  4. All `package.json` files have `"private"` removed or set to `false` for publishable packages
  5. Package tarball (`npm pack --dry-run`) contains only intended files (no test fixtures, planning docs, etc.)
**Requirements:** NPM-01, NPM-02, NPM-03, NPM-04, NPM-05
**Plans:** 3/3 plans complete

Plans:
- [ ] 22.3-01-PLAN.md — Package configuration (private flags, CLI metadata, files whitelist, repository URL)
- [ ] 22.3-02-PLAN.md — README creation (logo, tagline, features, installation, CLI examples)
- [ ] 22.3-03-PLAN.md — GitHub Actions release workflow (tag-triggered npm publish with provenance)

### Phase 23: Collections Foundation
**Goal:** Users can create, edit, duplicate, and delete named collections of device actions, persisted across sessions with a future-proof schema
**Depends on:** Phase 1 (module system, storage, adapters)
**Requirements:** COLL-01, COLL-02, COLL-03, COLL-04, COLL-05
**Success Criteria** (what must be TRUE):
  1. User can create a named collection with optional description via REST API, and it persists in `~/.simvyn/collections/` across server restarts
  2. User can list all saved collections, edit a collection's name/description/steps, and the changes persist immediately
  3. User can duplicate an existing collection (creating a copy with a new name) and delete a collection with no orphaned data
  4. The action registry returns a typed catalog of all available device actions (dark mode, location, app launch, etc.) with parameter schemas and platform compatibility metadata
  5. Collection storage schema includes `schemaVersion: 1` field on every saved collection document
**Plans:** 2/2 plans complete

Plans:
- [ ] 23-01-PLAN.md — Collection types, action registry (14 actions), module scaffold
- [ ] 23-02-PLAN.md — CRUD routes, action catalog endpoint, CLI subcommands, module registration

### Phase 24: Execution Engine
**Goal:** Users can apply a collection to one or more devices with real-time per-step feedback, graceful skip/fail handling, and execution timeouts
**Depends on:** Phase 23 (action registry, collection storage)
**Requirements:** CEXE-01, CEXE-02, CEXE-03, CEXE-04, CEXE-05, CEXE-06
**Success Criteria** (what must be TRUE):
  1. User can trigger collection execution targeting one or more devices, and each step runs sequentially against all target devices in parallel
  2. WebSocket broadcasts coalesced execution state per step completion — dashboard receives real-time progress (running/success/failed/skipped per step per device)
  3. Steps targeting an incompatible platform (e.g., iOS-only step on Android device) are automatically skipped with a skip badge — remaining steps continue normally
  4. A step that fails on a device shows a failure badge but does not abort the collection — execution continues to the next step
  5. Steps that exceed the 30-second timeout are terminated and marked as failed, allowing the collection to proceed
**Plans:** 2/2 plans complete

Plans:
- [ ] 24-01-PLAN.md — Execution state types + core execution engine (sequential steps, parallel devices, skip/fail/timeout)
- [ ] 24-02-PLAN.md — Execute endpoint, WS handler, CLI apply command

### Phase 25: Collection Builder UI
**Goal:** Users can visually assemble collections by browsing categorized actions, configuring step parameters, and reordering steps via drag-and-drop
**Depends on:** Phase 23 (action registry serving action catalog), Phase 24 (execution engine for apply)
**Requirements:** CBLD-01, CBLD-02, CBLD-03, CBLD-04
**Success Criteria** (what must be TRUE):
  1. User can open the collections panel, see a list of saved collections, and click "New Collection" to enter the step builder
  2. User can browse a categorized action catalog (Device Settings, Location, App Management, etc.) and add actions as steps to the collection
  3. Each step card displays platform badges (Apple/Android logo) indicating which platforms support that action
  4. User can drag steps to reorder them within the collection and configure per-step parameters (locale picker, location picker, URL input, etc.) inline
**Plans:** 2/2 plans complete

Plans:
- [x] 25-01-PLAN.md — Collections store, module registration (icon, dock, panel), list view
- [x] 25-02-PLAN.md — Step builder with ActionPicker, drag-and-drop reorder, platform badges, param editors

### Phase 26: Apply Modal & Integration
**Goal:** Users can apply collections from the dashboard modal or command palette with live execution feedback, and automate via CLI
**Depends on:** Phase 24 (execution engine), Phase 25 (builder UI + collections store)
**Requirements:** CINT-01, CINT-02, CINT-03
**Success Criteria** (what must be TRUE):
  1. User can open an apply modal from any collection, pick target device(s), see a pre-apply compatibility summary (skipped step count per device), and execute with Cmd+Enter
  2. During execution the modal shows live per-step per-device status matrix (spinner → check/fail/skip) driven by WebSocket events
  3. Saved collections appear as actions in the command palette (Cmd+K) — selecting one opens the device picker flow and triggers execution
  4. User can run `simvyn collections list` to see saved collections and `simvyn collections apply <name> <device>` to execute headlessly from the CLI
  5. 2-3 built-in starter collections ship with the tool (e.g., "Dark Mode + Japanese Locale", "Screenshot Setup") and appear on first launch
**Plans:** 2/2 plans complete

Plans:
- [x] 26-01-PLAN.md — Apply modal (device picker, compatibility summary, WS execution matrix) + command palette integration
- [x] 26-02-PLAN.md — Built-in starter collections (3 presets seeded on first launch)

### Phase 27: Documentation
**Goal:** New users can understand what simvyn does, install it, and use every feature from a comprehensive, visual-first README
**Depends on:** Phase 26 (all features complete for accurate docs)
**Requirements:** DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. README opens with logo, tagline, quick-start instructions, and a visual feature overview — a new visitor understands the tool's purpose within 30 seconds
  2. Each module has a dedicated showcase section with description and screenshot placeholder showing the dashboard panel
  3. Collections feature has a getting-started walkthrough explaining how to create, configure, and apply a collection
  4. CLI reference table lists every command with usage examples, covering all modules including collections
**Plans:** 1/1 plans complete

Plans:
- [x] 27-01-PLAN.md — README restructure with module showcases, collections guide, and CLI reference

### v1.6 Coverage

```
COLL-01 → Phase 23    CEXE-01 → Phase 24    CBLD-01 → Phase 25
COLL-02 → Phase 23    CEXE-02 → Phase 24    CBLD-02 → Phase 25
COLL-03 → Phase 23    CEXE-03 → Phase 24    CBLD-03 → Phase 25
COLL-04 → Phase 23    CEXE-04 → Phase 24    CBLD-04 → Phase 25
COLL-05 → Phase 23    CEXE-05 → Phase 24
                       CEXE-06 → Phase 24    CINT-01 → Phase 26
                                              CINT-02 → Phase 26
DOC-01 → Phase 27                            CINT-03 → Phase 26
DOC-02 → Phase 27
DOC-03 → Phase 27
DOC-04 → Phase 27
```

**v1.6 Mapped: 22/22 — No orphaned requirements**

### v1.7 Coverage

```
RDEV-01 → Phase 28    RDEV-05 → Phase 28    RDEV-09 → Phase 28
RDEV-02 → Phase 28    RDEV-06 → Phase 28    RDEV-10 → Phase 28
RDEV-03 → Phase 28    RDEV-07 → Phase 28    RDEV-11 → Phase 28
RDEV-04 → Phase 28    RDEV-08 → Phase 28    RDEV-12 → Phase 28
```

**v1.7 Mapped: 12/12 — No orphaned requirements**
