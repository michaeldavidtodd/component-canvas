---
name: Component Canvas
description: A planning canvas for design-system architecture — one map for components, variants, and token chains.
colors:
  paper: "hsl(0 0% 99%)"
  card: "hsl(0 0% 100%)"
  canvas: "hsl(216 12% 97%)"
  ink: "hsl(220 15% 8%)"
  ink-muted: "hsl(220 10% 40%)"
  surface-muted: "hsl(215 15% 96%)"
  hairline: "hsl(216 13% 88%)"
  primary: "hsl(0 0% 9%)"
  primary-foreground: "hsl(0 0% 98%)"
  focus-ring: "hsl(258 100% 68%)"
  night-paper: "hsl(222.2 84% 4.9%)"
  night-card: "hsl(222.2 54% 10%)"
  night-ink: "hsl(210 40% 98%)"
  night-ink-muted: "hsl(215 20.2% 65.1%)"
  night-surface: "hsl(217.2 32.6% 17.5%)"
  night-hairline: "hsl(217.2 32.6% 10.5%)"
  night-primary: "hsl(258 100% 68%)"
  component-main: "hsl(258 100% 68%)"
  component-variant: "hsl(197 100% 58%)"
  component-sub: "hsl(152 100% 45%)"
  component-token: "hsl(45 100% 48%)"
  component-instance: "hsl(21 100% 68%)"
  component-group: "hsl(280 55% 55%)"
  destructive: "hsl(0 84% 60%)"
  success: "hsl(152 60% 53%)"
  warning: "hsl(45 95% 58%)"
  lp-canvas: "#05070f"
  lp-stage: "#070b16"
  lp-field: "#0a0f1e"
  lp-panel: "#0c1120"
  lp-chip: "#0d1326"
  lp-ink: "#edf1f8"
  lp-ink-soft: "#c6cedf"
  lp-ink-dim: "#9aa4b8"
  lp-ink-faint: "#7c86a0"
  lp-line: "#1d2540"
  lp-panel-line: "#232b42"
  lp-chip-line: "#26304e"
  lp-field-line: "#2a3454"
  lp-dot: "#131a2e"
  lp-card: "#1e293b"
  lp-card-line: "#2a3750"
  lp-handle: "#0b1220"
  lp-node-value: "#f2f6fc"
  lp-node-meta: "#8b97ab"
  lp-edge-main: "#8d5cff"
  lp-edge-token: "#f5b800"
  lp-edge-default: "#9ba7bd"
  lp-trace: "#ffd84d"
  lp-glyph-line: "#3a4666"
  lp-glyph-line-dim: "#2a3554"
  lp-cyan: "#66ffff"
  lp-alert: "#ff7a7a"
typography:
  display:
    fontFamily: "Boldonse, Inter, system-ui, sans-serif"
    fontSize: "clamp(42px, 4.9vw, 68px)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Boldonse, Inter, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.8vw, 52px)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Boldonse, Inter, system-ui, sans-serif"
    fontSize: "clamp(26px, 2.5vw, 36px)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.01em"
  app-display:
    fontFamily: "Unbounded, Inter, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  body-app:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.14em"
  mono-value:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 400
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "12px"
  node: "8px"
  tile: "5px"
  card: "14px"
  panel: "16px"
  dock: "24px"
  pill: "999px"
spacing:
  base: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  chapter-gap: "52px"
  row-padding: "42px"
  section: "15vh"
components:
  button-app-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-marketing-primary:
    backgroundColor: "{colors.lp-cyan}"
    textColor: "{colors.lp-canvas}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  button-marketing-ghost:
    textColor: "{colors.lp-ink-soft}"
    rounded: "{rounded.pill}"
    padding: "14px 24px"
  input-marketing-email:
    backgroundColor: "{colors.lp-field}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
  node-card-app:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
    width: "200px"
    height: "80px"
  grid-chip-app:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 8px"
    height: "36px"
  node-card-map:
    backgroundColor: "{colors.lp-card}"
    textColor: "{colors.lp-node-value}"
    rounded: "{rounded.node}"
    width: "190px"
    height: "92px"
  grid-chip-map:
    backgroundColor: "{colors.lp-card}"
    textColor: "{colors.lp-node-value}"
    rounded: "{rounded.node}"
    height: "40px"
  dock-marketing-pill:
    backgroundColor: "{colors.lp-panel}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 12px 10px 24px"
---

# Design System: Component Canvas

## Overview

**Creative North Star: "The Living Map"**

Component Canvas ships two surfaces from one Vite/React app, and they share a
vocabulary rather than a colour scheme. The app shell is the working tool: light
and dark token themes, near-white or near-black neutrals, a floating dock, and
nodes whose borders are their meaning. The marketing landing page is a committed
dark own-world — a deep-space canvas at `#05070F` under a dot grid, where the
visitor watches one component map assemble itself, rearrange into a structured
table, trace a token chain, and hand over a share link. Both surfaces argue the
same thing in the same grammar: the map *is* the product, so chrome recedes and
the diagram carries the argument. The marketing diagrams draw that grammar
literally — the app's own canvas card, the app's own edge semantics — so the
demonstration is a picture of the product rather than an illustration beside it.

The system is precise and Figma-adjacent — it borrows the interaction model
(canvas, floating dock, layers, variants) without borrowing Figma's visual
identity. It is calm and utilitarian at rest, with vibrancy arriving only where
it means something: five saturated component-type colours, one cyan action, and
typography doing the rest. Density is generous rather than tight — the marketing
surface paces itself in `vh` bands, not stacked cards — and every surface is
flat, hairline-bordered, and quiet until it needs to move.

