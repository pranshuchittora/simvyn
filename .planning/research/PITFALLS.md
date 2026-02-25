# Pitfalls Research

**Domain:** Mobile device devtool — CLI wrapper + web dashboard + plugin system
**Researched:** 2026-02-26
**Confidence:** HIGH (based on Flipper, Appium, ControlRoom post-mortems + direct Node.js CLI wrapper experience)

## Critical Pitfalls

### Pitfall 1: Hardcoding CLI Output Parsing Against a Single Xcode/SDK Version

**What goes wrong:**
`xcrun simctl list devices -j` and `adb devices -l` change their JSON/text output format across Xcode and Android SDK versions. Projects that parse against one version's output break silently or catastrophically when Apple ships a new Xcode or Google updates platform-tools. ControlRoom (6k stars, simctl wrapper) has open issues about breakage with every major Xcode release (#162 — "not working with Xcode 14.2", #170 — "errors on Xcode 15 beta 5"). Appium's node-simctl had issue #145: "can't get simulator list by command `xcrun simctl list devices -j`" on specific Xcode versions.

**Why it happens:**
Apple and Google treat their CLI tools as internal developer tools, not stable APIs. They change JSON keys, add new fields, modify exit codes, and restructure output without notice or versioning. Developers test against their current Xcode/SDK and ship.

**How to avoid:**
- Parse defensively: use optional chaining, provide fallbacks, never assume a field exists
- Version-detect: run `xcrun simctl --version` / `adb version` at startup and log it; if output format changes, you have the version to debug against
- Use the `-j` (JSON) flag for simctl always — never parse human-readable text output
- For adb, parse structured output formats when available (`adb devices -l` gives more structured data than `adb devices`)
- Write parser tests against captured output from multiple Xcode/SDK versions (store fixtures)
- Design the platform adapter interface so the parser is isolated from business logic — when Apple changes output, you fix one parser, not 16 modules

**Warning signs:**
- Tests only run on one Xcode version
- No output fixtures from prior SDK versions in test suite
- Parsing with exact string matching or rigid regex instead of flexible JSON traversal
- Users reporting "no devices found" after OS/Xcode update

**Phase to address:**
Phase 1 (Foundation) — the platform adapter and device detection layer must be built with version resilience from day one. This cannot be retrofitted.

---

### Pitfall 2: Zombie Child Processes and Leaked File Descriptors

**What goes wrong:**
Spawning CLI processes (`xcrun simctl`, `adb logcat`, `adb shell`) from Node.js and not properly managing their lifecycle leads to zombie processes, leaked file descriptors, and port exhaustion. This is especially dangerous with long-running streaming processes like `adb logcat` or `simctl io` (screen recording). When the user navigates away from a module or closes the browser tab, spawned processes keep running. Over time, the system accumulates dozens of orphaned `adb` and `simctl` processes consuming CPU and memory. Appium explicitly replaced Node.js's built-in `child_process` with their own `teen-process` wrapper (node-simctl issue #5) specifically to handle this.

**Why it happens:**
- `child_process.spawn()` doesn't automatically kill children when the parent exits
- WebSocket disconnect doesn't trigger process cleanup if not explicitly wired
- SIGTERM/SIGINT handlers are forgotten or don't propagate to child process trees
- `adb logcat` and similar streaming commands run forever by default
- On macOS, killing a process doesn't kill its children (no process groups by default)

**How to avoid:**
- Use `{ detached: false }` for all spawned processes (Node.js default, but be explicit)
- Always set up `AbortController` or process group kills (`process.kill(-pid)` on POSIX) for long-running processes
- Implement a process registry: every spawned process is tracked with its purpose, owning module, and target device. On cleanup, kill all registered processes
- Wire WebSocket `close` events to process cleanup for streaming operations
- Implement `process.on('exit')` and `process.on('SIGTERM')` handlers that kill all tracked child processes
- Set timeouts on one-shot commands (Appium's appium-adb had issue #147: "APK install timeout is hardcoded" — hardcoded timeouts are bad, but *no* timeouts are worse)
- For `adb logcat`: use `--pid` flag to scope to a specific app process when possible, reducing output volume

**Warning signs:**
- `ps aux | grep simctl` shows processes from hours ago
- System running slow after extended dashboard use
- "Too many open files" errors
- Log streaming works once but fails on reconnect (previous stream still holding the pipe)

**Phase to address:**
Phase 1 (Foundation) — build the process lifecycle manager as part of the core server, before any module spawns processes. Every module must go through this manager, never spawn directly.

---

### Pitfall 3: Monolithic Module Discovery = Circular Dependencies and Import Ordering Nightmares

**What goes wrong:**
A plugin/module system with 16+ modules and auto-discovery sounds clean in design, but TypeScript monorepos commonly collapse into circular dependency chains when module boundaries aren't enforced. Module A imports a type from Module B which imports a utility from shared which re-exports from Module A. The build succeeds (TypeScript handles circular refs at the type level) but runtime breaks with `undefined` imports or weird initialization ordering bugs. Flipper (Facebook's mobile devtool, 13.5k stars) struggled with this at scale — their plugin system's complexity contributed to React Native dropping it entirely. From the Flipper removal RFC: "longer compilation times, had a slew of gotchas."

