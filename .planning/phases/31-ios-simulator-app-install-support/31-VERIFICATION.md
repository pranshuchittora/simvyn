---
phase: 31-ios-simulator-app-install-support
verified: 2026-04-30T21:17:34Z
status: passed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - "Install a real iOS simulator .app bundle through Browse .app Bundle or drag/drop"
  - "Confirm Android and physical iOS selections show the .app simulator-only error"
  - "Confirm successful install refreshes the app list in the dashboard"
---

# Phase 31: iOS Simulator .app Install Support Verification Report

**Phase Goal:** Users can install iOS simulator `.app` bundles through the same App Management drag-and-drop/file-picker install flow that already accepts `.ipa` and `.apk`.
**Verified:** 2026-05-01
**Status:** passed with manual UAT still tracked
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Single-file `.ipa` and `.apk` uploads keep the existing multipart field name `file` | VERIFIED | `InstallDropZone.tsx:113-145` keeps single-file validation and appends `formData.append("file", file)`; `routes.ts:82-89` preserves the `part.fieldname === "file"` server path. |
| 2 | iOS simulator `.app` bundle uploads use `uploadType`, `bundleName`, `manifest`, and `bundle-file-N` | VERIFIED | `InstallDropZone.tsx:166-176` appends `bundle-file-N` parts and the `uploadType`, `bundleName`, and `manifest` fields. `routes.ts:63-128` reads the same protocol and reconstructs the bundle. |
| 3 | `.app` bundle uploads are rejected for Android and physical iOS on the server | VERIFIED | `routes.ts:53-70` computes simulator support and rejects `uploadType=app-bundle` early; `routes.ts:92-95` also rejects `bundle-file-N` parts on unsupported targets before streaming. |
| 4 | Bundle manifest paths cannot write outside the reconstructed `.app` directory | VERIFIED | `upload-utils.ts:96-125` rejects empty, absolute, backslash, NUL, and `..` paths, then verifies resolved destinations stay under the bundle root. |
| 5 | Bundle upload missing root `Info.plist` is rejected before install | VERIFIED | `upload-utils.ts:63-93` requires a manifest entry with `relativePath === "Info.plist"` before route reconstruction calls `adapter.installApp`. |
| 6 | App Management drop zone says `Drop IPA, APK, or iOS .app bundle here to install` | VERIFIED | `InstallDropZone.tsx:279-282` renders the exact UI-SPEC drop-zone copy. |
| 7 | File picker still accepts `.ipa,.apk` | VERIFIED | `InstallDropZone.tsx:299-305` keeps the file input `accept=".ipa,.apk"`. |
| 8 | A separate browse action lets users select a root directory ending with `.app` | VERIFIED | `InstallDropZone.tsx:103-110` configures a dedicated directory input with `webkitdirectory = true`; `InstallDropZone.tsx:291-306` renders `Browse .app Bundle` and wires it to that input. |
| 9 | Dashboard sends `.app` uploads using the backend app-bundle protocol | VERIFIED | `InstallDropZone.tsx:166-179` builds the manifest and posts to `/api/modules/apps/install/${deviceId}` with the planned fields; key-link verification passed. |
| 10 | Documentation no longer says dashboard installs are limited to IPA/APK | VERIFIED | `README.md` and `packages/cli/README.md` now mention iOS simulator `.app` support; `HomeScreen.tsx` and `manifest.ts` copy were updated. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/modules/app-management/upload-utils.ts` | Testable app bundle manifest and path validation helpers | VERIFIED | Exports `AppBundleUploadError`, `assertSafeAppBundleName`, `parseAppBundleManifest`, `validateAppBundleManifest`, and `resolveBundleFilePath`. |
| `packages/modules/app-management/upload-utils.test.ts` | Unit tests for traversal rejection and bundle validation | VERIFIED | `node --import tsx --test packages/modules/app-management/upload-utils.test.ts` passes with 13 tests. |
| `packages/modules/app-management/routes.ts` | Multipart app-bundle upload handling and safe reconstruction | VERIFIED | Streams `req.parts()`, preserves `file`, stages bundle parts, validates manifest, reconstructs under temp bundle root, and cleans up temp files. |
| `packages/dashboard/src/panels/AppPanel.tsx` | Selected device platform/type passed into `InstallDropZone` | VERIFIED | `AppPanel.tsx:11-14` resolves `selectedDevice`; `AppPanel.tsx:69-75` passes `devicePlatform` and `isPhysicalIos`. |
| `packages/dashboard/src/panels/apps/InstallDropZone.tsx` | File and `.app` bundle browse/drop install UI | VERIFIED | Supports IPA/APK file input, `.app` directory input, `webkitGetAsEntry()` traversal, platform checks, status text, and backend protocol upload. |
| `README.md` / `packages/cli/README.md` | Updated App Management install docs | VERIFIED | Grep verification passed for `iOS simulator .app` and `IPA, APK` copy. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `InstallDropZone.tsx` | `routes.ts` | FormData `uploadType=app-bundle` protocol | WIRED | `gsd-sdk query verify.key-links ...31-02-PLAN.md` passed after the FormData boundary comment tied the UI field names to the route handler. |
| `AppPanel.tsx` | `InstallDropZone.tsx` | Device platform and physical-device guard props | WIRED | `AppPanel.tsx:69-75` passes `devicePlatform` and `isPhysicalIos`; `InstallDropZone.tsx:148-160` and `212-216` enforce platform errors. |
| `routes.ts` | `ios.ts` | `adapter.installApp(device.id, reconstructedBundlePath)` | WIRED | `routes.ts:119-131` reconstructs `bundleRoot` and calls `adapter.installApp(device.id, bundleRoot)`. Existing iOS adapter support for direct `.app` install is covered by core tests. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| APP-BUNDLE-UPLOAD | 31-01 | Backend accepts safe app-bundle multipart upload protocol | SATISFIED | Truths 1-5 verified. |
| APP-BUNDLE-SECURITY | 31-01 | Manifest, path, platform, and temp-file safety | SATISFIED | Helper tests pass; code review hardening rejects unsupported bundle fields before streaming. |
| APP-BUNDLE-UI | 31-02 | Dashboard browse/drop `.app` bundle install UI | SATISFIED | Truths 6-9 verified; dashboard build passes. |
| APP-BUNDLE-DOCS | 31-02 | Dashboard/help/docs advertise the new capability accurately | SATISFIED | Truth 10 verified. |

**Note:** These Phase 31 requirement IDs are present in the plan frontmatter but are not defined in `.planning/REQUIREMENTS.md`. This is a traceability/documentation gap, not an implementation gap.

### Automated Verification

| Check | Status | Details |
|-------|--------|---------|
| `node --import tsx --test packages/modules/app-management/upload-utils.test.ts` | PASSED | 13/13 helper tests passed. |
| `npm run build -w @simvyn/dashboard` | PASSED | Vite dashboard build completed successfully after the final code change. |
| `npm run lint` | PASSED | oxlint found 0 warnings and 0 errors. |
| `npm test` | PASSED | 264/264 core tests passed when rerun outside sandbox; first sandboxed run failed only due storage tests writing to `/Users/pranshu/.simvyn`. |
| `npx tsc --noEmit ... routes.ts upload-utils.ts` | PASSED | Changed backend route/helper files passed strict TypeScript checking. |
| `npm run typecheck` | BLOCKED BY BASELINE | Fails on pre-existing repo-wide TypeScript project/rootDir and `.ts` import issues unrelated to Phase 31. |
| `gsd-sdk query verify.schema-drift 31` | PASSED | No schema drift detected. |
| `gsd-sdk query verify.key-links ...31-02-PLAN.md` | PASSED | 2/2 31-02 key links verified. |

### Code Review

| Check | Status | Details |
|-------|--------|---------|
| `31-REVIEW.md` | CLEAN | Code review found no open findings after hardening fix `7e1f467`. |

### Human Verification Required

### 1. Real `.app` Bundle Install

**Test:** Select a booted iOS simulator, use `Browse .app Bundle` or drag/drop a valid simulator build directory ending in `.app`.
**Expected:** Status shows `Installing {bundle}.app...`, then `Installed {bundle}.app`; the app list refreshes after the install event.
**Why human:** Requires a real local simulator bundle and browser directory/drop interaction.

### 2. Wrong Platform Error

**Test:** Select Android or a physical iOS device, then choose/drop the same `.app` bundle.
**Expected:** Status shows `.app bundles can only be installed on iOS simulators` before upload.
**Why human:** Requires switching real selected devices in the dashboard.

### 3. Missing Info.plist Error

**Test:** Select a directory ending in `.app` that does not contain root `Info.plist`.
**Expected:** UI shows `This .app bundle is missing Info.plist`.
**Why human:** Browser directory input/drop behavior must be exercised with a malformed local bundle.

### Gaps Summary

No implementation gaps found. All planned backend, UI, security, and documentation must-haves are implemented and wired. Manual UAT remains tracked separately because it requires real browser/simulator interaction.

---

_Verified: 2026-05-01_
_Verifier: Codex (inline GSD verifier)_