Nothing here is playful. There are no ornamental gradients, no glows, no
glass panels on the marketing world, no gradient text, no hero-metric rows, and
no eyebrow/kicker label above a headline: the hero begins with the headline
itself, sitting in the map's negative space. Breadth of proof is expressed by
structure and honesty — every demonstration carries a synthetic-data label in
the diagram, and the product describes itself as "modeled on Figma's structure;
replicates into Figma or code", with no superlatives and no implied
integration.

**Key Characteristics:**
- Two token themes (light/dark) for the app; one committed dark own-world for marketing.
- Semantic per-type colour (main violet, variant cyan, sub green, token gold, instance apricot) that is never decorative.
- One node anatomy at two densities: a 92-unit canvas card in the map states and a 40-unit grid chip in the structured state, crossfading per state.
- Edges resolved by one rule — main↔variant violet, anything touching a token gold, everything else grey — drawn without arrowheads.
- Unbounded for app display, Boldonse for marketing display, Inter for body, DM Mono only for values and measurements.
- Hairline borders first; shadows only on app layers that float above the canvas.
- Spring-settled motion (`cubic-bezier(0.34, 1.4, 0.64, 1)`), exponential ease-out for entrances, and a reduced-motion path that collapses everything to 0.01ms.

## Colors

Two token themes for the app, one own-world for marketing. Both are vibrant only
at the semantic layer; surfaces stay near-neutral so the five component-type
colours and the single action colour read as information.

Values are stored in `src/index.css` as bare HSL channel triples and consumed as
`hsl(var(--token))`; the frontmatter above carries the same values wrapped, so
they are valid CSS colours. Legacy `--brand-*`, `--sidebar-*`, and
`--secondary-muted` slots still sit in that file with no consumers — do not adopt
them into new work.

### Light Theme (default)

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `hsl(0 0% 99%)` | Page ground, dock backdrop |
| `--card` / `--popover` / `--workspace` | `hsl(0 0% 100%)` | Panels, node bodies, popovers |
| `--canvas` | `hsl(216 12% 97%)` | React Flow canvas field behind the nodes |
| `--foreground` | `hsl(220 15% 8%)` | All primary text |
| `--muted-foreground` | `hsl(220 10% 40%)` | Secondary text, labels, node metadata |
| `--muted` | `hsl(215 15% 96%)` | Hover fills, icon tiles, separators |
| `--border` / `--input-border` | `hsl(216 13% 88%)` | Every hairline: node borders at rest, dividers, inputs |
| `--primary` | `hsl(0 0% 9%)` | The action colour in light mode — a near-black button |
| `--primary-foreground` | `hsl(0 0% 98%)` | Text on that button |
| `--ring` | `hsl(258 100% 68%)` | Focus ring — the one place the violet shows up in chrome |

The light theme's action colour is **ink, not violet**: a light-mode primary
button is a black pill with white text. Violet is reserved for focus.

### Dark Theme (`.dark` on `<html>`)

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `hsl(222.2 84% 4.9%)` | Page ground |
| `--card` | `hsl(222.2 54% 10%)` | Panels and popovers (popover aliases card) |
| `--canvas` | `hsl(222.2 84% 6%)` | Canvas field |
| `--foreground` | `hsl(210 40% 98%)` | Primary text |
| `--muted-foreground` | `hsl(215 20.2% 65.1%)` | Secondary text |
| `--muted` / `--secondary` | `hsl(217.2 32.6% 17.5%)` | Hover fills and raised neutral surfaces |
| `--workspace` | `hsl(217.2 32.6% 17.5%)` | Node bodies — the tone the marketing card pins as `#1E293B` |
| `--border` | `hsl(217.2 32.6% 10.5%)` | Hairlines |
| `--primary` | `hsl(258 100% 68%)` | The action colour in dark mode — the same violet as a main component's semantics |
| `--ring` | `hsl(258 100% 68%)` | Focus ring |

Dark mode swaps the action colour to **Main Violet**; that is a deliberate theme
difference, not an inconsistency. `--accent` is the neutral hover/selected
surface in dark mode but a cyan tint in light mode — treat it as a surface, never
as the action colour.

### Semantic Component Colors

Five colours identify what a node is. They are the product's data model made
visible.

| Token | Value | Meaning |
| --- | --- | --- |
| `--component-main` | `hsl(258 100% 68%)` | Main component (purple) |
| `--component-variant` | `hsl(197 100% 58%)` | Variant (cyan) |
| `--component-sub` | `hsl(152 100% 45%)` | Sub-component (green) |
| `--component-token` | `hsl(45 100% 48%)` | Design token (gold) |
| `--component-instance` | `hsl(21 100% 68%)` | Instance (apricot) |
| `--component-group` | `hsl(280 55% 55%)` | Group (lilac, legend only) |

In dark mode the variant, sub and token slots lighten to `68%` lightness so they
hold on near-black (instance is already at 68%); main stays put. The marketing
diagrams pin their own fixed hexes in `map.tsx`'s `NODE_COLORS` — `#8D5CFF`,
`#29C2FF`, `#00E67A`, `#F5B800`, `#FF955C` — because they sit on a canvas that
never changes theme. The older `--lp-main`…`--lp-instance` variables in
`landing.css` are a close but not identical set, and now feed only the brand
mark; a diagram node takes its colour from `NODE_COLORS`, never from those.

