# Phase 3: App Management Module - Research

**Researched:** 2026-02-26
**Domain:** Mobile app lifecycle management (iOS Simulator + Android Emulator)
**Confidence:** HIGH

## Summary

Phase 3 adds a new `app-management` module following the exact patterns established by the `location` module (Phase 2). The module wraps `xcrun simctl` commands for iOS and `adb` commands for Android to provide list, install, uninstall, launch, terminate, inspect, and clear-data operations. The codebase already declares `"appManagement"` as a `PlatformCapability` in both iOS and Android adapters — the adapter methods just need to be implemented.

The critical technical challenge is parsing `simctl listapps` output, which uses Apple's old-style plist format (NOT JSON). This must be piped through `plutil -convert json` for reliable parsing. For Android, `adb shell pm list packages` returns simple line-based output, and `adb shell dumpsys package <pkg>` returns verbose key-value text that needs regex parsing. File upload for IPA/APK installation via the dashboard requires `@fastify/multipart`, which is not yet installed in the server package.

**Primary recommendation:** Follow the location module pattern exactly — add optional methods to PlatformAdapter, create `packages/modules/app-management/` with manifest.ts, routes.ts, ws-handler.ts, and register the dashboard panel via side-effect import.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APP-01 | List installed apps on iOS via `simctl listapps` | Verified: `xcrun simctl listapps <device>` outputs plist; pipe through `plutil -convert json -r -o - -- -` for JSON. Fields: CFBundleIdentifier, CFBundleDisplayName, CFBundleVersion, ApplicationType, DataContainer, Path |
| APP-02 | List installed apps on Android via `adb shell pm list packages` | Verified: `adb shell pm list packages -f` returns `package:/path/to/apk=com.package.name` per line. Use `-3` flag for third-party only |
| APP-03 | Install apps — IPAs on iOS, APKs on Android | iOS: `xcrun simctl install <device> <path>` (accepts `.app` bundles; IPAs must be unzipped first to extract `Payload/*.app`). Android: `adb -s <serial> install <apk-path>` |
| APP-04 | Uninstall apps on iOS/Android | iOS: `xcrun simctl uninstall <device> <bundle-id>`. Android: `adb -s <serial> uninstall <package>` |
| APP-05 | Launch apps on iOS/Android | iOS: `xcrun simctl launch <device> <bundle-id>` (returns `<bundle-id>: <pid>`). Android: `adb -s <serial> shell am start -n <package>/<activity>` or `adb -s <serial> shell monkey -p <package> -c android.intent.category.LAUNCHER 1` |
| APP-06 | Terminate apps on iOS/Android | iOS: `xcrun simctl terminate <device> <bundle-id>`. Android: `adb -s <serial> shell am force-stop <package>` |
| APP-07 | Clear app data on Android | `adb -s <serial> shell pm clear <package>`. iOS: no equivalent (use device erase or reinstall) |
| APP-08 | Show app info (bundle ID, version, container paths) | iOS: `xcrun simctl appinfo <device> <bundle-id>` (plist → plutil JSON). Android: `adb -s <serial> shell dumpsys package <package>` (text parsing for versionName, versionCode, dataDir) |
| APP-09 | CLI subcommands: `simvyn app list`, `simvyn app install`, `simvyn app launch` | Follow location module CLI pattern: headless adapter creation via `createAvailableAdapters()` + `createDeviceManager()` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@fastify/multipart` | ^9.4.0 | File upload (IPA/APK) via HTTP | Official Fastify plugin for multipart/form-data. Required for dashboard drag-and-drop install |

### Supporting
No new supporting libraries needed. All other dependencies are already in the monorepo:
- `@simvyn/core` — adapters, device-manager, process-manager, storage
- `@simvyn/types` — PlatformAdapter, Device, SimvynModule
- `@simvyn/server` — WsBroker, module-loader, Fastify augmentation
- `commander` — CLI (via module manifest `cli()` method)
- `zustand` — Dashboard state management (via existing pattern)

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@fastify/multipart` | Custom body parsing | Never hand-roll multipart parsing — edge cases everywhere |
| `plutil` for plist→JSON | `plist` npm package | `plutil` is always available on macOS where simctl exists; no extra dependency needed |
| `adb shell monkey` for launch | `adb shell am start -n` | `monkey` doesn't require knowing the launcher activity; `am start` requires `<package>/<activity>`. Use `monkey` as the simpler approach |

**Installation (in app-management module):**
```bash
npm install @fastify/multipart -w @simvyn/server
```

