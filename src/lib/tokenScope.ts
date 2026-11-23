/**
 * Helpers for CSS scopes and themes.
 *
 * A CSS custom property can be declared in several scopes (`:root`, `.dark`,
 * `@media (prefers-color-scheme: dark)`, ...). These helpers keep the theme
 * detection and label/identity rules in one place so the parser, the importer,
 * and the UI agree on what a scope means.
 */

export type CssTheme = "light" | "dark";

const DARK_PATTERNS: RegExp[] = [/prefers-color-scheme\s*:\s*dark/i, /\.dark(?![-\w])/i, /\[data-theme\s*=\s*["']?dark["']?\]/i, /\[data-color-mode\s*=\s*["']?dark["']?\]/i];

const LIGHT_PATTERNS: RegExp[] = [/prefers-color-scheme\s*:\s*light/i, /\.light(?![-\w])/i, /\[data-theme\s*=\s*["']?light["']?\]/i, /\[data-color-mode\s*=\s*["']?light["']?\]/i];

/**
 * Detect the color mode a scope belongs to. Explicit dark/light markers win;
 * a bare `:root`/`html` scope is treated as the default (light) theme.
 */
export const detectTheme = (scope: string): CssTheme | undefined => {
	if (!scope) return undefined;
	if (DARK_PATTERNS.some((pattern) => pattern.test(scope))) return "dark";
	if (LIGHT_PATTERNS.some((pattern) => pattern.test(scope))) return "light";
	if (/(^|[\s,>])(:root|html)(?![-\w])/i.test(scope)) return "light";
	return undefined;
};

/**
 * Short prefix used when the same variable name appears in more than one scope.
 * `:root` stays unprefixed; `.dark` becomes `dark`; `@theme` becomes `theme`.
 */
export const getScopePrefix = (scope: string, theme?: CssTheme): string => {
	if (theme) return theme;
	const trimmed = scope.trim();
	if (!trimmed) return "";
	const layer = trimmed.match(/@layer\s+([\w.-]+)/i);
	if (layer) return layer[1].toLowerCase();
	const atRule = trimmed.match(/@([\w-]+)/);
	if (atRule) return atRule[1].toLowerCase();
	const selector = trimmed.match(/\.([\w-]+)/);
	if (selector) return selector[1].toLowerCase();
	const attribute = trimmed.match(/\[([\w-]+)/);
	if (attribute) return attribute[1].toLowerCase();
	return "";
};

/** Human-readable scope label for the preview and the properties panel. */
export const formatScope = (scope: string): string => {
	const trimmed = scope.trim();
	if (!trimmed) return "Global";
	if (/(^|[\s,>])(:root|html)(?![-\w])/i.test(trimmed)) return "Global";
	return trimmed;
};

/** Stable identity used to merge a re-import with an existing token. */
export const getTokenIdentityKey = (source: string | undefined, scope: string | undefined, name: string | undefined): string => `${source ?? ""}::${scope ?? ""}::${name ?? ""}`;