**The Meaning-Before-Accent Rule.** The five component-type colours identify what
a node is. They are never used for buttons, hovers, convenient borders, charts,
or decorative fills. If a violet pixel is on screen, it is a main component (or
the focus ring, which is a binding on the same violet) — nothing else.

### Marketing Own-World (Committed Dark)

| Token | Value | Role |
| --- | --- | --- |
| `--lp-bg` | `#05070f` | Deep-space canvas ground |
| `lp-stage` (literal) | `#070b16` | Diagram stage wells inside the dark ground |
| `lp-field` (literal) | `#0a0f1e` | Text inputs and inset link fields |
| `lp-panel` (literal) | `#0c1120` | Floating dock, share card, stage labels |
| `--lp-chip` | `#0d1326` | Declared, no consumer — node cards use `lp-card` |
| `--lp-ink` | `#edf1f8` | Headlines, field text, hovering controls |
| `lp-ink-soft` (literal) | `#c6cedf` | Ghost-button text |
| `--lp-ink-dim` | `#9aa4b8` | Body copy, stage labels |
| `--lp-ink-faint` | `#7c86a0` | Mono hints, footer, placeholders |
| `--lp-line` | `#1d2540` | Section rules and stage borders |
| `lp-panel-line` (literal) | `#232b42` | Dock and label outlines |
| `--lp-chip-line` | `#26304e` | Declared, no consumer; the scrollbar still names the hex |
| `lp-field-line` (literal) | `#2a3454` | Input and share-card outlines |
| `lp-dot` (literal) | `#131a2e` | Dot-grid pips (36px pitch, r 1.5) |
| `lp-card` (literal) | `#1e293b` | Node card and grid-chip fill, benefit-glyph plates |
| `lp-card-line` (literal) | `#2a3750` | Card, chip and glyph outlines; the card's divider |
| `lp-handle` (literal) | `#0b1220` | Connection handles, and the glyph stroke inside a type tile |
| `lp-node-value` (literal) | `#f2f6fc` | Node names, column headers, literal token values |
| `lp-node-meta` (literal) | `#8b97ab` | Card meta rows, grid-chip values, count pills |
| `lp-edge-main` (literal) | `#8d5cff` | Edges between a main component and its variant |
| `lp-edge-token` (literal) | `#f5b800` | Edges with a token at either end |
| `lp-edge-default` (literal) | `#9ba7bd` | Every other edge, at 0.5 opacity |
| `lp-trace` (literal) | `#ffd84d` | Token-trace pulse |
| `lp-glyph-line` / `-dim` (literal) | `#3a4666` / `#2a3554` | Ledger-glyph plate lines |
| `--lp-cyan` | `#66ffff` | The single action colour |
| `lp-alert` (literal) | `#ff7a7a` | Structural-debt glyph: dashed break, warning dot |

`--lp-bg`, `--lp-ink`, `--lp-dim`, `--lp-faint`, `--lp-line`, `--lp-chip`,
`--lp-chip-line` and `--lp-cyan` are declared on `.lp`; `--lp-chip` and
`--lp-chip-line` no longer have a consumer. Every `(literal)` row is a hard-coded
hex in `landing.css`, in a TSX SVG attribute, or in `map.tsx`'s `NODE_COLORS`;
they are named here and in the frontmatter so they can be promoted to variables
without a rename.

Three hairlines form a deliberate ladder from darkest (section rules,
`#1d2540`) through panel and label outlines (`#232b42`) to lightest
(interactive outlines, `#2a3454`): a border gets lighter as the thing it holds
gets more interactive.

Diagram strokes sit outside that ladder, and they are not weighed by diagram
importance any more — they come from the app. A node card or chip is `1px
#2a3750`; an edge is resolved the way `getEdgeColor` resolves an app connection:
**violet `#8D5CFF`** for a main↔variant pair, **gold `#F5B800`** for any edge with
a token at either end, and the muted grey **`#9BA7BD` at 0.5 opacity** for
everything else. Edges are 2px in the chapter stages and 1px in the hero bleed,
and **none of them carries an arrowhead**, because the app draws none — direction
is the hierarchy, not a pointer. The token-trace pulse is `#FFD84D` at 2.5px, laid
over the gold chain it traces. (The one triangle left in the world is the small
filled marker inside the ledger's structure glyph, part of that glyph's
miniature at 1.5px rather than of any edge.)

**The Own-World Rule.** The marketing surface is committed dark. It does not read
the app's light/dark theme, and a visitor's system preference never changes it.
One page, one ground, `#05070F`.

**The One Cyan Rule.** Signal Cyan (`#66FFFF`) marks only where the visitor can
act (the primary action, a link in focus), where the interface is listening
(focus ring, selection, input focus), where a result is confirmed (the share
card's kind label and its copied check), and where the advisor is at work (its
scan line and spark). It is never a surface fill or a decorative rule, and it is
never the token-trace pulse — that pulse is gold, the colour of the chain it is
tracing.

### Status

`--destructive` `hsl(0 84% 60%)`, `--success` `hsl(152 60% 53%)`, `--warning`
`hsl(45 95% 58%)`, `--info` `hsl(221.3 97.5% 53.5%)` — app-shell only, rendered
as `text-*`/`bg-*/10` tints. They are not part of the marketing palette; the
marketing world's only alert colour is the coral `#FF7A7A` (`lp-alert`), used
inside a diagram.

