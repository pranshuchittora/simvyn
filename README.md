<p align="center">
  <img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/simvyn-icon-1024.png" width="180" alt="simvyn" />
</p>

<h1 align="center">simvyn</h1>

<p align="center">
  Universal mobile devtool — control iOS Simulators and Android Emulators from a single dashboard and CLI
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/v/simvyn" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/l/simvyn" alt="license" /></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/banner.png" alt="simvyn dashboard" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/demo.gif" alt="simvyn demo" />
</p>

## Quick Start

```bash
npx simvyn
```

Starts the local server, opens the web dashboard in your browser, and discovers all connected iOS Simulators and Android Emulators automatically.

## Installation

**Global install:**

```bash
npm install -g simvyn
```

**One-time use (no install):**

```bash
npx simvyn
```

**Requirements:**

- Node.js >= 22.12.0
- macOS (full iOS + Android support) or Linux (Android only)

## Features

- **Device Management** — Discover, boot, shutdown, erase, create, and clone simulators and emulators
- **Location Simulation** — Set GPS coordinates, play GPX/KML routes with speed control, save favorites
- **App Management** — Install, launch, terminate, uninstall apps via drag-and-drop or CLI
- **Log Viewer** — Real-time streaming with level filtering, regex search, pagination, and export
- **Screenshots and Recording** — Capture screenshots and record screen video with history
- **Deep Links** — Open URLs and custom schemes, save favorites per app
- **Push Notifications** — Compose JSON payloads, send to iOS simulators, template library
- **File Browser** — Browse app sandboxes, upload/download files, edit text inline
- **Database Inspector** — Browse SQLite tables, run SQL queries, view SharedPreferences and NSUserDefaults
- **Device Settings** — Dark mode, locale, permissions, status bar overrides, accessibility presets
- **Crash Logs** — iOS diagnostic reports and Android logcat/tombstone crashes
- **Developer Utilities** — Port forwarding, display overrides, battery simulation, input text, bug reports
- **Collections** — Bundle device actions into reusable sequences, apply to multiple devices at once
- **Web Dashboard** — Apple Liquid Glass design with command palette, keyboard navigation
- **Full CLI** — Every feature works headlessly via `simvyn <command>`

## Module Showcases

### Device Management

Discover all connected iOS Simulators and Android Emulators in one unified list. Boot, shutdown, and erase devices without touching Xcode or Android Studio. Create new iOS simulators by choosing a device type and runtime, or clone an existing one to quickly spin up duplicates.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/device-management.png" alt="Device Management" width="700" /></p>

- List all available simulators and emulators across platforms
- Boot, shutdown, and erase devices with one click or CLI command
- Create new iOS simulators with device type and runtime selection
- Clone and rename existing simulators
- Real-time device state updates via WebSocket

### Location

Set precise GPS coordinates on any device using an interactive map or manual input. Play back GPX and KML route files with adjustable speed control. Save frequently used locations as favorites for quick access.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/location.png" alt="Location" width="700" /></p>

- Interactive map with click-to-set coordinates
- GPX and KML route file playback with speed control
- Favorite locations saved per device
- Multi-device location broadcast
- Reverse geocoding for human-readable addresses

### App Management

Install, launch, terminate, and uninstall apps on any connected device. Drag and drop IPA or APK files directly onto the dashboard. View detailed app information and clear app data without manual adb or simctl commands.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/app-management.png" alt="App Management" width="700" /></p>

- Drag-and-drop IPA and APK installation
- Launch, terminate, and uninstall apps by bundle ID
- View app details including version, size, and permissions
- Clear app data on Android devices
- List all installed apps with search filtering

### Log Viewer

Stream device logs in real time with powerful filtering. Filter by log level, search with regex patterns, and filter by process name. Export filtered logs for sharing or archival. Paginated history lets you scroll back through thousands of entries without performance issues.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/log-viewer.png" alt="Log Viewer" width="700" /></p>

- Real-time log streaming via WebSocket
- Filter by level: debug, info, warning, error, fatal
- Regex search and process name filtering
- Paginated history with virtual scrolling
- Export filtered logs to file

### Screenshots and Recording

Capture screenshots and record screen video on any device. All captures are saved with timestamps and organized in a browsable history. Download or delete captures directly from the dashboard.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/screenshots-recording.png" alt="Screenshots and Recording" width="700" /></p>

