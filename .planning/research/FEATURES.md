# Feature Research

**Domain:** Universal mobile device devtools (iOS Simulator + Android Emulator/Device control)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Market Context

Flipper (facebook/flipper) was **archived on Sep 26, 2025** and React Native officially removed it in v0.74 (April 2024). There is no unified, SDK-free replacement. Developers currently cobble together `xcrun simctl`, `adb`, Android Studio, Xcode Instruments, and various standalone tools. This is the gap.

**Key insight:** Flipper required SDK integration (native code in the app). Our zero-SDK approach is fundamentally different — we wrap `simctl` and `adb` from the host side, meaning it works with **any** app regardless of framework (React Native, Flutter, native, Kotlin Multiplatform, etc.).

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Platform Support | Notes |
|---------|--------------|------------|------------------|-------|
| **Device Discovery & List** | Must see available devices/emulators | LOW | iOS: `simctl list` / Android: `adb devices` | Foundation for everything. Show booted status, device type, OS version |
| **Boot / Shutdown / Erase** | Basic device lifecycle control | LOW | iOS: `simctl boot/shutdown/erase` / Android: `adb emu kill`, emulator CLI | Android emulator lifecycle is more limited via adb alone |
| **App Install / Uninstall** | Core workflow for any mobile dev | LOW | iOS: `simctl install/uninstall` / Android: `adb install/uninstall` | Support drag-and-drop .app/.ipa/.apk in dashboard |
| **App Launch / Terminate** | Need to start/stop apps quickly | LOW | iOS: `simctl launch/terminate` / Android: `adb shell am start/force-stop` | Show running apps, quick relaunch |
| **Log Viewer** | #1 debugging tool, every dev needs this | MEDIUM | iOS: `simctl spawn log stream` / Android: `adb logcat` | Must support filtering, search, log level colors. Real-time streaming critical |
| **Screenshots** | Universal need for docs, bug reports, PRs | LOW | iOS: `simctl io screenshot` / Android: `adb shell screencap` | Support PNG/JPEG, one-click save, copy to clipboard |
| **Screen Recording** | Bug reproduction, demos, PRs | MEDIUM | iOS: `simctl io recordVideo` / Android: `adb shell screenrecord` | iOS supports h264/hevc. Android has 3-min limit. Both need clean start/stop |
| **Deep Links / URL Handling** | Every app uses deep links | LOW | iOS: `simctl openurl` / Android: `adb shell am start -a VIEW -d <url>` | Support custom schemes and universal links |
| **Push Notifications (iOS)** | iOS sim push is simctl's killer feature | LOW | iOS: `simctl push` with JSON payload / Android: N/A without SDK | Android push requires Firebase or app-side code — iOS is simctl-native |
| **Location Simulation** | Maps, geofencing, ride-sharing apps | MEDIUM | iOS: `simctl location set/start/run` / Android: `adb emu geo fix` | Already proven via sim-location. Route simulation is the valuable part |
| **File Management** | Browse app containers, push/pull files | MEDIUM | iOS: `simctl get_app_container` + filesystem / Android: `adb push/pull` | iOS: direct filesystem access to sim. Android: adb push/pull. Show app sandboxes |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Platform Support | Notes |
|---------|-------------------|------------|------------------|-------|
| **Unified Cross-Platform Dashboard** | One tool instead of juggling simctl + adb + Android Studio + Xcode | HIGH | Both | The core product thesis. No other tool does this well. Flipper tried but required SDK |
| **Zero SDK / No App Integration** | Works with any app instantly — Flutter, RN, native, anything | N/A (architecture) | Both | Biggest differentiator vs Flipper. Just point at a device, instant access |
| **Status Bar Override (iOS)** | Set time, battery, network for pixel-perfect screenshots | LOW | iOS: `simctl status_bar override` / Android: `adb shell cmd statusbar` (limited) | iOS has rich support: time, network type, battery state/level, operator name |
| **Privacy / Permission Control** | Grant/revoke/reset permissions without reinstalling | LOW | iOS: `simctl privacy grant/revoke/reset` / Android: `adb shell pm grant/revoke` | Huge DX improvement. Reset all permissions for testing first-run experience |
| **Dark Mode / Appearance Toggle** | Quick toggle without navigating settings | LOW | iOS: `simctl ui appearance light/dark` / Android: `adb shell cmd uimode night yes/no` | One-click toggle in dashboard |
| **Accessibility Settings** | Content size, increase contrast for a11y testing | LOW | iOS: `simctl ui content_size/increase_contrast` / Android: `adb shell settings` | Important for compliance testing. iOS has excellent simctl support |
| **Database Inspector** | View SQLite databases without pulling files manually | HIGH | iOS: read from sim filesystem / Android: `adb pull` then parse | Need SQLite parser. Show tables, run queries. Flipper's DB inspector was popular |
| **User Defaults / SharedPrefs Editor** | Read and edit app preferences without rebuilding | MEDIUM | iOS: read plist from sim container / Android: `adb shell run-as <pkg> cat shared_prefs/` | iOS plists are directly accessible. Android needs run-as (debug apps only) |
| **Clipboard Bridge** | Copy text between host and device | LOW | iOS: `simctl pbcopy/pbpaste/pbsync` / Android: `adb shell input text` (limited) | iOS has rich pasteboard support. Android clipboard is write-only without SDK |
| **Media Injection** | Add photos/videos/contacts to device | LOW | iOS: `simctl addmedia` / Android: `adb push` + `am broadcast` for media scan | iOS supports photos, live photos, videos, contacts (vCard) |
| **Keychain Management (iOS)** | Add certs, reset keychain | LOW | iOS: `simctl keychain add-root-cert/add-cert/reset` / Android: N/A | Useful for testing SSL pinning, proxy setups |
| **App Info / Container Inspector** | Show app metadata, container paths, entitlements | LOW | iOS: `simctl appinfo/get_app_container/listapps` / Android: `adb shell dumpsys package` | Quick access to bundle IDs, installed versions, paths |
| **Batch / Scriptable Operations** | CI/CD integration, automated testing setup | MEDIUM | Both via CLI | CLI-first design means everything is scriptable. Dashboard is the GUI layer |
| **Multi-Device View** | See and control multiple devices simultaneously | HIGH | Both | Run same command across devices. Compare iOS vs Android side by side |
| **iCloud Sync Trigger (iOS)** | Force iCloud sync for testing | LOW | iOS: `simctl icloud_sync` / Android: N/A | Niche but valuable for iCloud-dependent apps |
| **Network Condition Simulation** | Throttle bandwidth, add latency | HIGH | iOS: Network Link Conditioner (system) / Android: `adb shell cmd connectivity` (limited) | Hard to do without SDK. iOS has system-level NLC but it's not via simctl |
| **Crash Log Viewer** | View crash reports from device | MEDIUM | iOS: `~/Library/Logs/DiagnosticReports/` / Android: `adb logcat *:E` + tombstones | iOS crash logs are on host filesystem. Android needs logcat filtering |
| **Performance Monitoring** | CPU, memory, FPS at a glance | HIGH | iOS: Xcode Instruments (not simctl) / Android: `adb shell dumpsys meminfo/cpuinfo` | Android has decent shell access. iOS is very limited without Instruments |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **In-App SDK / Bridge** | Flipper had it, enables deep inspection | Violates core "zero SDK" principle. Creates framework-specific code, maintenance burden, build failures. This is what killed Flipper | Stay host-side only. Use platform tools (simctl, adb) exclusively. The constraint is the feature |
| **Network Inspector (full)** | Flipper's most popular plugin | Requires MITM proxy or SDK to intercept traffic. Host-side only approach can't see encrypted traffic without proxy setup. Don't half-build this | Recommend/integrate with mitmproxy or Charles Proxy. Optionally add a "proxy setup" wizard that configures certs via `simctl keychain` |
| **Layout Inspector / View Hierarchy** | Flipper had it, visually powerful | Requires either accessibility tree parsing (fragile) or SDK. Platform tools do this better (Xcode View Debugger, Android Layout Inspector) | Link to native tools. Don't compete with Xcode/Android Studio on inspection |
| **React Native / Flutter Devtools** | Framework-specific debugging | Framework lock-in, massive maintenance burden, already done better by framework teams themselves (RN DevTools, Flutter DevTools) | Stay framework-agnostic. Link to framework-specific tools from dashboard |
| **Screen Mirroring** | scrcpy has 136k stars | Requires native code (C/FFmpeg/SDL2), completely different tech stack from a web dashboard. scrcpy already does this perfectly | Integrate with scrcpy as optional companion. Don't rebuild it |
| **Emulator Creation / Runtime Management** | "Manage everything in one place" | Extremely complex (Android AVD, iOS runtime downloads), already handled well by IDE tooling, and rarely a developer pain point | Support listing/booting existing devices. Don't manage creation |
| **Remote Device Access** | Control devices from anywhere | Security nightmare, requires tunneling infrastructure, enterprise-level complexity | Keep it local. CLI + web dashboard on localhost |