**Why it happens:**
- Modules share types (device model, message protocol) and it's tempting to import directly across module boundaries
- Auto-discovery via filesystem scanning creates implicit coupling — module load order is alphabetical, not dependency-ordered
- TypeScript project references and workspace dependencies interact in non-obvious ways
- Developers add "just one quick import" across boundaries under time pressure

**How to avoid:**
- Enforce a strict dependency direction: `core` -> `shared-types` <- `modules`. Modules NEVER import from other modules. Period.
- Put all shared types (Device, Message protocol, ModuleManifest) in a single `@simvyn/types` package. This is the only package every module may depend on.
- Each module exports a manifest object conforming to a strict interface — the core loads modules through this interface, not via direct imports
- Use a module registry pattern: modules register themselves, core orchestrates. No module-to-module communication except through core's event bus
- Lint rule: `eslint-plugin-import` with `no-restricted-paths` to enforce module boundaries at CI time, not just convention
- Consider `turborepo` or `nx` for build orchestration — they understand workspace dependency graphs and will error on circular refs

**Warning signs:**
- TypeScript build takes 30+ seconds on incremental rebuild
- `Cannot access 'X' before initialization` errors at runtime
- Module works in isolation but breaks when loaded alongside other modules
- Developers avoiding putting code in the "right" package because imports are too painful

**Phase to address:**
Phase 1 (Foundation) — the monorepo structure, package boundaries, shared types package, and lint rules must be established before any modules are built. This is architectural — retrofitting module boundaries onto tangled code is a rewrite.

---

### Pitfall 4: The "One WebSocket For Everything" Bottleneck

**What goes wrong:**
Routing all real-time communication through a single WebSocket connection with a discriminated union message type (`{ type: 'log', ... } | { type: 'device-status', ... } | { type: 'screenshot', ... }`) seems elegant but creates a critical bottleneck. Log streaming from `adb logcat` can produce thousands of messages per second. Mixed onto the same connection as device status polls and UI state updates, it saturates the WebSocket, causes backpressure, drops messages, and makes the entire dashboard sluggish. Binary data (screenshots, screen recordings) makes it worse — a 2MB screenshot blocks text messages behind it.

**Why it happens:**
- sim-location's single WebSocket works because it only has one data stream (location updates). Developers assume the pattern scales.
- "We'll optimize later" — but WebSocket architecture is very hard to change after 16 modules are built on top of it
- Mixing binary (screenshots, recordings) and text (JSON messages) on one connection requires framing overhead

**How to avoid:**
- Design for multiple WebSocket channels from the start: one per concern (`/ws/device-status`, `/ws/logs/{deviceId}`, `/ws/module/{moduleName}`)
- Use the HTTP server for request-response patterns (screenshots, file downloads). Only use WebSocket for genuine streaming (logs, device status changes, playback updates)
- Implement per-channel backpressure: if the log channel is overwhelmed, it shouldn't affect device status updates
- For log streaming: implement server-side throttling/buffering — batch log lines into chunks (e.g., every 100ms) rather than sending each line individually
- Binary data (screenshots, recordings) should use HTTP endpoints with progress events, not WebSocket

**Warning signs:**
- Dashboard freezes when log streaming is active
- Device status updates lag behind reality during heavy log output
- Screenshot capture seems to pause everything for a moment
- Client-side message parsing becomes a CPU bottleneck (parsing thousands of JSON messages per second)

