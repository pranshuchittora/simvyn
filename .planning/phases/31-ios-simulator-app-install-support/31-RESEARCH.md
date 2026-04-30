# Phase 31: iOS Simulator .app Install Support - Research

**Researched:** 2026-05-01
**Revalidated:** 2026-05-01 via `$gsd-plan-phase 31 --research`
**Domain:** Dashboard app install upload flow, Fastify multipart handling, iOS simulator app bundle install
**Confidence:** HIGH

<user_constraints>

## User Constraints

No `CONTEXT.md` exists for this phase. Planning should use the roadmap goal:

- Users can install iOS simulator `.app` bundles through the same drag-and-drop/file-picker install flow that currently accepts `.ipa` and `.apk` files.

</user_constraints>

## Summary

The iOS adapter already supports direct simulator `.app` installation. `packages/core/src/adapters/ios.ts` calls `xcrun simctl install <device> <path>` for non-physical iOS devices, and `packages/core/src/__tests__/ios-adapter.test.ts` already verifies the direct `.app` path. Local `xcrun simctl help install` confirms the command shape: `simctl install <device> <path>`.

The missing capability is the upload surface. `packages/dashboard/src/panels/apps/InstallDropZone.tsx` rejects anything except `.ipa` and `.apk`, the file input has `accept=".ipa,.apk"`, and the server route in `packages/modules/app-management/routes.ts` expects exactly one uploaded file from `req.file()`. A simulator `.app` is normally a macOS directory bundle, so adding `.app` to the extension check is not enough. The dashboard must support selecting/dropping an `.app` directory, upload its contained files, and the server must reconstruct the directory safely before calling `adapter.installApp(device.id, reconstructedBundlePath)`.

Primary recommendation: preserve the current single-file IPA/APK code path, and add a second multipart protocol for `.app` bundle directories:

- Dashboard detects a dropped/selected directory whose root name ends with `.app`.
- Dashboard traverses the directory and uploads every contained file plus a JSON manifest of safe relative paths.
- Server streams multipart parts to a temp directory, validates/sanitizes the manifest paths, reconstructs `tmp/MyApp.app/...`, rejects non-iOS or physical iOS devices for bundle-directory upload, then calls the existing iOS adapter install method.

## Current Code Findings

### Existing success path

- `packages/core/src/adapters/ios.ts`
  - Simulator branch installs direct paths with `xcrun simctl install`.
  - `.ipa` files are unzipped into a temporary `Payload/*.app` directory before install.
  - Physical iOS devices branch to `xcrun devicectl device install app`.

- `packages/core/src/__tests__/ios-adapter.test.ts`
  - Already verifies direct `.app` simulator installs by expecting `["simctl", "install", "dev-1", "/path/to/MyApp.app"]`.

### Blocking gaps

- `packages/dashboard/src/panels/apps/InstallDropZone.tsx`
  - `handleFile` rejects any extension except `ipa` and `apk`.
  - Visible copy says "Drop IPA or APK here to install".
  - File picker uses `accept=".ipa,.apk"`.
  - Drop handling only reads `e.dataTransfer.files[0]`, which is file-oriented and does not traverse directories.

- `packages/modules/app-management/routes.ts`
  - `/install/:deviceId` uses `await req.file()` and writes one stream to one temp file.
  - No server-side upload kind distinguishes single-file packages from bundle-directory uploads.
  - No path traversal guard exists because single-file upload only joins `tmpDir + filename`; bundle reconstruction will need stricter path validation.

- Documentation still describes only IPA/APK install:
  - `README.md`
  - `packages/cli/README.md`
  - `packages/dashboard/src/components/HomeScreen.tsx`

## Implementation Approach

### 1. Define an explicit upload protocol

Keep existing single-file uploads backwards compatible:

```text
file: <File>   // .ipa or .apk
```

Add bundle-directory uploads:

```text
uploadType: app-bundle
bundleName: MyApp.app
manifest: [{"field":"bundle-file-0","relativePath":"Info.plist"}, ...]
bundle-file-0: <File>
bundle-file-1: <File>
...
```

Do not rely on multipart `filename` preserving slash-separated paths. Use the JSON manifest for relative paths and use part field names to map each stream to its intended destination.

### 2. Reconstruct bundles safely on the server

Server-side validation should be strict:

- `bundleName` must be a basename ending with `.app`.
- Bundle-directory uploads are allowed only for iOS simulators, not Android and not `device.id.startsWith("physical:")`.
- Each manifest relative path must be non-empty, relative, normalized, and must not contain `..`, absolute prefixes, or NUL bytes.
- Reconstructed paths must stay under the target bundle directory after `resolve()`.
- The upload must contain at least one file and should include root `Info.plist`.
- Unknown file fields should be rejected.
- Missing manifest entries should be rejected.
- Temp directory cleanup must remain in `finally`.

