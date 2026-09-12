# Automation, process control, and troubleshooting

## Resolve the executable once

`scripts/simvyn.mjs` finds the CLI relative to the installed skill, independent of the working directory:

1. npm layout: `<package>/dist/index.js` beside `<package>/skills/simvyn/`.
2. Source checkout: `<repo>/packages/cli/dist/index.js` beside `<repo>/skills/simvyn/`.
3. Existing executable named `simvyn` on `PATH`.

It checks the adjacent package manifest identifies `simvyn` (or `simvyn-monorepo` with a `simvyn` CLI workspace) before selecting a bundle. Copying the skill into another project's `.agents/skills` will not cause an unrelated `dist/index.js` to run. It runs a JavaScript bundle with the same Node.js executable as the launcher, preserves the caller's working directory and arguments, and inherits stdin/stdout/stderr. It adds no output on success. Its diagnostics go to stderr. It neither executes `npx` nor downloads/builds a missing CLI. If an existing bundle fails, that failure is returned rather than silently switching versions. Missing CLI yields exit code 127; a recursion guard prevents accidentally invoking the launcher as its own fallback.

For a skill copied without the npm package, install Simvyn separately or use the user's existing executable. For development from a checkout, build using the repository's documented release build before invocation. Do not assume the current working directory is the skill's location, or that a Pi package install made a global `simvyn` binary available.

## Output contracts that actually exist

| Command                                                       | Output usable by automation                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `device list --json`                                          | One JSON array. Inspect `id`, `platform`, `deviceType`, `state`, `isAvailable`, and OS/version fields.                                        |
| `logs <device> --json`                                        | Newline-delimited JSON log entries; streaming announcement goes to stderr. Parse individual lines, not the whole stream as one JSON document. |
| `screenshot <device> --output <file>`                         | Output file path on stdout after capture. Validate the file separately.                                                                       |
| `record <device> --output <file>`                             | Progress/instructions on stderr, output path after SIGINT cleanup.                                                                            |
| Apps, files, database, crashes, collections, device mutations | Human-readable tables/messages; no general `--json` contract.                                                                                 |

There is no global `--json`, `--yes`, `--dry-run`, `--timeout`, `--duration`, `--no-color`, or capability/command-schema command. Do not append these flags speculatively. `NO_COLOR` is honored by human-readable logs, but collection output uses explicit ANSI escapes; it is not a reliable global color switch. stdout/stderr are separate streams: capture them separately when parsing JSON and preserve diagnostics on failure.

Use an argument array with a process API when invoking the CLI from code. Do not interpolate user-provided URLs, text, SQL, or paths into a shell command string. Keep full IDs; module prefix matching can choose the first match and is not consistently ambiguity-safe. Refresh discovery after boot/reconnection rather than caching an Android AVD ID indefinitely.

Android `adb logcat` can emit historical buffered entries before new events. Ten seconds of process runtime is not a ten-second event-time window; correlate entry timestamps with the reproduction. `--level` is a minimum, so `warning` includes error/fatal. The log CLI does not reliably surface the underlying log process's stderr or nonzero exit status. An empty capture followed by exit code 0 does not establish a healthy stream; inspect the target, filter, and underlying command diagnostics when that distinction matters.

## Long-running commands

- `start` keeps a server alive; retain its process handle and stop only the server started for this task.
- `logs` streams until stopped. Keep a live session handle, save the relevant output, and send SIGINT for cleanup when the observation is complete.
- `record` requires SIGINT to finalize and, for Android, pull the video from the device. A hard timeout or SIGKILL can leave no useful local recording.
- `location route` completes after playback or can be stopped with SIGINT. Stopping playback does not automatically restore location; choose a subsequent `location clear` only when appropriate for the task.
- `bugreport` can take minutes. A tool yielding after its observation window does not prove the command has stopped; resume/poll its confirmed process handle.

The launcher forwards SIGINT, SIGTERM, and SIGHUP to the CLI, preserves exit codes, and propagates signal termination. CLI cleanup currently differs by command; for logs, recordings, and routes, prefer SIGINT. An external task timeout should first request graceful shutdown and wait for the final output before deciding to terminate a stuck process. Do not use blanket `killall node`, `pkill adb`, or terminate unrelated device sessions.

Before returning a recording, check that the file exists and has meaningful size and duration if a media inspection tool is available. Before returning a screenshot assessment, open the image. A path printed by the CLI is evidence of a capture request completing, not evidence of the expected UI state.

## Collections are action runners, not test verdicts

The current engine records a failed device/action, continues, and can mark the overall run `completed`. CLI `onComplete` prints success/skipped/failed counts but does not set a failing process exit code solely because steps failed. Thus exit code 0 is insufficient for CI success. Skipped steps can also mean a required check never ran.

Inspect per-step/per-device output and final counts, and verify the outcomes required by the task. If reliable machine-readable CI verdicts are required, report this limitation or use individual supported commands plus explicit artifact/state checks. Do not advertise a JSON report, JUnit output, assertion engine, rollback, or fail-fast flag that is not implemented.

Collection steps have a timeout (30 seconds by default); a timed-out action is not necessarily cancelled at the underlying device-command level. Inspect current device/app state before retrying a side-effecting action. Do not automatically replay an entire partially executed collection; select only the work still needed and already authorized.

## Diagnose by evidence

| Symptom                               | Next useful check                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI not found                         | Confirm a bundled or built `dist/index.js`, or an installed `simvyn` on PATH. Installation/build is separate from discovery.                                          |
| No iOS devices                        | Check macOS, Xcode selection, installed runtimes, and `xcrun simctl list devices`; physical discovery additionally needs devicectl.                                   |
| No Android devices                    | Check `adb devices -l` for unauthorized/offline status, emulator availability, and `emulator -list-avds`.                                                             |
| Device not found after boot           | Rerun `device list --json`; replace `avd:<name>` with the booted emulator serial.                                                                                     |
| Physical iOS ID rejects an operation  | Check [platforms.md](platforms.md). Retain `physical:`; removing it does not add simctl support.                                                                      |
| Android sandbox says “not debuggable” | Confirm the user's intended debug build; do not assume elevated access or replace it with another app.                                                                |
| Locale command appears ineffective    | iOS requires reboot; Android may lack root and may restart its framework. Verify the actual locale after readiness.                                                   |
| Empty log capture                     | Confirm app/process regex, log level, supported device type, and that the stream was running during the reproduction. There is no guaranteed app-specific log filter. |
| Crash result does not match target    | iOS reports come from the host diagnostic directory; correlate process/time and report contents.                                                                      |
| Read-only SQLite error                | `db query` opens read-only. Use inspection queries; do not treat dashboard edit capabilities as CLI write support.                                                    |
| Screenshot/video absent or blank      | Check target support, command diagnostics, explicit output directory, recording finalization, and protected-content behavior.                                         |
| Unknown flag/command                  | Read the installed command's `--help`. This skill documents existing behavior, not a proposed feature roadmap.                                                        |

For an unresolved failure, report the exact command with sensitive values redacted, installed version, device type/OS, exit status, relevant stderr, and what observation remains missing. Avoid repeatedly issuing the same unsupported mutation.
