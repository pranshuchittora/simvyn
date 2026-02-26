# Phase 12: Liquid Glass UI Refactor - Research

**Researched:** 2026-02-26
**Domain:** CSS design system / glassmorphism UI / Apple Liquid Glass
**Confidence:** HIGH

## Summary

The dashboard has a well-defined glass design token system in `main.css` (256 lines) and a comprehensive reference implementation in `location-panel.css` (1303 lines). The shell components (TopBar, Sidebar, DeviceSelector, ModuleShell) already use glass CSS classes and are largely compliant. The 12 module panels, however, use a hybrid of Tailwind utility classes and the shared glass utilities inconsistently — most panels use `glass-panel` for containers but rely on raw Tailwind for buttons, inputs, selects, tabs, and badges rather than the shared `.glass-button`, `.glass-input`, `.glass-select` classes.

Apple's Liquid Glass design (WWDC25 session 219) defines a material system built on: lensing (light bending through transparent layers), adaptive tinting (light/dark flipping based on content behind), deep shadows with inset highlights, rounded floating forms, and fluid spring-based motion. The existing `main.css` already captures the core visual properties well with `backdrop-filter: blur(20px) saturate(1.4)`, rgba glass backgrounds, inset highlights, and deep shadows. The primary gap is that many panels don't USE these shared utilities and instead inline similar-but-inconsistent values via Tailwind arbitrary values.

**Primary recommendation:** Expand `main.css` with additional shared utility classes (`.glass-tab-bar`, `.glass-table`, `.glass-badge`, `.glass-section`, `.glass-drop-zone`, `.glass-select` variants), then systematically convert each panel from inline Tailwind to these shared classes. No new CSS files needed per panel — the location-panel.css is special because it overrides Leaflet third-party styles.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GLASS-01 | Design tokens & shared CSS — main.css as single source of truth | main.css already has tokens + 5 utility classes. Needs ~6 more utilities extracted from recurring panel patterns (tab bar, table, badge, section, drop zone, textarea) |
| GLASS-02 | Shell components — TopBar, Sidebar, DeviceSelector, ModuleShell | TopBar uses `.top-bar`, Sidebar uses `.dock-sidebar`/`.dock-icon`, DeviceSelector uses `.glass-button`/`.glass-panel`. Already 90% compliant. DeviceSelector inline `style={{boxShadow}}` should use CSS class. ModuleShell skeleton needs glass-panel. |
| GLASS-03 | All module panels — 12 panels + their sub-components (total ~25 files) | Full audit below. Most panels use glass-panel for containers but inline Tailwind for buttons/inputs/selects/tabs/badges. Conversion is mechanical — replace inline patterns with shared classes. |
| GLASS-04 | Visual consistency audit — spacing, typography, animation patterns | Inconsistencies found: panel padding varies (p-4/p-6), header h1 sizing consistent (text-base font-medium), select styling inconsistent (some use glass-select, most use raw Tailwind), button styling fragmented across 4+ patterns. |
</phase_requirements>

## Standard Stack

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | @theme directive | Design token definition | Already configured, oklch color space support |
| CSS custom properties | native | Design token consumption | Zero runtime cost, CSS-native |
| backdrop-filter | native | Glass blur effect | Supported in all modern browsers |

### Supporting (already in use)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Framer Motion | existing | Panel entry animations | ModuleShell spring animations |
| Lucide React | existing | Icon system | All panel icons |

### No New Dependencies Needed
This is purely a CSS refactoring phase. No new libraries required.

## Architecture Patterns

### Existing Design Token Structure (main.css @theme)
```
@theme {
  --color-bg-base       oklch(0.05 0.01 270)
  --color-bg-surface    oklch(0.12 0.012 270)
  --color-bg-elevated   oklch(0.16 0.015 270)
  --color-glass         oklch(0.14 0.015 270 / 0.55)
  --color-glass-hover   oklch(0.18 0.015 270 / 0.7)
  --color-glass-border  oklch(1 0 0 / 0.08)
  --color-glass-border-hover  oklch(1 0 0 / 0.18)
  --color-accent-blue   oklch(0.7 0.12 240)
  --color-accent-purple oklch(0.65 0.12 290)
  --color-accent-teal   oklch(0.72 0.1 190)
  --color-text-primary  oklch(0.93 0.005 260)
  --color-text-secondary oklch(0.65 0.005 260)
  --color-text-muted    oklch(0.4 0.005 260)
  --color-border        oklch(1 0 0 / 0.08)
  --radius-panel        14px
  --radius-button       10px
}
```