Use `req.parts()` from `@fastify/multipart`, which is already installed and typed in the project. The package supports async iteration over file and field parts. Existing single-file behavior can either stay on `req.file()` or be migrated to `req.parts()` as long as the `file` field remains supported.

### 3. Add dashboard directory support without new dependencies

Use built-in browser APIs already available in TypeScript DOM types:

- File picker: use a second hidden input for directory selection and set `directoryInputRef.current.webkitdirectory = true` imperatively because React's input prop typings do not expose `webkitdirectory`.
- Selected directory files expose `File.webkitRelativePath`; validate the first path segment ends in `.app`.
- Drag and drop: inspect `DataTransferItem.webkitGetAsEntry()`, find a `FileSystemDirectoryEntry` whose `name` ends in `.app`, recursively traverse it with `createReader().readEntries()`, and collect files.
- Keep the existing single-file path for dropped/selected `.ipa` and `.apk`.

Do not add a zipping dependency. Multipart streaming preserves low implementation cost and avoids bundling client-side compression code.

### 4. User-visible behavior

Expected dashboard behavior:

- Drop or browse `.ipa` and `.apk` as before.
- Select/drop a directory named `*.app` for iOS simulators.
- Show an explicit error if:
  - The selected directory is not named `*.app`.
  - A `.app` directory is selected for Android.
  - A `.app` directory is selected for physical iOS.
  - The bundle is empty or missing `Info.plist`.

Suggested copy:

- Drop zone: `Drop IPA, APK, or iOS .app bundle here to install`
- Browse button: keep file browse for IPA/APK and add a second compact button for `.app bundle`
- Status: `Installing MyApp.app...`, `Installed MyApp.app`, `Only .ipa, .apk, and iOS simulator .app bundles are accepted`

## Files To Plan

Likely implementation files:

- `packages/modules/app-management/routes.ts`
  - Add bundle upload protocol parsing and safe reconstruction.
  - Preserve single-file upload behavior.

- `packages/dashboard/src/panels/apps/InstallDropZone.tsx`
  - Add accepted package constants.
  - Add directory input and directory drag/drop traversal.
  - Build the bundle multipart payload.
  - Update copy and status messages.

- `README.md`
  - Update App Management feature text and CLI table wording to include iOS simulator `.app` bundles where relevant.

- `packages/cli/README.md`
  - Update install example/docs wording.

- `packages/dashboard/src/components/HomeScreen.tsx`
  - Update quick-start tip.

Potential test/support files:

- `packages/modules/app-management/upload-utils.ts`
  - Good place for manifest validation/path sanitization helpers so they can be unit-tested without spinning up Fastify.

- `packages/modules/app-management/upload-utils.test.ts`
  - Direct `node --import tsx --test` coverage for valid manifests, traversal rejection, absolute path rejection, missing file rejection, and bundle-name rejection.

## Security Notes

This phase introduces directory reconstruction from browser-supplied metadata. Treat the manifest as untrusted input.

Threats to cover in PLAN.md:

- Path traversal writes outside temp dir via `../` or absolute paths.
- Uploading a huge number of parts or large files as a denial-of-service vector.
- Installing a bundle on the wrong platform/device type.
- Leaving partially reconstructed temp files after failure.
- Trusting client-side extension validation without server-side checks.

Recommended mitigations:

- Use `resolve()` containment checks before every write.
- Keep multipart limits and add explicit max files/parts if raising the default part count.
- Validate platform/device type server-side before streaming large bundle payloads where possible.
- Cleanup temp dirs in `finally`.
- Return 400 for validation errors and 500 only for unexpected adapter/install errors.

## Validation Architecture

Automated validation should cover the risky pieces:

1. Unit tests for upload helper path validation:
   - accepts `MyApp.app` plus `Info.plist`
   - rejects `MyApp`
   - rejects `../Info.plist`
   - rejects `/absolute/path`
   - rejects missing manifest/file mappings
   - rejects empty bundle or missing root `Info.plist`

2. Existing core test remains the adapter proof:
   - `packages/core/src/__tests__/ios-adapter.test.ts` already verifies direct `.app` simulator install.

3. Build/type validation for dashboard and route changes:
   - `npm run typecheck`
   - `npm run build -w @simvyn/dashboard`
   - `npm run lint`

4. Manual UAT:
   - Start dashboard.
   - Select a booted iOS simulator.
   - Drag/drop or browse a valid `*.app` simulator build directory.
   - Verify install success and app list refresh.
   - Try the same bundle on Android and confirm a clear rejection.
   - Try the same bundle on physical iOS and confirm a clear rejection.

## Planning Recommendation

Use two plans:

1. Backend upload protocol and safe `.app` reconstruction.
2. Dashboard directory selection/drop support plus documentation updates.

The backend plan should be Wave 1 because it defines the multipart protocol and security validation. The dashboard/docs plan can depend on Wave 1 and should use exactly that protocol.
