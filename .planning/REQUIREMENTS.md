# Requirements: Simvyn

**Defined:** 2026-02-26
**Core Value:** Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: TypeScript monorepo with npm workspaces — shared types, core, server, dashboard, CLI packages
- [x] **INFRA-02**: Module/plugin system with auto-discovery — each module registers routes, WebSocket handlers, CLI commands, and UI panel
- [x] **INFRA-03**: Fastify server with WebSocket support (multi-channel envelope-based multiplexing)
- [x] **INFRA-04**: React + Vite + Tailwind v4 web dashboard with lazy-loaded module panels
- [x] **INFRA-05**: CLI entry point via commander.js — `simvyn` starts server + opens dashboard, subcommands for headless use
- [x] **INFRA-06**: Published as `simvyn` npm package, invocable via `npx simvyn`
- [x] **INFRA-07**: State persistence in `~/.simvyn/` for module state, device preferences, favorites
- [x] **INFRA-08**: Process lifecycle manager for safe child process spawning/cleanup (simctl, adb calls)
- [x] **INFRA-09**: Cross-platform support — macOS (full iOS+Android), Linux (Android-only, graceful degradation when simctl unavailable)

### Device Management

- [x] **DEV-01**: Detect all iOS simulators via `simctl list devices --json` with booted status, device type, OS version
- [x] **DEV-02**: Detect all Android emulators via `emulator -list-avds` and connected Android devices via `adb devices`
- [x] **DEV-03**: Unified device model across iOS and Android platforms
- [x] **DEV-04**: Boot, shutdown, and erase iOS simulators from dashboard and CLI
- [x] **DEV-05**: Boot and kill Android emulators from dashboard and CLI
- [x] **DEV-06**: Real-time device status updates via polling with configurable interval
- [x] **DEV-07**: Device selector in UI — pick a single device or target all (broadcast mode)
- [x] **DEV-08**: Platform capability detection — report which features are available per device type

### Location

- [x] **LOC-01**: Migrate sim-location codebase into simvyn monorepo as Location module (copy and refactor to module architecture)
- [x] **LOC-02**: Set GPS coordinates on iOS simulators via `simctl location set`
- [x] **LOC-03**: Set GPS coordinates on Android emulators via `adb emu geo fix`
- [x] **LOC-04**: Simulate routes from GPX/KML files with playback controls (play, pause, resume, stop, speed)
- [x] **LOC-05**: iOS route simulation via native `simctl location start` (pipe waypoints to stdin)
- [x] **LOC-06**: Android route simulation via tick-based `geo fix` calls at configurable intervals
- [x] **LOC-07**: Interactive map UI for picking coordinates and drawing routes (Leaflet)
- [x] **LOC-08**: Geocoding search (forward and reverse) via Nominatim proxy with rate limiting
- [x] **LOC-09**: Save favorite locations and routes with persistence
- [x] **LOC-10**: CLI subcommands: `simvyn location set <device> <lat> <lng>`, `simvyn location route <device> <file>`

### File System

- [x] **FS-01**: Browse iOS simulator app sandboxes via `simctl get_app_container` + direct filesystem access
- [x] **FS-02**: Browse Android app files via `adb pull`/`adb push` and `adb shell run-as` for debug apps
- [x] **FS-03**: Download files from device to host
- [x] **FS-04**: Upload files from host to device
- [x] **FS-05**: Edit text files inline in the dashboard with save-back to device
- [x] **FS-06**: CLI subcommands: `simvyn fs ls <device> <path>`, `simvyn fs pull <device> <path>`, `simvyn fs push <device> <src> <dest>`

### Database Inspector

- [x] **DB-01**: Detect and list SQLite databases within app containers
- [x] **DB-02**: Browse SQLite tables — show schema, row counts, column types
- [x] **DB-03**: View table data with pagination and sorting
- [x] **DB-04**: Edit individual cell values and write back to database
- [x] **DB-05**: Run arbitrary SQL queries with results display
- [x] **DB-06**: View SharedPreferences (Android) as key-value table
- [x] **DB-07**: View NSUserDefaults (iOS) as key-value table via plist reading
- [ ] **DB-08**: CLI subcommands: `simvyn db list <device>`, `simvyn db query <device> <db> <sql>`