### Existing Utility Classes in main.css
| Class | Properties | Used By |
|-------|-----------|---------|
| `.glass-panel` | backdrop-filter, bg, border, border-radius, box-shadow, color | Most panels (containers) |
| `.glass-button` | bg, border, border-radius, padding, color, cursor, transitions, hover | DeviceSelector, some buttons |
| `.glass-input` | bg, color, border, padding, border-radius, placeholder, focus | Rarely used — panels inline it |
| `.glass-select` | bg, color, border, padding, border-radius, cursor | Rarely used — panels inline it |
| `.top-bar` | backdrop-filter, bg, border-bottom | TopBar |
| `.dock-sidebar` | flex col, width, backdrop-filter, bg, border-right | Sidebar |
| `.dock-icon` | flex center, w/h, border-radius, transitions, active/hover states | Sidebar icons |

### Pattern 1: The Glass Surface Formula
**What:** Every glass element uses the same 5-property formula
**When to use:** Any floating/elevated UI element
```css
/* The canonical glass surface — used by ALL glass elements */
backdrop-filter: blur(20px) saturate(1.4);
-webkit-backdrop-filter: blur(20px) saturate(1.4);
background: rgba(30, 30, 40, 0.55);  /* or var(--color-glass) */
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 0.5px 0 rgba(255,255,255,0.06);
border-radius: 14px;  /* var(--radius-panel) */
color: #e8e8ed;  /* var(--color-text-primary) */
```

### Pattern 2: The Inline Tailwind Anti-Pattern (what needs fixing)
**What:** Panels inline glass-like properties via Tailwind instead of using `.glass-panel`
**Example (repeated in ~10 panels):**
```tsx
// BAD: inline Tailwind that partially duplicates glass-select
className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[200px] truncate"
```
This pattern appears in EVERY panel's device selector `<select>` element. Should use `.glass-select`.

### Pattern 3: Recurring UI Patterns That Need Shared Classes
| Pattern | Occurrence | Proposed Class |
|---------|-----------|---------------|
| Device selector `<select>` | Every panel (11x) | `.glass-select` (exists but unused) |
| Panel header (h1 + actions) | Every panel | `.panel-header` (standardize spacing) |
| "No device selected" empty state | Every panel | `.glass-empty-state` |
| Tab bar (segmented control) | Database, could be reused | `.glass-tab-bar` + `.glass-tab` |
| Data table (thead/tbody) | Apps, FileBrowser, Database (5x) | `.glass-table` |
| Status badge (colored pill) | Device, Apps, Database, Settings | `.glass-badge` + color variants |
| Drop zone (dashed border upload) | Apps, Media | `.glass-drop-zone` |
| Primary action button (blue bg) | All panels | `.glass-button-primary` |
| Destructive action button (red) | Device, Apps, Permissions | `.glass-button-destructive` |
| Textarea (code/json editor) | Push, SQL, Clipboard, FileEditor | `.glass-textarea` |

### Anti-Patterns to Avoid
- **Glass on glass:** Never stack `.glass-panel` inside `.glass-panel` — use transparent fills for nested elements (Apple principle)
- **Mixing oklch and rgba:** location-panel.css uses rgba, main.css tokens use oklch. The shared classes should use rgba for visual consistency with the reference implementation
- **Redundant backdrop-filter:** Don't apply backdrop-filter to elements inside a glass panel — only the outermost container needs it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glass blur effect | Per-component backdrop-filter | `.glass-panel` class | Single source of truth, consistent blur/saturate values |
| Button variants | Inline Tailwind per button | `.glass-button` + `.glass-button-primary` + `.glass-button-destructive` | 15+ buttons with inconsistent hover states currently |
| Select styling | Per-select Tailwind | `.glass-select` (already exists, just unused) | Identical select styling in 11 panels |
| Table styling | Per-table inline classes | `.glass-table` utility | 5 tables with near-identical styling |

