---
phase: 31-ios-simulator-app-install-support
plan: 02
subsystem: ui
tags: [react, dashboard, app-management, app-bundle, documentation]
requires:
  - phase: 31-01
    provides: "Backend app-bundle multipart protocol and safe .app reconstruction"
provides:
  - "Dashboard install drop zone support for browsing and dropping iOS simulator .app bundles"
  - "Client-side platform guard for .app bundles on Android and physical iOS devices"
  - "Updated dashboard, CLI, and README copy for app bundle install support"
affects: [app-management, dashboard-home, cli-docs]
tech-stack:
  added: []
  patterns:
    - "Use a dedicated hidden directory input for .app bundle selection"
    - "Use FileSystemDirectoryEntry traversal for dropped app bundle directories"
key-files:
  created: []
  modified:
    - packages/dashboard/src/panels/AppPanel.tsx
    - packages/dashboard/src/panels/apps/InstallDropZone.tsx
    - packages/dashboard/src/components/HomeScreen.tsx
    - packages/modules/app-management/manifest.ts
    - README.md
    - packages/cli/README.md
key-decisions:
  - "Kept IPA/APK browsing as the primary file action and added a separate .app bundle browse action."
  - "Validated .app bundle platform support in the UI before upload, while keeping server-side enforcement from 31-01."
  - "Used explicit FormData field names matching the backend protocol instead of adding a client-side archive step."
patterns-established:
  - "Directory bundle uploads should submit `uploadType`, `bundleName`, `manifest`, and `bundle-file-N` fields."
  - "Dashboard upload surfaces should retain the existing single-file multipart protocol for existing package formats."
requirements-completed: [APP-BUNDLE-UI, APP-BUNDLE-DOCS]
duration: 24min
completed: 2026-05-01
---

# Phase 31: Dashboard App Bundle Install Summary

**App Management drop zone now installs IPA/APK files and iOS simulator `.app` directories through separate browse/drop paths**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-30T20:53:00Z
- **Completed:** 2026-04-30T21:17:34Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Passed selected device platform and physical-iOS metadata from `AppPanel` into `InstallDropZone`.
- Added `.app` bundle directory browse and drag/drop traversal, including `Info.plist` validation and wrong-platform errors.
- Built app-bundle `FormData` requests using the backend `uploadType=app-bundle` protocol from Plan 31-01.
- Updated dashboard tips, module CLI description, README, and CLI README to mention iOS simulator `.app` support.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pass selected device metadata into InstallDropZone** - `c9e39ed` (feat)
2. **Task 2: Add .app directory browse and drag/drop upload protocol** - `240bf34` (feat)
3. **Task 3: Update help text and documentation** - `63cffe8` (docs)

Additional plan support:

- `9277e40` - Annotated the FormData protocol boundary so GSD key-link verification can connect the dashboard fields to `packages/modules/app-management/routes.ts`.

## Files Created/Modified

- `packages/dashboard/src/panels/AppPanel.tsx` - Looks up the selected device and passes platform metadata into the install drop zone.
- `packages/dashboard/src/panels/apps/InstallDropZone.tsx` - Supports IPA/APK file uploads, `.app` directory browse, `.app` directory drop traversal, and app-bundle FormData construction.
- `packages/dashboard/src/components/HomeScreen.tsx` - Updates the rotating Apps module tip.
- `packages/modules/app-management/manifest.ts` - Updates CLI command description for install path support.
- `README.md` - Updates App Management and CLI table wording.
- `packages/cli/README.md` - Adds app install path support sentence.

## Decisions Made

- Used two visible browse actions instead of overloading the existing file input with unsupported directory props.
- Preferred exactly one dropped `.app` directory over file fallback, matching the UI-SPEC contract.
- Kept unsupported package and platform errors inline in the existing status line rather than adding a new notification system.

## Deviations from Plan

None - implementation scope matched the plan.

## Issues Encountered

`npm run typecheck` remains blocked by pre-existing repo-wide TypeScript configuration issues:

- Core tests import `.ts` files without `allowImportingTsExtensions`.
- CLI and root TypeScript builds include files outside their configured `rootDir`.

Successful verification for this plan:

- `npm run build -w @simvyn/dashboard` - passed
- `npm run lint` - passed
- `node --import tsx --test packages/modules/app-management/upload-utils.test.ts` - passed
- `gsd-sdk query verify.key-links .planning/phases/31-ios-simulator-app-install-support/31-02-PLAN.md` - passed
- `rg "iOS simulator \\.app|IPA, APK" README.md packages/cli/README.md packages/dashboard/src/components/HomeScreen.tsx packages/modules/app-management/manifest.ts` - passed

Manual UAT was not run in this session because it requires a real simulator bundle selection/drop flow in the browser.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 31 is ready for final verification. Remaining validation is manual UAT with a booted iOS simulator and a real `.app` bundle.

---

*Phase: 31-ios-simulator-app-install-support*
*Completed: 2026-05-01*
