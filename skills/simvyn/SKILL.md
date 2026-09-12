---
name: simvyn
description: Operate iOS Simulators, Android Emulators, and connected mobile devices with Simvyn. Use for device discovery, app installation and launch, screenshots, logs, deep links, location simulation, app data inspection, device settings, and reusable device workflows through the Simvyn CLI or dashboard.
license: MIT
---

# Simvyn

Use Simvyn to inspect or operate the user's mobile development environment. This is a CLI workflow skill; it does not register MCP tools or a native Pi extension.

Requires Node.js 22 (22.14.0+) or 24+ and an installed or built Simvyn CLI. macOS supports iOS and Android; Linux supports Android. iOS requires Xcode and simulator runtimes; Android requires adb and configured devices or emulators. See the platform reference for operation-specific requirements.

## Start with the installed CLI

Resolve paths relative to this skill directory, not the user's project directory. The supplied launcher prefers the CLI bundled beside the installed skill, then a built Simvyn checkout, then `simvyn` on `PATH`. It does not download packages, build the project, or start a server on its own.

```bash
node /absolute/path/to/skills/simvyn/scripts/simvyn.mjs --version
node /absolute/path/to/skills/simvyn/scripts/simvyn.mjs device list --json
```

In the references, `simvyn` means this resolved invocation, or the user's existing `simvyn` executable when appropriate. Read `--help` for the installed command if its version differs from these references. Running with no arguments starts the dashboard; use an explicit subcommand for headless work.

Choose the full device ID from discovery and retain it through the task. Device name and ID-prefix matching are inconsistent across commands. Rediscover after booting an Android AVD because `avd:<name>` changes to an `emulator-<port>` ID. Most operations require a booted device. A discovered physical device may still need to be unlocked or trusted.

## Choose the relevant reference

- [CLI commands](references/cli.md): argument order, supported options, output forms, and commands missing from brief help examples.
- [Platform support](references/platforms.md): read before physical-device operations, permissions, app data inspection, clipboard work, or selecting an iOS/Android equivalent.
- [Recipes](references/recipes.md): app repro sessions, screenshots, Android local development, GPS and push testing, accessibility checks, and multi-device collections.
- [Automation and troubleshooting](references/automation.md): read for scripts/CI, JSON parsing, long-running processes, failed commands, and collection result interpretation.

## Execute and verify within the task

Use the actions needed for the user's request. Inspect an existing collection with `collections show` before applying it: its name does not reveal whether it erases data, launches apps, or changes settings. Preserve any existing authorization; when a requested diagnosis does not include deleting/resetting data, propose the concrete reset before doing it.

Save screenshots, recordings, and downloaded files to explicit paths and inspect the artifacts needed to substantiate the result. A screenshot command returns a path; the agent must use its own image-viewing tool to inspect the image. Report the device, actions performed, artifact locations, and observed failures or unsupported operations. Do not infer success from a command being available or from a collection's zero exit status alone.