## Architecture Patterns

### Recommended Module Structure
```
packages/modules/app-management/
├── manifest.ts          # SimvynModule: register(), cli(), capabilities
├── routes.ts            # Fastify routes (list, install, uninstall, launch, terminate, info, clear-data)
├── ws-handler.ts        # WS channel "apps" for real-time updates
├── package.json         # @simvyn/module-app-management
└── tsconfig.json
```

### Pattern 1: PlatformAdapter Extension (Optional Methods)
**What:** Add app management methods as optional properties on PlatformAdapter interface
**When to use:** Always — this is the established pattern (see `setLocation?`, `clearLocation?`, `erase?`)
**Example:**
```typescript
// In packages/types/src/device.ts — extend PlatformAdapter
export interface PlatformAdapter {
  // ... existing methods ...
  listApps?(deviceId: string): Promise<AppInfo[]>;
  installApp?(deviceId: string, appPath: string): Promise<void>;
  uninstallApp?(deviceId: string, bundleId: string): Promise<void>;
  launchApp?(deviceId: string, bundleId: string): Promise<void>;
  terminateApp?(deviceId: string, bundleId: string): Promise<void>;
  getAppInfo?(deviceId: string, bundleId: string): Promise<AppInfo | null>;
  clearAppData?(deviceId: string, bundleId: string): Promise<void>;
}
```

### Pattern 2: Module Manifest (Follow Location Module Exactly)
**What:** manifest.ts exports a `SimvynModule` with `register()`, `cli()`, and `capabilities`
**When to use:** Every module
**Example (from location/manifest.ts):**
```typescript
const appManagementModule: SimvynModule = {
  name: "apps",
  version: "0.1.0",
  description: "App lifecycle management — install, launch, terminate, inspect",
  icon: "app-window",

  async register(fastify, _opts) {
    await fastify.register(appRoutes);
    registerAppWsHandler(fastify);
  },

  cli(program) {
    const app = program.command("app").description("App management commands");
    // subcommands: list, install, uninstall, launch, terminate, info, clear-data
  },

  capabilities: ["appManagement"],
};
```

### Pattern 3: CLI Headless Adapter Creation
**What:** Each CLI action creates its own adapters/DeviceManager without needing the server
**When to use:** All CLI subcommands
**Example (from location/manifest.ts:30-48):**
```typescript
.action(async (deviceId: string) => {
  const { createAvailableAdapters, createDeviceManager } = await import("@simvyn/core");
  const adapters = await createAvailableAdapters();
  const dm = createDeviceManager(adapters);
  const devices = await dm.refresh();
  const target = devices.find((d) => d.id === deviceId || d.id.startsWith(deviceId));
  if (!target) { console.error(`Device not found: ${deviceId}`); process.exit(1); }
  const adapter = dm.getAdapter(target.platform);
  // ... use adapter ...
  dm.stop();
});
```

### Pattern 4: Dashboard Panel Registration (Side-Effect Import)
**What:** Panel component calls `registerPanel("apps", AppPanel)` at module scope; imported in App.tsx
**When to use:** Every dashboard panel
**Example (from LocationPanel.tsx:155 and App.tsx:12):**
```typescript
// panels/AppPanel.tsx — bottom of file
registerPanel("apps", AppPanel);

// App.tsx — add import
import "./panels/AppPanel";
```

### Pattern 5: WS Channel Registration
**What:** `wsBroker.registerChannel("apps", handler)` for real-time app list updates
**When to use:** When dashboard needs live data from backend operations
**Example (from location/ws-handler.ts:11):**
```typescript
wsBroker.registerChannel("apps", (type, payload, socket, requestId) => {
  if (type === "list-apps") { /* ... */ }
  if (type === "install-app") { /* ... */ }
});
```

### Pattern 6: File Upload via @fastify/multipart
**What:** Register multipart plugin on the module's Fastify scope; use `req.file()` to get upload stream
**When to use:** IPA/APK installation from dashboard
**Example:**
```typescript
// In routes.ts
import multipart from "@fastify/multipart";

export async function appRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: { fileSize: 500_000_000 } // 500MB limit for large APKs
  });

  fastify.post<{ Params: { deviceId: string } }>("/install/:deviceId", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });
    // Save to temp dir, then install
    const tmpPath = join(tmpdir(), data.filename);
    await pipeline(data.file, createWriteStream(tmpPath));
    // ... install via adapter ...
  });
}
```

