# Contributing to simvyn

Thanks for your interest in improving simvyn! This document covers how to set up the project, the conventions we follow, and what to expect when you open a pull request.

By participating in this project you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Running Checks](#running-checks)
- [Adding a Module](#adding-a-module)
- [Commit Conventions](#commit-conventions)
- [Pull Requests](#pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Releases](#releases)

## Ways to Contribute

- **Report a bug** — open a [bug report](https://github.com/pranshuchittora/simvyn/issues/new?template=bug_report.yml)
- **Request a feature** — open a [feature request](https://github.com/pranshuchittora/simvyn/issues/new?template=feature_request.yml)
- **Improve docs** — README fixes, clearer CLI descriptions, and new screenshots are all welcome
- **Write code** — bug fixes, new modules, and platform coverage for physical devices

If you are planning a large change, please open an issue first so we can agree on the approach before you invest time in it.

## Development Setup

**Requirements**

- Node.js 22.22.1+, 24.11.0+, or 26+ (the repo is developed and tested on Node 24; the build tools do not support Node 23 or 25)
- macOS for full iOS + Android support; Linux supports Android only
- Xcode with Command Line Tools for iOS Simulators, Xcode 15+ for physical iOS devices
- Android SDK platform tools (`adb`) on your `PATH` for Android

The published CLI requires Node.js 22 (22.14.0+) or 24+ for its native SQLite dependency. The higher development minimum comes from lint-staged and tsdown.

**Install and run**

```bash
git clone https://github.com/pranshuchittora/simvyn.git
cd simvyn
npm install

# Server + dashboard with hot reload
npm run dev
```

Other useful entry points:

```bash
npm run dev:server      # Fastify server only (no dashboard dev server)
npm run dev:dashboard   # Vite dashboard only
npm start               # Run the CLI from source
```

To exercise the CLI from source without building:

```bash
npx tsx packages/cli/src/index.ts device list
```

## Project Structure

simvyn is an npm workspaces monorepo. Only `packages/cli` is published to npm, as the `simvyn` package.

| Path                 | Package             | Purpose                                                      |
| -------------------- | ------------------- | ------------------------------------------------------------ |
| `packages/types`     | `@simvyn/types`     | Shared TypeScript types, including the module contract       |
| `packages/core`      | `@simvyn/core`      | Platform adapters (`simctl`, `devicectl`, `adb`) and storage |
| `packages/server`    | `@simvyn/server`    | Fastify server, WebSocket broker, process manager            |
| `packages/dashboard` | `@simvyn/dashboard` | React web dashboard                                          |
| `packages/cli`       | `simvyn`            | CLI entry point and the published bundle                     |
| `packages/modules/*` | —                   | Self-contained feature modules                               |

Device-specific behaviour lives in the adapters under `packages/core/src/adapters/`. If a capability only exists on emulators or simulators, the adapter is the right place to reject it with a clear message.

## Running Checks

These are the same checks CI runs on every pull request, so run them before pushing:

```bash
npm run lint          # oxlint
npm run format:check  # prettier
npm run typecheck:pi  # Pi extension types
npm test              # node:test
```

To fix formatting automatically:

```bash
npm run format
```

A `pre-commit` hook runs Prettier over staged files via lint-staged, so formatting is usually handled for you.

> **Note:** `npm run typecheck` currently reports pre-existing project-reference errors across the monorepo and is not part of CI. It can also write `.js` files next to sources outside the referenced projects, so delete any it leaves behind. Don't be alarmed if it fails on a clean checkout — please don't mix unrelated `tsconfig` fixes into a feature PR. `npm run typecheck:pi` checks the Pi extension on its own and does not write files.

### Tests

Tests use the built-in Node test runner. The suite currently covers `packages/core`, the location module, and the Pi extension's process handling:

```bash
npm test
```

If you add a test file outside those paths, extend the `test` script glob in the root `package.json` so it actually runs — a glob that matches nothing fails silently.

## Adding a Module

Each feature is a self-contained module under `packages/modules/<name>/`. A module owns its API routes, CLI commands, and WebSocket handlers.

A typical module looks like:

```
packages/modules/<name>/
  manifest.ts      # default export: SimvynModule
  routes.ts        # Fastify HTTP routes
  ws-handler.ts    # WebSocket channel handler
  package.json
  tsconfig.json
```

The manifest implements the `SimvynModule` contract from `@simvyn/types`:

```ts
export interface SimvynModule {
	name: string;
	version: string;
	description: string;
	icon?: string;
	register: (fastify: any, opts: any) => Promise<void>;
	cli?: (program: any) => void;
	capabilities?: PlatformCapability[];
}
```

To wire a new module up:

1. Create the module directory and manifest.
2. Add the workspace path if it isn't already covered by `packages/modules/*`.
3. Register it in `packages/cli/src/all-modules.ts`.
4. Add a dashboard panel under `packages/dashboard/src/panels/` if it needs UI.
5. Declare `capabilities` so unsupported device types disable the feature in the UI instead of failing at runtime.

## Commit Conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

Common types are `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, and `build`. Scope is usually the module or package name.

```
fix(location): handle physical devices and name-based selection
feat(collections): add step reordering
docs: document trusted publishing setup
```

Release notes are generated from commit subjects, so write them for a reader who wasn't in the PR.

## Pull Requests

1. Fork the repo and create a branch from `main`.
2. Make your change, with tests where the behaviour is testable.
3. Run `npm run lint`, `npm run format:check`, and `npm test`.
4. Open a PR against `main` and fill in the template.

Keep PRs focused — one logical change per PR. Unrelated refactors and formatting sweeps make review harder and are likely to be sent back.

If your change affects device behaviour, please say which devices you tested against (simulator, emulator, physical iOS, physical Android) and on which OS.

## Reporting Bugs

Before filing, please:

- Check [existing issues](https://github.com/pranshuchittora/simvyn/issues)
- Include your OS, Node version, and simvyn version (`simvyn --version`)
- Say whether the device is a simulator, emulator, or physical device

The dashboard can generate a debug report for you: **Tool Settings → Diagnostics → Debug Report**. Attaching it makes triage much faster.

For security issues, do **not** open a public issue — see [SECURITY.md](SECURITY.md).

## Releases

Releases are automated and maintainer-only. A maintainer runs the **Release Dispatch** workflow with a `patch`, `minor`, or `major` bump; it versions `packages/cli`, tags the commit, and triggers the **Release** workflow, which publishes to npm via [trusted publishing](https://docs.npmjs.com/trusted-publishers) with provenance and cuts a GitHub Release.

Contributors do not need to bump versions in their PRs.