### Logs

- [x] **LOG-01**: Stream iOS simulator logs in real-time via `simctl spawn log stream`
- [x] **LOG-02**: Stream Android device logs in real-time via `adb logcat`
- [x] **LOG-03**: Filter logs by level (verbose, debug, info, warning, error, fatal) with color coding
- [x] **LOG-04**: Search/filter logs by text pattern with regex support
- [x] **LOG-05**: Filter logs by process/app name
- [x] **LOG-06**: Export logs to file (plain text or JSON)
- [x] **LOG-07**: Server-side log batching to prevent WebSocket flooding
- [x] **LOG-08**: CLI subcommand: `simvyn logs <device> [--level <level>] [--filter <pattern>]`

### Push Notifications

- [x] **PUSH-01**: Compose push notification payload via JSON editor in dashboard
- [x] **PUSH-02**: Send push notifications to iOS simulators via `simctl push <device> <bundle-id> <payload>`
- [x] **PUSH-03**: Save favorite push payloads for reuse
- [x] **PUSH-04**: Template library for common push payload structures
- [x] **PUSH-05**: CLI subcommand: `simvyn push <device> --bundle <id> --payload <json>`

### Deep Links

- [x] **LINK-01**: Launch URLs/deep links on iOS via `simctl openurl`
- [x] **LINK-02**: Launch URLs/deep links on Android via `adb shell am start -a VIEW -d <url>`
- [x] **LINK-03**: Support custom URL schemes and universal links
- [x] **LINK-04**: Save favorite deep links per app for quick access
- [x] **LINK-05**: CLI subcommand: `simvyn link <device> <url>`

### Screenshots & Recording

- [x] **SCRN-01**: Capture screenshots on iOS via `simctl io screenshot`
- [x] **SCRN-02**: Capture screenshots on Android via `adb shell screencap` + `adb pull`
- [x] **SCRN-03**: Record screen on iOS via `simctl io recordVideo` with start/stop controls
- [x] **SCRN-04**: Record screen on Android via `adb shell screenrecord` with start/stop controls
- [x] **SCRN-05**: Save screenshot/recording history with timestamps and device info
- [x] **SCRN-06**: Copy screenshot to host clipboard from dashboard
- [x] **SCRN-07**: CLI subcommands: `simvyn screenshot <device> [--output <path>]`, `simvyn record <device> [--output <path>]`

### Device Settings

- [x] **SET-01**: Toggle dark/light mode on iOS via `simctl ui appearance`
- [x] **SET-02**: Toggle dark/light mode on Android via `adb shell cmd uimode night`
- [x] **SET-03**: Override iOS status bar (time, battery, network type, carrier) via `simctl status_bar override`
- [x] **SET-04**: Grant/revoke/reset app permissions on iOS via `simctl privacy`
- [x] **SET-05**: Grant/revoke app permissions on Android via `adb shell pm grant/revoke`
- [x] **SET-06**: Change locale/language settings where platform supports
- [x] **SET-07**: CLI subcommands: `simvyn settings dark-mode <device> <on|off>`, `simvyn settings permission <device> <grant|revoke|reset> <permission>`

### Accessibility

- [x] **A11Y-01**: Toggle accessibility content size presets on iOS via `simctl ui content_size`
- [x] **A11Y-02**: Toggle increase contrast on iOS via `simctl ui increase_contrast`
- [x] **A11Y-03**: Toggle TalkBack on Android via `adb shell settings put secure enabled_accessibility_services`
- [x] **A11Y-04**: Quick preset panel for common accessibility test configurations
- [x] **A11Y-05**: CLI subcommand: `simvyn a11y <device> <setting> <value>`

### Crash Logs

- [x] **CRASH-01**: List and view iOS crash logs from `~/Library/Logs/DiagnosticReports/`
- [x] **CRASH-02**: List and view Android crash logs via `adb logcat *:E` and tombstone access
- [x] **CRASH-03**: Filter crash logs by app/process and time range
- [x] **CRASH-04**: CLI subcommand: `simvyn crashes <device> [--app <bundle-id>]`

### App Management