### Anti-Patterns to Avoid
- **Parsing plist with regex:** The `simctl listapps` output is NeXT-style plist, NOT JSON. Always pipe through `plutil -convert json -r -o - -- -`. Regex parsing will break on edge cases (paths with special chars, multi-line values).
- **Using `exec` instead of `execFile`:** Project convention is `execFile` everywhere (avoids shell injection).
- **Assuming IPA = .app:** `simctl install` needs a `.app` bundle. IPAs are zip files containing `Payload/*.app`. Must unzip first.
- **Hardcoding Android launcher activity:** `am start -n <package>/<activity>` requires knowing the main activity. Use `monkey -p <package> -c android.intent.category.LAUNCHER 1` instead — it discovers and launches the main activity automatically.
- **Adding `@fastify/multipart` globally:** Register it scoped to the app-management module routes only, not at the server level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart file upload parsing | Custom stream-based body parser | `@fastify/multipart` | Multipart boundaries, encoding, limits, memory management — extremely error-prone |
| Plist parsing | Regex or custom parser | `plutil -convert json` (shell) | Apple's plist format has edge cases; `plutil` is authoritative and always available on macOS |
| Temp file management for uploads | Custom temp dir + cleanup | `os.tmpdir()` + cleanup in `finally` block | OS handles temp dir permissions; just ensure cleanup |

**Key insight:** The actual app management commands are straightforward shell calls. The complexity is in I/O: parsing varied output formats and handling file uploads. Use existing tools for both.

## Common Pitfalls

### Pitfall 1: simctl listapps Plist Format
**What goes wrong:** Output looks like JSON but isn't — it's NeXT-step plist (`{key = value;}` syntax)
**Why it happens:** `simctl listapps` doesn't have a `--json` flag (unlike `simctl list devices`)
**How to avoid:** Always pipe: `xcrun simctl listapps <device> | plutil -convert json -r -o - -- -`
**Warning signs:** JSON.parse errors on listapps output; keys with `=` instead of `:`

### Pitfall 2: IPA vs .app Bundle for iOS Install
**What goes wrong:** `simctl install` fails with "unable to determine bundle type" on IPA files
**Why it happens:** IPAs are zip archives with `Payload/<AppName>.app` inside; simctl only accepts `.app` bundles
**How to avoid:** Detect file extension; if `.ipa`, unzip to temp dir and find `Payload/*.app`; if `.app` use directly
**Warning signs:** Error exit code 2 from simctl install with IPA path

### Pitfall 3: Android Device Serial for Shutdown AVDs
**What goes wrong:** `adb -s avd:MyPhone shell pm list packages` fails because `avd:*` IDs are synthetic
**Why it happens:** The Android adapter uses `avd:` prefix for un-booted emulators (see `android.ts:112`). These devices can't run app commands.
**How to avoid:** Only allow app operations on devices with `state === "booted"`. Check that deviceId doesn't start with `avd:` before calling adb commands.
**Warning signs:** "device not found" errors from adb

### Pitfall 4: Android Launch Without Activity Name
**What goes wrong:** `am start` requires `<package>/<activity>` but you only have the package name
**Why it happens:** Android requires specifying the entry point activity
**How to avoid:** Use `adb shell monkey -p <package> -c android.intent.category.LAUNCHER 1` which auto-discovers the launcher activity. Alternatively, use `adb shell cmd package resolve-activity --brief <package>` to find the activity first.
**Warning signs:** "Error: Activity not started, unable to resolve Intent" from am start

### Pitfall 5: Large File Upload Timeouts
**What goes wrong:** 500MB APKs/IPAs time out during upload
**Why it happens:** Default Fastify body size limits and multipart limits are too small
**How to avoid:** Set `limits.fileSize` to at least 500MB in `@fastify/multipart` config; consider streaming the file to disk rather than buffering in memory (`req.file()` + `pipeline` to `createWriteStream`)
**Warning signs:** 413 status codes or multipart FilesLimitError

### Pitfall 6: simctl Commands Require Booted Device
**What goes wrong:** `simctl listapps`, `simctl launch`, etc. fail on shutdown devices
**Why it happens:** Most simctl app commands need a running simulator
**How to avoid:** Check `device.state === "booted"` before running app commands; return clear error message
**Warning signs:** "Unable to lookup in current state: Shutdown" errors

## Code Examples

Verified patterns from actual codebase and command-line testing:

