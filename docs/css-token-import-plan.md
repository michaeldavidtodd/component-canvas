# CSS Token Import Plan

Status: Draft
Owner: MDT
Last updated: 2026-11-23

## Context

Designers need to map an existing design system into the canvas. Today every token has to be created by hand. Most design systems already expose their tokens as CSS custom properties, so importing a stylesheet is the fastest path to a populated token map.

This plan covers parsing CSS custom properties, normalizing them into the app's token model, and creating the corresponding nodes and edges.

## Decisions

| Area | Decision |
| --- | --- |
| Input | File upload and paste, in one modal |
| Parser | `css-tree` for robust CSS parsing |
| Type inference | Name + value heuristics; preview lets the user correct the type. Ambiguous variables default to untyped and are skipped unless opted in |
| Unsupported values | Imported as literal tokens with no format and flagged. New formats can be added later |
| Alias chains | Allowed. Alias tokens may parent other alias tokens |
| Scoping | Import every scope, prefix duplicate names with the scope, and store `tokenScope` / `tokenTheme` for future theme features |
| Placement | Dedicated area to the right of the graph, laid out with Dagre. A "CSS Import" group node anchors the import |
| Metadata | Store `tokenSource`, `tokenScope`, and `tokenTheme` on each token |
| Desktop | Standard file input (works in web and Tauri) |
| Merge | Re-imports diff against existing tokens by `(tokenSource, tokenScope, variableName)` |

## Architecture

1. **Parser** (`src/lib/cssTokens.ts`) — `parseCssVariables(cssText, sourceName)`.
2. **Normalizer** (`src/lib/cssTokenNormalize.ts`) — `normalizeCssVariable(parsed)`.
3. **Model** — optional `tokenScope`, `tokenTheme`, `tokenSource` on `ComponentNodeData`; a `group` component type for import/theme grouping.
4. **UI** — import modal from the dock; preview with editable types and statuses.
5. **Graph integration** — one `setNodes` / `setEdges` update so undo/redo treats the import as one action.

## Phasing

- **Phase 1 (MVP):** parser, normalizer, model fields, group type, modal, literal import, placement, feedback.
- **Phase 2:** alias chains, merge strategy, scope/theme surfacing.
- **Phase 3:** robustness (`@media`, `@supports`, `@layer`, `@theme`, `@property`), tests, export.

## Issues

### 1. Add `css-tree` and build the CSS variable parser

**Scope**

- Add `css-tree` dependency.
- Create `src/lib/cssTokens.ts` with `parseCssVariables(cssText, sourceName)`.
- Walk declarations and collect custom properties (`--*`) with:
  - `name`, `rawValue`, `scope` (selector/at-rule chain), `sourceOrder`, `propertySyntax` from `@property`.
- Handle comments, strings, nested blocks, `@media`, `@supports`, `@layer`, `@theme`, `@property`.
- Detect color mode from scope: `.dark`, `[data-theme="dark"]`, `prefers-color-scheme: dark` → `dark`; `:root` / `html` / `[data-theme="light"]` → `light`; otherwise `null`.
- Return a typed result or throw a typed `CssParseError`.

**Acceptance**

- Parses `src/index.css` and returns every variable with the correct scope.
- Malformed CSS produces a typed error, not a crash.
- No UI changes yet.

### 2. Normalize CSS values and infer token types

**Scope**

- Create `src/lib/cssTokenNormalize.ts` with `normalizeCssVariable(parsed)`.
- Normalize:
  - hex → `tokenFormat: "hex"`.
  - `rgb()` / `rgba()` → bare channels, `"rgb"` / `"rgba"`.
  - `hsl()` / `hsla()` → bare channels, `"hsl"` / `"hsla"`.
  - bare HSL channels (`0 0% 99%`) → `"hsl"`.
  - bare RGB channels (`59 130 246`) → `"rgb"`.
  - lengths (`16px`, `1rem`, `100%`, `10vw`) → number + unit.
  - unitless numbers → number, format undefined, flagged ambiguous.
  - `var(--x)` → alias reference; `var(--x, fallback)` → alias + fallback.
  - unsupported (`calc()`, `clamp()`, `color-mix()`, named colors, shadows, gradients, `currentColor`, `inherit`) → literal with no format, `status: "unsupported"`.
- Infer `tokenType` / `tokenSubType` from name + value + `@property` syntax.
- Return `status: "ready" | "unsupported" | "ambiguous"` with reasons.

**Acceptance**

- Normalizes the app's own variables correctly.
- Flags unsupported values instead of silently dropping them.
- Infers types for common naming conventions.
- Unit tests cover the normalization matrix.

