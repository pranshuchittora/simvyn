# Phase 28: Real Device Support - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend simvyn's functionality from simulators/emulators to physical Android and iOS devices connected via USB. Both platforms in a single phase. Android adapter refinement (low effort — adb already works) plus iOS real device support via `xcrun devicectl` (bigger lift — entirely different tooling from `simctl`).

</domain>

<decisions>
## Implementation Decisions

### Platform scope
- Both Android and iOS real devices in one phase
- Android: refine existing adapter (remove incorrect `avd:` guards for USB devices, most features already work)
- iOS: branch within existing ios.ts adapter (conditional paths based on device ID format distinguishing simulator vs physical)
- No separate adapter classes — single adapter per platform with internal branching
- WiFi connections supported if easy to implement (Android `adb tcpip/connect`, iOS network devices in Xcode 14+), otherwise USB-only is fine

### Feature parity boundary
- Unsupported features on physical devices show disabled controls with tooltip ("Not available on physical devices")
- Features that can't work on real devices: erase, create/clone simulator, set status bar overrides, set location (hardware GPS), push notifications (simctl-only)
- Collections auto-skip unsupported steps with a badge (same pattern as existing iOS/Android platform skips), no pre-run warning needed
- iOS app installation: document code signing as a prerequisite. Simvyn just runs the install command, doesn't manage provisioning
- File system / database browsing: mark as unsupported on real iOS devices (no filesystem access without jailbreak). Android real devices work via adb as normal
- Capabilities endpoint already derives flags from adapter method presence — this pattern extends naturally to real devices

### iOS connection method
- Use `xcrun devicectl` (Apple's official CLI, Xcode 15+)
- Assume devices are pre-paired via Xcode/Finder — simvyn only discovers already-paired devices
- Device discovery uses same polling interval as simulators — unified polling cycle
- Graceful degradation if `devicectl` not available (older Xcode): iOS real device features hidden, simulators still work. Show notification on the tool settings debugging page explaining Xcode 15+ is required for physical iOS device support

### Device presentation
- Device selector uses grouped sections: "Simulators", "Emulators", "Physical Devices" with section headers
- Physical devices show actual model name as device type (e.g., "iPhone 15 Pro", "Pixel 8") from device properties
- On disconnect: notify user (toast) then remove device from list immediately on next poll
- Battery level / charging status: Claude's discretion based on available APIs and UI space

### Claude's Discretion
- Battery info display decision (show if easy, skip if cluttered)
- WiFi connection implementation (include if straightforward, defer if complex)
- Exact device ID format for distinguishing real vs simulated iOS devices
- Loading skeleton / empty states for real device sections
- Error messages for operations that fail on real devices

</decisions>

<specifics>
## Specific Ideas

- Android real devices already partially work — the existing adapter's `listDevices()` already discovers USB devices via `adb devices` and creates Device entries with `deviceType: "Physical"`. The main gaps are `avd:` prefix guards on methods that should work on USB devices.
- The existing capabilities endpoint pattern (`!!adapter?.method`) naturally extends to real devices — methods that don't exist for physical devices simply return undefined, and the dashboard hides those controls.
- Tool settings page should have a "Diagnostics" or "Debugging" section that shows whether `xcrun devicectl` is available and what Xcode version is installed.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-real-device-support*
*Context gathered: 2026-03-05*
