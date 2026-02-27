<p align="center">
  <img src="assets/simvyn-icon-1024.png" width="180" alt="simvyn" />
</p>

<h1 align="center">simvyn</h1>

<p align="center">
  Universal mobile devtool — control iOS Simulators and Android Emulators from a single dashboard and CLI
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/v/simvyn" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/l/simvyn" alt="license" /></a>
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/node/v/simvyn" alt="node version" /></a>
</p>

---

<!-- Add dashboard screenshot here -->
*Dashboard screenshot coming soon*

---

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

- **Device Management** — Discover, boot, shutdown, erase iOS Simulators and Android Emulators
- **Location Simulation** — Set GPS coordinates, play GPX/KML routes with speed control, save favorite locations
- **App Management** — Install, launch, terminate, uninstall apps via drag-and-drop or CLI
- **Log Viewer** — Real-time log streaming with level filtering, regex search, and export
- **Screenshots and Recording** — Capture screenshots and record screen on any device
- **Deep Links** — Open URLs and custom schemes, save favorites per app
- **Push Notifications** — Compose and send push payloads to iOS simulators with template library
- **File Browser** — Browse app sandboxes, upload/download files, edit text files inline
- **Database Inspector** — Browse SQLite tables, run SQL queries, view SharedPreferences and NSUserDefaults
- **Device Settings** — Toggle dark mode, manage permissions, override status bar, accessibility presets
- **Crash Logs** — View iOS diagnostic reports and Android logcat crashes
- **Developer Utilities** — Port forwarding, display overrides, battery simulation, input injection, bug reports
- **Web Dashboard** — Apple Liquid Glass design with command palette (Cmd+K), keyboard navigation
- **Full CLI** — Every feature works headlessly via `simvyn <command>`

## CLI Examples

```bash
simvyn                                      # Start dashboard
simvyn device list                          # List all devices
simvyn location set <device> 37.78 -122.41  # Set GPS location
simvyn app install <device> ./app.apk       # Install an app
simvyn screenshot <device>                  # Take a screenshot
simvyn logs <device> --level error          # Stream error logs
simvyn push <device> --payload payload.json # Send push notification
simvyn device create <name> <type> <runtime> # Create iOS simulator
```

## How It Works

simvyn wraps `xcrun simctl` (iOS) and `adb` (Android) behind a unified interface. No SDK required — works with any app, no code changes needed. The web dashboard communicates with a local Fastify server over WebSocket for real-time device state and log streaming.

## Supported Platforms

| Platform | iOS Simulators | Android Emulators | Android Devices |
|----------|---------------|-------------------|-----------------|
| macOS    | Yes           | Yes               | Yes             |
| Linux    | No            | Yes               | Yes             |

## License

MIT
