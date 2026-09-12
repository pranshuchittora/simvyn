---
status: resolved
trigger: "GitHub issue #14: Android physical devices does not work location changing (mock location)"
created: "2026-05-08"
updated: "2026-05-08"
---

# Debug Session: Android Physical Location

## Symptoms

- expected_behavior: Location command should either set location on a supported device or explain why it cannot.
- actual_behavior: GitHub issue screenshot shows `simvyn location set 2510DRA23G 42 44` returning `Device not found`, then `simvyn location set QO49VW8PFAA6JJPJ 42 44` throwing an uncaught stack trace from bundled `dist/index.js`.
- error_messages: `Error: Location simulation is not available on physical Android devices`.
- timeline: Reported in GitHub issue #14 on 2026-05-06.
- reproduction: Run `simvyn device list`, then run `simvyn location set` against the Android physical device name or serial.

## Current Focus

- hypothesis: The CLI location command does not catch adapter errors and only resolves devices by ID/prefix, so physical-device unsupported errors surface as raw stack traces and displayed device names are not accepted.
- test: Add focused coverage for location CLI device-name resolution and physical-device rejection; run the existing core adapter tests.
- expecting: Physical Android requests fail with a clean unsupported message and no adapter call; emulator requests still call `adb emu geo fix` through the adapter.
- next_action: None.

## Evidence

- timestamp: 2026-05-08
  observation: Issue screenshot shows an Android physical device serial listed with name `2510DRA23G`, then a name-based command fails lookup and an ID-based command throws an uncaught stack trace.
- timestamp: 2026-05-08
  observation: `packages/modules/location/manifest.ts` invoked `adapter.setLocation()` without a command-level try/catch and resolved devices only by ID or ID prefix.
- timestamp: 2026-05-08
  observation: `packages/modules/location/ws-handler.ts` accepted `deviceIds`, while the dashboard sends a singular `deviceId` for location updates.

## Eliminated

- hypothesis: Android emulator location setting is generally broken.
  reason: Existing and added tests verify emulator IDs still call the adapter with longitude-first `adb emu geo fix` arguments.

## Resolution

- root_cause: Physical Android devices cannot use Simvyn's current location command because it relies on emulator-only `adb emu geo fix`; the CLI exposed that expected limitation as an uncaught stack trace and did not resolve by displayed device name.
- fix: Added physical-device preflight messaging in the location CLI, unambiguous device-name resolution, command-level error handling for set/clear/route, and WebSocket support for the dashboard's singular `deviceId` payload.
- verification: `npm test` passed 268 tests; `npm run lint` passed; `npm run bundle -w simvyn` passed. `npm run typecheck` still fails on existing tsconfig/project-reference issues unrelated to this fix.
- files_changed: `packages/modules/location/manifest.ts`, `packages/modules/location/ws-handler.ts`, `packages/modules/location/manifest.test.ts`, `packages/core/src/__tests__/android-adapter.test.ts`, `package.json`.
