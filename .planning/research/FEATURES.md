# Feature Landscape: Collections & Getting Started Documentation

**Domain:** Reusable device action sets + comprehensive documentation for a mobile devtool
**Researched:** 2026-03-04
**Confidence:** HIGH (based on codebase analysis, reference system study, documentation best practices)
**Milestone:** v1.6 — Collections & Documentation

## Context

Simvyn already has 16+ modules with full CLI subcommands, interactive command palette with multi-step flows, per-module persistence in `~/.simvyn/`, platform capability detection, and a Liquid Glass UI. This research focuses exclusively on the two NEW features: a Collections system (reusable device action batches) and comprehensive Getting Started documentation.

Reference systems studied: Apple Shortcuts (action-based sequential runner), Playwright test fixtures (composable environment setup), Android Studio device profiles (device configuration presets), Xcode test plans (parameterized test configs).

---

## Table Stakes

Features users expect from a "Collections" / preset system. Missing = feature feels half-baked.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Create collection with name** | Users need to identify and find collections | LOW | `@simvyn/core` storage | Persist in `~/.simvyn/collections/`. UUID for each collection |
| **Add steps from categorized action list** | Apple Shortcuts paradigm — browse available actions by category | MEDIUM | All existing modules (for action catalog) | Categories: Device Settings, Location, App Management, Deep Links, Push, Media, etc. One action per step |
| **Configure parameters per step** | Each action needs its own params (lat/lon for location, app bundleId for launch, etc.) | MEDIUM | Command palette step types (reuse `StepType` patterns) | Reuse existing parameter picker UIs — LocalePicker, LocationPicker, etc. |
| **Platform badge per step** | Users must know which steps are iOS-only or Android-only BEFORE applying | LOW | `PlatformCapability` type, adapter capability checking | Show Apple/Android logo badges. Critical for cross-platform awareness |
| **Apply collection to selected device(s)** | The core use case — one click to configure a device | MEDIUM | Device store (multi-select), all module HTTP APIs | POST to each module's existing API endpoint sequentially. Already built: `/api/modules/device-settings/appearance`, `/api/modules/location/set`, etc. |
| **Real-time per-step execution feedback** | Apple Shortcuts shows spinner → check/fail per step. Users need to see progress | MEDIUM | None (new UI component) | States per step per device: pending → running (spinner) → success (check) → failed (x) → skipped (skip badge) |
| **Platform incompatibility skip with badge** | When an iOS-only step hits an Android device, skip it gracefully, don't fail the whole run | LOW | Platform capability detection (already exists) | Show "skipped — iOS only" badge. Don't interrupt execution of remaining steps |
| **Edit existing collections** | Users iterate on collections over time | LOW | Storage layer | Same UI as creation, pre-populated with existing steps |
| **Delete collections** | Cleanup | LOW | Storage layer | Confirm dialog before delete |
| **Persist collections across sessions** | Collections are long-lived — survive server restarts | LOW | `createModuleStorage("collections")` | Already proven pattern: `~/.simvyn/collections/collections.json` |

## Differentiators

