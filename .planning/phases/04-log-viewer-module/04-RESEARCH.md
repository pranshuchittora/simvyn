# Phase 4: Log Viewer Module - Research

**Researched:** 2026-02-26
**Domain:** Real-time log streaming from iOS simulators (simctl/log) and Android devices (adb logcat) with server-side batching and WebSocket delivery
**Confidence:** HIGH

## Summary

The log viewer module streams device logs in real-time to both CLI and dashboard clients. iOS uses `xcrun simctl spawn <device> log stream --style ndjson --level debug` which outputs structured JSON-per-line with fields like `messageType`, `eventMessage`, `processImagePath`, `subsystem`, `category`, and `timestamp`. Android uses `adb -s <serial> logcat -v json` (available since API 26 / logcat v3) which outputs ndjson with fields like `priority`, `tag`, `message`, `pid`, and `tid`. Both commands are long-running child processes that emit data on stdout until killed.

The key architectural challenge is **server-side batching** (LOG-07): a verbose device can emit hundreds of log lines per second. Sending each line as an individual WebSocket message would flood the connection and degrade other module traffic. The solution is a per-device log buffer that flushes on a timer (e.g., every 100-200ms), batching accumulated lines into a single WS message. The existing `ProcessManager.spawn()` in `@simvyn/core` handles child process lifecycle and cleanup, and the `WsBroker` handles per-client subscription-based delivery — both are ready to use.

The module follows the established module manifest contract: Fastify plugin for REST routes (export endpoint), WS channel handler (`logs`) for streaming, CLI subcommand (`simvyn logs`), and dashboard panel registration. No new external dependencies are needed — ndjson parsing is just `JSON.parse()` per line, and the existing process management handles spawn/kill.