## Feature Dependencies

```
[Device Discovery & List]
    └──requires──> (nothing — this is the foundation)
    
[App Install/Uninstall]
    └──requires──> [Device Discovery]
    
[App Launch/Terminate]
    └──requires──> [Device Discovery]
    
[Log Viewer]
    └──requires──> [Device Discovery]
    
[Screenshots / Screen Recording]
    └──requires──> [Device Discovery]
    
[Deep Links]
    └──requires──> [Device Discovery]
    
[Push Notifications]
    └──requires──> [Device Discovery]
    
[Location Simulation]
    └──requires──> [Device Discovery]
    
[File Management]
    └──requires──> [Device Discovery]
    └──enhances──> [Database Inspector]
    └──enhances──> [User Defaults/SharedPrefs Editor]
    
[Database Inspector]
    └──requires──> [File Management] (need to read files from container)
    
[User Defaults/SharedPrefs Editor]
    └──requires──> [File Management] (need to read/write plist/xml)
    
[App Info / Container Inspector]
    └──requires──> [Device Discovery]
    └──enhances──> [File Management] (provides container paths)
    
[Crash Log Viewer]
    └──requires──> [Device Discovery]
    └──enhances──> [Log Viewer]
    
[Multi-Device View]
    └──requires──> [Device Discovery]
    └──enhances──> (all device-specific features)
    
[CLI Interface] ──parallel──> [Web Dashboard]
    (both consume same core modules)
```

