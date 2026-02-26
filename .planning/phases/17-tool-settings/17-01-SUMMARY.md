---
phase: 17-tool-settings
plan: 01
subsystem: ui
tags: [react, fastify, settings, storage, data-management]

requires:
  - phase: 14-module-icons
    provides: moduleIconMap/moduleLabelMap icon system for sidebar display
  - phase: 13-url-routing
    provides: URL-based routing so /tool-settings resolves to panel
provides:
  - Tool settings API endpoints (config read/write, storage usage, data wipe)
  - ToolSettingsPanel dashboard component with server config, storage, and data management
  - tool-settings module registry injection for sidebar visibility
affects: []

tech-stack:
  added: []
  patterns: [module-registry-injection-without-module-dir, non-device-panel-pattern]

key-files:
  created:
    - packages/dashboard/src/panels/ToolSettingsPanel.tsx
  modified:
    - packages/server/src/app.ts
    - packages/dashboard/src/App.tsx
    - packages/dashboard/src/components/icons/module-icons.tsx

key-decisions:
  - "Module registry injection checks hasDecorator('moduleRegistry') — creates standalone registry with /api/modules route if moduleLoaderPlugin wasn't registered (no modulesDir)"
  - "Tool config saved via createModuleStorage('tool-settings') — reuses existing storage pattern, config persists at ~/.simvyn/tool-settings/config.json"
  - "Recursive calculateDirSize helper for storage usage — simple readdir+stat walk with try/catch for robustness"

patterns-established:
  - "Non-device panel pattern: ToolSettingsPanel has no device selector dependency, operates on server-level config"
  - "Module registry injection: synthetic modules added to registry without full module manifest (no modulesDir required)"

requirements-completed: [TSET-01, TSET-02, TSET-03, TSET-04, TSET-05]

duration: 3min
completed: 2026-02-27
---

# Phase 17 Plan 01: Tool Settings Summary

**Tool settings page with server config (port, auto-open), ~/.simvyn/ storage usage display, and data wipe — injected as synthetic module in sidebar**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T21:23:35Z
- **Completed:** 2026-02-26T21:26:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Tool settings API endpoints for config CRUD, storage calculation, and full data wipe
- ToolSettingsPanel with server configuration, storage usage, and destructive data management sections
- Wrench icon (orange #F59E0B) in sidebar dock with "Tool Settings" label
- Module registry injection handles both with-modulesDir and without-modulesDir cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tool-settings API endpoints and inject into module registry** - `468b95e` (feat)
2. **Task 2: Create ToolSettingsPanel with config display, data wipe, and storage usage** - `7456757` (feat)

## Files Created/Modified
- `packages/server/src/app.ts` - Tool settings API routes (config, storage, data wipe) and module registry injection
- `packages/dashboard/src/panels/ToolSettingsPanel.tsx` - Tool settings panel with 3 sections (config, storage, data management)
- `packages/dashboard/src/App.tsx` - Panel registration import
- `packages/dashboard/src/components/icons/module-icons.tsx` - Wrench icon and label for tool-settings

## Decisions Made
- Module registry injection checks `fastify.hasDecorator('moduleRegistry')` and creates standalone registry with `/api/modules` route when moduleLoaderPlugin wasn't registered — ensures tool-settings appears in sidebar regardless of modulesDir configuration
- Config persisted via `createModuleStorage("tool-settings")` at `~/.simvyn/tool-settings/config.json` — consistent with all other module storage patterns
- Storage size calculated with recursive readdir+stat — simple, no dependencies, try/catch for robustness against permission errors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v1.1 milestone phases (13-17) now complete
- Phase 12 still has incomplete plans (3/7) from v1.0 scope

---
*Phase: 17-tool-settings*
*Completed: 2026-02-27*
