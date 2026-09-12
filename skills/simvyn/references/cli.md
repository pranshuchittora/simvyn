# CLI commands

Use the launcher described in [SKILL.md](../SKILL.md), or an existing `simvyn` executable. The commands below are the implemented CLI surface; `<...>` marks a required argument and `[...]` an optional one. Replace placeholders before execution. Quote paths, names, SQL, text, and URLs containing shell punctuation. Consult `simvyn <command> --help` when needed.

## Discovery and dashboard

| Command                                               | Behavior and constraints                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `simvyn --version`                                    | Installed CLI version; lowercase `-v` means verbose, not version.                                                             |
| `simvyn --help`                                       | Lists top-level commands without starting a server.                                                                           |
| `simvyn device list --json`                           | JSON array with `id`, `name`, `platform`, `state`, `osVersion`, `deviceType`, `isAvailable`. No per-device capability object. |
| `simvyn device list --platform ios`                   | Human-readable list; platform filter accepts `ios` or `android`. Can combine with `--json`.                                   |
| `simvyn start --no-open`                              | Starts the local dashboard server without opening a browser. Default address `127.0.0.1:3847`.                                |
| `simvyn start --port 3848 --host 127.0.0.1 --no-open` | Explicit server address. Headless device commands do not require this server.                                                 |

`--verbose` logs underlying commands and can reveal supplied payloads; enable it for relevant troubleshooting. `upgrade` installs the latest global npm package and is a software update action, not a diagnostic command.

## Device lifecycle

Use full IDs. Core `device` commands require exact IDs, even though several module commands accept prefixes.

| Command                                                  | Notes                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `simvyn device boot <id>`                                | Boots a simulator/AVD and polls for up to 60 seconds. Rediscover Android ID afterward. |
| `simvyn device shutdown <id>`                            | Stops a simulator/emulator; physical-device behavior differs.                          |
| `simvyn device create <name> <deviceTypeId> [runtimeId]` | Creates an iOS simulator. Uses Apple's identifiers, not marketing names.               |
| `simvyn device clone <id> <newName>`                     | Clones an iOS simulator.                                                               |
| `simvyn device rename <id> <newName>`                    | Renames an iOS simulator.                                                              |
| `simvyn device erase <id>`                               | Erases iOS simulator contents; shut it down first.                                     |
| `simvyn device delete <id>`                              | Deletes a shut-down iOS simulator.                                                     |
| `simvyn device favourite <id>` / `unfavourite <id>`      | Changes local favorites.                                                               |
| `simvyn device favourites`                               | Lists favorites; human-readable output.                                                |

The current type/runtime listing switches live under `device create`, which still requires its two positional arguments. These are read-only listing invocations; the dummy arguments are not used for creation:

```bash
simvyn device create unused unused --list-types
simvyn device create unused unused --list-runtimes
```

## Apps, links, media, and clipboard

| Command                                      | Notes                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| `simvyn app list <device> --type user`       | Lists apps; `--type` is `user`, `system`, or `all` (default). Human-readable table. |
| `simvyn app info <device> <bundle-id>`       | Prints version/type and available container information.                            |
| `simvyn app install <device> <path>`         | Install a compatible `.apk`, `.app`, or `.ipa`; see platform restrictions.          |
| `simvyn app launch <device> <bundle-id>`     | Launches the identified app.                                                        |
| `simvyn app terminate <device> <bundle-id>`  | Terminates the app.                                                                 |
| `simvyn app uninstall <device> <bundle-id>`  | Uninstalls the app and can remove its data.                                         |
| `simvyn app clear-data <device> <bundle-id>` | Deletes app data on iOS simulators or Android; unsupported on physical iOS.         |
| `simvyn link <device> <url>`                 | Opens a URL or registered scheme; there is no `deep-link` subcommand.               |
| `simvyn media add <device> <file>`           | Adds one photo/video to the simulator or Android gallery.                           |
| `simvyn clipboard get <device>`              | Reads iOS simulator clipboard; Android read is unimplemented.                       |
| `simvyn clipboard set <device> <text>`       | iOS simulator write; Android can fall back to typing into the focused field.        |

## Evidence and diagnostics

