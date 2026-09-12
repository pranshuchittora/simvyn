# Using simvyn with AI coding agents

The simvyn skill helps a coding agent operate iOS Simulators, Android Emulators, and supported physical devices through the existing CLI. It covers device selection, app operations, screenshots, device settings, sandbox inspection, logs, and saved Collections. No application SDK integration is needed for these commands; individual operations still depend on the device and build type.

This is a portable instruction package with a CLI launcher and detailed references. The agent needs a terminal tool and access to your local developer tools. Installing the skill does not add an MCP server, register new tool APIs, or grant additional permissions.

## Install for Pi

With Pi already installed, use a simvyn npm release that contains `skills/simvyn/`:

```bash
pi install npm:simvyn
pi list
```

Start a new Pi session and invoke:

```text
/skill:simvyn List the available devices and explain which can capture screenshots. Do not change device state.
```

Pi reads the package's declared skill resources. The included launcher finds the CLI inside that installation, so a separate global `simvyn` executable is unnecessary. Use `pi install npm:simvyn@<version>` to select a particular skill-bearing release, replacing `<version>` with its published version. Pi also supports project-scoped installation with `-l`. See the official [Pi package documentation](https://pi.dev/docs/latest/packages) for scope, updates, and removal, and [Pi skills documentation](https://pi.dev/docs/latest/skills) for loading skills.

The npm command installs the published package, not uncommitted changes in this repository. If the current release does not include the skill yet, use the checkout instructions below.

## Install the portable skill for another agent

Install the CLI, then the skill for the agent you use:

```bash
npm install -g simvyn
npx skills add pranshuchittora/simvyn --skill simvyn --agent codex --yes
```