**Phase to address:**
Phase 1 (Foundation) — WebSocket architecture must be multi-channel from the start. Retrofitting channel separation onto a single-socket design requires every module to be updated.

---

### Pitfall 5: Cross-Platform "Graceful Degradation" That Never Gets Tested

**What goes wrong:**
The project targets macOS (iOS+Android), Linux (Android-only), and Windows (Android-only). "Graceful degradation when simctl unavailable" is specified, but in practice, the entire codebase is developed and tested on macOS. The first time a Linux user runs `npx simvyn`, they get a crash because:
- `xcrun` is called unconditionally during startup
- File paths use macOS-specific locations (`~/Library/Developer/...`)
- `adb` binary discovery assumes macOS SDK paths
- Filesystem operations use case-sensitive paths that break on case-insensitive Windows NTFS

Appium's appium-adb had issue #44: "Simplify searching for Android SDK binary locations" — SDK binary discovery across platforms is a known hard problem. `ANDROID_HOME` vs `ANDROID_SDK_ROOT` (deprecated), vs platform-specific default paths.

**Why it happens:**
- Developer works on macOS, the happy path works, they ship
- CI runs on macOS/Linux but doesn't exercise the "simctl unavailable" code paths
- `which xcrun` returns an error on Linux, but nobody tested that `catch` block
- Android SDK location varies wildly: `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `~/Library/Android/sdk`, `~/Android/Sdk`, `C:\Users\...\AppData\Local\Android\Sdk`

**How to avoid:**
- Build a `PlatformCapabilities` module that detects available tools at startup and exposes a capability map: `{ simctl: boolean, adb: boolean, xcrun: boolean }`
- Guard every simctl call behind `if (capabilities.simctl)` — not just at the module level, but every CLI invocation
- Abstract SDK binary discovery into a single module that checks: environment variables -> common paths -> `which`/`where` command -> user config
- CI must include a Linux job that verifies the Android-only path works
- For adb path discovery, check: `ANDROID_HOME/platform-tools/adb`, `ANDROID_SDK_ROOT/platform-tools/adb`, common default paths per OS, then `PATH`
- Never hardcode `/` as path separator — use `path.join()` everywhere

**Warning signs:**
- No CI job runs on Linux or Windows
- Tests mock `child_process.execFile` instead of actually testing platform detection
- The "simctl not found" error message is the default Node.js `ENOENT` rather than a helpful guide
- `process.platform` checks scattered throughout the codebase instead of centralized

**Phase to address:**
Phase 1 (Foundation) — platform detection and capability system must be built first. Phase 2 should add CI jobs for Linux. Windows support can be later but the abstractions must be there from day one.

---

### Pitfall 6: Publishing a Monorepo as a Single `npx` Executable

**What goes wrong:**
The project is a TypeScript monorepo with workspace packages, but end users run `npx simvyn`. The gap between "monorepo with 8+ packages during development" and "single installable package for users" is where most monorepo devtools projects fail. Common failures:
- Workspace packages reference each other via `workspace:*` protocol, which doesn't resolve after `npm publish`
- `package.json` `files` field doesn't include built output from workspace dependencies
- `bin` field points to TypeScript source instead of compiled JavaScript
- `npx simvyn` works from the repo (because workspace linking) but fails from npm (because dependencies aren't published)
- Version mismatches between workspace packages after partial publish

**Why it happens:**
- npm workspaces are designed for developing multiple packages, not for bundling them into one distributable
- Developers test by running from the repo root, never from a clean `npx` install
- The "it works on my machine" gap is larger with monorepos because workspace symlinks mask missing dependencies

**How to avoid:**
- Decide early: are workspace packages published individually or bundled? For a devtool like this, **bundle** — users install one package, internal packages are implementation detail
- Use `tsup` or `unbuild` to bundle the server + CLI into a single distributable, resolving workspace imports at build time
- If keeping internal packages, use `"dependencies"` (not `"devDependencies"`) in the main package's `package.json` for workspace packages that must be included
- Test the publish artifact: `npm pack && npm install ./simvyn-0.0.1.tgz && npx simvyn` in CI
- Use `"files"` field in root package.json explicitly — don't rely on `.npmignore`
- For the React dashboard: it must be pre-built and included as static assets in the server package, not served from a Vite dev server

**Warning signs:**
- `npx simvyn` works from the repo but fails with "Cannot find module '@simvyn/core'" from npm
- Dashboard shows blank page when installed via npm (Vite dev server not running)
- `npm pack` produces a 500KB tarball (missing built assets) or a 200MB tarball (included node_modules)

**Phase to address:**
Phase 1 (Foundation) — the build and packaging strategy must be designed alongside the monorepo structure. Test `npm pack` from day one of CI, not after 16 modules are built.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling devices every 2s instead of event-based detection | Simple to implement, no platform-specific listeners | CPU waste, stale data between polls, 16 modules all polling = 16x overhead | MVP only — Phase 2 should add `simctl list devices -j` diffing and `adb track-devices` for push-based updates |
| Single `simctl`/`adb` call per action instead of batching | Simpler code, one command per button click | Each `xcrun simctl` invocation has ~200ms startup overhead. 5 device operations = 1 second of just CLI startup | Always batch where possible — `simctl list` once, not per-device |
| Storing module state as individual JSON files | No database dependency, easy to debug | File system race conditions when multiple modules write concurrently; no atomic transactions; grows unwieldy with many modules | Acceptable permanently — but use file locking (`proper-lockfile`) and atomic writes (write to temp then rename) |
| Inlining platform adapter logic in modules | Faster to write the first module | Every new module re-implements device selection, error handling, platform checks | Never — extract on first use, not later |
| Using `child_process.exec` instead of `execFile` | Simpler API, string commands | Shell injection vulnerability — user-controlled device names or file paths could execute arbitrary commands | Never — always use `execFile` with argument arrays |

## Integration Gotchas

Common mistakes when connecting to `simctl` and `adb`.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `xcrun simctl` | Calling `simctl` directly instead of `xcrun simctl`. On systems with multiple Xcode installations, `simctl` may not be in PATH, but `xcrun` resolves the correct one via `xcode-select` | Always call via `xcrun simctl`. Detect Xcode path via `xcode-select -p` and validate it exists before first use |
| `adb` server | Assuming adb server is running. First `adb devices` call starts the server, which takes 2-3 seconds and prints "daemon starting" to stderr, breaking output parsing | Run `adb start-server` explicitly during initialization. Parse `adb devices` output ignoring the first two lines (header). Check stderr separately from stdout |
| `simctl push` (notifications) | Sending push payload without a running app or with wrong bundle ID gives exit code 164 with unhelpful error message | Validate that the target app is installed and running before attempting push. Map exit codes to human-readable errors (ControlRoom issue #168 — push notification text encoding issues) |
| `adb logcat` | Running `adb logcat` without clearing first gives a flood of historical logs | Use `adb logcat -c` to clear, then `adb logcat -v threadtime` for parseable timestamps. Use `--pid` to filter to specific app when possible |
| `simctl io` (screenshots) | Attempting screenshot on a shutdown simulator silently fails or returns a corrupt file | Check device state is "Booted" before any IO operation. Validate output file exists and has non-zero size after capture |
| `adb` with multiple devices | Calling `adb shell` without `-s <serial>` when multiple devices are connected gives "error: more than one device/emulator" | Always pass `-s <device-serial>` for every adb command. Never rely on default device selection |
| Android SDK path | Using `ANDROID_SDK_ROOT` (deprecated since CLI tools 7.0) or hardcoding `~/Library/Android/sdk` | Check in order: `ANDROID_HOME` -> `ANDROID_SDK_ROOT` -> platform-specific defaults. Validate that `platform-tools/adb` exists at the resolved path |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parsing full `adb logcat` output as individual lines over WebSocket | Dashboard freezes, browser tab uses 500MB+ RAM | Server-side buffering: batch lines into 100ms chunks, implement virtual scrolling on client, cap retained log buffer at 10K lines | >100 log lines/second (normal for a debug Android app) |
| Re-running `simctl list devices -j` for every module that needs device info | 200ms per call × 16 modules = 3.2 seconds of blocking on each poll cycle | Centralized device manager that polls once and shares state via event emitter. Modules subscribe, never call simctl directly | >3 modules polling independently |
| Storing screenshots/recordings in memory before writing to disk | Node.js process OOM crash on large recordings | Stream directly from child process stdout to filesystem using `pipe()`. Serve files from disk, never buffer in memory | Screen recording >30 seconds at full resolution |
| Synchronous `fs.readFileSync` for config/state files | Server blocks on disk I/O, WebSocket messages queue up | Use `fs.promises` (async) for all file operations. The only acceptable sync operation is at startup before the server is listening | >5 concurrent module state reads |
| Running `simctl list` and `adb devices` sequentially | Startup takes 3+ seconds (200ms simctl + 500ms first adb + server startup) | Run platform detection in parallel: `Promise.all([detectiOS(), detectAndroid()])` | Always — this is free performance |

## Security Mistakes

Domain-specific security issues for a local developer tool.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Binding HTTP server to `0.0.0.0` instead of `127.0.0.1` | Any device on the network can control your simulators, read your app data, execute adb commands on your connected devices | Default to `127.0.0.1`. If user explicitly requests network access, require `--host 0.0.0.0` flag and print a warning |
| Passing user input to shell commands via string interpolation | Shell injection: a device name containing `; rm -rf /` could be catastrophic. adb device serials and simctl UDIDs come from the system, but file paths and app bundle IDs may come from user input | Always use `execFile` with argument arrays, never `exec` with string concatenation. Validate all inputs against allowlist patterns |
| Serving the React dashboard without CORS restrictions | If bound to non-localhost, other websites could make requests to the dashboard API via CSRF | Set `Access-Control-Allow-Origin: http://localhost:<port>` explicitly. Only accept WebSocket connections from expected origins |
| File browser module allowing path traversal | User could navigate outside the app sandbox to read system files | Resolve and validate all file paths against the app container root. Reject paths containing `..` after resolution. Use `path.resolve()` and check it starts with the expected prefix |
| No authentication even on localhost | Other local applications or malicious scripts could call the API | Low risk for localhost-only, but consider an optional auth token for `0.0.0.0` mode. At minimum, generate a random token and require it in the URL when network-bound |

