---
phase: 31-ios-simulator-app-install-support
plan: 01
subsystem: api
tags: [fastify, multipart, ios-simulator, app-bundle, upload-validation]
requires: []
provides:
  - "Safe multipart app-bundle upload protocol for iOS simulator .app directories"
  - "Tested helper APIs for bundle manifest parsing, bundle-name validation, and path containment"
  - "Server-side rejection of .app bundle installs on Android and physical iOS devices"
affects: [dashboard-install-drop-zone, app-management, ios-installs]
tech-stack:
  added: []
  patterns:
    - "Use explicit multipart manifests for directory uploads instead of trusting filenames"
    - "Stream uploaded bundle files to temp staging paths before validated reconstruction"
key-files:
  created:
    - packages/modules/app-management/upload-utils.ts
    - packages/modules/app-management/upload-utils.test.ts
  modified:
    - packages/modules/app-management/routes.ts
key-decisions:
  - "Preserved the existing single-file multipart field name `file` for IPA/APK installs."
  - "Added a separate `uploadType=app-bundle` protocol for directory bundle uploads."
  - "Validated manifest paths server-side before moving staged files into the reconstructed .app directory."
patterns-established:
  - "Directory uploads must provide a JSON manifest mapping file fields to relative paths."
  - "Bundle paths are resolved under a temp bundle root and rejected unless the final path stays inside that root."
requirements-completed: [APP-BUNDLE-UPLOAD, APP-BUNDLE-SECURITY]
duration: 32min
completed: 2026-05-01
---

# Phase 31: Backend App Bundle Upload Summary

**Fastify app install route now accepts safe multipart iOS simulator `.app` bundle uploads while preserving existing IPA/APK single-file installs**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-30T20:39:00Z
- **Completed:** 2026-04-30T21:11:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added testable upload helper APIs for safe bundle names, manifest parsing, duplicate detection, root `Info.plist` enforcement, and traversal-safe path resolution.
- Replaced the install route's single `req.file()` reader with `req.parts()` streaming that still supports the existing `file` field.
- Added server-side `uploadType=app-bundle` handling that reconstructs uploaded files under `tmpDir/{bundleName}` and rejects `.app` bundle installs unless the target is an iOS simulator.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add testable app-bundle upload validation helpers** - `1105ca8` (feat)
2. **Task 2: Extend the app install route to reconstruct .app bundles safely** - `4dea404` (feat)

## Files Created/Modified

- `packages/modules/app-management/upload-utils.ts` - App bundle manifest, bundle-name, and path validation helpers.
- `packages/modules/app-management/upload-utils.test.ts` - Node test coverage for safe names, malformed manifests, duplicates, missing `Info.plist`, and path traversal.
- `packages/modules/app-management/routes.ts` - Multipart install route supporting both single-file installs and reconstructed `.app` bundle uploads.

## Decisions Made

- Preserved the existing `file` multipart field for IPA/APK compatibility.
- Used manifest field names as the source of truth for bundle reconstruction instead of trusting multipart filenames.
- Returned HTTP 400 for validation failures via `AppBundleUploadError`; adapter and install failures remain HTTP 500.

## Deviations from Plan

None - implementation scope matched the plan.

## Issues Encountered

`npm run typecheck` is blocked by pre-existing repo-wide TypeScript configuration issues, including `.ts` test import errors and CLI rootDir/project-reference failures. The changed backend files were validated with:

- `node --import tsx --test packages/modules/app-management/upload-utils.test.ts` - passed
- `npx tsc --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck packages/modules/app-management/routes.ts packages/modules/app-management/upload-utils.ts` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The backend multipart protocol is ready for the dashboard to submit `.app` directory bundles using `uploadType`, `bundleName`, `manifest`, and `bundle-file-N` fields.

---

*Phase: 31-ios-simulator-app-install-support*
*Completed: 2026-05-01*
