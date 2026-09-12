# Task recipes

Use these as starting points for an authorized task, choosing only the relevant operations. `simvyn` means the launcher or installed executable resolved in [SKILL.md](../SKILL.md). Choose full IDs from `device list --json`; replace all example device IDs, bundle IDs, paths, and URLs with values from the user's project and target.

## Reproduce a mobile bug and collect evidence

1. Run `simvyn --version` and `simvyn device list --json`. Identify the requested platform, OS, full ID, and whether the device is physical. If an AVD needs booting, boot it and discover its new ID before continuing.
2. Use `simvyn app list <device> --type user` and `simvyn app info <device> <bundle-id>` to identify the installed app. Install the user's build only if the task calls for it; retain the intended app-data state.
3. Start a log stream in a controllable tool session. A process-name regex can narrow noise; the CLI does not offer an app bundle filter:

   ```bash
   simvyn logs <device> --json --level debug --filter 'ExampleApp|checkout'
   ```

4. Launch the app or open the repro URL. For Android, `input tap`, `swipe`, `text`, and `keyevent` can reproduce coordinate-based actions. For iOS, the current CLI lacks input injection; use an available, authorized interaction tool or the user-driven simulator interaction. Do not fabricate a `simvyn tap` command.
5. Capture a screenshot with an explicit path and inspect it with the agent's image tool. Where supported, collect crashes or a bug report if logs/screenshot do not answer the diagnosis. Stop the owned log session with SIGINT and retain the captured output.
6. Report the actual app/device versions, reproduction steps, observed behavior, and evidence paths. Distinguish a failed app action from a failed capture or unsupported device feature.

Use the physical iOS limits in [platforms.md](platforms.md): that workflow cannot promise Simvyn log streaming, screenshots, or recordings on an iPhone.

## Capture light/dark or accessibility screenshots

For a booted iOS simulator or supported Android device, set the chosen device and output directory:

```bash
simvynDevice='<full-device-id>'
simvynOutput='./artifacts/simvyn'
mkdir -p "$simvynOutput"
simvyn settings dark-mode "$simvynDevice" off
simvyn screenshot "$simvynDevice" --output "$simvynOutput/light.png"
simvyn settings dark-mode "$simvynDevice" on
simvyn screenshot "$simvynDevice" --output "$simvynOutput/dark.png"
```

Ensure the intended app screen has rendered after each setting change before capturing; command completion is not a visual readiness assertion. Inspect both images. For iOS simulator marketing captures, optionally apply the status-bar overrides in [cli.md](cli.md); clear them afterward only if the task called for a temporary override and there were no prior overrides to preserve.

To check Dynamic Type/font scaling, choose `a11y content-size <device> accessibility-extra-large` and inspect clipping, overlap, and reachable controls. This is a visual check, not proof of accessibility compliance. Restore the prior appearance and content-size values, rather than always imposing light mode/large text afterward. The CLI does not provide general settings getters; use known prior values or the dashboard's available state before changing settings.

## Connect an Android app to a local development server

If the app calls port 8081 on its own device loopback and the dev server runs on host port 8081:

```bash
simvyn reverse list <android-device>
simvyn reverse add <android-device> tcp:8081 tcp:8081
simvyn app launch <android-device> <package-name>
```

Verify the app reaches the running server. Remove the mapping with `reverse remove <android-device> tcp:8081` when the temporary task ends, unless it predated the task or the user wants it retained. If the host instead needs to reach a service on device port 3000 via host port 8080, use `forward add <device> tcp:8080 tcp:3000`.

No iOS forwarding implementation exists in Simvyn. Server bind address, app network security policy, and a running development server remain separate prerequisites; port mapping does not configure them.

## Test location and a push-driven deep link

Use an iOS simulator for the combined workflow, or an Android emulator for GPS alone. Location commands can use the discovered full ID:

```bash
simvyn location set <simulator-or-emulator> 37.7749 -122.4194
simvyn location route <simulator-or-emulator> ./fixtures/walk.gpx --speed 1.4
```

Route playback lasts for the route distance divided by speed; stop the owned session with SIGINT when finished. Clearing on Android sets coordinates to `0,0`. The tested app must have its relevant location permissions and actually read the simulated feed.

For an iOS simulator push test, save the payload to a project fixture:

```json
{
	"aps": {
		"alert": { "title": "Order ready", "body": "Open order 123" },
		"sound": "default"
	},
	"orderId": "123"
}
```

```bash
simvyn push <ios-simulator> --bundle <bundle-id> --file ./fixtures/order-ready.json
simvyn link <ios-simulator> 'exampleapp://orders/123'
```

These are separate tests. Opening the link verifies direct routing; it does not prove that tapping the delivered notification routes correctly. Test notification interaction separately with the available interaction surface. Payload keys beyond `aps` must match the app's implementation.

## Inspect app data while diagnosing a state bug

```bash
simvyn fs ls <device> <bundle-id>
simvyn db list <device> <bundle-id>
simvyn db query <device> <bundle-id> <path-from-db-list> "SELECT name FROM sqlite_master WHERE type = 'table' LIMIT 50"
simvyn db prefs <device> <bundle-id>
```

Use a simpler shell quoting form if preferred, or pass SQL as a discrete argument from a process API. For the actual table, inspect its schema and use a bounded query such as `SELECT * FROM orders LIMIT 20`. Do not guess a database location, convert the read-only query into a write attempt, or assume a release Android app supports `run-as`.

For a file artifact, `fs pull <device> <bundle-id> <remote-path> <explicit-local-path>` saves the file. A live SQLite main-file copy may omit committed WAL data; use the consistent-snapshot guidance in [platforms.md](platforms.md) when interpreting results.

## Apply an existing workflow to multiple devices

```bash
simvyn collections list
simvyn collections show <collection-id>
simvyn device list --json
simvyn collections apply <collection-id> <first-full-id> <second-full-id>
```

Inspect steps and all targets first. The engine runs steps in order, with selected devices executing each step concurrently. A failure or unsupported action can be recorded without stopping the remaining workflow. Read every per-device status and the final counts; a completed run does not guarantee every requested action succeeded.

For a new collection, `collections create` only creates an empty record. Configure steps in the dashboard. Current collection actions cover operations such as appearance, locale, location, app launch, screenshots, permissions, and device erase; do not invent app-install, assertions, CLI import/export, or YAML workflow support. See [automation.md](automation.md) before using collections in CI.