## UX Pitfalls

Common user experience mistakes in mobile devtool dashboards.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Not handling "no devices found" gracefully | User sees blank screen, doesn't know if tool is broken or they need to boot a simulator | Show clear empty state: "No devices detected. Boot a simulator in Xcode or connect an Android device." Include a "Refresh" button and link to troubleshooting |
| Requiring Xcode CLI tools without explaining how to install them | `xcrun: error: invalid active developer path` is confusing for users who installed Xcode but not CLI tools | Detect this specific error, show: "Run `xcode-select --install` to set up Xcode Command Line Tools" |
| Module UI loading states that block the entire dashboard | User switches modules and stares at a spinner while one module fetches device data | Each module loads independently. Show module skeleton/placeholder immediately. Device data should come from the central device manager, not per-module fetches |
| Log streaming without search/filter on first release | Users see thousands of lines, can't find what they need, conclude the tool is useless | Ship search + log level filtering in the same release as log streaming. These are not separate features — streaming without filtering is noise |
| Dark mode only with no option to adjust | Some developers work in bright environments, or have visual impairments that make dark frosted glass unreadable | Ship with a dark default but include a contrast/theme toggle from the start. Accessibility is not a follow-up feature |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Device detection:** Often missing handling for "Shutdown" vs "Booted" vs "Creating" states — verify all simctl device states are handled, not just "Booted"
- [ ] **Log streaming:** Often missing reconnection logic when device reboots or adb server restarts — verify logs resume after device restart without manual refresh
- [ ] **Screenshot capture:** Often missing error handling for locked devices or devices still booting — verify screenshot fails gracefully with helpful message
- [ ] **Push notifications:** Often missing payload validation — verify malformed JSON is caught before sending to simctl, not after a cryptic exit code
- [ ] **File browser:** Often missing symlink handling — iOS simulator app containers have symlinks; verify they don't cause infinite recursion or path confusion
- [ ] **Database inspector:** Often missing handling for locked/WAL-mode SQLite databases — verify tool works when app is actively writing to the database
- [ ] **CLI subcommands:** Often missing stdin/stdout piping for scripting — verify `simvyn screenshot --device X` can be piped to `pbcopy` or used in shell scripts
- [ ] **npm package:** Often missing pre-built dashboard assets — verify `npx simvyn` works without Vite/Node dev tooling installed globally

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CLI output parsing breaks on new Xcode | LOW | Add output fixture for new version, fix parser, release patch. Good architecture means this is a one-file change in the platform adapter |
| Zombie processes accumulating | MEDIUM | Add process registry retroactively, audit all `spawn`/`exec` calls. May require adding `AbortController` throughout modules. Ship as breaking change if module API changes |
| Circular dependency chains | HIGH | Requires extracting shared types package, rewriting import paths across all modules, potentially restructuring the monorepo. Can be a multi-day effort with 16 modules |
| Single WebSocket bottleneck | HIGH | Requires new multi-channel WebSocket architecture, updating every module's message handling, and all client-side WebSocket code. Essentially a rewrite of the communication layer |
| Cross-platform crashes on Linux | LOW-MEDIUM | Usually just missing platform guards. Fix the specific crash, but then do a full audit of all CLI invocations for platform guards. Add Linux CI job |
| `npx` install broken | MEDIUM | Requires understanding what's missing (usually built assets or workspace deps). Fix build pipeline, test with `npm pack`. May need to restructure how packages are bundled |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CLI output parsing brittleness | Phase 1 (Foundation) | Parser tests pass against fixtures from 3+ Xcode/SDK versions |
| Zombie child processes | Phase 1 (Foundation) | Process registry exists, all spawned processes tracked, cleanup tested on server shutdown |
| Circular dependencies | Phase 1 (Foundation) | `eslint-plugin-import` `no-restricted-paths` rule enforced in CI; zero cross-module imports |
| WebSocket bottleneck | Phase 1 (Foundation) | Multi-channel WebSocket architecture documented and implemented before first streaming module |
| Cross-platform failures | Phase 1 (Foundation) + Phase 2 (CI) | `PlatformCapabilities` module exists; Linux CI job passes; `xcrun` never called without capability check |
| npm packaging broken | Phase 1 (Foundation) | CI runs `npm pack && npx simvyn --version` on every PR; dashboard pre-built in tarball |
| Shell injection | Phase 1 (Foundation) | Zero uses of `child_process.exec()` in codebase; lint rule enforces `execFile` only |
| Log streaming without filtering | Phase with log module | Search + level filter ship in same PR as log streaming — not a follow-up |
| Device detection edge cases | Phase with device module | Tests cover all `simctl` device states: Shutdown, Booted, Creating, Shutting Down, Erasing |
| File path traversal in file browser | Phase with file browser module | Test that `../../etc/passwd` is rejected; path resolution validated against container root |

