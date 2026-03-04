# Phase 28: Real Device Support - Research

**Researched:** 2026-03-05
**Domain:** iOS `xcrun devicectl` CLI, Android `adb` real device support, adapter architecture
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Both Android and iOS real devices in one phase
- Android: refine existing adapter (remove incorrect `avd:` guards for USB devices, most features already work)
- iOS: branch within existing ios.ts adapter (conditional paths based on device ID format distinguishing simulator vs physical)
- No separate adapter classes — single adapter per platform with internal branching
- WiFi connections supported if easy to implement (Android `adb tcpip/connect`, iOS network devices in Xcode 14+), otherwise USB-only is fine
- Unsupported features on physical devices show disabled controls with tooltip ("Not available on physical devices")
- Features that can't work on real devices: erase, create/clone simulator, set status bar overrides, set location (hardware GPS), push notifications (simctl-only)
- Collections auto-skip unsupported steps with a badge (same pattern as existing iOS/Android platform skips), no pre-run warning needed
- iOS app installation: document code signing as a prerequisite. Simvyn just runs the install command, doesn't manage provisioning
- File system / database browsing: mark as unsupported on real iOS devices (no filesystem access without jailbreak). Android real devices work via adb as normal
- Capabilities endpoint already derives flags from adapter method presence — this pattern extends naturally to real devices
- Use `xcrun devicectl` (Apple's official CLI, Xcode 15+)
- Assume devices are pre-paired via Xcode/Finder — simvyn only discovers already-paired devices
- Device discovery uses same polling interval as simulators — unified polling cycle
- Graceful degradation if `devicectl` not available (older Xcode): iOS real device features hidden, simulators still work. Show notification on the tool settings debugging page explaining Xcode 15+ is required for physical iOS device support
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

### Deferred Ideas (OUT OF SCOPE)

None specified.

</user_constraints>

## Summary

This phase extends simvyn from simulator/emulator-only to physical device support on both platforms. The work divides into two asymmetric halves: **Android is a low-effort refinement** (adb already discovers and communicates with USB devices — the main issue is removing `avd:` prefix guards that incorrectly block operations on physical device serials) while **iOS is a significant new capability** requiring integration with `xcrun devicectl`, Apple's CoreDevice CLI that shipped with Xcode 15.

The `devicectl` CLI (verified locally on Xcode 26.2, version 506.6) provides a comprehensive set of commands for real iOS device interaction: device discovery (`list devices`), app management (`device install app`, `device uninstall app`), process control (`device process launch/terminate`), file operations (`device copy to/from`), device info (`device info apps/details/processes`), and diagnostics (`device sysdiagnose`). All commands support structured JSON output via `--json-output <path>` to a temp file (the *only* supported programmatic interface — stdout is human-readable and unstable). Device identification uses CoreDevice UUIDs (format: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`), which are distinct from simctl UDIDs, making simulator-vs-physical branching straightforward.

The architecture approach (internal branching within each adapter) is sound. The iOS adapter can use a helper function `isPhysicalDevice(id)` to route calls. For capabilities, the existing pattern of optional methods returning `undefined` works perfectly — real device operations that differ from simulator can conditionally define/undefine methods, or the capability list can become device-context-aware.

**Primary recommendation:** Implement a `isPhysicalDevice()` discriminator in each adapter, gate operations through it, and use `devicectl`'s JSON output mode exclusively for iOS real device operations.

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xcrun devicectl` | 506.6 (Xcode 15+) | iOS real device discovery, app management, process control | Apple's official replacement for idevice* tools, ships with Xcode |
| `adb` | (system) | Android real device discovery and all operations | Already used, works identically on physical devices and emulators |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `os.tmpdir()` + `mkdtemp` | Node.js built-in | Temp files for devicectl JSON output | Every devicectl call requiring parsed output |
| `plutil` | macOS built-in | Already used in iOS adapter for plist→JSON | Not needed for devicectl (native JSON support) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xcrun devicectl` | `libimobiledevice` / `pymobiledevice3` | Third-party, requires separate install, not needed since devicectl covers all use cases |
| `xcrun devicectl` | Xcode's `xctrace` | Only for profiling/tracing, not general device interaction |

**Installation:** No new npm packages needed. All tools are system CLIs.

## Architecture Patterns

### How devicectl Works (Critical for Implementation)

**JSON output is file-based only.** The devicectl CLI explicitly states: "JSON output to a user-provided file on disk is the ONLY supported interface for scripts/programs to consume command output." Every invocation that needs parsed results must:

1. Create a temp file path
2. Pass `--json-output <path>` to devicectl
3. Read and parse the file after command completes
4. Clean up the temp file

**Device identification.** devicectl accepts `--device <uuid|ecid|serial_number|udid|name|dns_name>`. The CoreDevice `identifier` field (UUID format) is the most reliable. From the actual JSON output on this machine:

```json
{
  "identifier": "50C188FA-F830-5408-B59E-A91760B08474",
  "hardwareProperties": {
    "reality": "physical",
    "marketingName": "iPhone 15",
    "platform": "iOS",
    "udid": "00008120-00141DE83AE3601E",
    "deviceType": "iPhone"
  },
  "deviceProperties": {
    "name": "iPhone",
    "osVersionNumber": "26.3"
  },
  "connectionProperties": {
    "transportType": "localNetwork",
    "tunnelState": "disconnected",
    "pairingState": "paired"
  }
}
```

### Discriminating Physical vs Simulated Devices

**iOS:** The `hardwareProperties.reality` field is `"physical"` for real devices. Simulators discovered via `simctl` use standard UUIDs but are in a completely different code path. The recommended discriminator:
- Real device IDs from devicectl use CoreDevice UUIDs (the `identifier` field)
- Simulator IDs from simctl use simulator UDIDs  
- Since both are UUID format, use a **prefix convention**: store real device IDs with a `physical:` prefix (e.g., `physical:50C188FA-F830-5408-B59E-A91760B08474`) to make branching trivial: `id.startsWith("physical:")`
- Strip the prefix before passing to devicectl commands

**Android:** Physical devices have serials like `R5CR30XXXXX` or IP:port. Emulators have `emulator-NNNN`. Shutdown AVDs have `avd:name`. Discriminator: `!id.startsWith("emulator-") && !id.startsWith("avd:")`.

### Pattern 1: devicectl JSON Output Helper

**What:** A helper function that wraps every devicectl call with temp file management
**When to use:** Every devicectl invocation that needs parsed results

```typescript
// packages/core/src/adapters/ios.ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function devicectlJson<T>(args: string[]): Promise<T> {
  const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-dctl-"));
  const jsonPath = join(tmpDir, "output.json");
  try {
    await verboseExec("xcrun", [
      "devicectl", ...args,
      "--json-output", jsonPath,
      "-q",
    ]);
    const raw = await readFile(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.result as T;
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
```

### Pattern 2: Conditional Adapter Method Definition

**What:** Capabilities that differ between real and simulated devices return per-device results
**When to use:** When the adapter needs to expose different method availability for different device types

The current architecture defines capabilities at the adapter level (per-platform), not per-device. For real device support, the `capabilities()` method and the `/capabilities` endpoint need to become device-aware.

**Approach:** The capabilities endpoint already receives `deviceId` as a query param and looks up the adapter. The adapter's method presence (`!!adapter?.setLocation`) drives capability flags. For per-device capability variance, there are two options:

**Option A (Recommended): Runtime guard with clear error messages.** Keep methods defined on the adapter, but add guards that check if the device is physical and throw descriptive errors. The capabilities endpoint can additionally check device type:

```typescript
// In the capabilities endpoint (device-settings/routes.ts)
const device = fastify.deviceManager.devices.find(d => d.id === deviceId);
const isPhysical = device?.deviceType === "Physical";

return {
  appearance: !!adapter?.setAppearance && (!isPhysical || device.platform === "android"),
  statusBar: !!adapter?.setStatusBar && !isPhysical,
  // ...
};
```

**Option B: Split capabilities method to accept device context.** Change `capabilities()` to `capabilities(deviceId?)` and return different arrays. More invasive but cleaner long-term.

**Recommendation: Option A** — minimal surface area change, uses existing patterns.

### Pattern 3: Device Selector Grouping

**What:** Group devices into "Simulators", "Emulators", "Physical Devices" sections
**When to use:** DeviceSelector component

```typescript
function groupDevices(devices: Device[]) {
  const groups: Record<string, Device[]> = {};
  for (const d of devices) {
    let section: string;
    if (d.deviceType === "Physical") {
      section = "Physical Devices";
    } else if (d.platform === "android") {
      section = "Emulators";
    } else {
      section = "Simulators";
    }
    (groups[section] ??= []).push(d);
  }
  // Order: Physical first, then Simulators, then Emulators
  const ordered: Record<string, Device[]> = {};
  for (const key of ["Physical Devices", "Simulators", "Emulators"]) {
    if (groups[key]?.length) ordered[key] = groups[key];
  }
  return ordered;
}
```

### Anti-Patterns to Avoid

- **Creating separate adapter classes for physical vs simulated:** The user explicitly decided against this. Keep one adapter per platform with internal branching.
- **Parsing devicectl stdout:** The CLI explicitly states stdout is for humans and is unstable across versions. Always use `--json-output <path>`.
- **Assuming devicectl UUIDs match simctl UUIDs:** They are different identifier systems. A device's CoreDevice UUID (the `identifier` field) is NOT the same as its UDID.
- **Checking `devicectl` availability at every operation:** Check once at startup/init and cache the result.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| iOS real device discovery | Custom USB/lockdownd protocol | `xcrun devicectl list devices --json-output` | Complex pairing protocol, Apple handles it |
| iOS app install on device | Custom signing/install pipeline | `xcrun devicectl device install app --device <id> <path>` | Code signing verification is handled by devicectl |
| iOS process management | Custom process listing/killing | `xcrun devicectl device process launch/terminate` | DDI services handle it |
| Android USB device detection | Custom USB enumeration | `adb devices` (already used) | adb handles all transport |
| Device ID format validation | Regex-based ID parsing | Prefix convention (`physical:` for iOS real devices) | Simple, extensible, no brittle parsing |
| Temp file cleanup for JSON output | Manual try/finally everywhere | Dedicated `devicectlJson()` helper with guaranteed cleanup | Prevents temp file leaks |

**Key insight:** Both platforms provide comprehensive CLI tools that handle the device communication protocol. Simvyn should be a thin orchestration layer over these CLIs, not a reimplementation.

## Common Pitfalls

### Pitfall 1: Android `avd:` Guard Blocks Physical Devices
**What goes wrong:** Many Android adapter methods have `if (deviceId.startsWith("avd:")) throw new Error(...)` guards. These correctly prevent operations on shutdown AVDs (which have synthetic `avd:` prefix IDs) but don't affect physical devices. However, some methods use `emu` subcommands that ONLY work on emulators.
**Why it happens:** The guard was written to prevent "device must be booted" errors, but `emu` commands are the actual emulator-only restriction.
**How to avoid:** Audit each method. The `avd:` guard is fine — it catches shutdown AVDs. The real issue is methods that use `adb emu ...` commands (geo fix, emu kill) — these fail on physical devices. Add a physical device guard for emulator-only features.
**Specific operations that use `emu` (emulator-only on Android):**
- `setLocation` — uses `adb emu geo fix` (emulator only)
- `clearLocation` — uses `adb emu geo fix 0 0` (emulator only)
- `shutdown` — uses `adb emu kill` (emulator only; for physical devices, no-op or use `adb reboot -p` if desired)
**Operations that use `adb shell` (work on ALL devices including physical):**
- All app management (pm, am commands)
- Screenshot (screencap)
- Screen recording (screenrecord)
- Clipboard (cmd clipboard, input text)
- Appearance (cmd uimode)
- Media (push + broadcast)
- Permissions (pm grant/revoke)
- Port forwarding (forward/reverse)
- Display (wm size/density)
- Battery (dumpsys battery) — NOTE: `dumpsys battery set/unplug` is simulation, resets on reboot
- Input injection (input tap/swipe/text/keyevent)
- Bug report (bugreport)
- TalkBack (settings put)
**Operations that need root / won't work on non-rooted physical devices:**
- `setLocale` — uses `su 0 setprop` (requires root)

### Pitfall 2: devicectl JSON Output Requires Temp Files
**What goes wrong:** Trying to parse stdout from devicectl commands.
**Why it happens:** Other CLIs (like `simctl list --json`) output JSON to stdout. devicectl does not — stdout is human-readable tables.
**How to avoid:** Always use `--json-output <path>` with a temp file. Create a helper function that manages this.
**Warning signs:** Getting "unexpected token" JSON parse errors, or getting table-formatted output.

### Pitfall 3: devicectl Device Connection State
**What goes wrong:** Trying to interact with a device that's discovered but not connected (tunnel is disconnected).
**Why it happens:** devicectl `list devices` shows ALL known devices, including those that were paired previously but aren't currently connected. The `connectionProperties.tunnelState` can be `"disconnected"`.
**How to avoid:** Filter devices by connection state. Only show devices where the tunnel is active/connected, OR where DDI services are available. The `deviceProperties.ddiServicesAvailable` field indicates whether the device is ready for developer operations.
**Warning signs:** Commands timing out or returning "device not connected" errors.

### Pitfall 4: iOS Real Device Screenshot/Recording Not in devicectl
**What goes wrong:** Looking for screenshot/recording commands in devicectl and not finding them.
**Why it happens:** devicectl (as of version 506.6) does NOT have built-in screenshot or screen recording commands. These capabilities require either `libimobiledevice` tools or the Xcode screenshot/recording APIs.
**How to avoid:** For now, mark screenshot and screen recording as unsupported on iOS physical devices. Or investigate `xcrun xctrace` as an alternative for screenshots.
**Warning signs:** Searching devicectl help for "screenshot" yields nothing.

### Pitfall 5: Collections Skipping on Real Devices
**What goes wrong:** Collections that work on simulators fail or skip steps on real devices without clear feedback.
**Why it happens:** The `isSupported` check in the action registry checks adapter method presence, not device-type compatibility. Methods like `setLocation` exist on the iOS adapter (for simulators) but will fail on physical devices.
**How to avoid:** Enhance the `isSupported` check to also consider the target device type, or make the adapter method itself context-aware (throwing a descriptive error for unsupported device types). For collections, the existing skip mechanism + a "skipped (unsupported on physical device)" badge is sufficient.

### Pitfall 6: devicectl Requires Xcode 15+ and Developer Mode
**What goes wrong:** devicectl not found or device commands fail.
**Why it happens:** devicectl was introduced in Xcode 15. Also, physical devices must have Developer Mode enabled (iOS 16+) and be paired with the Mac.
**How to avoid:** Check for devicectl availability at adapter init. If not available, only register simulator capabilities. Show a diagnostic message in tool settings.

## Code Examples

### Listing iOS Real Devices via devicectl

```typescript
// Source: Verified locally with `xcrun devicectl list devices --json-output`
interface DevicectlListResult {
  devices: Array<{
    identifier: string; // CoreDevice UUID
    hardwareProperties: {
      reality: "physical" | "virtual";
      marketingName: string; // e.g. "iPhone 15"
      platform: string; // e.g. "iOS"
      udid: string;
      deviceType: string; // e.g. "iPhone"
    };
    deviceProperties: {
      name: string; // user-set device name
      osVersionNumber: string; // e.g. "26.3"
      ddiServicesAvailable: boolean;
      developerModeStatus: string;
    };
    connectionProperties: {
      transportType: string; // "localNetwork", "wired"
      tunnelState: string; // "connected", "disconnected"
      pairingState: string; // "paired"
    };
  }>;
}

async function listPhysicalIosDevices(): Promise<Device[]> {
  const result = await devicectlJson<DevicectlListResult>(["list", "devices"]);
  
  return result.devices
    .filter(d => d.hardwareProperties.reality === "physical")
    .filter(d => d.hardwareProperties.platform === "iOS")
    .map(d => ({
      id: `physical:${d.identifier}`,
      name: d.deviceProperties.name,
      platform: "ios" as const,
      state: "booted" as const, // physical devices are always "booted" if visible
      osVersion: `iOS ${d.deviceProperties.osVersionNumber}`,
      deviceType: d.hardwareProperties.marketingName, // "iPhone 15"
      isAvailable: true,
    }));
}
```

### Installing App on iOS Real Device

```typescript
// Source: Verified locally with `xcrun devicectl device install app --help`
async function installAppOnDevice(deviceId: string, appPath: string): Promise<void> {
  const realId = deviceId.replace("physical:", "");
  await verboseExec("xcrun", [
    "devicectl", "device", "install", "app",
    "--device", realId,
    appPath,
    "-q",
  ]);
}
```

### Launching App on iOS Real Device

```typescript
// Source: Verified locally with `xcrun devicectl device process launch --help`
async function launchAppOnDevice(deviceId: string, bundleId: string): Promise<void> {
  const realId = deviceId.replace("physical:", "");
  await verboseExec("xcrun", [
    "devicectl", "device", "process", "launch",
    "--device", realId,
    bundleId,
    "-q",
  ]);
}
```

### Opening URL on iOS Real Device

```typescript
// Source: devicectl process launch supports --payload-url
async function openUrlOnDevice(deviceId: string, url: string): Promise<void> {
  const realId = deviceId.replace("physical:", "");
  // Launch Safari with the URL, or use open command
  // devicectl supports --payload-url on launch, but for arbitrary URLs:
  await verboseExec("xcrun", [
    "devicectl", "device", "process", "launch",
    "--device", realId,
    "com.apple.mobilesafari",
    "--payload-url", url,
    "-q",
  ]);
}
```

### Listing Apps on iOS Real Device

```typescript
// Source: Verified locally with `xcrun devicectl device info apps --help`
async function listAppsOnDevice(deviceId: string): Promise<AppInfo[]> {
  const realId = deviceId.replace("physical:", "");
  interface DevicectlAppsResult {
    apps: Array<{
      bundleIdentifier: string;
      bundleDisplayName?: string;
      bundleName?: string;
      bundleShortVersion?: string;
      bundleVersion?: string;
    }>;
  }
  const result = await devicectlJson<DevicectlAppsResult>([
    "device", "info", "apps",
    "--device", realId,
    "--include-removable-apps",
  ]);
  
  return (result.apps ?? []).map(app => ({
    bundleId: app.bundleIdentifier,
    name: app.bundleDisplayName ?? app.bundleName ?? app.bundleIdentifier,
    version: app.bundleShortVersion ?? app.bundleVersion ?? "unknown",
    type: "user" as const,
  }));
}
```

### Android Physical Device Guard Pattern

```typescript
// Utility to check if an Android device ID is a physical device
function isAndroidPhysical(deviceId: string): boolean {
  return !deviceId.startsWith("emulator-") && !deviceId.startsWith("avd:");
}

function isAndroidEmulatorRunning(deviceId: string): boolean {
  return deviceId.startsWith("emulator-");
}

// In setLocation — uses `emu geo fix` which only works on emulators
async setLocation(deviceId: string, lat: number, lon: number): Promise<void> {
  if (deviceId.startsWith("avd:")) throw new Error("Device must be booted");
  if (isAndroidPhysical(deviceId)) {
    throw new Error("Location simulation is not available on physical Android devices");
  }
  await verboseExec("adb", ["-s", deviceId, "emu", "geo", "fix", String(lon), String(lat)]);
}
```

### Disconnect Detection Pattern

```typescript
// In the polling loop, detect devices that disappeared
async function poll(): Promise<Device[]> {
  const results = await Promise.all(adapters.map(a => a.listDevices()));
  const allDevices = sortDevices(results.flat());
  const fp = devicesFingerprint(allDevices);

  if (fp !== lastFingerprint) {
    // Detect disconnections for toast notifications
    const currentIds = new Set(allDevices.map(d => d.id));
    const disconnected = currentDevices.filter(d => 
      d.deviceType === "Physical" && !currentIds.has(d.id)
    );
    
    lastFingerprint = fp;
    currentDevices = allDevices;
    
    emitter.emit("devices-changed", allDevices);
    if (disconnected.length > 0) {
      emitter.emit("devices-disconnected", disconnected);
    }
  }
  return allDevices;
}
```

## iOS Real Device Feature Matrix

Based on devicectl capabilities verified locally:

| Feature | devicectl Command | Supported | Notes |
|---------|------------------|-----------|-------|
| **Device Discovery** | `list devices` | YES | JSON output with hardware/connection details |
| **Install App** | `device install app` | YES | Requires signed .app bundle |
| **Uninstall App** | `device uninstall app` | YES | By bundle ID |
| **Launch App** | `device process launch` | YES | Supports env vars, URL payload |
| **Terminate App** | `device process terminate` | YES | By PID (need to find PID first) |
| **List Apps** | `device info apps` | YES | Filterable, includes system apps |
| **List Processes** | `device info processes` | YES | Running processes with PIDs |
| **Device Details** | `device info details` | YES | Full hardware/software info |
| **File Copy To** | `device copy to` | YES | Domain-scoped (appDataContainer, temporary) |
| **File Copy From** | `device copy from` | YES | Domain-scoped |
| **File Listing** | `device info files` | YES | Domain-scoped (appDataContainer, systemCrashLogs) |
| **Reboot** | `device reboot` | YES | Full or userspace reboot |
| **Sysdiagnose** | `device sysdiagnose` | YES | Alternative to simctl diagnose |
| **Screenshot** | N/A | NO | Not available in devicectl |
| **Screen Recording** | N/A | NO | Not available in devicectl |
| **Set Location** | N/A | NO | Hardware GPS, no simulation |
| **Clipboard** | N/A | NO | No clipboard commands |
| **Appearance** | N/A | NO | No UI settings commands |
| **Status Bar** | N/A | NO | No status bar commands |
| **Deep Links** | `device process launch --payload-url` | PARTIAL | Opens URL in specific app during launch |
| **Notifications** | `device notification post/observe` | DARWIN ONLY | Darwin notifications, not push/user notifications |
| **Orientation** | `device orientation set/get` | MAYBE | "for devices that support it" — worth testing |

## Android Real Device Feature Matrix

Based on adb command analysis:

| Feature | Command Type | Works on Physical | Notes |
|---------|-------------|-------------------|-------|
| **Device Discovery** | `adb devices` | YES | Already implemented, shows serial |
| **All App Management** | `adb shell pm/am` | YES | Install, uninstall, launch, terminate |
| **Screenshot** | `adb shell screencap` | YES | Same as emulator |
| **Screen Recording** | `adb shell screenrecord` | YES | Same as emulator |
| **Clipboard** | `adb shell cmd clipboard` | YES | Android 12+ |
| **Appearance** | `adb shell cmd uimode` | YES | Same as emulator |
| **Media** | `adb push` | YES | Same as emulator |
| **Permissions** | `adb shell pm grant/revoke` | YES | Same as emulator |
| **Port Forwarding** | `adb forward/reverse` | YES | Same as emulator |
| **Display Override** | `adb shell wm` | YES | May need developer options enabled |
| **Battery Simulation** | `adb shell dumpsys battery` | YES | Simulation only, resets on reboot |
| **Input Injection** | `adb shell input` | YES | Same as emulator |
| **Bug Report** | `adb bugreport` | YES | Same as emulator |
| **TalkBack** | `adb shell settings` | YES | Same as emulator |
| **Deep Links** | `adb shell am start` | YES | Same as emulator |
| **Set Location** | `adb emu geo fix` | NO | Emulator-only command |
| **Clear Location** | `adb emu geo fix 0 0` | NO | Emulator-only command |
| **Shutdown** | `adb emu kill` | NO | Emulator-only (could use `adb reboot -p` but risky) |
| **Set Locale** | `adb shell su 0 setprop` | NO | Requires root access |
| **Erase** | N/A | NO | Not available via adb |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `libimobiledevice` / `ideviceinstaller` | `xcrun devicectl` | Xcode 15 (Sept 2023) | Official Apple tool, no third-party deps |
| `instruments` for device interaction | `xcrun devicectl` | Xcode 15 (Sept 2023) | `instruments` deprecated |
| `ios-deploy` for app installation | `xcrun devicectl device install app` | Xcode 15 | No npm dependency needed |

**Deprecated/outdated:**
- `libimobiledevice` tools (`idevicescreenshot`, `ideviceinstaller`): Still work but require separate install. devicectl is the official replacement for most tasks.
- `ios-deploy`: npm package for iOS app deployment. No longer needed with devicectl.
- `instruments` CLI: Fully deprecated, removed from recent Xcode versions.

## Discretion Recommendations

### Battery Info Display
**Recommendation: Include for Android, skip for iOS.**
- Android: `adb shell dumpsys battery` works on all devices and returns level/status. Easy to parse, useful info for physical devices.
- iOS: No devicectl command for battery info. Would require additional tooling. Skip.
- UI: Show battery icon + percentage next to physical device name in device selector, if space permits.

### WiFi Connection
**Recommendation: Include for Android (simple), defer for iOS (complex).**
- Android WiFi: `adb tcpip 5555` then `adb connect <ip>:5555`. Two commands, well-documented, reliable.
- iOS WiFi: Devices paired over WiFi already appear in `devicectl list devices` with `transportType: "localNetwork"`. No extra work needed — they'll be discovered automatically if WiFi pairing was done in Xcode/Finder. The existing device on this machine already shows `"transportType": "localNetwork"`.
- **Update:** iOS WiFi is essentially free — already-WiFi-paired devices show up in devicectl automatically. No additional implementation needed.

### Device ID Format for iOS Physical Devices
**Recommendation: Use `physical:` prefix on CoreDevice UUID.**
- CoreDevice UUID: `50C188FA-F830-5408-B59E-A91760B08474`
- Stored as: `physical:50C188FA-F830-5408-B59E-A91760B08474`
- This is unambiguous, simple to check with `startsWith`, and strips cleanly for devicectl commands.
- Alternative considered: using the UDID (`00008120-00141DE83AE3601E`) — but this would be confusable with simctl UDIDs.

### Loading States
**Recommendation: No special loading skeleton for real devices.**
- Real devices appear in the same polling cycle as simulators/emulators. No separate loading state needed.
- If no physical devices are connected, simply don't show the "Physical Devices" section header.

### Error Messages for Real Device Operations
**Recommendation: Use descriptive, actionable error messages.**
- "Location simulation is not available on physical devices (hardware GPS cannot be overridden)"
- "App installation failed — ensure the app is signed with a valid provisioning profile for this device"
- "This device is no longer connected. Please reconnect via USB."
- "Erase is only available for simulators"

## Open Questions

1. **iOS Screenshot on Real Devices**
   - What we know: devicectl does NOT have a screenshot command. `libimobiledevice` has `idevicescreenshot` but isn't installed.
   - What's unclear: Whether there's another Apple CLI that can capture screenshots, or if this must remain unsupported.
   - Recommendation: Mark as unsupported for now. Can add `idevicescreenshot` support as a future enhancement if `libimobiledevice` is detected.

2. **devicectl Process Terminate Requires PID**
   - What we know: `devicectl device process terminate --pid <pid>` works, but requires knowing the PID. `devicectl device info processes` can list them.
   - What's unclear: Whether terminating by bundle ID is possible without first querying the process list.
   - Recommendation: Implement terminate as a two-step: list processes → find by bundle ID → terminate by PID. Wrap in a helper.

3. **devicectl Connection/Tunnel Requirements**
   - What we know: The sample device shows `tunnelState: "disconnected"` but it's a WiFi device. USB devices may have different tunnel state semantics.
   - What's unclear: Whether `tunnelState` must be `"connected"` for commands to work, or if devicectl establishes the tunnel automatically on demand.
   - Recommendation: Try commands on devices regardless of tunnel state. If they fail, catch the error and surface a "device not connected" message. Also test filtering by `ddiServicesAvailable: true`.

4. **Capabilities Endpoint Becoming Device-Aware**
   - What we know: The current capabilities endpoint checks adapter method presence, which is platform-level. Some features (like `setLocation`) exist on the iOS adapter for simulators but shouldn't be reported as available for physical devices.
   - What's unclear: Whether to modify the capabilities endpoint to accept device context, or handle this purely in the UI.
   - Recommendation: Modify the capabilities endpoint to also consider `deviceType`. The endpoint already receives `deviceId` — look up the device and check its type.

## Sources

### Primary (HIGH confidence)
- `xcrun devicectl --help` and all subcommand help — verified locally on Xcode 26.2 (devicectl 506.6)
- `xcrun devicectl list devices --json-output` — actual JSON output format from connected iPhone 15
- Existing codebase analysis: `packages/core/src/adapters/android.ts`, `packages/core/src/adapters/ios.ts`, `packages/types/src/device.ts`, `packages/core/src/device-manager.ts`, `packages/dashboard/src/components/DeviceSelector.tsx`, `packages/modules/collections/execution-engine.ts`, `packages/modules/collections/action-registry.ts`, `packages/modules/device-management/routes.ts`, `packages/modules/device-settings/routes.ts`

### Secondary (MEDIUM confidence)
- Analysis of `adb emu` vs `adb shell` command categorization — based on adb documentation and the command patterns in the existing adapter
- devicectl file copy domain-type options — from help text, not tested with actual device

### Tertiary (LOW confidence)
- iOS screenshot alternative approaches (`idevicescreenshot`, `xctrace`) — not verified, based on ecosystem knowledge
- `devicectl device orientation` availability on physical devices — help text says "for devices that support it" but untested

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — devicectl verified locally, adb behavior well-known
- Architecture: HIGH — patterns derived from actual codebase analysis and devicectl JSON format
- Feature matrices: HIGH for what's available, MEDIUM for what's NOT available (negative claims)
- Pitfalls: HIGH — derived from code analysis and tool behavior
- iOS screenshot gap: LOW — couldn't find a solution in official Apple CLIs

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — devicectl API is versioned, adb is mature)
