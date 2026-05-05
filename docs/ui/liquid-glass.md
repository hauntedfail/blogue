# Liquid Glass UI

## Status

The site uses a local Svelte implementation for liquid glass UI surfaces. Do not
load the remote Web Component bundle from
`https://glass.danilofiumi.com/web-comps/boundle.js`.

The local implementation is inspired by
`danilofiumi/liquid-glass-svelte`, especially the layered filter, tint, shadow,
and highlight structure. The upstream repository does not currently publish an
npm package and does not include a license file, so this project does not vendor
or copy the upstream component verbatim.

## Goals

- Keep liquid glass available as normal Astro/Svelte components.
- Avoid runtime dependency on external CDN scripts.
- Support arbitrary child markup for cards, sidebars, panels, and post content.
- Support clickable controls without changing their navigation or event
  behavior.
- Keep global CSS utilities as compatibility glue, not as the primary source of
  the effect.

## Components

### `LiquidGlassDefs.astro`

Path: `src/components/misc/LiquidGlassDefs.astro`

Defines the shared SVG distortion filter:

- filter id: `haunted-liquid-glass-distortion`
- inserted once from `src/layouts/Layout.astro`
- required before any liquid glass surface or button can render the
  displacement effect

Do not duplicate this SVG filter inside each component.

### `LiquidGlassSurface.svelte`

Path: `src/components/misc/LiquidGlassSurface.svelte`

Use this for non-button surfaces that need to contain arbitrary markup:

- post cards
- post content containers
- about and sponsors content panels
- profile/sidebar cards

Public props:

- `id?: string`
- `class?: string`
- `style?: string`
- `contrast?: "light" | "dark" | "light-contrast" | "dark-contrast"`
- `accent?: string`
- `roundness?: string`

The component renders a `liquid-glass-core` root with internal layers:

- `liquid-glass-filter`
- `liquid-glass-shadow`
- `liquid-glass-tint`
- `liquid-glass-highlight`
- `liquid-glass-content`

The slot content is placed inside `liquid-glass-content`.

### `LiquidGlassButton.svelte`

Path: `src/components/misc/LiquidGlassButton.svelte`

Use this for clickable controls when the element itself should carry the glass
effect:

- navbar links
- menu/search/language/theme buttons
- icon buttons that need direct click handling

Public props:

- `id?: string`
- `href?: string`
- `target?: string | null`
- `rel?: string`
- `ariaLabel?: string`
- `name?: string`
- `type?: "button" | "submit" | "reset"`
- `onclick?: (event: MouseEvent) => void`
- `onmouseenter?: (event: MouseEvent) => void`
- `contrast?: "light" | "dark" | "light-contrast" | "dark-contrast"`
- `accent?: string`
- `roundness?: string`

If `href` is provided, the component renders an anchor. Otherwise it renders a
button.

## Global CSS Compatibility

Core path: `src/styles/liquid-glass.css`

Compatibility path: `src/styles/main.css`

`src/styles/liquid-glass.css` is the single source of truth for liquid glass
rendering math. Keep all opacity, shadow, tint, highlight, filter, blur, and
hover rendering values there.

The global classes `card-base`, `float-panel`, `btn-plain`, `btn-regular`,
`btn-card`, `btn-regular-dark`, and `btn-liquid` still exist because many
components already use them. They provide compatibility and a broad visual
baseline for older surfaces.

`src/styles/main.css` may define layout-oriented utility structure such as
`position`, `isolation`, `overflow`, sizing, flex alignment, and text color
states. It must not redefine the liquid glass visual calculations that belong
to `src/styles/liquid-glass.css`.

New or intentionally touched liquid glass UI should prefer:

- `LiquidGlassSurface.svelte` for containers
- `LiquidGlassButton.svelte` for controls

Avoid adding new independent `.liquid-*` visual systems in global CSS.

## Core Rendering Contract

The root variables and selector groups in `src/styles/liquid-glass.css` control
the shared effect for:

- `LiquidGlassSurface.svelte` roots and layers
- `LiquidGlassButton.svelte` roots and layers
- legacy utility surfaces such as `card-base`, `float-panel`, `btn-plain`,
  `btn-regular`, `btn-card`, `btn-regular-dark`, and `btn-liquid`

Do not place element-specific opacity, shadow, tint, highlight, filter, blur, or
dark-mode rendering math inside `LiquidGlassSurface.svelte`,
`LiquidGlassButton.svelte`, cards, buttons, nav items, or sidebar components.
Those components should provide markup, props, events, accessibility attributes,
and layout classes only.

The rendering became visibly inconsistent when cards, buttons, and global
utilities each carried their own liquid glass calculations. Treat that as a
regression risk: any future visual tuning should change the shared variables or
shared selector groups in `src/styles/liquid-glass.css`, then verify that
surface and button classes still compute matching filter and opacity values.

## Reference Spec From `GlassedButton.svelte`

`GlassedButton.svelte` is a local reference file for studying the desired liquid
glass rendering quality. Treat it as an implementation reference only. Do not
import it into application code, and do not copy its source verbatim into the
site unless licensing and ownership are resolved.

The reusable design requirements extracted from the reference are:

- The effect is a layered optical system, not a flat translucent background.
- The distortion filter is a dedicated full-size layer behind the content.
- The surface has an independent shadow layer that can move or soften on hover
  and active states.
- The tint/accent layer is separate from the distortion layer so accent color can
  be tuned without changing the glass displacement.
