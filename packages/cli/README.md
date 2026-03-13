<p align="center">
  <img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/simvyn-icon-1024.png" width="180" alt="simvyn" />
</p>

<h1 align="center">simvyn</h1>

<p align="center">
  Universal mobile devtool — control iOS Simulators, Android Emulators, and real devices from a single dashboard and CLI
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/v/simvyn" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/simvyn"><img src="https://img.shields.io/npm/l/simvyn" alt="license" /></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/pranshuchittora/simvyn/main/assets/banner.png" alt="simvyn dashboard" />
</p>

## Quick Start

```bash
npx simvyn
```

Starts the local server, opens the web dashboard in your browser, and discovers all connected simulators, emulators, and USB-connected physical devices automatically.

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

- **Device Management** — Discover, boot, shutdown, erase simulators, emulators, and physical devices
- **App Management** — Install, launch, terminate, uninstall apps via drag-and-drop or CLI
- **Log Viewer** — Real-time log streaming with level filtering, regex search, and export
- **Location Simulation** — Set GPS coordinates, play GPX/KML routes with speed control, save favorite locations
- **Device Settings** — Toggle dark mode, change locale, rotate orientation, manage permissions, override status bar, accessibility presets
- **Screenshots and Recording** — Capture screenshots and record screen on any device
- **Deep Links** — Open URLs and custom schemes, save favorites per app
- **Database Inspector** — Browse SQLite tables, run SQL queries, view SharedPreferences and NSUserDefaults
- **File Browser** — Browse app sandboxes, upload/download files, edit text files inline
- **Push Notifications** — Compose and send push payloads to iOS simulators with template library
- **Collections** — Bundle device actions into reusable sequences, apply to multiple devices at once
- **Crash Logs** — View iOS diagnostic reports and Android logcat crashes
- **Clipboard** — Read and write device clipboard contents
- **Media** — Push photos and videos to device camera rolls and galleries
- **Tool Settings** — Server configuration, storage management, diagnostics, and debug reports
- **Real Device Support** — Connect physical Android and iOS devices via USB with automatic discovery
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

simvyn wraps `xcrun simctl` (iOS Simulators), `xcrun devicectl` (iOS physical devices), and `adb` (Android) behind a unified interface. No SDK required — works with any app, no code changes needed. The web dashboard communicates with a local Fastify server over WebSocket for real-time device state and log streaming.

## Supported Platforms

| Platform | iOS Simulators | iOS Devices | Android Emulators | Android Devices |
| -------- | -------------- | ----------- | ----------------- | --------------- |
| macOS    | Yes            | Limited     | Yes               | Yes             |
| Linux    | No             | No          | Yes               | Yes             |

> **Note:** iOS physical device support requires Xcode 15+ and uses `xcrun devicectl`. Supported features include device discovery, app install/uninstall/launch/terminate, app listing, deep links, and file copy. Features like screenshots, screen recording, location simulation, and push notifications are not available on physical iOS devices. Android physical devices support nearly all features except emulator-only commands (location via `adb emu geo`, battery simulation).

## License

MIT