## Common Pitfalls

### Pitfall 1: location-panel.css has DUPLICATE class definitions
**What goes wrong:** location-panel.css redefines `.glass-panel` and `.glass-button` (lines 366-394)
**Why it happens:** It was built as a standalone reference, not integrated with main.css
**How to avoid:** During this refactor, remove the duplicate definitions from location-panel.css and ensure it imports from main.css (which it already does via Tailwind)
**Warning signs:** CSS specificity conflicts, visual differences between location panel and others

### Pitfall 2: Inline `style={{}}` attributes in JSX
**What goes wrong:** DeviceSelector.tsx line 52 has `style={{ boxShadow: "..." }}` — can't be overridden by CSS classes
**How to avoid:** Move all inline styles to CSS classes
**Warning signs:** Search for `style={{` in component files

### Pitfall 3: Breaking existing functionality while restyling
**What goes wrong:** Changing classNames can break conditional styling (active states, disabled states, etc.)
**How to avoid:** Keep all conditional logic; only replace the static class portions
**Warning signs:** Test hover/active/disabled states after each panel conversion

### Pitfall 4: Inconsistent border-radius values
**What goes wrong:** location-panel.css uses border-radius: 16px for panels, main.css uses 14px (`--radius-panel`)
**How to avoid:** Standardize on `var(--radius-panel)` = 14px everywhere, or update token to 16px to match reference
**Warning signs:** Visible radius differences between panels

### Pitfall 5: Table header sticky backgrounds
**What goes wrong:** TableViewer.tsx uses `bg-bg-surface/90 backdrop-blur-sm` for sticky headers — a different glass treatment
**How to avoid:** Create a `.glass-table-header` utility that uses the standard glass formula
**Warning signs:** Table headers look different from other glass surfaces

## Code Examples

### Proposed New Utility Classes for main.css

```css
/* Primary action button (blue) */
.glass-button-primary {
  background: rgba(0, 122, 255, 0.3);
  border: 1px solid rgba(0, 122, 255, 0.4);
  border-radius: var(--radius-button);
  padding: 6px 12px;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
  transition: background 0.2s ease;
}
.glass-button-primary:hover {
  background: rgba(0, 122, 255, 0.45);
}
.glass-button-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Destructive button (red) */
.glass-button-destructive {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border: 1px solid rgba(255, 107, 107, 0.25);
  border-radius: var(--radius-button);
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
  transition: background 0.15s ease;
}
.glass-button-destructive:hover {
  background: rgba(255, 107, 107, 0.3);
}

/* Glass table */
.glass-table {
  width: 100%;
  font-size: 0.875rem;
}
.glass-table thead tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.glass-table thead th {
  padding: 8px 16px;
  font-weight: 500;
}
.glass-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.1s ease;
}
.glass-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
.glass-table td {
  padding: 6px 16px;
}

/* Glass tab bar */
.glass-tab-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.04);
  width: fit-content;
}
.glass-tab {
  padding: 6px 16px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  background: transparent;
  font-family: inherit;
}
.glass-tab.active {
  background: var(--color-glass);
  color: var(--color-text-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
.glass-tab:hover:not(.active) {
  color: var(--color-text-primary);
}

/* Glass drop zone */
.glass-drop-zone {
  border: 2px dashed rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-panel);
  padding: 48px;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.glass-drop-zone.drag-over {
  border-color: rgba(0, 122, 255, 0.4);
  background: rgba(0, 122, 255, 0.04);
}

/* Glass textarea */
.glass-textarea {
  width: 100%;
  background: transparent;
  color: var(--color-text-primary);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.875rem;
  resize: none;
  outline: none;
  padding: 12px;
}

/* Glass badge */
.glass-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 500;
}

/* Empty state */
.glass-empty-state {
  text-align: center;
  padding: 48px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
```

### Panel Conversion Pattern (before/after)