### 3. Extend the token model with scope, theme, and source

**Scope**

- Add optional fields to `ComponentNodeData`:
  - `tokenScope?: string` (raw selector/at-rule context).
  - `tokenTheme?: string` (`light`, `dark`, or custom).
  - `tokenSource?: string` (file name or `pasted`).
- Add `src/lib/tokenScope.ts` with `detectColorMode`, `formatScopeLabel`, `getTokenScopeKey`.
- Confirm save/load round-trip (JSON, no schema change).

**Acceptance**

- Fields persist through save/load.
- Existing projects are unaffected.
- Helpers are tested.

### 4. Allow alias → alias parent relationships

**Scope**

- Relax `TOKEN_ALIAS_RULE` in `src/lib/parentRules.ts` to allow a token parent of any kind (literal or alias), still `maxTotal: 1`.
- Update the rule description.
- Update `getChildTypeOptions` so token children under a token parent can be alias or literal.
- Ensure cycles are still prevented (`buildTokenLayout` path set, `parentGroups` descendants).
- Update `PropertiesPanel` parent picker labels if needed.

**Acceptance**

- An alias token can be parented to another alias token.
- The structured map renders the chain.
- Existing rules still prevent cycles and multiple parents.

### 5. Add a group node type for import/theme grouping

**Scope**

- Add `"group"` to `ComponentType`.
- Add meta in `src/lib/componentTypes.ts`: label "Group", description, icon (`FolderTree`), colors (`--component-group`), child mapping (`group → token`).
- Add `GROUP_RULE` in `src/lib/parentRules.ts` (no parents for MVP).
- Add `group` to `TYPE_RANK` and `COLUMN_LABELS` in `src/lib/tokenLayout.ts`.
- Add `--component-group` to `src/index.css` (light and dark).
- Add "Group" to `PropertiesPanel` type options.
- `WorkspaceHeader` filters and `NodeDock` add menu pick it up automatically.

**Acceptance**

- Group nodes render, filter, and can parent tokens.
- No regressions in existing node types.

### 6. Build the CSS import modal UI

**Scope**

- Add an "Import CSS" entry point in `NodeDock` (new "Import" group, icon `FileUp`).
- Modal:
  - File input (`accept=".css,text/css"`, 5 MB limit).
  - Paste textarea.
  - "Parse" button.
  - Loading and error states.
- Preview table:
  - Checkbox, name, value, inferred type (editable select), scope/theme, status badge.
  - Select all/none, filter by status.
  - Counts summary.
- "Import" button with progress.

**Acceptance**

- Upload or paste → preview → adjust types → import.
- Errors are actionable.

### 7. Create token nodes and edges from parsed CSS

**Scope**

- Add `importCssTokens` logic (new `src/lib/importCssTokens.ts` + hook, or in `ComponentLibraryPlanner`).
- Create a group node per source: `CSS Import: <file>`.
- Create literal tokens under the group with all token fields + scope/theme/source.
- Create alias tokens with edges to referenced tokens (including chains).
- Create placeholder literals for unresolved references so aliases have a parent.
- Apply scope prefixes for duplicate names (`dark/color-bg`).
- Lay out the imported subtree with Dagre to the right of the existing graph.
- Commit in a single `setNodes` / `setEdges` update for undo/redo.
- Select and reveal the import root.

**Acceptance**

- Import produces a correctly structured, laid-out subtree.
- Undo removes the whole import in one step.

### 8. Merge strategy for re-imports

**Scope**

- Identity: `(tokenSource, tokenScope, variableName)`.
- Diff parsed variables against existing tokens: `new`, `changed`, `unchanged`, `removed`.
- Preview shows the diff with per-row action (update/skip/delete).
- Apply updates in place: value, format, type, subtype, kind, alias, label.
- Update alias edges: remove stale, add new.
- Removed tokens: user choice (delete or keep).
- Reuse the existing group node for the same source.

**Acceptance**

- Re-importing the same file updates changed tokens without duplicating.
- Removed tokens are handled per user choice.

### 9. Progress, error, and success feedback

**Scope**

- Progress phases in the modal: reading → parsing → normalizing → creating → done.
- Toasts:
  - Success: "Imported 42 tokens (3 skipped)" with an "Undo" action.
  - Partial success: list skipped reasons.
  - Errors: invalid file type, file too large, parse error, no variables found.
- Empty result: "No CSS custom properties found."

**Acceptance**

- Every failure mode has a clear message.
- Success reports counts.
- Undo is available.

### 10. Surface scope/theme in the UI (bonus)

**Scope**