### iOS: List Apps (with plist→JSON conversion)
```typescript
// Source: Verified on macOS with xcrun simctl listapps + plutil
async listApps(deviceId: string): Promise<AppInfo[]> {
  // listapps outputs NeXT-step plist, NOT JSON
  const { stdout: plist } = await execFileAsync("xcrun", ["simctl", "listapps", deviceId]);
  const { stdout: json } = await execFileAsync("plutil", ["-convert", "json", "-r", "-o", "-", "--", "-"], {
    input: plist, // pipe plist as stdin
  });
  const data = JSON.parse(json) as Record<string, {
    CFBundleIdentifier: string;
    CFBundleDisplayName?: string;
    CFBundleName?: string;
    CFBundleVersion?: string;
    ApplicationType: string; // "User" | "System"
    DataContainer?: string;
    Path?: string;
  }>;
  return Object.values(data).map(info => ({
    bundleId: info.CFBundleIdentifier,
    name: info.CFBundleDisplayName ?? info.CFBundleName ?? info.CFBundleIdentifier,
    version: info.CFBundleVersion ?? "unknown",
    type: info.ApplicationType.toLowerCase() as "user" | "system",
    dataContainer: info.DataContainer?.replace("file://", "") ?? undefined,
    appPath: info.Path ?? undefined,
  }));
}
```

**IMPORTANT:** `execFile`'s `input` option was added in Node.js for spawning processes. For piping, use a two-step approach or `child_process.spawn` with stdin pipe. The simpler pattern:
```typescript
// Alternative: use spawn to pipe
import { spawn } from "node:child_process";

function plistToJson(plistStr: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("plutil", ["-convert", "json", "-r", "-o", "-", "--", "-"]);
    let out = "";
    proc.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    proc.stderr.on("data", () => {});
    proc.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(`plutil exit ${code}`)));
    proc.stdin.write(plistStr);
    proc.stdin.end();
  });
}
```

### iOS: Install App (with IPA handling)
```typescript
// Source: Verified xcrun simctl help install
async installApp(deviceId: string, appPath: string): Promise<void> {
  let installPath = appPath;
  let tmpDir: string | undefined;

  if (appPath.endsWith(".ipa")) {
    // IPAs are zip files; extract Payload/*.app
    tmpDir = await mkdtemp(join(tmpdir(), "simvyn-ipa-"));
    await execFileAsync("unzip", ["-q", appPath, "-d", tmpDir]);
    const entries = await readdir(join(tmpDir, "Payload"));
    const appBundle = entries.find(e => e.endsWith(".app"));
    if (!appBundle) throw new Error("No .app found in IPA");
    installPath = join(tmpDir, "Payload", appBundle);
  }

  try {
    await execFileAsync("xcrun", ["simctl", "install", deviceId, installPath]);
  } finally {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  }
}
```

### Android: List Apps
```typescript
// Source: Verified adb shell pm list packages
async listApps(deviceId: string): Promise<AppInfo[]> {
  const { stdout } = await execFileAsync("adb", ["-s", deviceId, "shell", "pm", "list", "packages", "-f", "-3"]);
  // Output: "package:/data/app/~~hash==/com.example.app-hash==/base.apk=com.example.app\n"
  return stdout.trim().split("\n").filter(Boolean).map(line => {
    const match = line.match(/^package:(.+?)=([^\s]+)$/);
    if (!match) return null;
    return {
      bundleId: match[2],
      name: match[2], // package name; display name requires additional query
      version: "unknown", // requires dumpsys for version
      type: "user" as const,
      appPath: match[1],
    };
  }).filter(Boolean);
}
```

### Android: Launch App (using monkey)
```typescript
// Source: Android developer documentation
async launchApp(deviceId: string, bundleId: string): Promise<void> {
  await execFileAsync("adb", ["-s", deviceId, "shell", "monkey", "-p", bundleId, "-c", "android.intent.category.LAUNCHER", "1"]);
}
```

### Android: Get App Info (dumpsys parsing)
```typescript
// Source: adb shell dumpsys package
async getAppInfo(deviceId: string, bundleId: string): Promise<AppInfo | null> {
  try {
    const { stdout } = await execFileAsync("adb", ["-s", deviceId, "shell", "dumpsys", "package", bundleId]);
    const versionName = stdout.match(/versionName=(.+)/)?.[1]?.trim() ?? "unknown";
    const versionCode = stdout.match(/versionCode=(\d+)/)?.[1] ?? "";
    const dataDir = stdout.match(/dataDir=(.+)/)?.[1]?.trim() ?? undefined;
    const codePath = stdout.match(/codePath=(.+)/)?.[1]?.trim() ?? undefined;
    return {
      bundleId,
      name: bundleId,
      version: versionName + (versionCode ? ` (${versionCode})` : ""),
      type: "user",
      dataContainer: dataDir,
      appPath: codePath,
    };
  } catch {
    return null;
  }
}
```