- One-click screenshot capture
- Screen recording with start/stop controls
- Timestamped capture history
- Download and delete captures from the dashboard

### Deep Links

Open URLs and custom URI schemes on any device. Save frequently used deep links as favorites organized by app. Test your app's deep link handling without manually typing URLs into a terminal.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/deep-links.png" alt="Deep Links" width="700" /></p>

- Open any URL or custom scheme on a device
- Save favorite deep links per app
- Link history with recent-first ordering
- Works with both iOS and Android

### Push Notifications

Compose JSON push notification payloads and send them to iOS simulators. Use the built-in template library as a starting point or write payloads from scratch. Real-time JSON validation highlights errors before sending.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/push-notifications.png" alt="Push Notifications" width="700" /></p>

- Compose and send push payloads to iOS simulators
- Built-in payload template library
- Real-time JSON validation
- Target specific apps by bundle ID

### File Browser

Browse the sandbox file system of any installed app. Navigate directories, upload and download files, and edit text files inline. Transfer files between your machine and the device without manual adb pull/push commands.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/file-browser.png" alt="File Browser" width="700" /></p>

- Browse app sandbox directories
- Upload and download files
- Inline text file editing
- Works with both iOS and Android app containers

### Database Inspector

Browse SQLite databases inside any app's sandbox. View table schemas, run arbitrary SQL queries, and inspect SharedPreferences (Android) or NSUserDefaults (iOS). Edit values inline without writing scripts.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/database-inspector.png" alt="Database Inspector" width="700" /></p>

- Browse SQLite tables with sortable columns
- Run arbitrary SQL queries
- View and edit SharedPreferences and NSUserDefaults
- Inline cell editing with type detection

### Device Settings

Toggle dark mode, change locale, manage app permissions, and override status bar appearance. Apply accessibility presets to test your app under different conditions. All settings changes take effect immediately on the target device.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/device-settings.png" alt="Device Settings" width="700" /></p>

- Toggle dark/light mode
- Change device locale
- Manage app permissions
- Override status bar (time, battery, signal)
- Accessibility presets (bold text, increase contrast, content size)

### Crash Logs

View iOS diagnostic reports (.ips files) and Android crash logs from logcat and tombstone dumps. Browse crash entries with timestamps and process information. Inspect full crash details without digging through device file systems.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/crash-logs.png" alt="Crash Logs" width="700" /></p>

- iOS diagnostic report (.ips) parsing
- Android logcat crash grouping by PID and tag
- Android tombstone dump retrieval
- Timestamped crash list with detail view

### Developer Utilities

Forward ports between your machine and a device, override display properties, simulate battery states, inject text input, and generate bug reports. A collection of common developer workflows consolidated into one panel.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/developer-utilities.png" alt="Developer Utilities" width="700" /></p>

- Port forwarding (TCP and reverse)
- Display density and resolution overrides
- Battery level and charging state simulation
- Text input injection
- Bug report generation

### Collections

Create reusable sets of device actions and apply them to multiple devices at once. Collections bundle together steps like setting location, toggling dark mode, and installing an app into a single repeatable workflow. Three starter presets ship with simvyn to get you started.

<p align="center"><img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/screenshots/collections.png" alt="Collections" width="700" /></p>

- Create, duplicate, and manage named collections
- Browse categorized action catalog across all modules
- Drag-and-drop step reordering
- Apply to multiple devices with compatibility checking
- Three built-in starter presets

## Collections Guide

Collections let you bundle multiple device actions into a reusable sequence and apply them to any combination of devices with one click.

### Creating a Collection

Open the Collections panel from the sidebar. Click **New Collection** and give it a name. The collection starts empty — you'll add steps from the action catalog.

### Adding Steps

Click **Add Step** to browse the categorized action catalog. Actions are organized by module — Device Settings, Location, App Management, and more. Select an action, configure its parameters inline (coordinates, bundle IDs, toggle values), and it appears in your collection. Drag steps to reorder them.

### Applying a Collection

Click **Apply** to open the apply modal. Select one or more target devices from the device list. A compatibility summary shows which steps will be skipped on incompatible platforms (for example, iOS-only actions on an Android device). Press **Cmd+Enter** to execute. A live status matrix shows per-step, per-device progress in real time.

### Command Palette Integration

