---
phase: 23-collections-foundation
plan: 01
subsystem: collections
tags: [action-registry, platform-adapter, typescript, collections]

requires:
  - phase: 01-foundation
    provides: PlatformAdapter interface with device action methods
provides:
  - Collection and ActionDescriptor type definitions in @simvyn/types
  - Action registry with 14 typed device action descriptors
  - Collections module scaffold (package.json, tsconfig.json, manifest)
affects: [24-execution-engine, 25-collection-builder-ui, 26-apply-modal]

tech-stack:
  added: []
  patterns: [action-descriptor-registry, adapter-method-dispatch, isSupported-guard]

key-files:
  created:
    - packages/types/src/collections.ts
    - packages/modules/collections/action-registry.ts
    - packages/modules/collections/manifest.ts
    - packages/modules/collections/package.json
    - packages/modules/collections/tsconfig.json
  modified:
    - packages/types/src/index.ts

key-decisions:
  - "Action descriptors use direct adapter method calls (not HTTP routes) for execution — avoids coupling to server"
  - "isSupported checks adapter method presence with !! — consistent with capabilities endpoint pattern"
  - "set-status-bar overrides param is JSON string parsed at execution time — matches flexible adapter signature"

patterns-established:
  - "ActionDescriptor pattern: id, label, description, module, params, execute(adapter, deviceId, params), isSupported(adapter)"
  - "Action registry as flat array with getActionDescriptors() accessor function"

requirements-completed: [COLL-05]

duration: 2min
completed: 2026-03-04
---

# Phase 23 Plan 01: Types & Action Registry Summary

**Collection/ActionDescriptor types with 14-action registry covering all device adapter methods, plus collections module scaffold**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T11:12:48Z
- **Completed:** 2026-03-04T11:15:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Collection types (Collection, CollectionStep, ActionDescriptor, ActionParam) defined with schemaVersion: 1 literal
- Action registry with all 14 device actions — each with typed params, execute function, and isSupported guard
- Collections module scaffold following established deep-links module pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Collection types and action registry types** - `dcc62f6` (feat)
2. **Task 2: Action registry and module scaffold** - `b65061f` (feat)

## Files Created/Modified
- `packages/types/src/collections.ts` - ActionParam, ActionDescriptor, CollectionStep, Collection type definitions
- `packages/types/src/index.ts` - Re-exports new collection types
- `packages/modules/collections/action-registry.ts` - 14 action descriptors with execute/isSupported functions
- `packages/modules/collections/manifest.ts` - Minimal SimvynModule manifest (routes added in Plan 02)
- `packages/modules/collections/package.json` - Module package with workspace dependencies
- `packages/modules/collections/tsconfig.json` - TypeScript config with types/core project references

## Decisions Made
- Action descriptors call PlatformAdapter methods directly (not HTTP routes) — avoids coupling to server, enables both CLI and API execution paths
- isSupported uses `!!adapter.methodName` pattern — consistent with existing capabilities endpoint derivation
- set-status-bar overrides param is string type with JSON.parse at execution — matches adapter's `Record<string, string>` signature

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Types and action registry ready for Plan 02 (CRUD routes and storage)
- Module scaffold has empty register() awaiting route registration

---
*Phase: 23-collections-foundation*
*Completed: 2026-03-04*