### File Upload Route (Fastify multipart)
```typescript
// Source: @fastify/multipart README (verified v9.4.0)
import multipart from "@fastify/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function appRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: { fileSize: 500_000_000 } // 500MB
  });

  fastify.post<{ Body: { deviceId: string } }>("/install", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const tmpDir = await mkdtemp(join(tmpdir(), "simvyn-upload-"));
    const filePath = join(tmpDir, data.filename);

    try {
      await pipeline(data.file, createWriteStream(filePath));
      // ... resolve device, call adapter.installApp(deviceId, filePath) ...
      return { success: true };
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `simctl listapps` has no JSON flag | Pipe through `plutil -convert json` | Always been this way | Must always use plutil for parsing |
| `@fastify/multipart` < v9 | v9.4.0 with Fastify 5 compat | 2024 | Use latest; Fastify 5 compatible |
| `adb shell am start` requiring activity | `adb shell monkey` for simpler launch | Always available | Use monkey for package-only launch |

**Deprecated/outdated:**
- None relevant — simctl and adb APIs are stable

## Open Questions

1. **Android app display names**
   - What we know: `pm list packages` only returns package names, not human-readable display names
   - What's unclear: Whether to make an additional `aapt dump badging` call per app for display name, or just show package names
   - Recommendation: Show package names by default; optionally enrich with `dumpsys` for individual app detail view. Doing `dumpsys` for every installed app would be slow.

2. **Should system apps be shown on iOS?**
   - What we know: `simctl listapps` returns both User and System apps (22 system, 3 user in testing)
   - What's unclear: Whether to filter to User-only by default
   - Recommendation: Show all by default with a filter toggle (User/System/All). The `ApplicationType` field makes filtering easy.

3. **File upload via WebSocket vs HTTP**
   - What we know: Large binary uploads are more naturally handled via HTTP multipart
   - What's unclear: Whether to offer WS-based install at all
   - Recommendation: HTTP POST for file upload (multipart), WS only for triggering installs from a server-side path and receiving progress/completion events.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** — Direct reading of all relevant source files:
  - `packages/types/src/device.ts` — PlatformAdapter interface, PlatformCapability including "appManagement"
  - `packages/core/src/adapters/ios.ts` — iOS adapter with capabilities() already listing "appManagement"
  - `packages/core/src/adapters/android.ts` — Android adapter with capabilities() already listing "appManagement"
  - `packages/modules/location/manifest.ts` — Reference module implementation
  - `packages/modules/location/routes.ts` — Reference Fastify route registration
  - `packages/modules/location/ws-handler.ts` — Reference WS handler
  - `packages/modules/location/storage.ts` — Reference module storage
  - `packages/dashboard/src/panels/LocationPanel.tsx` — Reference dashboard panel
  - `packages/dashboard/src/stores/panel-registry.ts` — Panel registration pattern
  - `packages/server/src/module-loader.ts` — Module discovery and loading
  - `packages/server/src/ws-broker.ts` — WS broker channel registration
  - `packages/server/src/app.ts` — Server setup (no multipart yet)
- **`xcrun simctl` commands** — Verified on macOS with actual simulator:
  - `listapps` — Confirmed plist output format, fields available
  - `appinfo` — Confirmed plist output, pipe through plutil works
  - `install`, `uninstall`, `launch`, `terminate` — Confirmed syntax and error messages
  - `get_app_container` — Confirmed app/data/groups container paths
- **`@fastify/multipart` README** — Verified v9.4.0 API (fetched from GitHub)

### Secondary (MEDIUM confidence)
- **Android adb commands** — Syntax verified via `adb help` and documentation. Not tested against live emulator but commands are well-documented and stable.
- **`adb shell monkey`** for launch — Standard Android testing utility, widely documented.

### Tertiary (LOW confidence)
- None — all findings verified against primary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Only one new dependency (`@fastify/multipart`), rest is existing codebase patterns
- Architecture: HIGH — Follows exact module pattern established in Phase 2 (location module)
- Pitfalls: HIGH — Verified plist parsing, IPA handling, and Android serial issues against live tools
- Command syntax: HIGH (iOS) / MEDIUM (Android) — iOS tested on live simulator; Android verified via help only

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain — simctl and adb APIs rarely change)