**Primary recommendation:** Use ndjson output format for both platforms (iOS `--style ndjson`, Android `logcat -v json`), normalize into a common `LogEntry` type, implement a `LogStreamer` class per device that buffers and flushes via timer, and deliver batches through the existing WsBroker subscription system.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOG-01 | Stream iOS simulator logs via `simctl spawn log stream` | Use `xcrun simctl spawn <udid> log stream --style ndjson --level debug` — produces structured JSON per line. Process spawned via `ProcessManager.spawn()`. See "iOS Log Streaming" pattern below. |
| LOG-02 | Stream Android device logs via `adb logcat` | Use `adb -s <serial> logcat -v json` for structured output, or fallback to `logcat -v threadtime` with regex parsing for older devices. Spawned via `ProcessManager.spawn()`. |
| LOG-03 | Filter logs by level with color coding | Normalize both platform log levels to unified enum: `verbose`, `debug`, `info`, `warning`, `error`, `fatal`. iOS maps `messageType` field; Android maps `priority` field. Color coding is dashboard-side CSS. |
| LOG-04 | Search/filter by text pattern with regex | Client-side filtering on the accumulated log buffer. `new RegExp(pattern)` with try/catch for invalid regex. Apply to both `message` and `processName` fields. |
| LOG-05 | Filter by process/app name | iOS ndjson includes `processImagePath` (extract basename) and `process` predicate. Android logcat includes `tag` and PID. Normalize to `processName` field in `LogEntry`. |
| LOG-06 | Export logs to file (plain text or JSON) | REST endpoint `GET /api/modules/logs/export/:deviceId?format=json|text` serves the server-side log buffer. Dashboard triggers download via fetch + blob URL. CLI can pipe stdout to file. |
| LOG-07 | Server-side log batching to prevent WS flooding | `LogStreamer` class accumulates parsed entries in an array, flushes every 100-200ms via `setInterval`. Single WS message per flush with `{entries: LogEntry[]}` payload. |
| LOG-08 | CLI subcommand: `simvyn logs <device> [--level <level>] [--filter <pattern>]` | Headless CLI spawns its own adapter + process, streams to stdout with ANSI color per level. No server required. Pattern follows existing CLI module pattern in location/app-management. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process.spawn` | built-in | Long-running log stream processes | Already used via `ProcessManager` in @simvyn/core |
| Node.js `readline` | built-in | Line-by-line parsing of ndjson stdout | Standard approach for streaming line-delimited output from child processes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chalk` | already in project deps | ANSI color coding for CLI log output | CLI `simvyn logs` command for terminal color by log level |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `readline` for line splitting | Manual buffer + `\n` split on `data` events | `readline` handles partial lines correctly (buffered reads don't always end on `\n`). Use readline's `createInterface`. |
| `--style ndjson` for iOS | `--style default` with regex parsing | ndjson is machine-parseable, stable across macOS versions. Default text format has changed between macOS versions (the research flag concern). ndjson eliminates this problem entirely. |
| `logcat -v json` for Android | `logcat -v threadtime` with regex | json output is structured and reliable. Fallback to threadtime only if device API < 26. |

**Installation:**
```bash
# No new dependencies needed — all built-in Node.js + existing project deps
```

## Architecture Patterns

### Recommended Module Structure
```
packages/modules/log-viewer/
├── manifest.ts         # SimvynModule: register, cli, capabilities
├── package.json        # @simvyn/module-log-viewer
├── tsconfig.json
├── routes.ts           # Fastify routes (export endpoint)
├── ws-handler.ts       # WsBroker channel "logs" registration
└── log-streamer.ts     # LogStreamer class (spawn, parse, buffer, flush)
```

### Pattern 1: LogStreamer — Per-Device Stream Manager
**What:** A class that manages a single device's log stream child process, parses output, buffers entries, and flushes batches to a callback.
**When to use:** Server-side for each active log subscription, CLI-side for headless streaming.

```typescript
// LogStreamer lifecycle:
// 1. spawn child process (simctl spawn / adb logcat)
// 2. pipe stdout through readline for line-by-line ndjson parsing
// 3. parse each line into LogEntry, apply server-side level filter
// 4. accumulate in buffer array
// 5. flush buffer on timer (every 100-200ms) via onFlush callback
// 6. kill child process on stop()

interface LogStreamer {
  start(): void;
  stop(): void;
  readonly deviceId: string;
  readonly isRunning: boolean;
}
```

### Pattern 2: WS Channel with Subscription-Based Streaming
**What:** The `logs` WS channel starts/stops per-device streamers based on client subscribe/unsubscribe messages. Multiple clients can subscribe to the same device's logs.
**When to use:** Dashboard panel subscribes on mount, unsubscribes on unmount or device change.

```typescript
// WS message types for "logs" channel:
// Client → Server:
//   { type: "start-stream", payload: { deviceId, level? } }
//   { type: "stop-stream", payload: { deviceId } }
//
// Server → Client:
//   { type: "log-batch", payload: { deviceId, entries: LogEntry[] } }
//   { type: "stream-started", payload: { deviceId } }
//   { type: "stream-stopped", payload: { deviceId } }
//   { type: "error", payload: { message } }
```

### Pattern 3: Shared LogEntry Type
**What:** Unified log entry type that normalizes iOS and Android log output into a common format.

```typescript
// In @simvyn/types:
type LogLevel = "verbose" | "debug" | "info" | "warning" | "error" | "fatal";

interface LogEntry {
  timestamp: string;     // ISO 8601
  level: LogLevel;
  message: string;
  processName: string;   // basename of process image path (iOS) or tag (Android)
  pid: number;
  subsystem?: string;    // iOS subsystem field
  category?: string;     // iOS category field
  raw?: string;          // original unparsed line (for debugging)
}
```

### Pattern 4: Reference Counting for Shared Streams
**What:** When multiple WS clients subscribe to the same device's logs, maintain a single child process with a reference counter. Only kill the process when the last client unsubscribes.
**When to use:** Prevents spawning duplicate `log stream` / `logcat` processes per device.

```typescript
// StreamRef: { streamer: LogStreamer, clientCount: number }
// On subscribe: if ref exists, increment count; else create streamer
// On unsubscribe: decrement count; if 0, stop and delete
// On client disconnect: decrement all refs for that client
```

### Anti-Patterns to Avoid
- **One WS message per log line:** Sends thousands of tiny messages. Always batch.
- **Unbounded log buffer:** Memory leak if buffer grows indefinitely. Cap at N entries (e.g., 10,000) and evict oldest.
- **exec instead of spawn for log stream:** `exec` buffers all output — impossible for streaming. Must use `spawn` with stdout pipe.
- **Parsing iOS `--style default` text output:** Format varies across macOS versions (the documented research flag). Use `--style ndjson` for stable machine parsing.
- **Global log filter on server:** Filters should be client-side (dashboard) or per-CLI-invocation. Server streams all levels (or a minimum level), clients filter locally for instant filter changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line-by-line stdout parsing | Manual `data` event buffer accumulation with `\n` split | `readline.createInterface({ input: child.stdout })` | Handles partial reads, backpressure, encoding correctly |
| Child process lifecycle | Manual spawn/kill tracking | `ProcessManager` from `@simvyn/core` | Already handles cleanup on SIGTERM/SIGINT/exit, tracks active processes |
| WS message routing | Custom WS message dispatch | `WsBroker.registerChannel("logs", handler)` | Already handles subscribe/unsubscribe, per-client state via WeakMap |
| ANSI color output | Manual escape codes | `chalk` (already in project) or simple ANSI constant map | Consistent, readable, handles NO_COLOR env |

**Key insight:** The existing infrastructure (`ProcessManager`, `WsBroker`, module manifest system) handles 90% of the plumbing. The novel work is: (1) ndjson parsing + normalization per platform, (2) batching timer logic, and (3) reference-counted stream sharing.

## Common Pitfalls

### Pitfall 1: iOS `log stream` Output Varies by macOS Version
**What goes wrong:** The text output format of `log stream --style default` has changed across macOS versions (column order, spacing, field names).
**Why it happens:** Apple updates the `log` utility without backwards compatibility guarantees for text output.
**How to avoid:** Use `--style ndjson` exclusively. The JSON schema has been stable since its introduction. Confirmed working on macOS 26.3 with fields: `messageType`, `eventMessage`, `processImagePath`, `processID`, `subsystem`, `category`, `timestamp`.
**Warning signs:** If a user reports "logs not parsing" on a different macOS version, check if somehow text mode is being used.

### Pitfall 2: iOS log level mapping confusion
**What goes wrong:** iOS uses `messageType` values of `Default`, `Info`, `Debug`, `Error`, `Fault`. There is no explicit `Verbose` or `Warning` in iOS unified logging.
**Why it happens:** iOS unified logging has a different level taxonomy than Android's `V/D/I/W/E/F`.
**How to avoid:** Map iOS levels: `Default` → `info`, `Info` → `info`, `Debug` → `debug`, `Error` → `error`, `Fault` → `fatal`. There's no native iOS `verbose` or `warning`. Activity events can be mapped to `verbose`. Clearly document the mapping.
**Warning signs:** Users expecting to see "warning" level logs from iOS — won't exist natively.

### Pitfall 3: Stdout Partial Line Reads
**What goes wrong:** `child.stdout.on('data')` can split a JSON line across multiple chunks, causing `JSON.parse()` to fail.
**Why it happens:** Node.js streams emit data in arbitrary-sized chunks, not line-by-line.
**How to avoid:** Use `readline.createInterface({ input: child.stdout })` which buffers and emits complete lines.
**Warning signs:** Sporadic JSON parse errors in logs.

### Pitfall 4: Log Buffer Memory Leak
**What goes wrong:** Server accumulates log entries forever, eventually consuming all memory.
**Why it happens:** No eviction policy on the log buffer.
**How to avoid:** Cap the server-side buffer at a fixed size (e.g., 10,000 entries per device). Use a circular buffer or `array.shift()` when exceeding max. The dashboard maintains its own buffer for scroll-back.
**Warning signs:** Server memory growing linearly over time while logs are streaming.

### Pitfall 5: Android `logcat -v json` Not Available
**What goes wrong:** Older Android devices (API < 26) don't support `-v json` format.
**Why it happens:** JSON logcat output was added in Android 8.0 (API 26).
**How to avoid:** Try `-v json` first, detect failure (logcat exits immediately or outputs error), fall back to `-v threadtime` format with regex parsing. The threadtime format is: `MM-DD HH:MM:SS.mmm  PID  TID LEVEL TAG: MESSAGE`.
**Warning signs:** Empty log output on older emulator images.

### Pitfall 6: Zombie Processes on Client Disconnect
**What goes wrong:** Client disconnects (browser tab closed) but log streaming child process keeps running.
**Why it happens:** No cleanup hook on WS client disconnect.
**How to avoid:** `WsBroker` already fires `close` event on socket disconnect. The WS handler must decrement the reference count (or stop the streamer) in the `close` handler. Also, the `ProcessManager` kills all tracked processes on server shutdown.
**Warning signs:** `ps aux | grep "log stream"` shows orphaned processes.

### Pitfall 7: Android AVD Device IDs
**What goes wrong:** Attempting to run `adb logcat` on an `avd:` prefixed device ID (which is a synthetic shutdown-state ID).
**Why it happens:** The Android adapter uses `avd:` prefix for unbooted AVDs.
**How to avoid:** Guard all log commands with `if (deviceId.startsWith("avd:")) throw new Error("Device must be booted")`. Same pattern used in app-management adapter.
**Warning signs:** adb errors about "device not found".

## Code Examples

### iOS Log Streaming with ndjson
```typescript
// Spawn log stream on a simulator
import { createInterface } from "node:readline";

function spawnIosLogStream(
  processManager: ProcessManager,
  deviceId: string,
  level: string = "debug"
): { child: ChildProcess; lines: AsyncIterable<string> } {
  const child = processManager.spawn("xcrun", [
    "simctl", "spawn", deviceId,
    "log", "stream",
    "--style", "ndjson",
    "--level", level,
  ]);

  const rl = createInterface({ input: child.stdout! });
  return { child, lines: rl };
}

// Parse one ndjson line from iOS log stream
function parseIosLogLine(line: string): LogEntry | null {
  try {
    const obj = JSON.parse(line);
    // Skip non-log events (activityCreateEvent, etc.)
    if (obj.eventType !== "logEvent") return null;
    return {
      timestamp: obj.timestamp,
      level: mapIosLevel(obj.messageType),
      message: obj.eventMessage ?? "",
      processName: extractBasename(obj.processImagePath ?? ""),
      pid: obj.processID ?? 0,
      subsystem: obj.subsystem || undefined,
      category: obj.category || undefined,
    };
  } catch {
    return null;
  }
}

function mapIosLevel(messageType: string): LogLevel {
  switch (messageType) {
    case "Debug": return "debug";
    case "Info": return "info";
    case "Default": return "info";
    case "Error": return "error";
    case "Fault": return "fatal";
    default: return "verbose";
  }
}
```

### Android Log Streaming with JSON
```typescript
// Spawn logcat on an Android device
function spawnAndroidLogStream(
  processManager: ProcessManager,
  deviceId: string
): { child: ChildProcess; lines: AsyncIterable<string> } {
  const child = processManager.spawn("adb", [
    "-s", deviceId,
    "logcat",
    "-v", "json",
  ]);

  const rl = createInterface({ input: child.stdout! });
  return { child, lines: rl };
}

// Parse one ndjson line from adb logcat -v json
// Android logcat JSON format:
// {"priority":4,"tag":"ActivityManager","message":"...","pid":1234,"tid":5678}
// Priority: 2=V, 3=D, 4=I, 5=W, 6=E, 7=F (Assert)
function parseAndroidLogLine(line: string): LogEntry | null {
  try {
    const obj = JSON.parse(line);
    return {
      timestamp: new Date().toISOString(), // logcat -v json doesn't always include timestamp
      level: mapAndroidPriority(obj.priority),
      message: obj.message ?? "",
      processName: obj.tag ?? "",
      pid: obj.pid ?? 0,
    };
  } catch {
    return null;
  }
}

function mapAndroidPriority(priority: number): LogLevel {
  switch (priority) {
    case 2: return "verbose";
    case 3: return "debug";
    case 4: return "info";
    case 5: return "warning";
    case 6: return "error";
    case 7: return "fatal";
    default: return "info";
  }
}
```

### Server-Side Batching
```typescript
// Accumulate log entries, flush on timer
const FLUSH_INTERVAL_MS = 150;
const MAX_BUFFER_SIZE = 10_000;

class LogBuffer {
  private entries: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private onFlush: (entries: LogEntry[]) => void;

  constructor(onFlush: (entries: LogEntry[]) => void) {
    this.onFlush = onFlush;
  }

  start() {
    this.timer = setInterval(() => {
      if (this.entries.length > 0) {
        this.onFlush([...this.entries]);
        this.entries = [];
      }
    }, FLUSH_INTERVAL_MS);
  }

  push(entry: LogEntry) {
    this.entries.push(entry);
    // Also maintain a capped history buffer if needed
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Flush remaining
    if (this.entries.length > 0) {
      this.onFlush([...this.entries]);
      this.entries = [];
    }
  }
}
```

### CLI Log Command
```typescript
// Headless CLI — no server, direct spawn
program
  .command("logs <device>")
  .description("Stream device logs")
  .option("--level <level>", "Minimum log level", "info")
  .option("--filter <pattern>", "Filter by text/regex pattern")
  .action(async (deviceId, opts) => {
    const { createAvailableAdapters, createDeviceManager, createProcessManager } = await import("@simvyn/core");
    const adapters = await createAvailableAdapters();
    const dm = createDeviceManager(adapters);
    const pm = createProcessManager();

    const devices = await dm.refresh();
    const target = devices.find(d => d.id === deviceId || d.id.startsWith(deviceId));
    if (!target || target.state !== "booted") { /* error handling */ }

    // Spawn appropriate log stream
    const { child, lines } = target.platform === "ios"
      ? spawnIosLogStream(pm, target.id, opts.level)
      : spawnAndroidLogStream(pm, target.id);

    const filterRe = opts.filter ? new RegExp(opts.filter) : null;

    for await (const line of lines) {
      const entry = target.platform === "ios"
        ? parseIosLogLine(line)
        : parseAndroidLogLine(line);
      if (!entry) continue;
      if (!passesLevelFilter(entry.level, opts.level)) continue;
      if (filterRe && !filterRe.test(entry.message) && !filterRe.test(entry.processName)) continue;

      // Output with color
      console.log(formatLogEntry(entry));
    }
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `simctl spawn <device> log stream --style default` (text parsing) | `--style ndjson` for structured JSON output | macOS 10.15+ / unified logging v2 | Eliminates regex-based parsing, stable across OS versions |
| `adb logcat -v time` (text format) | `adb logcat -v json` (structured JSON) | Android 8.0 / API 26 | Machine-parseable, no regex needed. Fallback to `-v threadtime` for API < 26 |
| `ndjson` style name | `ndjson` (not `json`) for streaming | macOS 12+ added `ndjson` as alias for streaming JSON | `--style json` outputs a JSON array (waits for completion). `--style ndjson` outputs one JSON object per line (streaming). Must use `ndjson`. |

**Deprecated/outdated:**
- `log stream --style json`: This outputs a JSON array which only completes when the stream ends — unusable for real-time. Use `ndjson` instead.
- `adb logcat -v brief`: Old default format, harder to parse than `threadtime` or `json`.

## Open Questions

1. **Android `logcat -v json` timestamp field**
   - What we know: The json format includes priority, tag, message, pid, tid. Timestamp availability varies by Android version.
   - What's unclear: Whether all Android 8+ versions include a timestamp in the JSON output or if we need to add our own.
   - Recommendation: Add server-side timestamp at parse time as fallback. Prefer device timestamp if present.

2. **Maximum practical flush interval**
   - What we know: Too fast (10ms) wastes CPU on small batches. Too slow (1s) makes logs feel laggy.
   - What's unclear: Optimal interval for "feels real-time" without excessive WS messages.
   - Recommendation: Start with 150ms (6-7 flushes/second). This matches typical terminal refresh rates and is well under perceptual latency. Tunable if needed.

3. **Dashboard log buffer size**
   - What we know: Server caps at ~10K entries. Dashboard needs its own buffer for scrollback.
   - What's unclear: How large a buffer can React efficiently render with virtualization.
   - Recommendation: Dashboard stores up to 50K entries in zustand, renders with CSS `overflow-y: auto`. If performance issues arise, add windowed rendering later (Phase 5 concern). Don't over-engineer now.

## Sources

### Primary (HIGH confidence)
- **macOS `log` command man page** — Verified `--style ndjson`, `--level`, `--predicate`, and field names directly on macOS 26.3
- **Live ndjson output capture** — Ran `log stream --style ndjson` on host and confirmed JSON schema: `messageType`, `eventMessage`, `processImagePath`, `processID`, `subsystem`, `category`, `timestamp`, `eventType`
- **`simctl spawn` help** — Confirmed `simctl spawn <device> <executable> [args]` runs a process inside the simulator's context
- **`log help predicates`** — Confirmed predicate fields: `process`, `processIdentifier`, `subsystem`, `category`, `composedMessage`, valid log types: `default`, `release`, `info`, `debug`, `error`, `fault`
- **Existing codebase** — All module patterns (manifest, routes, ws-handler, CLI registration) verified from `packages/modules/location/` and `packages/modules/app-management/`

### Secondary (MEDIUM confidence)
- **Android `adb logcat` documentation** — JSON format (`-v json`) available from logcat v3 / Android 8.0+. Priority levels 2-7 map V/D/I/W/E/F.
- **ProcessManager in @simvyn/core** — spawn/exec/cleanup API verified from source at `packages/core/src/process-manager.ts`

### Tertiary (LOW confidence)
- **Android logcat JSON timestamp field** — Training data suggests timestamp may or may not be included depending on exact Android version. Needs runtime validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No external dependencies needed, all Node.js built-ins + existing project infrastructure
- Architecture: HIGH — Follows established module patterns exactly (manifest, routes, ws-handler, CLI), verified against 3 existing modules
- Pitfalls: HIGH — iOS ndjson format verified live on macOS 26.3, level mapping confirmed from `log help predicates`, partial-line buffering well-understood
- Android specifics: MEDIUM — logcat JSON format from documentation, not live-tested (no booted Android device during research)

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable — OS log utilities change slowly)