Features that set the Collections system apart from a basic batch runner. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Step-by-step visual builder** | Drag-add UX similar to Apple Shortcuts — not just a config file but an interactive builder | MEDIUM | Categorized action registry | Categorized action list on left, step sequence on right. Each step shows its icon, name, platform badge, and configured params |
| **Multi-device parallel apply** | Apply same collection to 3+ devices simultaneously — core devtool power move | HIGH | Device multi-select, concurrent execution | Show per-device × per-step progress matrix. Reference: Playwright parallel test execution feedback |
| **Pre-apply compatibility summary** | Before running, show a summary: "3 of 5 steps will run on Android device X (2 iOS-only steps will be skipped)" | LOW | Platform capability check | Prevents surprises. Shows yellow warning badges for partially-compatible applies |
| **Command palette integration** | "Apply Collection: Japanese Locale Setup" directly from Cmd+K | MEDIUM | Command palette actions system, collection store | Register collections as dynamic command palette actions. Each collection becomes a multi-step action with device picker |
| **Reorder steps via drag-and-drop** | Step order matters (e.g., set locale THEN launch app) — users need to reorder | LOW | React DnD or CSS sortable | Framer Motion `Reorder` component fits the Liquid Glass aesthetic |
| **Duplicate collection** | Quick way to create variants ("Japanese testing" → "Korean testing") | LOW | Storage layer | Clone then edit pattern |
| **Collection CLI subcommand** | `simvyn collections apply <name> <device>` for CI/CD automation | MEDIUM | Collections storage, all module CLIs | Enables scripting: `simvyn collections apply "japan-setup" iPhone-16-Pro` |
| **Built-in starter collections** | Ship with 2-3 example collections so users understand the concept immediately | LOW | Collection schema definition | Examples: "Dark Mode + Japanese Locale", "Screenshot Setup (status bar + dark mode)", "GPS Tokyo + Launch Maps" |
| **Step execution timeout** | If a step hangs, don't block the whole collection forever | LOW | Timer per API call | 30s default timeout per step. Show timeout failure in UI |
| **Execution history / last applied** | "When did I last apply this collection?" helps with debugging | LOW | Storage layer | Timestamp of last execution + device list. Not a full audit log — just last run |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Tempting | Why Avoid | What to Do Instead |
|--------------|-------------|-----------|-------------------|
| **Conditional logic / branching** | Apple Shortcuts has if/else, repeat | Massively increases complexity. Collections are "apply this config" not "run this program." Conditional logic turns it into a scripting engine | Keep it linear — ordered list of steps, execute sequentially. If users need conditionals, they use the CLI in a shell script |
| **Variables / data passing between steps** | "Output of step 1 feeds step 2" | Turns collections into a workflow engine. Current steps are independent device config commands, not a data pipeline | Each step is self-contained. Parameters are set at creation time, not at runtime. If the bundleId from "install app" needs to feed "launch app", the user puts both in the step config |
| **Step-level device targeting** | "Step 1 on iOS device, Step 2 on Android device" per step | Over-complicates the mental model. Collections are "apply this config set TO these devices" | Apply to device set. Steps that are incompatible with a device in the set get skipped. Simple |
| **Collection sharing / import-export** | Share collections with teammates | Adds serialization format concerns, versioning, trust/security. Premature for v1.6 | Collections are local JSON in `~/.simvyn/`. Users can manually copy the JSON file if needed. Import/export is a v2+ feature |
| **Scheduled / automatic execution** | "Apply this collection every time a device boots" | Event-driven execution requires a daemon/watcher architecture. Way out of scope | Manual apply only. CLI integration allows users to script their own automation |
| **Undo / rollback after apply** | "Undo all changes from that collection" | Most device actions aren't cleanly reversible (what's the "undo" of set-locale-to-Japanese?). Creates false expectations | Don't offer undo. Users can create a "reset" collection that sets things back to defaults |
| **Nested collections** | Collection A includes Collection B as a step | Recursive execution, circular dependency detection, debugging nightmares | Flat step list only. Users can duplicate steps across collections |
| **Full documentation site (Docusaurus/Nextra)** | Dedicated docs website | Premature for project at this stage. README is the right place until there are 50+ pages of docs | Comprehensive README.md with per-feature sections. Add `docs/` site when README exceeds ~500 lines |

## Feature Dependencies

### Collections Feature Chain

```
[Collection Schema Definition]  ←  foundation type
    └── [Collections Storage (server)]  ←  CRUD persistence
        ├── [Collection Builder UI (dashboard)]  ←  create/edit UX
        │   ├── [Action Catalog Registry]  ←  maps module capabilities → collection step types
        │   ├── [Step Parameter Pickers]  ←  reuse LocalePicker, LocationPicker, etc.
        │   └── [Platform Badge Component]  ←  shows iOS/Android compatibility
        ├── [Collection Apply Engine (server)]  ←  sequential execution against module APIs
        │   ├── [Per-Step Status Tracking]  ←  pending/running/success/fail/skip states
        │   ├── [Platform Compatibility Check]  ←  pre-apply + runtime skip logic
        │   └── [Multi-Device Orchestration]  ←  parallel per-device, sequential per-step
        ├── [Apply Modal UI (dashboard)]  ←  device picker + real-time execution feedback
        ├── [Command Palette Registration]  ←  dynamic actions from saved collections
        └── [CLI Subcommand]  ←  `simvyn collections` commands
```

### Documentation Feature Chain