- The visible rim is a masked outline layer, usually implemented with
  `mask-composite: exclude` over a conic or linear gradient.
- Text and icon content may have a sheen/highlight overlay, but that overlay
  must not become the source of the global glass rendering math.
- Hover and active states should update shared CSS variables such as animation
  time, easing, gradient angle, shadow position, and transform scale.
- Touch devices should avoid hover-only animated angle changes and keep a stable
  default state.

The reference contains app/editor-specific behavior that is out of scope for
this site:

- editable text state
- `document.execCommand`
- console logging of edited text
- per-instance SVG filter definitions
- direct runtime mutation of global rendering variables from component logic

Those behaviors must not be carried into `LiquidGlassButton.svelte` or
`LiquidGlassSurface.svelte`.

### Required Layer Model

The local implementation should preserve this conceptual layer order:

1. host element: sizing, border radius, pointer behavior, and clipping
2. distortion filter layer: `backdrop-filter` plus
   `url("#haunted-liquid-glass-distortion")`
3. shadow/rim layer: masked border and depth shadow
4. tint/accent layer: shared opacity and accent mixing
5. highlight layer: conic/radial sheen controlled by shared variables
6. content layer: slotted text, icons, links, or card content

All layers must be driven from `src/styles/liquid-glass.css`. Component files
may emit the DOM nodes needed for these layers, but they must not define their
own opacity, filter, shadow, highlight, or dark-mode math.

### Variables To Keep Centralized

When refining quality from the reference, add or tune shared variables in
`src/styles/liquid-glass.css` instead of adding per-component constants:

- animation duration and easing
- conic highlight angle
- text/content sheen angle
- border width
- distortion filter opacity
- tint opacity
- highlight opacity
- shadow blur and shadow offset
- light/dark shadow colors
- light/dark outline gradient colors
- hover scale
- active press transform

The current shared variable names may evolve, but the ownership rule must not:
rendering math belongs to `src/styles/liquid-glass.css`.

### Refinement Backlog From The Reference

The first local implementation covered the layer model, static rim, content
sheen, and hover/active state hooks. The reference still has several visual
effects that should be represented in the centralized implementation:

- stronger SVG distortion than the initial site values; tune the shared
  `haunted-liquid-glass-distortion` filter instead of defining per-component
  filters
- a hover-only rotating conic accent glow, controlled by shared animation
  variables and disabled on coarse pointer devices
- active-state shadow variables for the pressed depth effect rather than
  relying only on transform
- hover-state backdrop blur reduction on buttons, giving the surface a sharper
  focused feeling during interaction
- light/dark text or icon shadow on button content, limited to
  `LiquidGlassButton` content so card typography is not affected globally
- stronger accent tint as a shared variable, while preserving a separate tint
  layer from the distortion layer

These refinements should continue to use `src/styles/liquid-glass.css` and
`LiquidGlassDefs.astro` as the only rendering owners. Do not add component-local
CSS math or a second SVG filter in `LiquidGlassButton.svelte`.

### Mapping To Existing Components

`LiquidGlassButton.svelte` should map the reference structure to the current
site like this:

- reference `.button-wrap` maps to `.liquid-glass-button`
- reference `.glass-filter` maps to `.liquid-glass-button-filter`
- reference `.button-shadow` maps to `.liquid-glass-button-shadow`
- reference tint block maps to `.liquid-glass-button-tint`
- reference button/text sheen and outline map to the shared
  `.liquid-glass-button-highlight` and centralized pseudo-element rules
- reference content maps to `.liquid-glass-button-content`

`LiquidGlassSurface.svelte` uses the same layer concept, but content is arbitrary
card/sidebar/post markup instead of a single text span. Surface refinements
should therefore avoid assumptions about inline text.

## Application Rules

- Do not add the remote `boundle.js` script to the document head.
- Do not copy upstream code verbatim unless licensing is resolved first.
- Do not modify core site behavior such as Giscus while working on visual liquid
  glass changes.
- Preserve existing routes, links, event handlers, accessibility labels, and
  localization behavior when replacing an element with `LiquidGlassButton`.
- Keep `LiquidGlassDefs` mounted once in the base layout.
- Keep `clawdy_runa_sama_sm` and `.DS_Store` files out of liquid glass commits
  unless a separate task explicitly includes them.
- Keep liquid glass rendering logic centralized in
  `src/styles/liquid-glass.css`; do not scatter per-component variants across
  cards, buttons, nav, or sidebar code.
- Use `GlassedButton.svelte` only as a reference/spec source. It is not a
  production component and should not be imported by routes, layouts, or UI
  components.

## Verification

Run these after changes:

```sh
pnpm fmt:check
pnpm check
pnpm lint
pnpm build
```

For visual changes, also inspect localhost with Playwright or the app browser and
confirm:

- `.liquid-glass-core` and `.liquid-glass-button` render expected layers.
- the filter layer uses `url("#haunted-liquid-glass-distortion")`.
- `.liquid-glass-core`, `.liquid-glass-button`, `.card-base`, and
  `.btn-regular` share the same configured filter opacity and highlight opacity
  values unless an intentional shared variable changes them.
- button surfaces keep separate distortion, shadow, tint, highlight, and content
  layers, matching the reference layer model without copying the reference
  implementation verbatim.
- desktop and mobile viewports do not gain horizontal overflow.
- nav, sidebar, post cards, and post content remain clickable.