- [x] **APP-01**: List all installed apps on iOS via `simctl listapps`
- [x] **APP-02**: List all installed apps on Android via `adb shell pm list packages`
- [x] **APP-03**: Install apps — IPAs on iOS via `simctl install`, APKs on Android via `adb install`
- [x] **APP-04**: Uninstall apps on iOS via `simctl uninstall`, on Android via `adb uninstall`
- [x] **APP-05**: Launch apps on iOS via `simctl launch`, on Android via `adb shell am start`
- [x] **APP-06**: Terminate apps on iOS via `simctl terminate`, on Android via `adb shell am force-stop`
- [x] **APP-07**: Clear app data on Android via `adb shell pm clear`
- [x] **APP-08**: Show app info — bundle ID, version, container paths via `simctl appinfo` / `adb shell dumpsys package`
- [x] **APP-09**: CLI subcommands: `simvyn app list <device>`, `simvyn app install <device> <path>`, `simvyn app launch <device> <bundle-id>`

### Media Injection

- [x] **MED-01**: Push photos and videos to iOS simulator camera roll via `simctl addmedia`
- [x] **MED-02**: Push photos and videos to Android device via `adb push` + media scanner broadcast
- [x] **MED-03**: Drag-and-drop media files in dashboard for injection
- [x] **MED-04**: CLI subcommand: `simvyn media add <device> <file>`

### Clipboard

- [x] **CLIP-01**: Read iOS simulator clipboard via `simctl pbpaste`
- [x] **CLIP-02**: Write to iOS simulator clipboard via `simctl pbcopy`
- [x] **CLIP-03**: Write to Android device clipboard via `adb shell input text` or `adb shell am broadcast`
- [x] **CLIP-04**: CLI subcommands: `simvyn clipboard get <device>`, `simvyn clipboard set <device> <text>`

### Dashboard UI

- [x] **UI-01**: Apple Liquid Glass design — dark background with deep gradients, frosted glass panels (backdrop-filter: blur + saturate)
- [x] **UI-02**: Muted accent colors (soft blue, purple, teal), no harsh neons
- [x] **UI-03**: Spring animations via Framer Motion for panel transitions and interactions
- [x] **UI-04**: Inter font, light-medium weights, thin translucent scrollbars, rounded corners (12-16px)
- [x] **UI-05**: Top bar with device selector dropdown + connection status indicators
- [x] **UI-06**: Sidebar listing all modules with icons, active module highlighted
- [x] **UI-07**: Main content area rendering active module panel — module state persists when switching
- [x] **UI-08**: Responsive layout that works on various screen sizes
- [x] **UI-09**: Toast notifications for async operations (location set, screenshot captured, etc.)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Performance Monitoring

- **PERF-01**: CPU usage monitoring via `adb shell dumpsys cpuinfo` (Android)
- **PERF-02**: Memory usage monitoring via `adb shell dumpsys meminfo` (Android)
- **PERF-03**: FPS monitoring where platform exposes it
- **PERF-04**: Performance graphs over time in dashboard

### Network

- **NET-01**: Network link conditioner integration for throttling/latency simulation
- **NET-02**: Proxy setup wizard — configure device to route through mitmproxy/Charles
- **NET-03**: SSL pinning bypass helpers via `simctl keychain add-root-cert` (iOS)
- **NET-04**: Recommend external tools (mitmproxy, Charles Proxy) with setup instructions

### Extended Features