| Command                                                      | Notes                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simvyn screenshot <device> --output <path.png>`             | Writes image and prints its path. Create parent directory first.                                                                                                                                                                                    |
| `simvyn record <device> --output <path.mp4>`                 | Long-running; stop with SIGINT/Ctrl+C to finalize and retrieve video. No duration option.                                                                                                                                                           |
| `simvyn logs <device> --json --level debug --filter <regex>` | Streaming JSON lines. `--level` is an inclusive minimum: `verbose`, `debug`, `info`, `warning`, `error`, `fatal`; default `info`. `warning` also includes error/fatal. Regex matches message or process name. No `--app`/`--since`/duration option. |
| `simvyn crashes <device> --app <name> --since <ISO-date>`    | Human-readable crash summary. `--app` filters by app/process text.                                                                                                                                                                                  |
| `simvyn crashes <device> --view <log-id>`                    | Displays the identified crash. Summary table does not currently print the ID; use a known ID from the dashboard/report metadata.                                                                                                                    |
| `simvyn bugreport <device> --output <directory>`             | Collects diagnostics and prints result information. Output is a directory, unlike screenshot/record output. Can take minutes.                                                                                                                       |

Use [automation guidance](automation.md) for process lifetimes and interpretation of iOS crash results.

## Location and push

```bash
simvyn location set <device> <latitude> <longitude>
simvyn location route <device> <route.gpx> --speed 10
simvyn location clear <device>
simvyn push <ios-simulator> --bundle <bundle-id> --file <payload.json>
```

Route input accepts GPX/KML; speed is meters per second even though help labels the argument `<ms>`. Use a positive speed. Latitude comes before longitude; use latitude in [-90, 90] and longitude in [-180, 180]. When a negative coordinate is treated as an option, use `location set -- <device> <lat> <lng>` to end option parsing. GPS simulation is unavailable on physical devices. `location clear` resets Android emulator coordinates to `0,0`; it does not restore a physical GPS feed.

For push, `--bundle` is required, plus either `--file` or `--payload '<JSON>'`. Prefer a JSON file for complex payloads. It is simulator injection, not an APNs/FCM delivery service, and is not implemented for Android or physical iOS.

## App files, SQLite, and preferences

```bash
simvyn fs ls <device> <bundle-id> [relative-path]
simvyn fs pull <device> <bundle-id> <remote-path> [local-path]
simvyn fs push <device> <bundle-id> <local-path> <remote-path>
simvyn db list <device> <bundle-id>
simvyn db query <device> <bundle-id> <db-path> '<SQL>'
simvyn db prefs <device> <bundle-id>
```

`fs` paths are relative to the app data container. Pull defaults to the remote basename in the current directory; prefer an explicit destination. For push, the local file precedes the remote destination. For `db query`, use a path from `db list`: iOS also accepts an absolute host path; Android uses the app's device path. CLI queries open SQLite read-only, so use bounded `SELECT` statements and read-only schema queries. `db prefs` prints values and has no CLI editing option. Android sandbox inspection requires a debuggable app. See [platform limitations](platforms.md) before physical-device or live-database work.

## Settings and accessibility

| Command                                                              | Values and scope                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `simvyn settings dark-mode <device> <state>`                         | `on` or `off`.                                                                          |
| `simvyn settings locale <device> <locale>`                           | For example `ja_JP`; iOS requires reboot, Android emulator may restart its framework.   |
| `simvyn settings orientation <device> <orientation>`                 | Android: `portrait`, `landscape-left`, `landscape-right`, `portrait-upside-down`.       |
| `simvyn settings permission <device> grant <permission> <bundle-id>` | iOS simctl permission name or Android permission constant. `revoke` has the same order. |
| `simvyn settings permission <device> reset <bundle-id>`              | iOS simulator; no permission argument here. Android reset is unimplemented.             |
| `simvyn a11y content-size <device> <size>`                           | iOS simulator Dynamic Type / Android font scaling. Use supported named sizes.           |
| `simvyn a11y increase-contrast <device> <state>`                     | `on`/`off`; iOS simulator only.                                                         |
| `simvyn a11y talkback <device> <state>`                              | `on`/`off`; Android with TalkBack installed.                                            |

iOS status-bar options:

```bash
simvyn settings status-bar <device> --time '9:41' --battery-level 100 --battery-state charged --wifi-bars 3 --cellular-bars 4
simvyn settings status-bar <device> --clear
```

Also supported: `--operator <name>`, `--network <type>` (`wifi`, `3g`, `4g`, `lte`, `lte-a`, `lte+`, `5g`, `5g+`, `5g-uwb`). These change appearance, not actual network connectivity or battery state.

## Android development utilities

```bash
simvyn forward add <device> tcp:8080 tcp:3000
simvyn forward list <device>
simvyn forward remove <device> tcp:8080
simvyn reverse add <device> tcp:3000 tcp:8080
simvyn reverse list <device>
simvyn reverse remove <device> tcp:3000
simvyn display size <device> 1080x1920
simvyn display size <device> --reset
simvyn display density <device> 320
simvyn display density <device> --reset
simvyn battery set <device> --level 15 --status 3 --no-ac --no-usb
simvyn battery unplug <device>
simvyn battery reset <device>
simvyn input tap <device> <x> <y>
simvyn input swipe <device> <x1> <y1> <x2> <y2> [durationMs]
simvyn input text <device> '<text>'
simvyn input keyevent <device> <keyCode>
```

Forward arguments are host-local then device-remote; reverse arguments are device-remote then host-local. Battery status codes: 1 unknown, 2 charging, 3 discharging, 4 not charging, 5 full. `--ac`/`--usb` enable their power sources; `--no-ac`/`--no-usb` disable them. Input coordinates are screen pixels; key codes accept numeric or Android key names such as `KEYCODE_BACK`. This is coordinate/key injection, not a semantic UI tree or assertion engine.

## Collections and keychains

```bash
simvyn collections list
simvyn collections show <id>
simvyn collections create '<name>' --description '<description>'
simvyn collections duplicate <id> --name '<new-name>'
simvyn collections delete <id>
simvyn collections apply '<name-or-id>' <device-id> [additional-device-ids...]
simvyn keychain add <ios-simulator> <certificate-file> --root
simvyn keychain reset <ios-simulator>
```

`collections show`, `duplicate`, and `delete` take an ID (prefix accepted), whereas `apply` also accepts an exact collection name, case-insensitively. Creation produces an empty collection. Add/reorder/configure steps in the dashboard; there is currently no CLI step editor or import/export command. Applying a collection can skip unsupported actions and still report completion despite failures; read [automation guidance](automation.md).

`keychain add` without `--root` installs a certificate without the root-certificate mode. Certificate changes affect trust; `keychain reset` resets simulator keychain contents.