```
[README Restructure]
    ├── [Quick Start section]  ←  npx simvyn, what happens
    ├── [Per-Feature sections with screenshots]
    │   ├── [Device Management docs]
    │   ├── [Location Simulation docs]
    │   ├── [App Management docs]
    │   ├── ... (each existing module)
    │   └── [Collections docs]
    ├── [CLI Reference section]
    └── [Platform Support Matrix]
```

### Cross-Feature Dependencies on Existing Modules

The Collections module is a **meta-module** — it doesn't have its own device adapter methods. Instead, it orchestrates calls to existing module APIs:

| Collection Step Type | Existing Module | API Endpoint | Platform |
|---------------------|----------------|--------------|----------|
| Set Appearance (dark/light) | device-settings | `POST /api/modules/device-settings/appearance` | Both |
| Set Locale | device-settings | `POST /api/modules/device-settings/locale` | Both |
| Set Location | location | `POST /api/modules/location/set` | Both |
| Open Deep Link | deep-links | `POST /api/modules/deep-links/open` | Both |
| Launch App | app-management | `POST /api/modules/app-management/launch` | Both |
| Terminate App | app-management | `POST /api/modules/app-management/terminate` | Both |
| Install App | app-management | `POST /api/modules/app-management/install` | Both |
| Send Push | push | `POST /api/modules/push/send` | iOS only |
| Set Clipboard | clipboard | `POST /api/modules/clipboard/set` | Both (limited Android) |
| Add Media | media | `POST /api/modules/media/add` | Both |
| Set Status Bar | device-settings | `POST /api/modules/device-settings/status-bar` | iOS only |
| Grant Permission | device-settings | `POST /api/modules/device-settings/permission/grant` | Both |
| Set Content Size | device-settings | `POST /api/modules/device-settings/content-size` | Both |
| Toggle High Contrast | device-settings | `POST /api/modules/device-settings/increase-contrast` | Both |
| Take Screenshot | screenshot | `POST /api/modules/screenshot/capture/:deviceId` | Both |

**Key insight:** Collections doesn't need new adapter methods — it's purely an orchestration layer over existing HTTP APIs. This is architecturally clean and means any future module automatically becomes available as a collection step type by registering in the action catalog.

## Documentation Features (Getting Started)

### Table Stakes for Devtool README

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Hero banner / logo** | First impression, project identity | LOW | Already exists: `simvyn-icon-1024.png` and `banner.png` |
| **One-liner description** | Visitors decide in 3 seconds whether to continue reading | LOW | Already exists, good |
| **Quick start (< 3 steps)** | npm-installable tools must have `npx X` front and center | LOW | Already exists: `npx simvyn` |
| **Feature list with brief descriptions** | Users scan for capabilities that match their needs | LOW | Already exists but brief. Expand with screenshot placeholders |
| **CLI reference with examples** | CLI-first tool must document commands | MEDIUM | Exists partially. Needs per-module command coverage |
| **Platform support matrix** | Cross-platform tool must be transparent about what works where | LOW | Already exists as table |
| **Prerequisites / requirements** | Node.js version, macOS/Linux, Xcode/Android SDK | LOW | Exists. Ensure complete |

### Differentiators for Devtool README

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Per-feature sections with screenshots** | Visual evidence of capabilities. Top READMEs use GIFs/screenshots for every major feature | MEDIUM | Screenshot placeholder format: `<!-- screenshot: feature-name -->`. Add real screenshots in a follow-up pass |
| **GIF demo of key workflows** | Animated demo captures attention — awesome-readme research shows GIFs are the #1 README differentiator | MEDIUM | Priority GIFs: (1) Command palette Cmd+K flow (2) Location map interaction (3) Collections apply with real-time feedback |
| **Collections getting started guide** | New feature needs dedicated onboarding section | LOW | "Create your first collection" walkthrough with screenshots |
| **Architecture section** | Helps contributors understand the codebase | LOW | Brief explanation of monorepo structure, module system, zero-SDK philosophy |
| **How It Works section** | Technical credibility — explain simctl/adb wrapping approach | LOW | Already exists, brief. Expand slightly |

### Anti-Features for Documentation

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Separate docs site** | Premature. Docusaurus adds build complexity and maintenance. README is discoverable on npm and GitHub | Keep everything in README.md. Add docs site when content exceeds ~500 lines |
| **API reference for server endpoints** | Internal APIs are for the dashboard, not for users | Document CLI commands (user-facing). Server API is implementation detail |
| **Contributing guide in README** | Clutters the user-facing README | Separate CONTRIBUTING.md file (defer to later) |
| **Exhaustive CLI flag documentation** | `--help` exists for this | Show common examples, point to `simvyn <command> --help` for full options |