- **EXT-01**: Multi-device view — see and control multiple devices simultaneously
- **EXT-02**: Keychain management on iOS via `simctl keychain`
- **EXT-03**: iCloud sync trigger on iOS via `simctl icloud_sync`
- **EXT-04**: Batch operations / CI profiles for automated test environment setup

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app SDK / bridge | Violates core "zero SDK" principle. This is what killed Flipper. The constraint is the feature. |
| Full network inspector | Requires MITM proxy or SDK. Recommend mitmproxy/Charles Proxy instead. |
| Layout inspector / view hierarchy | Requires SDK or fragile accessibility tree parsing. Xcode/Android Studio do this better. |
| React Native / Flutter devtools | Framework-specific lock-in. Framework teams build better tools. Stay agnostic. |
| Screen mirroring | Requires native code (C/FFmpeg/SDL2). scrcpy already does this perfectly. |
| Windows native support | Use WSL. No Windows-specific code paths. |
| iOS real device support | simctl only works with simulators. USB iPhone requires entirely different tooling. |
| Remote device access | Security nightmare, tunneling infrastructure. Keep it local. |
| Android emulator (AVD) creation | Complex (system image downloads, hardware profiles). Android Studio handles this. iOS simulator creation IS supported via `simctl create` (Phase 19). |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| INFRA-08 | Phase 1 | Complete |
| INFRA-09 | Phase 1 | Complete |
| DEV-01 | Phase 1 | Complete |
| DEV-02 | Phase 1 | Complete |
| DEV-03 | Phase 1 | Complete |
| DEV-04 | Phase 1 | Complete |
| DEV-05 | Phase 1 | Complete |
| DEV-06 | Phase 1 | Complete |
| DEV-07 | Phase 1 | Complete |
| DEV-08 | Phase 1 | Complete |
| LOC-01 | Phase 2 | Complete |
| LOC-02 | Phase 2 | Complete |
| LOC-03 | Phase 2 | Complete |
| LOC-04 | Phase 2 | Complete |
| LOC-05 | Phase 2 | Complete |
| LOC-06 | Phase 2 | Complete |
| LOC-07 | Phase 2 | Complete |
| LOC-08 | Phase 2 | Complete |
| LOC-09 | Phase 2 | Complete |
| LOC-10 | Phase 2 | Complete |
| APP-01 | Phase 3 | Complete |
| APP-02 | Phase 3 | Complete |
| APP-03 | Phase 3 | Complete |
| APP-04 | Phase 3 | Complete |
| APP-05 | Phase 3 | Complete |
| APP-06 | Phase 3 | Complete |
| APP-07 | Phase 3 | Complete |
| APP-08 | Phase 3 | Complete |
| APP-09 | Phase 3 | Complete |
| LOG-01 | Phase 4 | Complete |
| LOG-02 | Phase 4 | Complete |
| LOG-03 | Phase 4 | Complete |
| LOG-04 | Phase 4 | Complete |
| LOG-05 | Phase 4 | Complete |
| LOG-06 | Phase 4 | Complete |
| LOG-07 | Phase 4 | Complete |
| LOG-08 | Phase 4 | Complete |
| UI-01 | Phase 5 | Complete |
| UI-02 | Phase 5 | Complete |
| UI-03 | Phase 5 | Complete |
| UI-04 | Phase 5 | Complete |
| UI-05 | Phase 5 | Complete |
| UI-06 | Phase 5 | Complete |
| UI-07 | Phase 5 | Complete |
| UI-08 | Phase 5 | Complete |
| UI-09 | Phase 5 | Complete |
| SCRN-01 | Phase 6 | Complete |
| SCRN-02 | Phase 6 | Complete |
| SCRN-03 | Phase 6 | Complete |
| SCRN-04 | Phase 6 | Complete |
| SCRN-05 | Phase 6 | Complete |
| SCRN-06 | Phase 6 | Complete |
| SCRN-07 | Phase 6 | Complete |
| LINK-01 | Phase 6 | Complete |
| LINK-02 | Phase 6 | Complete |
| LINK-03 | Phase 6 | Complete |
| LINK-04 | Phase 6 | Complete |
| LINK-05 | Phase 6 | Complete |
| PUSH-01 | Phase 6 | Complete |
| PUSH-02 | Phase 6 | Complete |
| PUSH-03 | Phase 6 | Complete |
| PUSH-04 | Phase 6 | Complete |
| PUSH-05 | Phase 6 | Complete |
| FS-01 | Phase 7 | Complete |
| FS-02 | Phase 7 | Complete |
| FS-03 | Phase 7 | Complete |
| FS-04 | Phase 7 | Complete |
| FS-05 | Phase 7 | Complete |
| FS-06 | Phase 7 | Complete |
| DB-01 | Phase 7 | Complete |
| DB-02 | Phase 7 | Complete |
| DB-03 | Phase 7 | Complete |
| DB-04 | Phase 7 | Complete |
| DB-05 | Phase 7 | Complete |
| DB-06 | Phase 7 | Complete |
| DB-07 | Phase 7 | Complete |
| DB-08 | Phase 7 | Pending |
| SET-01 | Phase 8 | Complete |
| SET-02 | Phase 8 | Complete |
| SET-03 | Phase 8 | Complete |
| SET-04 | Phase 8 | Complete |
| SET-05 | Phase 8 | Complete |
| SET-06 | Phase 8 | Complete |
| SET-07 | Phase 8 | Complete |
| A11Y-01 | Phase 8 | Complete |
| A11Y-02 | Phase 8 | Complete |
| A11Y-03 | Phase 8 | Complete |
| A11Y-04 | Phase 8 | Complete |
| A11Y-05 | Phase 8 | Complete |
| CRASH-01 | Phase 9 | Complete |
| CRASH-02 | Phase 9 | Complete |
| CRASH-03 | Phase 9 | Complete |
| CRASH-04 | Phase 9 | Complete |
| MED-01 | Phase 9 | Complete |
| MED-02 | Phase 9 | Complete |
| MED-03 | Phase 9 | Complete |
| MED-04 | Phase 9 | Complete |
| CLIP-01 | Phase 9 | Complete |
| CLIP-02 | Phase 9 | Complete |
| CLIP-03 | Phase 9 | Complete |
| CLIP-04 | Phase 9 | Complete |