- Show `tokenScope` / `tokenTheme` badges on token nodes or in the properties panel.
- Add a read-only "Source" section in `PropertiesPanel` (source file, scope, theme).
- Prepare for future theme palette views (group by `tokenTheme`).

**Acceptance**

- Imported tokens display their scope/theme.
- No layout regressions.

### 11. Add unit tests for CSS parsing and normalization (recommended)

**Scope**

- Add Vitest (or the project's preferred runner) and a `test` script.
- Fixtures:
  - `src/index.css` (HSL channels, `.dark`, `var()` aliases).
  - Tailwind v4 `@theme`.
  - `@media (prefers-color-scheme: dark)`.
  - Alias chains.
  - Unsupported values.
  - Malformed CSS.
- Tests for parser, normalizer, scope detection, merge identity.

**Acceptance**

- Tests pass locally.
- Fixtures cover the decisions above.

## Dependencies

| Issue | Depends on |
| --- | --- |
| 1 Parser | — |
| 2 Normalizer | 1 |
| 3 Model fields | — |
| 4 Alias chains | — |
| 5 Group type | — |
| 6 Modal UI | 1, 2, 3 |
| 7 Graph integration | 1, 2, 3, 4, 5, 6 |
| 8 Merge | 7 |
| 9 Feedback | 6, 7 |
| 10 Scope/theme UI | 3, 7 |
| 11 Tests | 1, 2 |

## Suggested priorities

- **High:** Epic, 1, 2, 3, 5, 6, 7
- **Medium:** 4, 8, 9
- **Low:** 10, 11

## Implementation notes

### Parser shape

```ts
export interface ParsedCssVariable {
  /** Variable name without the leading `--`. */
  name: string;
  /** Value exactly as written in the declaration. */
  rawValue: string;
  /** Selector or at-rule chain that contains the declaration. */
  scope: string;
  /** Detected color mode, if the scope implies one. */
  theme: string | null;
  /** Declaration order, used to keep the preview stable. */
  sourceOrder: number;
  /** `syntax` from a matching `@property`, when present. */
  propertySyntax?: string;
}

export interface CssParseResult {
  variables: ParsedCssVariable[];
  warnings: string[];
}
```

### Normalizer shape

```ts
export type NormalizedStatus = "ready" | "unsupported" | "ambiguous";

export interface NormalizedCssToken {
  name: string;
  scope: string;
  theme: string | null;
  source: string;
  status: NormalizedStatus;
  reasons: string[];
  tokenType?: TokenType;
  tokenSubType?: TokenSubType;
  tokenKind: "literal" | "alias";
  tokenValue?: string;
  tokenFormat?: TokenValueFormat;
  tokenAlias?: string;
  /** Original value, kept for the preview and for unsupported literals. */
  rawValue: string;
}
```

### Merge identity

```ts
const getTokenScopeKey = (token: Pick<ComponentNodeData, "tokenSource" | "tokenScope" | "label">) =>
  `${token.tokenSource ?? ""}::${token.tokenScope ?? ""}::${token.label}`;
```

### Placement

- Compute the bounding box of existing nodes.
- Place the import group at `maxX + 240`.
- Lay out the imported subtree with Dagre (`rankdir: "LR"` for token chains).
- Offset the laid-out nodes by the group's position.
- Commit nodes and edges in one update.

### Scope prefixes

- If a variable name appears in more than one scope, prefix the label with the scope:
  - `:root` → `color-bg`
  - `.dark` → `dark/color-bg`
  - `@media (prefers-color-scheme: dark)` → `dark/color-bg`
- Store the raw scope on `tokenScope` regardless of the prefix.

### Unsupported values

- Import as literal tokens with `tokenFormat: undefined` and `status: "unsupported"`.
- Show the raw value in the preview and on the node.
- Do not block the import; report the count in the success toast.

### Alias chains

- `--a: #fff` → literal `a`.
- `--b: var(--a)` → alias `b`, edge `a → b`.
- `--c: var(--b)` → alias `c`, edge `b → c`.
- Unresolved reference → placeholder literal with no value, flagged in the preview.

## Open questions

- Should the import group be one per source file, or one per scope/theme? (Current plan: one per source file; scope is stored on tokens and prefixed in labels.)
- Should unitless numbers default to `px` or stay unformatted? (Current plan: stay unformatted and flagged ambiguous.)
- Should named colors be converted to hex or imported as unsupported literals? (Current plan: unsupported literals, flagged.)
- Should `@import` be followed? (Current plan: no. Only the CSS you provide is parsed. Stylesheets referenced by `@import` are not fetched, so their tokens won't be imported. The preview shows a warning that names the skipped `@import` and tells the user to paste the referenced file's contents to include them.)
