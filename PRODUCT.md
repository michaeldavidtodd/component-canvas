# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: product UX designers — including design-system designers — at mid-to-large scale SaaS companies, planning or maintaining a design system's component architecture. Secondary: design engineers working alongside them. They are fluent in design-tool conventions (canvas, layers, variants, tokens) but are not necessarily developers. Their job: decide and communicate component hierarchy, variant structure, and token architecture before it gets built, and get the team aligned on that plan.

## Product Purpose

Component Canvas is a planning tool for design-system architecture. It lets a designer map an entire component system — main components, variants, sub-components, tokens, instances — as one interactive diagram, in two views: a free-form Canvas (node editor) and a Structured map (hierarchy grid). It exists to surface architecture problems while they are still cheap, before anything is built in Figma or code. Success: a designer can see their whole system as one map, catch structural problems early, and share the plan with their team.

## Positioning

Component Canvas is *modeled after* Figma's component structure — main component → variant hierarchies and literal → alias → usage token chains — so a plan built here replicates cleanly into Figma and/or code. It does **not** integrate with Figma: there is no plugin, sync, or file import, and no surface may claim or imply one. The claim is structural fidelity, not connectivity. Generic canvases (FigJam, Miro) and spreadsheets can hold a diagram of a system but encode none of its semantics: typed nodes, hierarchy levels, token formats, and validation are the difference a neighboring product cannot truthfully copy.

## Operating Context

Used in design-system planning and audit workflows alongside Figma and code: mapping a new system's architecture, planning variant structures, documenting token alias chains, reviewing a library's health, and sharing the plan via links. Ships as a web app (Supabase auth and persistence, static hosting, hash routing). A macOS desktop app via Tauri exists in the repo and is publicly **coming soon** — marketing may name it as coming soon, never as a download. An AI design-system advisor (Cmd+K) proxies OpenRouter through a Supabase edge function that verifies the caller's JWT and requests zero data retention.

## Capabilities and Constraints

- Canvas view: free-form node editor (React Flow) for components and connections.
- Structured map: table-like grid; columns are hierarchy levels (main component → variant; literal → alias → usage), rows are leaves; column resizing, row reordering, header filters by node type.
- Semantic node types with fixed per-type colors: main (purple), variant (cyan), sub (green), token (yellow), instance (orange).
- Color tokens show swatches; saved tokens are validated for their format and flagged when invalid.
- Undo/redo, lock editing, version history.
- Auth: email/password sign-up and sign-in, plus an anonymous guest mode that does not save. **Sign-up is open and free.**
- Sharing: read-only share links (`/share/:token`).
- AI advisor (Cmd+K) requires sign-in.
- CSS token import is a plan (`docs/css-token-import-plan.md`), not shipped; do not claim it.

## Brand Commitments

- Name: **Component Canvas** (committed; README, auth screen, page meta).
- Existing meta tagline: "Design Systems That Scale" (index.html).
- Personality (from `.impeccable.md`, the project's design context): precise, Figma-adjacent, professional — calm, confident, utilitarian; never playful, toy-like, or decorative. Figma-adjacent means borrowing the interaction model (canvas, dock, layers), not copying Figma's visual identity.
- Semantic color rule: component-type colors carry meaning and are never used as generic decorative accents.
- For the marketing surface, the user's bar: design-forward but not loud; professional, polished, visually stunning, and unique, addressed to skeptical senior/staff product designers.

## Evidence on Hand

- `README.md` — product description, views, stack, deployment.
- `.impeccable.md` — design context: users, brand personality, aesthetic direction, design principles.
- A working, demonstrable app (initial demo canvas data in `src/lib`).
- No testimonials, usage metrics, customer names, or press exist. Future work must not fabricate them; all demonstrations use clearly-labeled synthetic data.

## Product Principles

1. **The map is the product.** Show the system doing its job; chrome and claims recede.
2. **Structural fidelity to Figma, honestly stated.** The plan mirrors Figma's model so it transfers; never imply integration.
3. **Precision over decoration.** Every element earns its place; no ornamental gradients, glows, or nested cards.
4. **Color carries meaning.** Per-type colors are semantic, never generic accents.
5. **Prove, don't claim.** Demonstrate with the real mechanism and labeled synthetic data; invent no proof.
