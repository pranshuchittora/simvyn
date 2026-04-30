---
status: partial
phase: 31-ios-simulator-app-install-support
source: [31-VERIFICATION.md]
started: 2026-05-01
updated: 2026-05-01
---

## Current Test

Awaiting manual dashboard testing with a real iOS simulator `.app` bundle.

## Tests

### 1. Install Real `.app` Bundle

expected: Select a booted iOS simulator, browse or drop a valid `.app` bundle, and see `Installed {bundle}.app` with the app list refreshed.
result: [pending]

### 2. Reject Wrong Platform

expected: Select Android or physical iOS, browse or drop the same `.app` bundle, and see `.app bundles can only be installed on iOS simulators`.
result: [pending]

### 3. Reject Missing `Info.plist`

expected: Select a directory ending in `.app` without root `Info.plist` and see `This .app bundle is missing Info.plist`.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