**Coverage:**
- v1.0 requirements: 108 total
- Mapped to phases: 108
- Unmapped: 0

## v1.1 Requirements — Dashboard UX Polish

### Routing

- [x] **ROUTE-01**: URL updates when user selects a module (e.g., `/logs`, `/location`)
- [x] **ROUTE-02**: Refreshing the page opens the same module that was active
- [x] **ROUTE-03**: Direct URL navigation works (typing `/logs` in browser navigates to that module)

### Command Palette

- [x] **CMDK-01**: User can open a search palette with Cmd+K (or Ctrl+K on Linux)
- [x] **CMDK-02**: Palette lists all available modules with icons and descriptions
- [x] **CMDK-03**: User can fuzzy-search module names and navigate to them by pressing Enter
- [x] **CMDK-04**: Palette uses Liquid Glass styling (frosted glass backdrop, blur, dark theme)
- [x] **CMDK-05**: User can search for device actions (e.g., "screenshot", "set location", "toggle dark mode")

### Home Screen

- [x] **HOME-01**: When no module is selected (or on first load), a welcome/home screen is displayed
- [x] **HOME-02**: Home screen shows keyboard shortcuts, quick-start tips, and recently used modules
- [x] **HOME-03**: Home screen shows connected device summary (count, names, states)

### Module Icons

- [x] **ICON-01**: Each module has a custom colorful liquid glass SVG icon (not Lucide)
- [x] **ICON-02**: Icons used in sidebar dock, command palette, and home screen

### Capture Management

- [x] **CAP-01**: User can delete individual screenshots or recordings from capture history
- [x] **CAP-02**: User can clear all capture history at once

### Tool Settings

- [x] **TSET-01**: Dedicated settings page accessible from the sidebar for the entire tool
- [x] **TSET-02**: User can wipe all saved data and settings (favorites, history, preferences)
- [x] **TSET-03**: User can configure server port
- [x] **TSET-04**: User can toggle auto-open browser on launch
- [x] **TSET-05**: User can see storage usage (how much data in `~/.simvyn/`)

## v1.1 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROUTE-01 | Phase 13 | Complete |
| ROUTE-02 | Phase 13 | Complete |
| ROUTE-03 | Phase 13 | Complete |
| CMDK-01 | Phase 15 | Complete |
| CMDK-02 | Phase 15 | Complete |
| CMDK-03 | Phase 15 | Complete |
| CMDK-04 | Phase 15 | Complete |
| CMDK-05 | Phase 15 | Complete |
| HOME-01 | Phase 16 | Complete |
| HOME-02 | Phase 16 | Complete |
| HOME-03 | Phase 16 | Complete |
| ICON-01 | Phase 14 | Complete |
| ICON-02 | Phase 14 | Complete |
| CAP-01 | Phase 16 | Complete |
| CAP-02 | Phase 16 | Complete |
| TSET-01 | Phase 17 | Complete |
| TSET-02 | Phase 17 | Complete |
| TSET-03 | Phase 17 | Complete |
| TSET-04 | Phase 17 | Complete |
| TSET-05 | Phase 17 | Complete |