```tsx
// BEFORE: inline Tailwind device select (in every panel)
<select className="rounded-[var(--radius-button)] bg-bg-surface/60 border border-border px-2 py-1.5 text-xs text-text-secondary max-w-[200px] truncate">

// AFTER: shared glass-select class
<select className="glass-select max-w-[200px] truncate">
```

```tsx
// BEFORE: inline primary button
<button className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-blue/20 border border-accent-blue/30 px-3 py-1.5 text-sm text-accent-blue hover:bg-accent-blue/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">

// AFTER: shared glass-button-primary
<button className="glass-button-primary flex items-center gap-2 text-sm">
```

## Complete Panel Audit

### Shell Components (GLASS-02)

| Component | File | Lines | Current State | Work Needed |
|-----------|------|-------|---------------|-------------|
| TopBar | components/TopBar.tsx | 29 | Uses `.top-bar` CSS class | Minimal — already glass. Connection dot styling is fine. |
| Sidebar | components/Sidebar.tsx | 83 | Uses `.dock-sidebar`/`.dock-icon` CSS | Already fully glass. No changes needed. |
| DeviceSelector | components/DeviceSelector.tsx | 120 | Uses `.glass-button`/`.glass-panel`, but has inline `style={{boxShadow}}` | Small — remove inline style, verify dropdown uses glass-panel consistently |
| ModuleShell | components/ModuleShell.tsx | 96 | Uses bg/animation. Skeleton uses `glass-panel` | Small — verify loading skeleton uses consistent glass tokens |

### Module Panels (GLASS-03)

| Panel | File(s) | Total Lines | glass-panel Used? | Inline Selects | Inline Buttons | Inline Inputs | Tables | Effort |
|-------|---------|-------------|-------------------|----------------|----------------|---------------|--------|--------|
| **Device** | DevicePanel.tsx | 285 | Yes (cards, empty state) | 0 | 5 (refresh, boot, shutdown, erase) | 0 | 0 | MEDIUM — convert button variants, badge styling |
| **Location** | LocationPanel.tsx + 19 sub-files + location-panel.css | ~2500 | Yes (reference impl) | 0 | Many (in CSS) | Many (in CSS) | 0 | LOW — already glass. Remove duplicate .glass-panel/.glass-button defs from location-panel.css |
| **App** | AppPanel.tsx + AppList.tsx + AppActions.tsx + InstallDropZone.tsx | ~403 | Yes (empty, table) | 1 | 7 (refresh, filters, actions) | 0 | 1 | MEDIUM — convert select, buttons, table, drop zone |
| **Log** | LogPanel.tsx + LogToolbar.tsx + LogList.tsx | ~410 | Yes (log list, empty) | 1 device + 0 | 8 (levels, export, clear) | 2 (search, process) | 0 | MEDIUM — convert select, toolbar buttons, filter inputs |
| **Screenshot** | ScreenshotPanel.tsx | 281 | Yes (cards, empty, loading) | 1 | 4 (capture, record, download, copy) | 0 | 0 | SMALL — convert select, buttons |
| **Deep Links** | DeepLinksPanel.tsx | 249 | Yes (favorites, empty, add form) | 1 | 3 (open, add/cancel, save) | 4 (url, favUrl, label, bundleId) | 0 | MEDIUM — convert select, buttons, inputs |
| **Push** | PushPanel.tsx | 294 | Yes (empty, templates, saved, history) | 1 | 4 (send, save, save current, history toggle) | 2 (bundleId, saveName) + 1 textarea | 0 | MEDIUM — convert select, buttons, inputs, textarea |
| **File System** | FileSystemPanel.tsx + FileBrowser.tsx + FileEditor.tsx | ~365 | Yes (empty, table, editor) | 2 | 3 (upload, save, close) + table download btns | 0 | 1 | MEDIUM — convert selects, table, buttons |
| **Database** | DatabasePanel.tsx + DatabaseBrowser.tsx + TableViewer.tsx + SqlEditor.tsx + PrefsViewer.tsx | ~622 | Yes (tables, browser, empty, editor) | 2 + pageSize | Tab bar + run btn + sort btns | 1 textarea | 3 tables | LARGE — most complex panel, tab bar, 3 table variants, pagination, inline editing |
| **Settings** | SettingsPanel.tsx + StatusBarSection.tsx + PermissionsSection.tsx + AccessibilitySection.tsx | ~750 | Yes (sections, empty) | 3 (device, battery state, cellular, etc) + many in sub-components | 8+ (appearance toggle, apply, clear, grant, revoke, reset, presets) | 3 (time, locale, operator) + range | 0 | LARGE — many form elements, toggle switches, grid layout |
| **Crash Logs** | CrashLogsPanel.tsx | 209 | Yes (empty, filters, log list, detail) | 1 | 2 (refresh, back) | 2 (app filter, since) | 0 | SMALL — convert select, buttons, inputs |
| **Media** | MediaPanel.tsx | 161 | Yes (empty, drop zone) | 1 | 1 (browse) | 0 | 0 | SMALL — convert select, drop zone, button |
| **Clipboard** | ClipboardPanel.tsx | 175 | Yes (content panel, empty) | 1 | 4 (read, copy, write, paste) | 0 + 2 textareas | 0 | SMALL — convert select, buttons, textareas |