## Sources

- **Flipper (facebook/flipper)** — Archived Sep 2025, 13.5k stars. Cautionary tale about plugin-based mobile devtool complexity. React Native removed it in 0.74 due to "longer compilation times, slew of gotchas, apps sometimes had trouble connecting." [github.com/facebook/flipper](https://github.com/facebook/flipper) — HIGH confidence
- **ControlRoom (twostraws/ControlRoom)** — 6k stars simctl GUI wrapper. Issues #162, #170, #156 document Xcode version breakage and simctl API changes. [github.com/twostraws/ControlRoom](https://github.com/twostraws/ControlRoom) — HIGH confidence
- **Appium node-simctl** — Node.js wrapper for simctl. Issue #145 (JSON parsing breakage), #138 (exit code handling), #5 (replaced child_process with teen-process). [github.com/appium/node-simctl](https://github.com/appium/node-simctl) — HIGH confidence
- **Appium appium-adb** — Node.js wrapper for adb. Issue #150 (SDK version breakage), #44 (SDK binary path discovery), #147 (hardcoded timeouts), #175 (adb flag changes). [github.com/appium/appium-adb](https://github.com/appium/appium-adb) — HIGH confidence
- **React Native 0.74 release notes** — Documents Flipper removal rationale. [reactnative.dev/blog/2024/04/22/release-0.74](https://reactnative.dev/blog/2024/04/22/release-0.74) — HIGH confidence
- **"Why you don't need Flipper" (Jamon Holmgren, Infinite Red)** — Post-mortem on Flipper's UX issues. [shift.infinite.red](https://shift.infinite.red/why-you-dont-need-flipper-in-your-react-native-app-and-how-to-get-by-without-it-3af461955109) — MEDIUM confidence
- **npm workspaces documentation** — Official docs on workspace publishing behavior. [docs.npmjs.com/cli/v10/using-npm/workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) — HIGH confidence

---
*Pitfalls research for: Simvyn — Universal Mobile Device Devtool*
*Researched: 2026-02-26*
