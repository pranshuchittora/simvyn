# Simvyn

## What This Is

A universal mobile device devtool — local web dashboard + CLI for controlling iOS Simulators, Android Emulators, and real Android devices via USB/adb. Zero app-side integration required. Entirely host-side, wrapping `xcrun simctl` and `adb`. Think: Flipper replacement that needs no SDK, works with any framework (React Native, Flutter, Swift, Kotlin, anything).

## Core Value

Developers can control and inspect any iOS simulator or Android emulator/device from a single unified dashboard without modifying their app code.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Detect all iOS simulators, Android emulators, and connected Android devices with unified device model
- [ ] Create, boot, shutdown, erase, delete simulators/emulators from dashboard
- [ ] Real-time device status monitoring via polling
- [ ] Device selector UI — pick one or target all
- [ ] Set GPS coordinates, simulate routes (GPX), geofencing (port from sim-location)
- [ ] Browse app sandboxes — download/upload files, edit text files inline
- [ ] Browse SQLite databases — view/edit tables, run queries; SharedPreferences/NSUserDefaults viewer
- [ ] Stream device logs with filtering, search, log level highlighting, export
- [ ] Compose and send push notification payloads (simctl push for iOS, FCM for Android)
- [ ] Launch deep links / universal links, save favorites
- [ ] Capture screenshots, screen recording, save history
- [ ] Toggle dark/light mode, change locale/language, set time, battery simulation, network conditioning
- [ ] CPU/memory/FPS performance monitoring where available
- [ ] Accessibility audit, toggle VoiceOver/TalkBack settings
- [ ] View and symbolicate crash reports
- [ ] List installed apps, install/uninstall IPAs/APKs, launch/terminate apps, clear app data
- [ ] Read/write app user defaults / shared preferences directly
- [ ] Push photos/videos to device camera roll
- [ ] Read/write device clipboard
- [ ] Network proxy setup, SSL pinning bypass helpers, network link conditioner
- [ ] Apple Liquid Glass inspired UI — dark background, frosted glass panels, spring animations
- [ ] CLI with `simvyn` starting dashboard; every module exposes headless CLI subcommands
- [ ] Published as `simvyn` npm package, invocable via `npx simvyn`
- [ ] Cross-platform: macOS (full iOS+Android), Linux (Android-only, graceful degradation when simctl unavailable)

## Current Milestone: v1.6 Collections & Documentation

**Goal:** Add reusable device action collections for batch configuration of multiple devices, and comprehensive getting started documentation with per-feature coverage.

**Target features:**
- Collections module — define reusable sets of device actions (dark mode, location, locale, app launch, etc.) and apply to one or more devices
- Step-by-step collection builder with categorized action list and per-step parameter configuration
- Apply modal with device picker, real-time per-step execution feedback (spinner/check/fail/skip), platform compatibility warnings
- Platform badges (Apple/Android logo) on steps that are platform-specific, with pre-apply warnings and skip-on-execute behavior
- Command palette integration for quick collection apply
- Getting started documentation in README.md — per-feature sections with screenshot placeholders

### Out of Scope

- Native mobile app (dashboard only) — web-first approach, no mobile client needed
- App-side SDK/integration — the entire point is zero-instrumentation
- Cloud/remote device management — local-only tool
- iOS real device support — simctl only works with simulators; USB iPhone control requires different tooling
- Windows native support — use WSL; no Windows-specific code paths
- Linux iOS support — simctl is macOS-only, no workaround

## Context

**Migration strategy:** `sim-location` at `/Users/pranshu/github/sim-location` will be directly migrated into this project — code copied and refactored to fit simvyn's monorepo/module architecture. Not a rewrite from scratch. It uses:
- Raw `node:http` server with `ws` WebSocket library
- React 19 + Vite 7 + Zustand for the web UI
- Platform adapter pattern: `PlatformAdapter` interface with `createIosAdapter()` and `createAndroidAdapter()` factory functions
- `xcrun simctl` for iOS, `adb` for Android
- File-based JSON storage at `~/.config/sim-location/`
- Discriminated union WebSocket message protocol (typed `ServerMessage`/`ClientMessage`)
- Glass-morphism CSS design system (hand-written, no framework)

**Key patterns to carry forward:**
- Platform adapter interface (`isAvailable()`, `listDevices()`, `setLocation()`, etc.)
- Factory function pattern (plain objects, no classes)
- Dual playback strategy (iOS native `simctl location start` vs Android manual tick-based `geo fix`)
- Zustand stores with dual access (React hooks + imperative `getState()`)
- Discriminated union message protocol for WebSocket

**Key patterns to evolve:**
- Raw `node:http` → Fastify or Express (more endpoints needed)
- Single CSS file → Tailwind CSS (larger UI surface)
- Monolithic structure → TypeScript monorepo with workspace packages
- Hardcoded features → Module/plugin system with auto-discovery

**Target audience:** Mobile developers using any framework. Anyone who uses iOS Simulator or Android Emulator during development.

## Constraints

- **Tech stack**: Node.js server (Fastify or Express), React + Vite + Tailwind web dashboard, TypeScript monorepo with workspace packages
- **CLI framework**: commander.js or yargs — `simvyn` starts dashboard, subcommands for headless use
- **Module system**: Each feature is a self-contained module that registers routes, WebSocket handlers, and CLI commands. Auto-discovery — adding a new tool = adding a new module folder.
- **State persistence**: Module state, device preferences persisted in `~/.simvyn/`
- **WebSocket**: Required for real-time device status, log streaming, playback updates
- **UI design**: Apple Liquid Glass inspired (WWDC 2025) — dark backgrounds with deep gradients, frosted glass panels (backdrop-filter: blur + saturate), muted accent colors (soft blue, purple, teal), spring animations (Framer Motion), SF Pro / Inter font, thin translucent scrollbars, rounded corners (12-16px)
- **Layout**: Top bar (device selector + status) → Sidebar (module list with icons) → Main content area. Module state persists when switching.
- **Cross-platform**: macOS = full iOS+Android, Linux = Android-only with graceful degradation when simctl unavailable. No Windows-specific code (WSL covers it).
- **npm package**: Published as `simvyn`, invocable via `npx simvyn`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript monorepo with workspaces | Module system needs clean boundaries; shared types across packages | — Pending |
| Fastify or Express for HTTP server | sim-location's raw node:http won't scale with many module endpoints | — Pending |
| Tailwind CSS over hand-written CSS | sim-location's 1200-line CSS file shows hand-written won't scale for 16+ modules | — Pending |
| Module/plugin architecture | Each feature self-contained; auto-discovery; easy to add new tools | — Pending |
| Migrate sim-location code directly | Copy and refactor into simvyn's module architecture — not a rewrite | — Pending |
| macOS + Linux only, no Windows | Windows users use WSL; avoids Windows-specific code paths | — Pending |
| Framer Motion for animations | Spring animations central to Liquid Glass aesthetic | — Pending |
| File-based persistence at ~/.simvyn/ | Simple, no database dependency; JSON files like sim-location | — Pending |

---
*Last updated: 2026-03-04 after milestone v1.6 start*