**Coverage:**
- v1.1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

## v1.2 Requirements — Interactive Command Palette

### Multi-Step Actions

- [x] **IPAL-01**: Command palette supports multi-step flows (action → parameters → device → execute) with step transitions inside the palette
- [x] **IPAL-02**: Inline device picker step — user can select one or multiple target devices within the palette without changing global selection
- [x] **IPAL-03**: Set Locale action — searchable/autocomplete locale list → device picker → apply locale
- [x] **IPAL-04**: Set Location action — select from bookmarked locations or free-text geocoding search → device picker → set point location
- [x] **IPAL-05**: Toggle Dark/Light Mode action — device picker → toggle appearance
- [x] **IPAL-06**: Erase Device action — device picker → confirmation step → erase
- [x] **IPAL-07**: Take Screenshot action — device picker → capture (existing action upgraded with device selection)
- [x] **IPAL-08**: Expanded action catalog with additional useful actions beyond the core 5

## v1.2 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IPAL-01 | Phase 18 | Complete |
| IPAL-02 | Phase 18 | Complete |
| IPAL-03 | Phase 18 | Complete |
| IPAL-04 | Phase 18 | Complete |
| IPAL-05 | Phase 18 | Complete |
| IPAL-06 | Phase 18 | Complete |
| IPAL-07 | Phase 18 | Complete |
| IPAL-08 | Phase 18 | Complete |

**Coverage:**
- v1.2 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

## v1.3 Requirements — Platform Capabilities

### Device Lifecycle

- [x] **DLIF-01**: Create new iOS simulators by selecting from available device types and runtimes via `simctl create`
- [x] **DLIF-02**: Clone existing iOS simulators to create identical copies via `simctl clone`
- [x] **DLIF-03**: Rename iOS simulators via `simctl rename`
- [x] **DLIF-04**: Manage SSL certificates on iOS simulators — add root certificates, add certs, reset keychain via `simctl keychain`
- [x] **DLIF-05**: Dashboard UI for device lifecycle (create/clone/rename in device panel, certificate management section)
- [x] **DLIF-06**: CLI subcommands: `simvyn device create`, `simvyn device clone`, `simvyn device rename`, `simvyn keychain add/reset`
- [x] **DLIF-07**: Command palette actions for create, clone, and rename device

### Developer Utilities

- [x] **DUTIL-01**: Port forwarding on Android — forward local ports to device and reverse device ports to local via `adb forward/reverse`, list and remove active forwards
- [x] **DUTIL-02**: Display overrides on Android — change screen resolution and density via `adb shell wm size/density` with reset to defaults
- [x] **DUTIL-03**: Battery simulation on Android — set battery level, charging state, and power source via `dumpsys battery` with reset
- [x] **DUTIL-04**: Input injection on Android — tap coordinates, swipe gestures, text input, and key events via `adb input`
- [x] **DUTIL-05**: Bug report collection — gather diagnostic data from iOS (`simctl diagnose`) and Android (`adb bugreport`), save to host
- [x] **DUTIL-06**: Dashboard panel for developer utilities with sections for each capability
- [x] **DUTIL-07**: CLI subcommands: `simvyn forward`, `simvyn display`, `simvyn battery`, `simvyn input`, `simvyn bugreport`

## v1.3 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DLIF-01 | Phase 19 | Complete |
| DLIF-02 | Phase 19 | Complete |
| DLIF-03 | Phase 19 | Complete |
| DLIF-04 | Phase 19 | Complete |
| DLIF-05 | Phase 19 | Complete |
| DLIF-06 | Phase 19 | Complete |
| DLIF-07 | Phase 19 | Complete |
| DUTIL-01 | Phase 20 | Complete |
| DUTIL-02 | Phase 20 | Complete |
| DUTIL-03 | Phase 20 | Complete |
| DUTIL-04 | Phase 20 | Complete |
| DUTIL-05 | Phase 20 | Complete |
| DUTIL-06 | Phase 20 | Complete |
| DUTIL-07 | Phase 20 | Complete |

**Coverage:**
- v1.3 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

## v1.4 Requirements — Quality of Life

### Settings Consolidation