Saved collections appear in the command palette (**Cmd+K**). Search for a collection by name and apply it directly with the device picker — no need to navigate to the Collections panel.

### Starter Collections

Three built-in presets ship with simvyn:

- **Dark Mode + Japanese Locale** — Enables dark mode and sets locale to Japanese
- **Screenshot Setup** — Configures status bar overrides for clean App Store screenshots
- **Reset Device State** — Clears location, resets settings, and erases app data

### CLI Usage

```bash
simvyn collections list                         # List all collections
simvyn collections apply <name> <devices...>    # Apply a collection to devices
```

## CLI Reference

Every feature is accessible from the command line. Run `simvyn` with no arguments to start the dashboard, or use any command below for headless operation.

| Command                                           | Description                             |
| ------------------------------------------------- | --------------------------------------- |
| `simvyn`                                          | Start the dashboard (default)           |
| `simvyn device list`                              | List all devices                        |
| `simvyn device boot <device>`                     | Boot a device                           |
| `simvyn device shutdown <device>`                 | Shutdown a device                       |
| `simvyn device erase <device>`                    | Erase device content and settings       |
| `simvyn device create <name> <type> <runtime>`    | Create a new iOS simulator              |
| `simvyn device clone <device> <name>`             | Clone an iOS simulator                  |
| `simvyn device rename <device> <name>`            | Rename an iOS simulator                 |
| `simvyn device delete <device>`                   | Delete an iOS simulator                 |
| `simvyn location set <device> <lat> <lng>`        | Set GPS coordinates                     |
| `simvyn location route <device> <file>`           | Play a GPX/KML route                    |
| `simvyn location clear <device>`                  | Clear simulated location                |
| `simvyn app list <device>`                        | List installed apps                     |
| `simvyn app install <device> <path>`              | Install an IPA or APK                   |
| `simvyn app uninstall <device> <bundle-id>`       | Uninstall an app                        |
| `simvyn app launch <device> <bundle-id>`          | Launch an app                           |
| `simvyn app terminate <device> <bundle-id>`       | Terminate an app                        |
| `simvyn app info <device> <bundle-id>`            | Show app details                        |
| `simvyn app clear-data <device> <bundle-id>`      | Clear app data (Android)                |
| `simvyn logs <device>`                            | Stream device logs                      |
| `simvyn screenshot <device>`                      | Capture a screenshot                    |
| `simvyn record <device>`                          | Record the screen                       |
| `simvyn link <device> <url>`                      | Open a deep link                        |
| `simvyn push <device>`                            | Send a push notification                |
| `simvyn fs ls <device> <bundle-id> [path]`        | List files in app sandbox               |
| `simvyn fs pull <device> <bundle-id> <path>`      | Download a file                         |
| `simvyn fs push <device> <bundle-id> <src> <dst>` | Upload a file                           |
| `simvyn db list <device> <bundle-id>`             | List databases                          |
| `simvyn db query <device> <bundle-id> <db> <sql>` | Run a SQL query                         |
| `simvyn db prefs <device> <bundle-id>`            | View SharedPreferences / NSUserDefaults |
| `simvyn keychain add <device> <cert>`             | Add a root certificate                  |
| `simvyn keychain reset <device>`                  | Reset the keychain                      |
| `simvyn collections list`                         | List all collections                    |
| `simvyn collections show <id>`                    | Show collection details                 |
| `simvyn collections create <name>`                | Create a new collection                 |
| `simvyn collections delete <id>`                  | Delete a collection                     |
| `simvyn collections duplicate <id>`               | Duplicate a collection                  |
| `simvyn collections apply <name> <devices...>`    | Apply a collection to devices           |

## How It Works

simvyn wraps `xcrun simctl` (iOS) and `adb` (Android) behind a unified interface. No SDK required — works with any app, no code changes needed.

The architecture is built around a module system where each feature (location, logs, app management, etc.) is a self-contained plugin that registers its own API routes, CLI commands, and WebSocket handlers. The web dashboard communicates with a local Fastify server over a single multiplexed WebSocket connection for real-time device state and log streaming.

## Supported Platforms

| Platform | iOS Simulators | Android Emulators | Android Devices |
| -------- | -------------- | ----------------- | --------------- |
| macOS    | Yes            | Yes               | Yes             |
| Linux    | No             | Yes               | Yes             |

## License

MIT