### Dependency Notes

- **Database Inspector requires File Management:** Must be able to locate and read files from app containers to access SQLite databases
- **User Defaults/SharedPrefs requires File Management:** Need filesystem access to read plist (iOS) and shared_prefs XML (Android) files
- **App Info enhances File Management:** `simctl get_app_container` and `adb shell pm path` provide the paths that File Management navigates
- **Multi-Device enhances everything:** Once any feature works for one device, multi-device is about parallel execution
- **CLI and Dashboard are parallel:** Both wrap the same core module layer — CLI for scriptability/CI, dashboard for interactive use

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept of "unified mobile devtools."

- [x] **Device Discovery & List** — the foundation; without this, nothing works
- [x] **Boot / Shutdown** — basic lifecycle control
- [x] **App Install / Uninstall / Launch / Terminate** — core developer workflow
- [x] **Log Viewer** — #1 debugging tool, real-time streaming with filtering
- [x] **Screenshots** — universal utility, low complexity, high perceived value
- [x] **Deep Links / URL Opening** — trivial to implement, used constantly
- [x] **Push Notifications (iOS)** — simctl's killer feature, unique value prop
- [x] **Location Simulation** — already proven via sim-location, extend to dashboard
- [x] **CLI Interface** — `simvyn` command that wraps all above, scriptable

### Add After Validation (v1.x)

Features to add once core is working and validated with users.

