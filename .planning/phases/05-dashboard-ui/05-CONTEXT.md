# Phase 5: Dashboard UI - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Apply the Apple Liquid Glass design system to the existing dashboard shell and module panels. Dark gradient backgrounds, frosted glass panels (backdrop-filter: blur + saturate), muted accent colors, spring animations, Inter font, responsive layout, and toast notifications. The dashboard shell and 4 module panels (device management, location, app management, log viewer) already exist from Phases 1-4 — this phase makes them look polished and cohesive.

</domain>

<decisions>
## Implementation Decisions

### Sidebar — macOS Dock style
- Vertical dock pinned to the left edge, not a traditional sidebar
- Icons only, no text labels — tooltip with module name on hover
- Glass/translucent background for the dock bar itself
- Subtle hover magnification (~1.2x scale on hovered icon, minimal neighbor effect) — dev tool, not playful
- Glowing dot indicator beside the active module icon (like macOS Dock running app indicator)
- Lucide icons for now (already used in module manifests: `scroll-text`, `app-window`, `map-pin`, etc.) — custom SVGs will replace these in a future iteration

### Claude's Discretion
- Glass effect intensity and layering (how sidebar, top bar, and module panels differentiate visually)
- Background gradient specifics (colors, direction, stops)
- Animation and transition style (spring bounciness, panel switching effects, micro-interactions)
- Toast notification design (position, stacking, duration, action buttons)
- Color palette distribution (which accent colors for what)
- Typography scale and spacing
- Responsive breakpoints and adaptation strategy

</decisions>

<specifics>
## Specific Ideas

- "The sidebar should be like macOS Dock" — this is the primary design reference for the module switcher
- Icons will eventually be replaced with custom illustrated SVGs, so the icon system should be designed to swap Lucide for custom SVGs cleanly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-dashboard-ui*
*Context gathered: 2026-02-26*
