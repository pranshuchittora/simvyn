---
phase: 10-post-v1-bugfixes
plan: 01
subsystem: ui
tags: [css, z-index, tailwind, leaflet, layout, stacking-context]

requires:
  - phase: 05-dashboard-ui
    provides: "Glass panel design system, dock sidebar, TopBar, ModuleShell"
  - phase: 02-location-module
    provides: "LocationPanel with Leaflet map"
provides:
  - "Correct z-index stacking for dock tooltips over module content"
  - "Correct z-index stacking for TopBar dropdown over module content"
  - "Working height chain for location module map rendering"
affects: []

tech-stack:
  added: []
  patterns:
    - "z-index layering: sidebar z-20, header z-30, content default"

key-files:
  created: []
  modified:
    - packages/dashboard/src/main.css
    - packages/dashboard/src/components/TopBar.tsx
    - packages/dashboard/src/components/ModuleShell.tsx

key-decisions:
  - "Raise sidebar/header z-index rather than lowering content — avoids touching ModuleShell overflow behavior"
  - "h-full on AnimatedPanel motion.div rather than restructuring LocationPanel — minimal change, fixes height chain"

patterns-established:
  - "Z-index stacking order: sidebar(20) < header(30) < tooltips/dropdowns(50+) < modals"

requirements-completed: [BUG-01, BUG-02, BUG-03]

duration: 1min
completed: 2026-02-26
---

# Phase 10 Plan 01: Post-v1 Bugfixes Summary

**Fixed z-index stacking for dock tooltips and TopBar dropdown, restored height chain for location module map rendering**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-26T13:11:37Z
- **Completed:** 2026-02-26T13:12:52Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Dock sidebar tooltips now render above module content (z-index 20 on sidebar)
- TopBar device selector dropdown renders above module content (z-index 30 on header)
- Location module map renders at full height with OpenStreetMap tiles visible (h-full on AnimatedPanel)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix z-index stacking for dock tooltips and device selector dropdown** - `4ccf35c` (fix)
2. **Task 2: Fix location module map rendering (height chain)** - `82de4b6` (fix)

## Files Created/Modified
- `packages/dashboard/src/main.css` - Added position: relative and z-index: 20 to .dock-sidebar
- `packages/dashboard/src/components/TopBar.tsx` - Added relative z-30 to header element
- `packages/dashboard/src/components/ModuleShell.tsx` - Added h-full to AnimatedPanel motion.div

## Decisions Made
- Raised sidebar/header z-index rather than lowering content z-index — avoids changing ModuleShell overflow behavior which other panels depend on
- Applied h-full to AnimatedPanel motion.div rather than restructuring LocationPanel — minimal, targeted fix that restores the height chain without affecting other panels

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 visual bugs fixed, dashboard is usable
- Ready for additional bugfix plans if more issues are found

## Self-Check: PASSED

All key files exist on disk. All commit hashes found in git log.

---
*Phase: 10-post-v1-bugfixes*
*Completed: 2026-02-26*