## Typography

**Display Font (marketing):** Boldonse (fallback Inter, system-ui)
**Display Font (app):** Unbounded (fallback Inter, system-ui)
**Body Font:** Inter (self-hosted 400–900, latin)
**Label / Mono Font:** DM Mono (300/400/500), values and measurements only

**Character:** A geometric, slightly engineered display voice over a neutral
humanist body — a spec sheet you enjoy reading. Boldonse is wide and hard-edged
and carries the marketing's declarative sentences; Unbounded is the app's
in-interface display face for headings in panels and dialogs. DM Mono is not a
style choice, it is a register: whenever a string is a value or a measurement it
goes mono and usually uppercase. A node's kind is the exception — it is set in
Inter in the node's own type colour, because the colour, not a mono register, is
what names the type.

The display swap is one variable, not two implementations. `--font-display` is
`var(--app-font-display, Boldonse)`: the marketing surface takes the Boldonse
fallback, `.app-shell` sets `--app-font-display: "Unbounded"`, and portaled
surfaces inherit because it is set on `<body>`. `--font-mono` mirrors it
(`var(--app-font-mono, "JetBrains Mono")`); `.app-shell` points that at DM Mono,
but the marketing CSS names DM Mono directly. JetBrains Mono is never self-hosted,
so nothing should rely on the bare `font-mono` default.

### Hierarchy

