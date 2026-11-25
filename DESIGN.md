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
  label-micro:
    fontFamily: "DM Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    letterSpacing: "1.5px"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "12px"
  chip: "10px"
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
  node-chip-app:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px"
    width: "200px"
    height: "80px"
  node-chip-map:
    backgroundColor: "{colors.lp-chip}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.chip}"
    width: "168px"
    height: "56px"
  dock-marketing-pill:
    backgroundColor: "{colors.lp-panel}"
    textColor: "{colors.lp-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 12px 10px 24px"
---

# Design System: Component Canvas

<!-- impeccable:design-map -->
Name: Component Canvas
Colors: paper hsl(0 0% 99%), card hsl(0 0% 100%), canvas hsl(216 12% 97%), ink hsl(220 15% 8%), ink-muted hsl(220 10% 40%), surface-muted hsl(215 15% 96%), hairline hsl(216 13% 88%), primary hsl(0 0% 9%), primary-foreground hsl(0 0% 98%) (+33 more in the frontmatter)
Fonts: Boldonse (display, headline, title); Unbounded (app-display); Inter (body, body-app); DM Mono (label, label-micro)
Spacing: base 4px, xs 8px, sm 12px, md 16px, lg 24px, xl 40px, chapter-gap 52px, row-padding 42px, section 15vh
Radius: sm 2px, md 4px, lg 6px, xl 12px, chip 10px, card 14px, panel 16px, dock 24px, pill 999px
North Star: "The Living Map"
Rules:
- The Meaning-Before-Accent Rule. The five component-type colours identify what
- The Own-World Rule. The marketing surface is committed dark.
- (+8 more)
Elevation:
- Node chip lift: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
- Floating layer: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
- Unused tinted scale: index.css
- (+7 more)
Don't:
- Don't use Main Violet, Variant Cyan, Sub Green, Token Gold or Instance Apricot as decorative accents, chart colours, or hover fills.
- Don't add gradients, glows, gradient text, glassmorphism, or `backdrop-filter` to the marketing surface — the app dock is the only blurred surface in the product.
- Don't put an eyebrow or kicker label above a headline, and don't build hero-metric rows or stat strips; the hero opens on the headline itself.
- Don't box sections in cards: marketing structure is 1px `--lp-line` rules and hairlines, never a stack of separated tiles.
- Don't imply a Figma plugin, sync, file import, or a downloadable macOS app.
- Don't use two families for one job or fabricate a weight Boldonse doesn't have — no faux-bold display type, no display face set inline in a component, and no display leading tighter than 1.55.
- Don't centre or offset an element with `transform` when an entrance animation owns `transform` — a `both` fill overwrites it.
- Don't use Signal Cyan as a surface fill or a label colour outside live states; action, focus, selection and live pulses only.
- Don't invent proof: no testimonials, usage metrics, customer names, or press — none exist, so none may be shown.
Map: src/index.css
Full: .impeccable/design-full.md (read a section when you need its detail)
