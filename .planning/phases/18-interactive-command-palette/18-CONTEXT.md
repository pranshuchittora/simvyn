# Phase 18: Interactive Command Palette - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform one-shot command palette actions into multi-step interactive flows. User selects an action, configures parameters (with autocomplete/search), picks target device(s), then executes — all within the Cmd+K palette.

</domain>

<decisions>
## Implementation Decisions

### Multi-step flow
- Actions follow: select action → configure parameters → select device(s) → execute
- Not all actions need all steps (e.g. screenshot just needs device selection)
- Palette stays open through the flow, content transitions between steps

### Action catalog — multi-step actions
- **Set Locale** — show searchable/autocomplete list of locales → pick device(s) → apply
- **Set Location** — pick from bookmarked locations OR free-text search (calls geocoding API) → pick device(s) → set point location (skip routes for now)
- **Toggle Dark/Light Mode** — pick device(s) → toggle
- **Erase Device** — pick device(s) → confirm → erase
- **Take Screenshot** — pick device(s) → capture (existing, now with device picker)
- Add more useful actions beyond the current 5 (expand action catalog)

### Device selection within palette
- Actions that operate on devices show an inline device picker step
- User can pick one or multiple devices depending on the action
- Overrides the global top-bar selection for that action only (doesn't change global state)

### Location action specifics
- Point location only — no route playback from palette
- Two input modes: select from saved bookmarks/favorites, or type free text that calls Nominatim geocoding API
- Results show as selectable list items

### Claude's Discretion
- Specific animation/transition between steps
- How to render the device picker (checkboxes, chips, list)
- Which additional actions to add beyond the ones specified
- Back navigation pattern (breadcrumb, back arrow, Escape)
- Loading states during API calls (geocoding, action execution)

</decisions>

<specifics>
## Specific Ideas

- Actions should appear above Pages in the palette (already shipped)
- Recent history section at top when no search (already shipped)
- The flow should feel like Raycast or Linear's command palette — fast, keyboard-driven, each step narrows the context

</specifics>

<deferred>
## Deferred Ideas

- Route playback from command palette — keep in Location module panel only
- Custom action scripting/macros — future feature

</deferred>

---

*Phase: 18-interactive-command-palette*
*Context gathered: 2026-02-27*