- [ ] **Web Dashboard** — visual UI wrapping CLI capabilities, real-time device status
- [ ] **Screen Recording** — natural extension of screenshots
- [ ] **Status Bar Override** — low effort, high impact for iOS screenshot workflows
- [ ] **Dark Mode Toggle** — one-click, devs toggle this constantly
- [ ] **Privacy / Permission Control** — grant/revoke/reset without reinstall
- [ ] **File Management** — browse containers, push/pull files
- [ ] **Clipboard Bridge** — pbcopy/pbpaste bridge (iOS)
- [ ] **Media Injection** — add photos/videos to simulator library
- [ ] **App Info Inspector** — show installed apps, bundle IDs, container paths

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Database Inspector** — high complexity, requires SQLite parsing, but very valuable
- [ ] **User Defaults / SharedPrefs Editor** — requires plist/XML parsing, read/write
- [ ] **Crash Log Viewer** — moderate complexity, high value for debugging
- [ ] **Multi-Device View** — compelling but complex UI challenge
- [ ] **Keychain Management** — niche but useful (iOS only)
- [ ] **Network Condition Simulation** — hard without SDK, investigate feasibility
- [ ] **Performance Monitoring** — limited by what's available host-side
- [ ] **Batch Operations / CI Mode** — scriptable profiles for test setup

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Device Discovery & List | HIGH | LOW | P1 |
| Boot / Shutdown / Erase | HIGH | LOW | P1 |
| App Install / Uninstall | HIGH | LOW | P1 |
| App Launch / Terminate | HIGH | LOW | P1 |
| Log Viewer (streaming) | HIGH | MEDIUM | P1 |
| Screenshots | HIGH | LOW | P1 |
| Deep Links / URL Open | HIGH | LOW | P1 |
| Push Notifications (iOS) | HIGH | LOW | P1 |
| Location Simulation | HIGH | MEDIUM | P1 |
| Screen Recording | MEDIUM | MEDIUM | P2 |
| Status Bar Override | MEDIUM | LOW | P2 |
| Dark Mode Toggle | MEDIUM | LOW | P2 |
| Permission Control | HIGH | LOW | P2 |
| File Management | HIGH | MEDIUM | P2 |
| Clipboard Bridge | MEDIUM | LOW | P2 |
| Media Injection | MEDIUM | LOW | P2 |
| App Info Inspector | MEDIUM | LOW | P2 |
| Web Dashboard | HIGH | HIGH | P2 |
| Database Inspector | HIGH | HIGH | P3 |
| User Defaults/SharedPrefs | HIGH | MEDIUM | P3 |
| Crash Log Viewer | MEDIUM | MEDIUM | P3 |
| Multi-Device View | MEDIUM | HIGH | P3 |
| Keychain Management | LOW | LOW | P3 |
| Performance Monitoring | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (CLI-first MVP)
- P2: Should have, add post-validation (dashboard + expanded features)
- P3: Nice to have, future consideration (advanced inspection + multi-device)

## Platform Parity Analysis

Not all features are available on both platforms. This is a critical constraint.

| Feature | iOS (simctl) | Android (adb) | Notes |
|---------|-------------|---------------|-------|
| Device List | ✅ Full | ✅ Full | Both excellent |
| Boot/Shutdown | ✅ Full | ⚠️ Partial | Android emulator lifecycle via `adb emu` is limited |
| App Install | ✅ Full | ✅ Full | Both straightforward |
| App Launch | ✅ Full | ✅ `am start` | Android requires knowing activity name or using monkey |
| Logs | ✅ `log stream` | ✅ `logcat` | Different formats, need unified view |
| Screenshots | ✅ Full | ✅ `screencap` | Need to pull file from Android |
| Screen Record | ✅ Full | ✅ `screenrecord` | Android 3-min limit, must pull file |
| Deep Links | ✅ `openurl` | ✅ `am start -d` | Both good |
| Push Notifications | ✅ `push` | ❌ None | No SDK-free Android push. Document as iOS-only |
| Location | ✅ Full (set/route) | ⚠️ `emu geo fix` | Android: emulator console only, no routing |
| Status Bar | ✅ Full | ⚠️ Partial | Android: limited demo mode via `cmd statusbar` |
| Permissions | ✅ `privacy` | ✅ `pm grant/revoke` | Both have good support |
| Dark Mode | ✅ `ui appearance` | ✅ `cmd uimode` | Both supported |
| Content Size | ✅ `ui content_size` | ⚠️ `settings` | Android is less direct |
| Clipboard | ✅ `pbcopy/pbpaste` | ⚠️ Write-only | Android can set but not read clipboard via adb |
| File Access | ✅ Direct filesystem | ✅ `push/pull` | iOS sim files are directly on host! Android needs adb |
| Media Add | ✅ `addmedia` | ⚠️ Push + broadcast | iOS is simpler, Android needs media scanner trigger |
| Keychain | ✅ `keychain` | ❌ None | iOS only |
| iCloud Sync | ✅ `icloud_sync` | ❌ N/A | iOS only |