- [x] **SCON-01**: Dev Utils and Device Settings dashboard panels merged into single "Device Settings" panel with organized sections for all device-level operations (appearance, permissions, accessibility, port forwarding, display overrides, battery simulation, input injection, bug reports)
- [x] **SCON-02**: Sidebar shows single "Device Settings" entry replacing separate "Settings" and "Dev Utils" entries
- [x] **SCON-03**: Command palette and home screen reflect the merged module (single entry, not two)

### Dock Polish

- [x] **DOCK-01**: Dock icons no longer scale on hover — tooltip popup label is the sole hover feedback

### Verbose CLI

- [x] **VCLI-01**: CLI supports `--verbose` / `-v` flag that logs every adb and simctl command with full arguments before execution
- [x] **VCLI-02**: Verbose output uses colored platform prefixes — green for Android (adb), blue for iOS (simctl), red for errors
- [x] **VCLI-03**: Structured logging library used for clear visual distinction between log types and levels

### Open Source Build

- [x] **OSBLD-01**: Dashboard build produces unminified JavaScript for readable error stack traces and open source transparency
- [x] **OSBLD-02**: Source maps generated and served alongside the dashboard build for accurate browser console error traces

## v1.4 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCON-01 | Phase 21 | Complete |
| SCON-02 | Phase 21 | Complete |
| SCON-03 | Phase 21 | Complete |
| DOCK-01 | Phase 21 | Complete |
| VCLI-01 | Phase 22 | Complete |
| VCLI-02 | Phase 22 | Complete |
| VCLI-03 | Phase 22 | Complete |
| OSBLD-01 | Phase 22 | Complete |
| OSBLD-02 | Phase 22 | Complete |

**Coverage:**
- v1.4 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

## v1.5 Requirements — Public Release

### Test Suite

- [x] **TEST-01**: Every iOS adapter method has tests verifying the correct `xcrun simctl` command and arguments are constructed
- [x] **TEST-02**: Every Android adapter method has tests verifying the correct `adb` / `emulator` command and arguments are constructed
- [x] **TEST-03**: Tests mock the exec/spawn layer and assert on command strings — no real devices needed to run tests
- [x] **TEST-04**: `npm test` passes from a clean checkout with zero external dependencies (node:test built-in runner)
- [x] **TEST-05**: Core utilities (device-manager, storage, verbose-exec) have unit tests

### NPM Package & README

- [x] **NPM-01**: Running `npx simvyn` installs and launches the tool correctly
- [x] **NPM-02**: README.md has the simvyn logo (large, centered), package name, tagline, feature list, installation instructions, usage examples, and screenshots
- [x] **NPM-03**: GitHub Actions workflow publishes to npm on version tag push (matching react-native-duckdb pattern with `npm publish --provenance`)
- [x] **NPM-04**: All internal `package.json` files have `"private": true`; only the CLI package is publishable
- [x] **NPM-05**: Package tarball (`npm pack --dry-run`) contains only intended files (no test fixtures, planning docs, etc.)

## v1.5 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 22.2 | Complete |
| TEST-02 | Phase 22.2 | Complete |
| TEST-03 | Phase 22.2 | Complete |
| TEST-04 | Phase 22.2 | Complete |
| TEST-05 | Phase 22.2 | Complete |
| NPM-01 | Phase 22.3 | Complete |
| NPM-02 | Phase 22.3 | Complete |
| NPM-03 | Phase 22.3 | Complete |
| NPM-04 | Phase 22.3 | Complete |
| NPM-05 | Phase 22.3 | Complete |

**Coverage:**
- v1.5 requirements: 10 total (5 test suite + 5 npm package)
- Mapped to phases: 10
- Unmapped: 0

## v1.6 Requirements — Collections & Documentation

### Collections - Core

- [x] **COLL-01**: User can create a collection with a name and optional description, persisted in `~/.simvyn/collections/`
- [x] **COLL-02**: User can edit an existing collection (re-opens builder with pre-populated steps)
- [x] **COLL-03**: User can delete a collection with confirmation dialog
- [x] **COLL-04**: User can duplicate an existing collection to create a variant
- [x] **COLL-05**: Collection storage schema includes `schemaVersion` field for future migration