### Effort Summary

| Effort Level | Panels | Count |
|-------------|--------|-------|
| **Already done** | Location | 1 |
| **SMALL** (< 30 min each) | Screenshot, Crash Logs, Media, Clipboard | 4 |
| **MEDIUM** (30-60 min each) | Device, App, Log, Deep Links, Push, File System | 6 |
| **LARGE** (60-90 min each) | Database, Settings | 2 |

**Total estimated scope:** ~8-12 hours of focused work

## Recommended Approach

### Step 1: Expand main.css utilities (GLASS-01)
Add the ~8 new utility classes (glass-button-primary, glass-button-destructive, glass-tab-bar/tab, glass-table, glass-badge, glass-drop-zone, glass-textarea, glass-empty-state) to main.css. Also update `.glass-select` to match the exact styling used in panels.

### Step 2: Fix location-panel.css conflicts
Remove the duplicate `.glass-panel` and `.glass-button` definitions from location-panel.css (lines 366-394). These override the main.css definitions and could cause specificity issues.

### Step 3: Shell components (GLASS-02)
Quick pass on TopBar, DeviceSelector, ModuleShell. Sidebar is already complete.

### Step 4: Convert panels smallest-first (GLASS-03)
Start with SMALL panels (Screenshot, Crash Logs, Media, Clipboard), then MEDIUM, then LARGE. Each conversion follows the same pattern:
1. Replace device `<select>` className with `.glass-select`
2. Replace primary buttons with `.glass-button-primary`
3. Replace destructive buttons with `.glass-button-destructive`
4. Replace tables with `.glass-table`
5. Replace inline inputs with `.glass-input`
6. Replace empty states with `.glass-empty-state`

### Step 5: Visual audit (GLASS-04)
Review all panels side-by-side for:
- Consistent padding (standardize on p-6)
- Consistent header patterns (text-base font-medium)
- Consistent border-radius (var(--radius-panel) vs var(--radius-button))
- Animation patterns (transitions on hover/active states)
- Badge color consistency

## Key Differences: oklch vs rgba

The `@theme` tokens use oklch (perceptually uniform), but the `.glass-panel` and location-panel.css use rgba values. Current state:

| Context | Color Space | Example |
|---------|------------|---------|
| @theme tokens | oklch | `oklch(0.14 0.015 270 / 0.55)` |
| .glass-panel background | var(--color-glass) — oklch | `var(--color-glass)` |
| location-panel.css | rgba | `rgba(30, 30, 40, 0.55)` |
| .top-bar, .dock-sidebar | rgba | `rgba(16, 16, 24, 0.7)` |

**Decision from prior phases:** "Switched from oklch inline values to rgba glass values in shell components for visual parity with sim-location"

**Recommendation:** Keep @theme tokens in oklch for Tailwind utility consumption. Keep CSS utility classes using rgba for the actual glass visual properties. This is the existing pattern and it works.

