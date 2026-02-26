---
phase: 11-location-module-rewrite
plan: 02
subsystem: ui
tags: [leaflet, react-leaflet, location, map, markers, playback, search, geocoding, gpx, kml]

requires:
  - phase: 11-location-module-rewrite
    provides: Zustand stores (location, playback, route, favorites) and route-parser utility from plan 01
provides:
  - 14 production-quality location UI components migrated from sim-location
  - 6 custom Leaflet DivIcon marker factories (locationPin, device, mixedDevice, playback, bookmark, waypoint)
  - 6 map tile styles (Dark, Voyager, Contrast, Light, Satellite, Street)
  - Coordinate input parsing in SearchBar
  - Real-world speed model PlaybackControls with sendLocation prop pattern
  - Draggable waypoint markers in RouteLayer
affects: [11-03, 11-04]

tech-stack:
  added: []
  patterns: [sendLocation prop pattern for WS message delegation to parent, inline DeviceInfo type for graceful degradation when global Device type lacks lastLocation]

key-files:
  created:
    - packages/dashboard/src/panels/location/MapStyleSwitcher.tsx
    - packages/dashboard/src/panels/location/BookmarkMarkers.tsx
    - packages/dashboard/src/panels/location/CursorPosition.tsx
    - packages/dashboard/src/panels/location/DeviceMarkers.tsx
    - packages/dashboard/src/panels/location/MyLocationButton.tsx
  modified:
    - packages/dashboard/src/panels/location/markers.ts
    - packages/dashboard/src/panels/location/MapView.tsx
    - packages/dashboard/src/panels/location/SearchBar.tsx
    - packages/dashboard/src/panels/location/ModeSelector.tsx
    - packages/dashboard/src/panels/location/FileImportButton.tsx
    - packages/dashboard/src/panels/location/PlaybackControls.tsx
    - packages/dashboard/src/panels/location/LocationMarker.tsx
    - packages/dashboard/src/panels/location/PlaybackMarker.tsx
    - packages/dashboard/src/panels/location/RouteLayer.tsx

key-decisions:
  - "PlaybackControls accepts sendLocation(type, payload) prop instead of raw wsRef — parent wraps WS envelope format"
  - "DeviceMarkers uses inline DeviceInfo type with lastLocation field — graceful degradation if global Device type lacks it"
  - "Named exports for all components (not default exports) — consistent with sim-location pattern"

patterns-established:
  - "sendLocation prop pattern: component sends flat messages, parent wraps in WS envelope"
  - "Inline type definition for cross-store type mismatches — avoid breaking changes in global types"

requirements-completed: [LOC-REWRITE-01, LOC-REWRITE-02]

duration: 13min
completed: 2026-02-26
---

# Phase 11 Plan 02: Component Migration Summary

**Replaced 7 location components and added 7 new ones from sim-location: 6 marker icon factories, 6 tile styles, draggable waypoint RouteLayer, coordinate-parsing SearchBar, real-world speed PlaybackControls with sendLocation pattern**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-26T14:04:44Z
- **Completed:** 2026-02-26T14:18:35Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Replaced simplified marker scaffolds with 6 rich DivIcon factories: locationPin (blue SVG pin), device (platform-colored with iOS/Android SVG logos), mixedDevice (gradient), playback (animated green dot), bookmark (emoji or yellow dot), waypoint (numbered orange circles)
- Added MapStyleSwitcher with 6 tile styles (Dark, Voyager, Contrast, Light, Satellite, Street) and both standalone component and Leaflet control versions
- Added BookmarkMarkers, CursorPosition, DeviceMarkers, MyLocationButton as new map overlay components
- Replaced MapView with full sim-location version: MapEventHandler, MapController, RouteController, MinZoomEnforcer, MapStyleControl, MyLocationMarker, all sub-layers
- Replaced SearchBar with coordinate regex parsing, debounced geocoding with abort controller, autocomplete dropdown, clear button
- Replaced PlaybackControls with real-world speed model: SPEED_PRESETS, custom speed input, km/h vs m/s toggle, 1x-10x multipliers, loop toggle, progress bar — using sendLocation prop pattern
- Replaced ModeSelector, FileImportButton, LocationMarker, PlaybackMarker, RouteLayer with full sim-location versions including draggable waypoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace markers.ts, MapStyleSwitcher, and map infrastructure components** - `34d86ef` (feat)
2. **Task 2: Replace MapView, SearchBar, ModeSelector, FileImportButton, PlaybackControls** - `2987d8f` (feat)

## Files Created/Modified
- `packages/dashboard/src/panels/location/markers.ts` - 6 DivIcon factories with SVG and CSS styling
- `packages/dashboard/src/panels/location/MapStyleSwitcher.tsx` - TileStyle interface, TILE_STYLES array, standalone switcher component
- `packages/dashboard/src/panels/location/BookmarkMarkers.tsx` - Renders saved favorites as emoji markers
- `packages/dashboard/src/panels/location/CursorPosition.tsx` - Lat/lon readout following cursor
- `packages/dashboard/src/panels/location/DeviceMarkers.tsx` - Platform-grouped device markers with ios/android/mixed icons
- `packages/dashboard/src/panels/location/MyLocationButton.tsx` - Leaflet custom control using navigator.geolocation
- `packages/dashboard/src/panels/location/LocationMarker.tsx` - Pin with popup showing coordinates and reverse geocode
- `packages/dashboard/src/panels/location/PlaybackMarker.tsx` - Green animated dot tracking playback position
- `packages/dashboard/src/panels/location/RouteLayer.tsx` - Draggable numbered waypoint markers with polyline
- `packages/dashboard/src/panels/location/MapView.tsx` - Full MapContainer with all overlays and tile switching
- `packages/dashboard/src/panels/location/SearchBar.tsx` - Geocoding autocomplete with coordinate parsing
- `packages/dashboard/src/panels/location/ModeSelector.tsx` - Point/route toggle using route-store
- `packages/dashboard/src/panels/location/FileImportButton.tsx` - GPX/KML import with toast feedback
- `packages/dashboard/src/panels/location/PlaybackControls.tsx` - Full speed model with sendLocation pattern

## Decisions Made
- PlaybackControls uses `sendLocation(type, payload)` prop instead of raw WebSocket ref — parent component wraps messages in WS envelope format, keeping WS internals out of the component
- DeviceMarkers defines inline `DeviceInfo` type with `lastLocation` field — simvyn's global `Device` type doesn't have `lastLocation`, so the component gracefully degrades (shows no device markers if field absent)
- All components use named exports (not default) — consistent with sim-location codebase pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 14 location components ready for LocationPanel orchestrator in plan 03
- Components use stores from plan 01 and are ready to be composed into the panel layout
- PlaybackControls needs parent to provide `sendLocation` wrapper around `useWs().send()`

---
*Phase: 11-location-module-rewrite*
*Completed: 2026-02-26*