### Collections - Builder

- [x] **CBLD-01**: User can add steps from a categorized action catalog (Device Settings, Location, App Management, Deep Links, Push, Media, Clipboard, Screenshot)
- [x] **CBLD-02**: Each step displays platform badges (Apple/Android logo) indicating which platforms support it
- [x] **CBLD-03**: User can reorder steps via drag-and-drop
- [x] **CBLD-04**: Each step has a parameter picker appropriate to its action type (locale picker, location picker, app picker, URL input, etc.)

### Collections - Execution

- [x] **CEXE-01**: User can apply a collection to one or more devices via modal device picker with Cmd+Enter to execute
- [x] **CEXE-02**: Apply modal shows real-time per-step per-device feedback (spinner for running, check for success, X for failed, skip icon for incompatible)
- [x] **CEXE-03**: Pre-apply compatibility summary shows how many steps will be skipped per device due to platform incompatibility
- [x] **CEXE-04**: Platform-incompatible steps are skipped during execution with skip badge, remaining steps continue
- [x] **CEXE-05**: Failed steps show failure badge but execution continues to next step (continue on error)
- [x] **CEXE-06**: Per-step execution timeout (30s default) prevents hung commands from blocking the entire collection

### Collections - Integration

- [x] **CINT-01**: Saved collections appear as command palette actions with device picker flow
- [x] **CINT-02**: CLI subcommands: `simvyn collections list`, `simvyn collections apply <name> <device>`
- [x] **CINT-03**: 2-3 built-in starter collections shipped with the tool (e.g., "Dark Mode + Japanese Locale", "Screenshot Setup")

### Documentation

- [x] **DOC-01**: README restructured with visual-first layout (logo, quick start, features, per-feature showcase, CLI reference, platform matrix)
- [x] **DOC-02**: Per-feature showcase sections with description and screenshot placeholders for each module
- [x] **DOC-03**: Collections feature documentation with getting started walkthrough
- [x] **DOC-04**: Expanded CLI reference table with all commands and usage examples

## v1.6 Out of Scope

| Feature | Reason |
|---------|--------|
| Conditional logic / branching in collections | Turns collections into a scripting engine. Keep it linear — users use shell scripts for complex logic |
| Variables / data passing between steps | Each step is self-contained with parameters set at creation time |
| Per-step device targeting | Collections are "apply this set TO these devices" — steps skip on incompatible platforms |
| Collection import/export | Premature. Local JSON in ~/.simvyn/ is sufficient. Users can copy files manually |
| Scheduled / automatic execution | Requires daemon/watcher architecture — way out of scope |
| Undo / rollback after apply | Most device actions aren't cleanly reversible. Users can create a "reset" collection |
| Nested collections | Recursive execution and circular dependency detection are nightmares. Flat step list only |
| Separate documentation site | Premature. README is the right place until content exceeds ~500 lines |

## v1.6 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COLL-01 | Phase 23 | Complete |
| COLL-02 | Phase 23 | Complete |
| COLL-03 | Phase 23 | Complete |
| COLL-04 | Phase 23 | Complete |
| COLL-05 | Phase 23 | Complete |
| CBLD-01 | Phase 25 | Complete |
| CBLD-02 | Phase 25 | Complete |
| CBLD-03 | Phase 25 | Complete |
| CBLD-04 | Phase 25 | Complete |
| CEXE-01 | Phase 24 | Complete |
| CEXE-02 | Phase 24 | Complete |
| CEXE-03 | Phase 24 | Complete |
| CEXE-04 | Phase 24 | Complete |
| CEXE-05 | Phase 24 | Complete |
| CEXE-06 | Phase 24 | Complete |
| CINT-01 | Phase 26 | Complete |
| CINT-02 | Phase 26 | Complete |
| CINT-03 | Phase 26 | Complete |
| DOC-01 | Phase 27 | Complete |
| DOC-02 | Phase 27 | Complete |
| DOC-03 | Phase 27 | Complete |
| DOC-04 | Phase 27 | Complete |

**Coverage:**
- v1.6 requirements: 22 total (5 core + 4 builder + 6 execution + 3 integration + 4 documentation)
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-03-04 — v1.6 traceability updated with phase assignments (Phases 23-27)*