Replace `codex` with a supported agent identifier, such as `claude-code`. The skills CLI installs to the project by default; add `--global` for user-wide scope. Its [official documentation](https://github.com/vercel-labs/skills) lists supported agents and installation options. This command requires the skill to have reached the repository's default branch.

The portable skill installation includes instructions and helper files, not the simvyn application. Keep the entire `skills/simvyn/` directory together if your agent uses a manual skill installation process. Follow that agent's loading instructions and make an installed `simvyn` CLI available on its PATH. Check the CLI version and command help before following instructions from a newer skill.

## Test an unreleased checkout

Use the development Node.js version in the [contributing guide](https://github.com/pranshuchittora/simvyn/blob/main/CONTRIBUTING.md); checkout build requirements can be newer than the installed CLI's runtime minimum. From the repository root, install its locked dependencies and build the release layout:

```bash
npm ci
npm run build:release
```

For a single Pi session, load the source skill directly:

```bash
pi --skill /absolute/path/to/simvyn/skills/simvyn/SKILL.md
```

To exercise the assembled npm package's skill resources through Pi instead:

```bash
pi install /absolute/path/to/simvyn/packages/cli
```

Use an absolute path to your checkout. Pi references a local package in place; it does not fetch the released npm version or build the checkout for you. Rebuild after changing CLI source or the skill files copied into the release layout. Use one installation route at a time to avoid loading two skills with the same name.

For another compatible agent, install from the local repository:

```bash
npx skills add /absolute/path/to/simvyn --skill simvyn --agent codex --yes
```

A copied portable skill needs a separately installed CLI on PATH. To test the checkout's exact CLI and skill together without relying on an installed version, run the source launcher directly:

```bash
node /absolute/path/to/simvyn/skills/simvyn/scripts/simvyn.mjs --version
node /absolute/path/to/simvyn/skills/simvyn/scripts/simvyn.mjs --help
```

## Select the executable and device explicitly

Use the launcher next to the `SKILL.md` that the agent loaded:

```bash
node /absolute/path/to/skills/simvyn/scripts/simvyn.mjs device list --json
```

The launcher looks for the bundled CLI, the built source-checkout CLI, or an installed `simvyn` on PATH. It does not download or upgrade simvyn. Resolve the skill's real location rather than guessing Pi's installation directory. The launcher preserves the caller's working directory, so relative inputs and output paths remain relative to the project where the agent is working.

The examples below use `simvyn` for readability. Substitute `node /absolute/path/to/skills/simvyn/scripts/simvyn.mjs` when using the bundled skill.

1. Check `simvyn --version` and `simvyn --help`.
2. Run `simvyn device list --json`; inspect `id`, `name`, `platform`, `state`, `osVersion`, `deviceType`, and `isAvailable`.
3. Select the user's intended device by its full ID. Use its bundle ID or Android package name for app operations. Do not choose the first device silently when several could match.
4. If booting is part of the requested task, boot that device and list devices again. Android's stopped AVD ID (`avd:<name>`) changes to an ADB serial after boot. Discovery alone does not prove the OS or app is ready.
5. Read command help and the [platform reference](../skills/simvyn/references/platforms.md) before operating on the selected target.

Most direct subcommands run without the dashboard server. Running bare `simvyn` starts the dashboard; use `simvyn start --no-open` only when a server is needed, and retain a process handle to stop it when finished.

## A small, reviewable workflow

For a booted iOS Simulator or supported Android target, capture the installed app's current state using actual device and app identifiers:

```bash
simvyn device list --json
simvyn app list DEVICE_ID --type user
simvyn app info DEVICE_ID com.example.app
simvyn app launch DEVICE_ID com.example.app
mkdir -p artifacts/simvyn
simvyn screenshot DEVICE_ID --output artifacts/simvyn/app.png
```

Replace `DEVICE_ID` and `com.example.app` before running. The first three commands inspect state; launching changes it. Only perform the parts the user's task authorizes. Open the screenshot to inspect the result and return its actual path. A successful launch does not establish that the intended screen loaded or that a UI assertion passed.

For app data, start with `simvyn db list DEVICE_ID com.example.app`, then a small read query against a returned database path. Use a `LIMIT` clause to bound tabular output. The CLI database query opens databases read-only; preferences are also read-only in the current inspector. Android sandbox access requires a debuggable build. See the [CLI reference](../skills/simvyn/references/cli.md) for exact arguments and the [recipes](../skills/simvyn/references/recipes.md) for settings, deep links, permissions, and other tasks.

## Output and process handling

| Command                              | Output contract                          | Agent handling                                                                         |
| ------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `device list --json`                 | One JSON array on stdout                 | Capture stderr separately; an empty list can require checking tool availability        |
| `logs DEVICE_ID --json`              | Streaming JSON Lines on stdout           | Start as a managed process, write to a file, filter, and stop after a bounded interval |
| `screenshot DEVICE_ID --output PATH` | Writes an image and prints its path      | Create the parent directory first; inspect the file                                    |
| `record DEVICE_ID --output PATH`     | Writes video after stopping              | Retain the process handle, send SIGINT, and wait for finalization                      |
| Other commands                       | Command-specific text, tables, or values | Read help; do not assume a global JSON-output flag                                     |

Only device listing and log streaming expose `--json`. Avoid verbose output when parsing structured stdout. Inspect the command's exit status and stderr as well as its output; a returned path is not a substitute for checking the artifact exists and can be opened.

Logs stream until stopped. Use an agent process tool or subprocess supervisor to start:

```bash
simvyn logs DEVICE_ID --level warning --filter 'MyApp|Payment' --json
```

Redirect stdout and stderr to separate files, retain the exact process handle, collect a short window such as 10 seconds, then send SIGINT and wait for exit. Read a bounded excerpt from the saved log. If it does not stop, terminate only the process tree you started. There is no `--duration`, `--limit`, or `--since` option for `logs`; do not invent one or assume piping to `head` reliably cleans up the producer. Recordings likewise require SIGINT and time to finalize the file. Detailed subprocess patterns belong in the [automation reference](../skills/simvyn/references/automation.md).

## Collections and verification limits

Inspect a saved Collection with `simvyn collections list` and `simvyn collections show ID` before applying it. Collections can contain destructive steps, such as erasing a simulator. Use the user's existing authorization and target scope; loading the skill does not authorize unrelated device changes.

Current `collections apply NAME_OR_ID DEVICE_ID...` prints each step's result and final success/skipped/failed counts. A zero exit status or the word “completed” does **not** mean every step succeeded. Examine every failed or skipped step and verify the required effects. The engine has no implemented cancellation, and timing out a step does not stop its underlying action. Avoid retrying timed-out mutations blindly.

Collections require already booted targets, have a limited action catalog, and do not currently provide a CLI recipe import/export or JSON run-report flag. They do not perform UI assertions. Use the [automation reference](../skills/simvyn/references/automation.md) for the current contract instead of treating them as a general CI test runner.

## Platform limits to check first

- **iOS Simulator:** requires macOS with Xcode and an installed compatible simulator runtime. Locale changes require a reboot. Status-bar overrides change appearance, not network conditions.
- **Physical iOS:** discovery and app management use `devicectl`. The current simvyn CLI does not provide the simulator's screenshot, recording, logs, settings, location, clipboard, or sandbox-inspection capabilities on physical iPhones. A dashboard capability does not imply matching CLI support.
- **Android:** requires ADB; emulator lifecycle and simulated GPS additionally need emulator support. Sandbox/database access uses `run-as` and needs a debuggable app. Android clipboard reading is unavailable; clipboard writing can fall back to typing into the focused field, so it is not a reliable clipboard assertion.
- **Interaction:** coordinate input is Android-only in the current CLI. There is no UI hierarchy, semantic-selector driver, automatic visual assertion, or MCP endpoint supplied by this skill.

Use the [full platform reference](../skills/simvyn/references/platforms.md) and the installed command's help for each operation. Consult the [installation requirements](../README.md#installation) for the supported Node.js environment. Report an unsupported operation as a limitation instead of claiming success or substituting a different device action.

## Discovery and maintenance

The npm package's `pi-package` keyword and `pi.skills` manifest describe its Pi resources. The portable `skills/simvyn/SKILL.md` supplies a name and task-specific description that compatible agents can discover after installation. Neither metadata nor a package keyword guarantees that an agent will load it for every task; invoke the skill explicitly when necessary.

### Publish to the Pi package catalog

The [Pi package catalog](https://pi.dev/packages) lists npm packages with the `pi-package` keyword. Simvyn declares that keyword in `packages/cli/package.json`, along with `pi.skills: ["./skills"]` and a `pi.image` preview URL, following the official [package and gallery requirements](https://pi.dev/docs/latest/packages#gallery-metadata).

The existing npm release workflow runs `npm run build:release`, which copies the canonical skill and agent guide into the CLI package before packing and publishing. Release these changes under a new npm version through that workflow; an already published version cannot be reused. The published package must contain `skills/simvyn/SKILL.md`, its launcher, and its references.

After the release, inspect the published metadata:

```bash
npm view simvyn version keywords pi --json
```

Confirm that the output includes `pi-package` and the skill path, search the catalog for `simvyn`, and verify installation with `pi install npm:simvyn`. A local package test verifies skill loading; catalog visibility must be checked after the npm release is indexed.

### Maintain the skill and documentation

The root [llms.txt](../llms.txt) is a small linked documentation index for tools or people that choose to read it. It does not install the skill or cause automatic tool registration.

The canonical skill lives in [`skills/simvyn/`](../skills/simvyn/SKILL.md). Keep its launcher and references aligned with the CLI, and rebuild the release layout before testing the packaged copy. Report the CLI version, selected device, commands attempted, observed results, and artifact paths when handing work back to a developer.