**Strategy:** Build each feature with the richer platform first (usually iOS), then add Android support where possible. Clearly mark iOS-only features in UI. Don't pretend features exist on Android when they don't.

## Competitor Feature Analysis

| Feature | Flipper (archived) | Android Studio | Xcode Instruments | scrcpy | Our Approach |
|---------|-------------------|----------------|-------------------|--------|--------------|
| Zero SDK setup | ❌ Required SDK | ✅ (built-in) | ✅ (built-in) | ✅ | ✅ Core design principle |
| Cross-platform | ✅ Both | ❌ Android only | ❌ iOS only | ❌ Android only | ✅ Both, unified UI |
| Log Viewer | ✅ With SDK | ✅ Logcat | ✅ Console | ❌ | ✅ Unified cross-platform |
| Network Inspector | ✅ With SDK | ✅ Profiler | ✅ Instruments | ❌ | ❌ Out of scope (recommend mitmproxy) |
| Layout Inspector | ✅ With SDK | ✅ Built-in | ✅ View Debugger | ❌ | ❌ Out of scope (use native tools) |
| Database Inspector | ✅ With SDK | ✅ App Inspection | ❌ | ❌ | ✅ v2+ (host-side file reading) |
| Push Notifications | ❌ | ❌ | ❌ | ❌ | ✅ iOS simctl native |
| Location Simulation | ❌ | ✅ Emulator UI | ✅ Simulator UI | ❌ | ✅ CLI + dashboard, route sim |
| Screen Recording | ❌ | ✅ Built-in | ✅ QuickTime | ✅ Best | ✅ Unified cross-platform |
| Permission Control | ❌ | ⚠️ Manual | ⚠️ Manual | ❌ | ✅ Automated grant/revoke/reset |
| CLI Scriptable | ❌ GUI-only | ⚠️ adb only | ⚠️ simctl only | ✅ CLI | ✅ Full CLI + dashboard |
| npm installable | ❌ | ❌ | ❌ | ❌ | ✅ `npm install -g simvyn` |
| Plugin system | ✅ Extensible | ❌ | ❌ | ❌ | ❌ Not initially (v2+ maybe) |
| Framework-agnostic | ❌ (RN-focused) | ✅ Native Android | ✅ Native iOS | ✅ | ✅ Works with anything |

## Sources

- **Flipper repository:** https://github.com/facebook/flipper — archived Sep 26, 2025 (HIGH confidence, verified directly)
- **React Native 0.74 blog:** https://reactnative.dev/blog/2024/04/22/release-0.74 — Flipper removal confirmed (HIGH confidence, official blog)
- **simctl help output:** Verified locally via `xcrun simctl help` on macOS (HIGH confidence, direct CLI output)
- **adb help output:** Verified locally via `adb help` (HIGH confidence, direct CLI output)
- **scrcpy repository:** https://github.com/Genymobile/scrcpy — 136k stars, v3.3.4, Android-only screen mirroring (HIGH confidence, verified directly)
- **simctl subcommand details:** Verified locally for io, location, push, status_bar, privacy, ui, keychain, addmedia (HIGH confidence)
- **adb shell commands:** Based on Android documentation and training data for am, pm, settings, dumpsys commands (MEDIUM confidence — no device available to verify shell commands)

---
*Feature research for: Universal mobile device devtools (simvyn)*
*Researched: 2026-02-26*