- **Display** (Boldonse 400, `clamp(42px, 4.9vw, 68px)`, 1.55, tracking −0.01em): the hero headline, once per page; `text-wrap: balance`.
- **Headline** (Boldonse 400, `clamp(30px, 3.8vw, 52px)`, 1.55): section openers — statement, chapters head, ledger head. The closing headline runs larger (`clamp(34px, 4.4vw, 60px)`) at the same 1.55.
- **Title** (Boldonse 400, `clamp(26px, 2.5vw, 36px)`, 1.55): chapter headings; ledger rows drop to `clamp(21px, 2vw, 28px)` at the same 1.55.
- **Body** (Inter 400, 17px, 1.65, `--lp-ink-dim`): marketing prose; measure capped at 46ch (hero sub), 56ch (section leads), 62ch (statement), 48ch (ledger rows). Emphasis is Inter 600 in `--lp-ink`, never bold-and-coloured.
- **Body (app)** (Inter 400, 14px, 1.5): interface text; app node names are Inter 500 at 14px. Inside the marketing diagrams the same name is set at diagram scale — Inter 600 19px in the canvas card (`DM Mono 500` 15.5px for an alias), Inter 500 13px in the grid chip (`DM Mono 500` 12.5px for an alias).
- **Kind labels** (Inter 500, 13px in the card, 12px over the grid columns): capitalised, always filled with the node's type colour, never in a mono cut. The app matches at 12px.
- **Label** (DM Mono 400, 12px, tracking 0.14em, uppercase): dock hints, footer meta, stage pills, share-link kind.
- **Mono value** (DM Mono 400, 10.5px in the marketing grid chip, 12px in the marketing card, 10px in the app's grid chip): token values. Alias names are the same register at weight 500 — 15.5px in the card, 12.5px in the chip — because the alias *is* its name. The old 10px uppercase in-SVG label cut is gone with the kind dots.
- **App display** (Unbounded 400, leading-tight, tracking-wide ≈0.025em): `h1`–`h3` inside the app shell.

Headlines use one weight. Boldonse ships 400 only and is never faked bolder; the
contrast in the type system comes from size and colour, not weight.

**The Ink-Band Rule.** Boldonse's display ink band measures roughly **1.38–1.51em**
of its em box, so every display block sets the same leading: **1.55**, on the hero
headline, the section openers, the closing headline, the chapter titles and the
ledger rows alike. Nothing Boldonse sets goes tighter — under 1.55 a wrapped line
can collide with the band above it, and the face's own measurements rule out the
old 1.16–1.24 ladder as "tight but safe". One value, no exceptions; measured
collision-free at 1440, 768 and 393.

**The Two Display Faces Rule.** Unbounded is the app's display face; Boldonse is
the marketing display face. The swap happens only through `--app-font-display` on
a surface wrapper (`.app-shell` sets Unbounded). Never hardcode a display family
inside a component.

**The Mono-Is-Data Rule.** DM Mono carries values, measurements, and metadata —
token values, alias names, count numerals, dock hints, share links. It never sets
prose, headings, primary button labels, or a node's kind: kinds are Inter in the
type colour, in the app and in every diagram.

## Layout

**App shell.** A full-viewport React Flow canvas with a bottom-centred floating
dock (24px from the bottom edge, `rounded-3xl`, `p-3`, 36px round controls in a
row with `h-6` hairline separators). Panels, dialogs, and the structured map sit
on `--card` above the `--canvas` field. Spacing follows Tailwind's 4px base;
density is tool-like, not airy. One review surface, one canvas: the map is never
nested in a card inside another card.

**Marketing surface.** Full-bleed sections in a vertical rhythm measured in
viewport, not pixels: 19vh/15vh openings, 15vh/13vh closings, 8–10vh between
chapter rows. Containers cap at 1240px (chapters), 1160px (ledger), 1060px
(statement), 660px (hero copy column), with 40px horizontal padding in the top
bar and 24px in section bodies. The hero is `100svh` with the copy absolutely
placed at `left: 72px, top: 47%` and the map bleeding behind it; the dock is
centred at the bottom (`bottom: 34px`, `translate: -50% 0`). Chapter rows are
`0.82fr / 1.18fr` (copy / stage); ledger rows are `4.5fr / 5fr / 230px`
(heading / body / glyph). Vertical 1px `--lp-line` rules separate sections and
rows and are the only dividers — no boxes around sections.

A chapter stage is a `1250 × 640` diagram in a box that keeps
`aspect-ratio: 1250 / 640` — `#070b16` well, `1px --lp-line`, `16px` radius,
`overflow: hidden` — and the share card floats inside that well rather than beside
it. The well sits in a `.lp-stage-wrap` flex column (`min-width: 0`, which the
chapter's grid column needs to resolve at phone widths) whose first child is the
state caption: a right-aligned `--lp-panel` pill above the well, present at every
width. It is a caption, not an overlay — it never covers the diagram, and it does
not disappear when the stage starts panning.

The document chrome is themed with the world: while the landing is mounted, `body`
background is swapped to `#05070f` and the scrollbar is `scrollbar-color: #26304e
#05070f` (a slate hairline on the canvas tone), then both are restored on
unmount. The light app never sees a dark scrollbar, and the landing never shows a
light one.

**Breakpoints.** 1180px: hero copy moves to `left: 48px`, ledger rows tighten to
`1fr / 1fr / 200px` with 28px gaps and glyphs shrink to 200px. 1023px: chapters
and ledger rows collapse to a single column (glyphs left-align), and the hero
leaves the bleed entirely — it becomes a column: copy in static flow
(`76px 40px 0` padding, no absolute placement), the landscape map swapped for a
portrait one (`viewBox 400×344`, the whole system re-laid as a two-column stack
of six cards, including the token pair `radius.base` → `radius.button` on its
gold edge; box locked to `aspect-ratio: 400 / 340`, `flex: none`,
`max-width: 560px`, `max-height: 280px`), the dock turned into a static centred
wrapped block (22px radius, 8px row gap, `12px 16px` padding, separator hidden)
that sits at the hero's bottom under `margin: auto 24px 18px`, and the hero's
synthetic-data note hidden. 720px: 22px
section padding, the hero headline drops to `clamp(34px, 9.4vw, 42px)` with a 16px
sub and the copy column starts `56px` from the top, and the dock tightens to
`10px 14px` padding with a 6px row gap. The same 720px query turns each chapter
stage into a pan frame — a 340px-tall window over a fixed 640px-wide canvas with
`overflow-x: auto`, plus a 42px right-edge gradient fade whenever the stage is not
in its share state — while its state caption stays in flow above the frame. The
app itself uses Tailwind's default breakpoints.

**The Negative-Space Rule.** The hero headline and its one supporting line sit in
the map's empty quadrant. Nothing is boxed behind them. If the diagram would
collide with the copy, move the diagram — never put the copy in a card.

## Elevation & Depth

**Two depth grammars**, chosen by world. **The marketing surface has no shadows at
all** — depth comes from a three-step hairline ladder and a four-step surface
ladder (`#05070F` ground → `#070B16` stage → `#0C1120` panel → `#1E293B` node
card), so a floating thing is lighter than the ground and edged with a hairline.
**App layers that float above the canvas** — the dock, canvas nodes, the
structured-map chips (`shadow-xs`), the minimap, popovers — pair a hairline
border with exactly one soft shadow, taken from Tailwind's default `shadow-xs` /
`shadow-md` / `shadow-lg` utilities. Resting app chrome (panels, tables,
dividers) is flat with a border only.

### Shadow Vocabulary

- **Node lift** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` — Tailwind v4's `shadow-md`): app canvas nodes only, so a node reads as a card you can grab. Marketing diagrams never shadow: a card there is `#1E293B` on a `#070B16` stage with a `#2A3750` hairline and nothing else.
- **Floating layer** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` — `shadow-lg`): the dock, the minimap, popovers and dialogs. The dock additionally uses `backdrop-blur-md` over `bg-background/90`.
- **Unused tinted scale:** `index.css` also declares `--shadow-sm/md/lg` with hints of `hsl(216 13% 15%)` at 5–10% alpha. Nothing consumes them (they are not mapped into `@theme`), so they do not render. Wire them up before citing them.

### Motion

- **`--ease-spring` = `cubic-bezier(0.34, 1.4, 0.64, 1)`** — the product's native motion. It gives a slight overshoot as a surface grows and settles: the dock's padding transition (300ms), glyph pop-in, node reseating in the marketing stage (900ms), and the share card's slide (800ms).
- **Exponential ease-out `cubic-bezier(0.16, 1, 0.3, 1)`** — entrances that are not settling a surface: hero copy rise (0.8s, from `opacity 0.35 / translateY 16px`, 80ms stagger per child), edge draw-on (1s via `stroke-dashoffset` with `pathLength=1`), dock entrance (0.8s at 200ms delay, layered over a `translate`-based centre so the `both` fill cannot overwrite it).
- **Linear** — only for continuous pulses that must read as constant: the token-trace dash loop (4.2s) and the stage trace (2.6s).
- **Idle drift** — hero cards float ±4–5px on a 6–8s `ease-in-out` alternate loop, one phase offset per card. Motion in the margins, never in the copy.
- **State reveals** — each chapter stage rests in one of four states and steps into it once, when it first crosses 45% visibility; nodes reseat on the 900ms spring while opacity settles alongside (0.5–0.55s), and a node's two anatomies — canvas card, grid chip — crossfade over 0.4s as the state changes. The trace state parks the four off-chain nodes at 0.3, and the share state takes the whole map to `translate(-80px, 8px) scale(0.94)` at 0.4 under the card.
- **Micro-states** — buttons lift 1px on hover and return on press (0.5s out-ease on transform, 0.25s on colour); app buttons translate 1px down on press.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` collapses every animation and transition on the marketing surface to `0.01ms` with `animation-iteration-count: 1`. Entering elements still land in their final position; nothing is left mid-draw.

**The One Depth Signal Rule.** A surface carries one depth signal, chosen by
world: the marketing world is border-only and has no shadows; app layers that
float over the canvas pair a hairline border with one soft shadow. No glows, no
bevels, no stacked shadows, and no `backdrop-filter` outside the app dock.

**The Native Spring Rule.** `--ease-spring` is the motion signature for anything
that grows, slides, or reseats. Entrances that are not settling a surface use the
exponential ease-out. Linear easing is reserved for the token-trace pulse, which
must read as constant motion.

## Shapes

Corners are small and consistent, never soft-to-the-point-of-toy. The app's
radius scale is relative to one token: `--radius: 0.375rem` (6px), with `md` at
radius − 2px (4px) and `sm` at radius − 4px (2px); `rounded-lg` is therefore 6px
and is the default for buttons, node cards and grid chips, and icon tiles
(`rounded-md`, 4px).
The dock's pill controls are fully round (36px circles in a 24px-radius card).

Marketing shapes form a second dialect: the canvas card is a 92-unit-tall
rectangle at `rx: 8` and the grid chip is the same 8px radius at 40 units, both
fixed per node and never stretched; the icon tile inside is 20 units at `rx: 5`.
Diagram stages are 16px, the share card 14px, the share-link field 9px, its copy
button 7px, and every action or hint is a 999px pill. Icons in diagrams are the
app's own: a dark `#0B1220` glyph stroked on the type-colour tile, small
`#0B1220` handle circles with a `#2A3750` stroke at each card's top and bottom
centre, two-column grip dots on grid chips, 1.5px hairline strokes, and dashed
breaks for structural debt. The brand mark is a 2×2 grid of 6px tiles at 2px
radius: Main Violet and Variant Cyan on the top row, Token Gold and Sub Green
below.

**The Pill-For-Action Rule.** Actions are pills (`999px` on marketing) or 6px-radius
app buttons; panels, stages, nodes and cards stay in the 5–16px band (icon tile
5px, copy button 7px, node cards and grid chips 8px, link field 9px, cards 14px,
stage 16px). Never pill a card, and never square off a dock button.

## Components

### Buttons
- **Shape:** marketing pills at `999px` (`padding: 14px 24px`, 15px/600 Inter); app buttons `rounded-lg` (6px, `padding: 12px 20px`, 14px/500), radius overridable per instance.
- **Primary (marketing):** Signal Cyan `#66ffff` fill on `#05070f` text; hover lifts 1px and lightens to `#8fffff`; press returns to 0.
- **Primary (app):** `--primary` on `--primary-foreground` — near-black in light, Main Violet in dark; hover to 80% `--primary`; `focus-visible` ring 3px at `ring/50`; `active` translates 1px down.
- **Ghost (marketing):** no fill, no border, `#c6cedf` text moving to `--lp-ink` on hover.
- **Focus:** marketing uses a global `:focus-visible { outline: 2px solid #66ffff; outline-offset: 3px; border-radius: 4px }`; the app uses `ring-3 ring-ring/50`. Focus never changes layout.

### Marketing Canvas Card (signature)
- **Form:** the app's node, drawn in SVG — 92 units tall (`CARD_H`), width fixed per node from 160 (the hero's `Input`) to 214 (`radius.button`), `rx: 8`, fill `#1E293B` (the dark `--workspace`), `1px` stroke `#2A3750`. It never stretches to its contents.
- **Contents, top to bottom:** the kind label — `Main Component`, `Variant`, `Sub Component`, `Token Literal`, `Token Alias`, `Instance` (the app's own `getNodeTypeLabel` vocabulary, nothing more) — in Inter 500 13px filled with the node's type colour; a 20-unit icon tile at the top right (`rx: 5`, fill in the type colour) holding a `#0B1220` 1.7px-stroke glyph — a 2×2 grid for main, a stacked diamond for variant, a square for sub, a three-dot circle for token, two offset squares for instance; the name in Inter 600 19px `#F2F6FC` (`DM Mono 500` 18px when the node is an alias — the family swaps, the size stays); a `1px #2A3750` divider at 0.7 opacity, drawn for tokens only, over the meta row — Inter 400 11.5px `#8B97AB` on the left, a literal token's value in DM Mono 500 12px `#F2F6FC` on the right. Non-token cards carry the meta line bare, as the app does.
- **Handles:** a 10-unit circle at the top-centre and bottom-centre, `#0B1220` fill with a `#2A3750` stroke — the app's connection handles at the app's positions.
- **Behaviour:** cards pop in with the spring (0.7s, 35–45ms stagger) and then idle-float on their own phase. In the stage they reseat with a 900ms spring; the trace state parks the four off-chain nodes at 0.3 opacity, and the share state takes the whole map to 0.4 and steps it 80 units left.

### Marketing Grid Chip (structured state)
- **Form:** the same node folded to one row — 40 units tall (`CHIP_H`), `rx: 8`, the same `#1E293B` fill and `1px #2A3750` stroke, width fixed per column (150–210).
- **Contents:** the 20-unit icon tile at 10 units from the left edge; the name in Inter 500 13px `#F2F6FC` at 38 (`DM Mono 500` 12.5px for an alias); a literal's value in DM Mono 400 10.5px `#8B97AB`, right-aligned at `w − 26`; and the drag grip at the right edge — two columns of three 1.2-unit dots in `#55648A` at 0.55.
- **Column headers:** Inter 500 12px `#F2F6FC` at 0.02em — `Main`, `Variants`, `Sub`, `Literals`, `Aliases`, `Usage` — each followed by a 26×16 count pill (`#232B42` fill, Inter 500 10px `#8B97AB` numeral), with a full-width `#1D2540` hairline under the row and a `#1D2540` vertical rule per column.
- **The One Anatomy Rule:** a node is one anatomy at a time. `.lp-form-card` and `.lp-form-chip` hold both drawings in place and crossfade over 0.4s when the stage enters or leaves the structured state, so a card never sits inside a chip or beside it, and nothing re-flows between states except the nodes' own poses.

### Share card (stage overlay)
- **Form:** `#0c1120` panel, `1px #2a3454`, `14px` radius, `20px` padding, at `right: 6%, top: 50%`, `width: min(360px, 44%)`. It slides in on an 800ms spring only in the share state, and its `pointer-events` follow that visibility.
- **Contents:** `Shared link` in DM Mono cyan, a 9px-radius read-only field on `#070b16` (`11px 14px` padding, 13.5px, ellipsised) holding the synthetic link `…/#/share/7f3k9w8d`, and a 12.5px `--lp-faint` meta line: "Read-only, always current with the map. Synthetic example."
- **Copy button (`.lp-copy`):** 30×30, transparent, 7px radius, a 15px clipboard glyph in `#7c86a0`; hover lifts it to `--lp-ink` on `#131a2e` — the dot-grid tone doubling as a hover fill. A click writes the visible link to the clipboard and swaps the glyph for a Signal Cyan check for 1.4s, the only cyan in the card besides the kind label.
- **On ≤720px** it stops floating: 12px insets along the bottom of the pan frame, no fixed width.

### Canvas Node Card (app)
- **Form:** `bg-workspace border-2 rounded-lg shadow-md p-3`, min 160×80, default 200×80.
- **Meaning:** the 2px border is the type signal and is colourless at rest (`--border`); selecting a node paints the border in its type colour; a variant whose parent main is selected gets `ring-2` in Main Violet instead.
- **Contents:** type label 12px capitalised in the type colour, a `rounded-md` icon tile filled with the type colour and `text-background` icon, the node name (Inter 500 14px, mono when it is an alias), an optional description at 12px muted.
- **Token nodes:** a `border-t-2 muted-foreground/10` footer with the token type • sub-type on the left and, for literals, a 12px swatch plus the mono value on the right.
- **Handles:** a 12px circle at each of the top and bottom centre, filled `--border`; hovering either one reveals the 24px `+` that adds a parent above or a child below. The marketing card keeps those positions and draws the circle `#0B1220` with a `#2A3750` stroke, the dark card's equivalent of that fill.

### Grid Chip (app, structured map)
- **Form:** a 36px row chip in a 48px row, `rounded-lg bg-workspace` with `1px --border` and `px-2`.
- **Contents:** a `size-5 rounded-md` type tile, the name at 12px (mono for an alias, structural ancestors muted before the current name), a literal's value in DM Mono 10px muted, and a `GripVertical` grip. Selection rings the chip; a dragged chip takes the type border.
- **Header:** a 44px row of Inter 500 12px column labels, each with a `rounded-full bg-muted` count pill at 10px, closed by a `border-b --border` rule that scrolls in step with the grid.

### Inputs
- **Marketing email field:** pill (`999px`), `#0a0f1e` fill, `1px #2a3454` border, `14px 22px` padding, 15px Inter, `width: min(340px, 100%)`. Focus swaps the border to Signal Cyan *and* keeps the surface's global focus ring (`2px #66ffff`, 3px offset, 4px radius) — the outline is never removed — and the caret is Signal Cyan too. Placeholder in `#7c86a0`.
- **App inputs:** `--input` fill, `1px --input-border`, `rounded-lg`; focus uses the standard `ring-3 ring-ring/50`.

### Docks
- **App dock:** bottom-centred floating card, `rounded-3xl`, `1px --border`, `background/90` + `backdrop-blur-md`, `shadow-lg`, `p-3`; 36px round controls that are `bg-primary text-primary-foreground` when selected, `border-border bg-secondary` when their panel is open, and `text-muted-foreground` at rest; growth is a 300ms padding transition on `--ease-spring`, and the dock's bottom offset compensates so the row never jumps.
- **Marketing dock:** one pill at the hero's bottom centre — `#0c1120` fill, `1px #232b42`, `10px 12px 10px 24px`, `gap: 16px`, holding a mono hint ("Free · open sign-up"), the cyan primary action, the ghost guest action, a 1×20px separator, and the "macOS — coming soon" hint. It centres with `translate: -50% 0` rather than `transform`, because its `lp-rise` entrance animates `transform`. On ≤1023px it becomes a static centred wrapped block (`12px 16px` padding, 22px radius, 8px row gap) with the separator hidden.

### Navigation
- **Marketing top bar:** brand mark + "Component Canvas" in DM Mono 12px/0.14em uppercase left, a mono sign-in or "Open app →" link right, absolutely positioned over the map at `26px 40px`. Links inherit colour, gain underline at 4px offset on hover. No border, no background — the map is behind it.
- **Footer:** three-part flex row on a `--lp-line` rule: brand, the honesty line ("Modeled on Figma's structure — no plugin, no sync · Demonstrations use synthetic data"), and mono links.

### Labels and Hints
- `.lp-mono` is the single label primitive: DM Mono 12px, 0.14em tracking, uppercase, in `--lp-ink-faint` unless it names something active. The 11px dock-hint and footer cut is the only smaller size.
- **Stage label:** a `--lp-panel` pill (`7px 12px`, `1px #232b42`, `--lp-ink-dim`, `999px`) that sits **above** the stage well, right-aligned, in flow inside `.lp-stage-wrap` (`margin: 0 2px 10px`) — never an overlay on the diagram. Every one ends in `· synthetic data`: `Canvas · synthetic data`, `Structured map · synthetic data`, `Token trace · synthetic data`, `Share link · synthetic data`. It renders at every width, phones included; the pan frame below 721px never swallows it.
- **Hero note:** the same honesty in prose — `The map is a demonstration — synthetic data`, DM Mono in `--lp-ink-faint` at `left: 40px, bottom: 108px`, clear of the dock's `bottom: 34px` and its height, and hidden at ≤1023px where the hero stacks.
- **Structured-state column headers:** Inter 500 12px `#F2F6FC` over each hierarchy column, its count in a `#232B42` pill, the row closed by a full-width `#1D2540` hairline. The kind labels in the same diagram are Inter in the type colour at 13px — the same cut as the app's, scaled to the card.

## Do's and Don'ts

### Do:
- **Do** keep the five component-type colours loaded with meaning — a node's colour is its type, in the app and in every marketing diagram.
- **Do** give the marketing surface its own dark ground (`#05070F` + dot grid) and let the app keep its light/dark token themes; the two never leak into each other.
- **Do** use `--ease-spring` (`cubic-bezier(0.34, 1.4, 0.64, 1)`) for surfaces that grow, slide or reseat, and the exponential `cubic-bezier(0.16, 1, 0.3, 1)` for entrances.
- **Do** set display type through `--app-font-display` on a surface wrapper; Boldonse in marketing, Unbounded in `.app-shell`.
- **Do** keep DM Mono for values and metadata, usually uppercase at 0.14em tracking or wider; a node's kind is Inter in its type colour, not mono.
- **Do** draw every diagram node as the app's own card — `#1E293B` fill, `2px #2A3750` border, an icon tile in the type colour with a dark glyph, the kind label in that colour — and collapse the same node to the 40-unit grid chip in the structured state.
- **Do** resolve diagram edges with the app's own `getEdgeColor` rule: main↔variant violet `#8D5CFF`, anything touching a token gold `#F5B800`, everything else `#9BA7BD` at 0.5. One palette, two surfaces.
- **Do** keep every Boldonse block at leading **1.55** — hero, section openers, closing headline, chapter titles, ledger rows. One value, no ladder: the face's ink band runs to ~1.51em and needs the room.
- **Do** label every demonstration as synthetic inside the diagram — a stage pill ending `· synthetic data`, the hero's bottom-left mono note — and describe the product the way the footer and page meta do: modeled on Figma's structure, replicates into Figma or code, no plugin, no sync.
- **Do** carry the reduced-motion path with any new animation: everything collapses to `0.01ms` with a single iteration, and elements land in their final position.
- **Do** let a surface be lighter and hairline-edged to read as raised in the marketing world, and reserve real shadows for app layers that float over the canvas.

### Don't:
- **Don't** use Main Violet, Variant Cyan, Sub Green, Token Gold or Instance Apricot as decorative accents, chart colours, or hover fills.
- **Don't** add gradients, glows, gradient text, glassmorphism, or `backdrop-filter` to the marketing surface — the app dock is the only blurred surface in the product.
- **Don't** put an eyebrow or kicker label above a headline, and don't build hero-metric rows or stat strips; the hero opens on the headline itself.
- **Don't** box sections in cards: marketing structure is 1px `--lp-line` rules and hairlines, never a stack of separated tiles.
- **Don't** imply a Figma plugin, sync, file import, or a downloadable macOS app. The desktop app is "coming soon" wherever it appears.
- **Don't** use two families for one job or fabricate a weight Boldonse doesn't have — no faux-bold display type, no display face set inline in a component, and no display leading tighter than 1.55.
- **Don't** centre or offset an element with `transform` when an entrance animation owns `transform` — a `both` fill overwrites it. Centre with the `translate` property, the way the hero dock does.
- **Don't** invent a diagram vocabulary of your own: no dot-and-label chip, no kind dot, no arrowhead, no separate edge palette. A diagram that shows a node shows the app's node, and an edge is coloured by what it connects.
- **Don't** invent proof: no testimonials, usage metrics, customer names, or press — none exist, so none may be shown.
- **Don't** use Signal Cyan as a surface fill or a label colour outside live states; action, focus, selection, the share card's confirmation and the advisor's live marks only — and never for the token-trace pulse, which is gold.