## Apple Liquid Glass Principles (from WWDC25 Session 219)

**Confidence:** HIGH (direct from official Apple WWDC25 transcript)

### Core Visual Properties
1. **Lensing** — light bends and warps through transparent material, providing separation while letting content through
2. **Inset highlights** — light sources produce highlights responding to geometry (already implemented: `inset 0 0.5px 0 rgba(255,255,255,0.06)`)
3. **Adaptive shadows** — shadow opacity increases over text, decreases over solid backgrounds (partially implemented: fixed box-shadow)
4. **Material illumination** — on interaction, material glows from within (not implemented — would require JS, deferred)
5. **Rounded floating forms** — nest in rounded device curves (implemented: `border-radius: 14px`)

### Key Design Rules
1. **Navigation layer only** — glass is for floating controls/navigation, NOT content layer (tables, lists should NOT be glass panels)
2. **No glass on glass** — never stack glass elements (current code sometimes nests glass-panel — audit needed)
3. **Two variants: Regular and Clear** — Regular is versatile (our `.glass-panel`), Clear is more transparent for media-rich contexts
4. **Tinting is selective** — use accent colors only on primary actions, not everything
5. **Accessibility built-in** — reduced transparency, increased contrast, reduced motion (our implementation should respect `prefers-reduced-motion`)

### What We Implement vs What We Skip
| Apple Feature | Our Implementation | Notes |
|--------------|-------------------|-------|
| Backdrop blur + saturation | `blur(20px) saturate(1.4)` | Already done |
| Inset highlight | `inset 0 0.5px 0 rgba(255,255,255,0.06)` | Already done |
| Deep shadow | `0 4px 24px rgba(0,0,0,0.3)` | Already done |
| Rounded forms | `border-radius: 14px` | Already done |
| Adaptive shadow (content-aware) | Skip | Requires JS intersection observer — too complex for pure CSS |
| Material illumination on tap | Skip | Requires JS touch tracking — deferred |
| Light/dark flipping | Skip | Dashboard is dark-only |
| Scroll edge effects | Skip | Would need JS scroll position tracking |
| Spring-based morphing | Already partial | ModuleShell uses `framer-motion` spring animations |

## Open Questions

1. **border-radius: 14px vs 16px**
   - What we know: main.css uses `--radius-panel: 14px`, location-panel.css uses `16px` in several places
   - Recommendation: Standardize on 14px (the token value). Update location-panel.css hardcoded values to use `var(--radius-panel)`.

2. **Glass-on-glass violations**
   - What we know: Some panels nest `.glass-panel` inside `.glass-panel` (e.g., CrashLogs filter panel inside a glass-panel, Database browser/viewer both glass-panel inside flex container)
   - Recommendation: Audit and fix — inner panels should use `bg-transparent` or subtle `bg-bg-surface/30` fills, not full glass

3. **`prefers-reduced-motion` support**
   - What we know: Apple explicitly mentions reduced motion as a Liquid Glass accessibility feature
   - Recommendation: Add a `@media (prefers-reduced-motion: reduce)` section to main.css that disables transitions and reduces blur

## Sources

### Primary (HIGH confidence)
- Apple WWDC25 Session 219 "Meet Liquid Glass" — full transcript analyzed. Design principles, variants (Regular/Clear), rules (no glass-on-glass, navigation layer only), accessibility features.
- Source code analysis: main.css (256 lines), location-panel.css (1303 lines), all 12 panel files + 15 sub-component files read in full.

### Secondary (MEDIUM confidence)
- Apple developer.apple.com/documentation/TechnologyOverviews/liquid-glass — referenced in WWDC session resources (page requires JS, couldn't fetch rendered content; principles verified via transcript)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure CSS refactor, no new dependencies
- Architecture: HIGH — existing patterns clear, main.css well-structured, conversion path obvious
- Pitfalls: HIGH — identified from direct code analysis
- Apple spec: HIGH — sourced from official WWDC25 session transcript

**Research date:** 2026-02-26
**Valid until:** 2026-06-26 (stable — CSS design patterns don't change fast)