## Documentation Patterns from Successful Devtools

Based on analysis of highly-starred devtool READMEs (gofiber/fiber, dbt-labs/dbt-core, thelounge/thelounge, refinedev/refine):

**Pattern 1: Visual-First**
- Logo/banner at top → badge row → one-line description → GIF demo → feature list
- Every feature section has a screenshot or GIF
- HIGH confidence — consistent across all top READMEs

**Pattern 2: Scannable Structure**
- Clear heading hierarchy (H2 for major sections, H3 for features)
- Feature list uses bold name + em-dash + description format
- Tables for structured comparisons (platform support, CLI commands)
- HIGH confidence — universal pattern

**Pattern 3: Quick Start First, Details Later**
- First 20 lines must contain: install command, run command, one-sentence explanation
- Detailed feature sections come after the fold
- CLI examples section with copy-paste commands
- HIGH confidence — npm ecosystem standard

**Pattern 4: Progressive Disclosure**
- Basic usage → features list → detailed sections → platform matrix → contributing
- Don't front-load configuration. Show the simplest path first
- HIGH confidence — matches Apple Shortcuts "Gallery" model (simple → advanced)

**Recommended README Structure for v1.6:**
```
1. Logo + badges + one-liner
2. GIF demo (dashboard overview)
3. Quick Start (npx simvyn)
4. Installation (global, npx, requirements)
5. Features (bulleted list with bold names)
6. Feature Showcase (per-feature sections with screenshots)
   - Device Management
   - Location Simulation
   - App Management
   - Log Viewer
   - Screenshots & Recording
   - Deep Links
   - Push Notifications
   - File Browser
   - Database Inspector
   - Device Settings
   - Crash Logs
   - Collections (NEW)
7. CLI Reference (table of commands with examples)
8. How It Works (simctl/adb wrapping)
9. Platform Support (matrix table)
10. License
```

## MVP Recommendation

### Collections — Prioritized Build Order

1. **Collection schema + storage** — define the data model, persist to `~/.simvyn/collections/`
2. **Action catalog registry** — map module capabilities to available step types with params schema
3. **Collection builder UI** — step-by-step creation with categorized action list
4. **Apply engine (server)** — sequential execution per device, skip on platform mismatch
5. **Apply modal UI** — device picker + real-time per-step feedback
6. **Command palette integration** — register saved collections as dynamic Cmd+K actions
7. **CLI subcommand** — `simvyn collections list|apply|create`
8. **Built-in starter collections** — 2-3 examples

### Documentation — Prioritized Build Order

1. **Restructure README** with new section hierarchy
2. **Per-feature sections** with screenshot placeholder comments
3. **Collections feature documentation** with usage walkthrough
4. **Expanded CLI reference** table
5. **Screenshot/GIF capture pass** (can be done separately)

### Defer to Later

- **Import/export collections** — v2+ once schema is stable
- **Collection versioning** — unnecessary for local-only tool
- **Conditional logic in steps** — never (keep it simple)
- **Separate docs site** — when README exceeds 500 lines
- **Video tutorials** — post-launch content

## Sources

- **Apple Shortcuts User Guide:** https://support.apple.com/guide/shortcuts/welcome/ios — action-based sequential execution model, categorized action list, per-step configuration (HIGH confidence, official Apple docs, verified March 2026)
- **Playwright Test Fixtures:** https://playwright.dev/docs/test-fixtures — composable, reusable environment setup, execution ordering, parallel execution model (HIGH confidence, official Playwright docs, verified March 2026)
- **awesome-readme curated list:** https://github.com/matiassingers/awesome-readme — 20.5k stars, comprehensive collection of README best practices and examples (HIGH confidence, verified March 2026)
- **Simvyn codebase analysis:** Direct examination of existing module system, command palette actions, storage patterns, platform adapters, device types (HIGH confidence, direct code reading)
- **Existing FEATURES.md:** Previous research from 2026-02-26 covering the full product feature landscape (HIGH confidence, internal document)

---
*Feature research for: Simvyn v1.6 Collections & Getting Started Documentation*
*Researched: 2026-03-04*
