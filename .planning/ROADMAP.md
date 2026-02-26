# Roadmap: Simvyn

**Created:** 2026-02-26
**Depth:** Comprehensive
**Phases:** 9
**Coverage:** 108/108 v1 requirements mapped

## Phases

- [x] **Phase 1: Foundation & Device Management** — Monorepo, module system, server, dashboard shell, CLI, device discovery and lifecycle
- [x] **Phase 2: Location Module (sim-location Migration)** — Migrate sim-location into module architecture, validating the module system end-to-end
- [x] **Phase 3: App Management Module** — Install, uninstall, launch, terminate, inspect apps on both platforms
- [x] **Phase 4: Log Viewer Module** — Real-time log streaming with filtering, search, and export
- [x] **Phase 5: Dashboard UI** — Apple Liquid Glass design system, layout shell, responsive panels, animations
- [x] **Phase 6: Quick-Action Modules** — Screenshots, screen recording, deep links, and push notifications
- [x] **Phase 7: File System & Database Inspector** — Browse app files, SQLite tables, SharedPreferences, and NSUserDefaults
- [ ] **Phase 8: Device Settings & Accessibility** — Dark mode, permissions, locale, status bar, accessibility toggles
- [ ] **Phase 9: Utility Modules** — Crash logs, media injection, and clipboard bridge

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
- [ ] 08-01-PLAN.md — Settings & accessibility module backend (types, adapters, routes, CLI)
- [ ] 08-02-PLAN.md — Dashboard panel with appearance, status bar, permissions, accessibility sections

### Phase 9: Utility Modules
**Goal:** Developers can view crash logs, inject media into devices, and bridge the clipboard between host and device
**Depends on:** Phase 1
**Requirements:** CRASH-01, CRASH-02, CRASH-03, CRASH-04, MED-01, MED-02, MED-03, MED-04, CLIP-01, CLIP-02, CLIP-03, CLIP-04
**Success Criteria** (what must be TRUE):
  1. User can list and view crash logs filtered by app and time range, from both iOS diagnostic reports and Android logcat/tombstones
  2. User can drag-and-drop photos or videos into the dashboard to inject them into the device's camera roll (or use `simvyn media add` CLI)
  3. User can read the current device clipboard contents and write text to the device clipboard from the dashboard or via `simvyn clipboard get/set`
  4. All three modules expose CLI subcommands that work headlessly without the dashboard
**Plans:** TBD

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
| 8. Device Settings & Accessibility | 0/2 | Not started | — |
| 9. Utility Modules | 0/? | Not started | — |

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

**Mapped: 108/108 ✓ — No orphaned requirements**

---
*Roadmap created: 2026-02-26*
*Last updated: 2026-02-26*
