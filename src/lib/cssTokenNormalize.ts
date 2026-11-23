import type { TokenSubType, TokenType, TokenValueFormat } from "@/types/component";
import type { ParsedCssVariable } from "@/lib/cssTokens";
import type { CssTheme } from "@/lib/tokenScope";
import { COLOR_FORMATS, DIMENSION_UNITS } from "@/lib/tokenValues";

export type NormalizedStatus = "ready" | "ambiguous" | "unsupported";

/** A CSS variable after value normalization and type inference. */
export interface NormalizedCssToken {
	name: string;
	raw: string;
	scope: string;
	theme?: CssTheme;
	sourceOrder: number;
	propertySyntax?: string;
	/** Where the declaration came from: the uploaded CSS or the Tailwind theme. */
	origin?: "upload" | "tailwind";
	status: NormalizedStatus;
	reasons: string[];
	tokenKind: "literal" | "alias";
	tokenType?: TokenType;
	tokenSubType?: TokenSubType;
	tokenValue?: string;
	tokenFormat?: TokenValueFormat;
	aliasOf?: string;
	aliasFallback?: string;
}

const COLOR_FORMAT_SET = new Set<string>(COLOR_FORMATS);
const DIMENSION_UNIT_SET = new Set<string>(DIMENSION_UNITS);

const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*([\s\S]+?)\s*\)$/i;
const HSL_RE = /^hsla?\(\s*([\s\S]+?)\s*\)$/i;
const OKLCH_RE = /^oklch\(\s*([\s\S]+?)\s*\)$/i;
const VAR_RE = /^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/i;
const DIMENSION_RE = /^(-?(?:\d+|\d*\.\d+))([a-z%]+)$/i;
const NUMBER_RE = /^-?(?:\d+|\d*\.\d+)$/;
const BARE_HSL_RE = /^-?(?:\d+|\d*\.\d+)(?:deg|rad|turn)?\s+[\d.]+%\s+[\d.]+%(?:\s*\/\s*[\d.]+%?)?$/i;
const BARE_RGB_RE = /^\d{1,3}\s+\d{1,3}\s+\d{1,3}(?:\s*\/\s*[\d.]+%?)?$/;
const RATIO_RE = /^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/;
const EASING_RE = /^(?:cubic-bezier|steps|linear)\(/i;
const CALC_SIMPLE_RE = /^calc\(\s*(-?(?:\d+|\d*\.\d+))\s*([+\-*/])\s*(-?(?:\d+|\d*\.\d+))\s*\)$/i;
const UNSUPPORTED_FUNCTION_RE = /^(?:calc|clamp|min|max|color-mix|light-dark|linear-gradient|radial-gradient|conic-gradient|url|image-set|paint|anchor|attr)\(/i;

const COLOR_NAME_HINT = /(^|[-_])(color|colour|background|foreground|surface|canvas|workspace|card|popover|primary|secondary|accent|muted|destructive|danger|warning|success|info|ring|border|fill|stroke|brand|sidebar|chart)([-_]|$)/i;
const RADIUS_NAME_HINT = /(^|[-_])(radius|corner|rounded)([-_]|$)/i;
const SPACING_NAME_HINT = /(^|[-_])(spacing|space|gap|padding|margin|gutter|inset)([-_]|$)/i;
const SIZE_NAME_HINT = /(^|[-_])(size|width|height|font-size|text-size|line-height|letter-spacing|avatar|icon|breakpoint)([-_]|$)/i;
const BACKGROUND_HINT = /(^|[-_])(background|bg|surface|canvas|workspace|card|popover)([-_]|$)/i;
const FOREGROUND_HINT = /(^|[-_])(foreground|fg|text|content|label|stroke|icon)([-_]|$)/i;
const PADDING_HINT = /(^|[-_])padding([-_]|$)/i;
const MARGIN_HINT = /(^|[-_])margin([-_]|$)/i;
const GAP_HINT = /(^|[-_])(gap|gutter)([-_]|$)/i;
const SHADOW_NAME_HINT = /(^|[-_])(shadow|elevation|drop-shadow)([-_]|$)/i;
const FONT_NAME_HINT = /(^|[-_])(font-family|font-sans|font-serif|font-mono|font-display|typeface|family)([-_]|$)/i;
const FONT_WEIGHT_NAME_HINT = /(^|[-_])(font-weight|weight)([-_]|$)/i;
const LINE_HEIGHT_NAME_HINT = /(^|[-_])(line-height|leading)([-_]|$)/i;
// Tailwind's `--text-*` scale is font size. Exclude `--text-shadow-*` and the
// `--text-*--line-height`-style modifiers, which are handled elsewhere.
const TEXT_SIZE_NAME_HINT = /(^|[-_])text-(?!shadow)[a-z0-9]+$/i;

const inferColorSubType = (name: string): TokenSubType | undefined => {
	if (BACKGROUND_HINT.test(name)) return "background";
	if (FOREGROUND_HINT.test(name)) return "foreground";
	return undefined;
};

const inferSpacingSubType = (name: string): TokenSubType | undefined => {
	if (PADDING_HINT.test(name)) return "padding";
	if (MARGIN_HINT.test(name)) return "margin";
	if (GAP_HINT.test(name)) return "gap";
	return undefined;
};

const inferType = (name: string, syntax?: string, format?: TokenValueFormat): { tokenType?: TokenType; tokenSubType?: TokenSubType } => {
	const normalizedSyntax = syntax?.toLowerCase();
	if (normalizedSyntax?.includes("color")) return { tokenType: "color", tokenSubType: inferColorSubType(name) };
	if (normalizedSyntax?.includes("length") || normalizedSyntax?.includes("percentage")) return { tokenType: "size", tokenSubType: "dimensions" };

	if (format === "shadow") return { tokenType: "shadow", tokenSubType: "elevation" };
	if (format === "font") return { tokenType: "font", tokenSubType: "font-family" };
	if (format === "ratio") return { tokenType: "ratio", tokenSubType: "aspect-ratio" };
	if (format === "number") {
		if (LINE_HEIGHT_NAME_HINT.test(name)) return { tokenType: "size", tokenSubType: "line-height" };
		if (FONT_WEIGHT_NAME_HINT.test(name)) return { tokenType: "font", tokenSubType: "font-weight" };
	}

	if (format && COLOR_FORMAT_SET.has(format)) return { tokenType: "color", tokenSubType: inferColorSubType(name) };
	if (RADIUS_NAME_HINT.test(name)) return { tokenType: "corner-radius" };
	if (SPACING_NAME_HINT.test(name)) return { tokenType: "spacing", tokenSubType: inferSpacingSubType(name) };
	if (LINE_HEIGHT_NAME_HINT.test(name)) return { tokenType: "size", tokenSubType: "line-height" };
	if (TEXT_SIZE_NAME_HINT.test(name)) return { tokenType: "size", tokenSubType: "font-size" };
	if (SIZE_NAME_HINT.test(name)) return { tokenType: "size", tokenSubType: "dimensions" };
	if (COLOR_NAME_HINT.test(name)) return { tokenType: "color", tokenSubType: inferColorSubType(name) };
	if (format && DIMENSION_UNIT_SET.has(format)) return { tokenType: "size", tokenSubType: "dimensions" };
	return {};
};

interface ClassifiedValue {
	status: NormalizedStatus;
	reasons: string[];
	tokenValue?: string;
	tokenFormat?: TokenValueFormat;
}

const classifyValue = (raw: string): ClassifiedValue => {
	const value = raw.trim();
	if (!value) return { status: "unsupported", reasons: ["Empty value"] };

	if (HEX_RE.test(value)) return { status: "ready", reasons: [], tokenValue: value, tokenFormat: "hex" };

	const rgb = value.match(RGB_RE);
	if (rgb) {
		const format = value.toLowerCase().startsWith("rgba") ? "rgba" : "rgb";
		return { status: "ready", reasons: [], tokenValue: rgb[1].trim(), tokenFormat: format };
	}

	const hsl = value.match(HSL_RE);
	if (hsl) {
		const format = value.toLowerCase().startsWith("hsla") ? "hsla" : "hsl";
		return { status: "ready", reasons: [], tokenValue: hsl[1].trim(), tokenFormat: format };
	}

	const oklch = value.match(OKLCH_RE);
	if (oklch) return { status: "ready", reasons: [], tokenValue: oklch[1].trim(), tokenFormat: "oklch" };

	if (BARE_HSL_RE.test(value)) return { status: "ready", reasons: [], tokenValue: value, tokenFormat: "hsl" };
	if (BARE_RGB_RE.test(value)) return { status: "ready", reasons: [], tokenValue: value, tokenFormat: "rgb" };

	if (RATIO_RE.test(value)) return { status: "ready", reasons: [], tokenValue: value, tokenFormat: "ratio" };
	if (EASING_RE.test(value)) return { status: "ready", reasons: [], tokenValue: value, tokenFormat: "easing" };

	const calc = value.match(CALC_SIMPLE_RE);
	if (calc) {
		const a = Number(calc[1]);
		const b = Number(calc[3]);
		const op = calc[2];
		const result = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : b === 0 ? Number.NaN : a / b;
		if (Number.isFinite(result)) return { status: "ready", reasons: [], tokenValue: String(Number(result.toFixed(6))), tokenFormat: "number" };
	}

	const dimension = value.match(DIMENSION_RE);
	if (dimension) {
		const unit = dimension[2].toLowerCase();
		if (DIMENSION_UNIT_SET.has(unit)) {
			return { status: "ready", reasons: [], tokenValue: dimension[1], tokenFormat: unit as TokenValueFormat };
		}
		return { status: "unsupported", reasons: [`Unsupported unit "${unit}"`], tokenValue: value };
	}

	if (NUMBER_RE.test(value)) return { status: "ambiguous", reasons: ["Unitless number; choose a unit before importing"], tokenValue: value };

	if (UNSUPPORTED_FUNCTION_RE.test(value)) return { status: "unsupported", reasons: ["Unsupported CSS function"], tokenValue: value };

	if (/^[a-z-]+$/i.test(value)) return { status: "unsupported", reasons: ["Named color or keyword"], tokenValue: value };

	return { status: "unsupported", reasons: ["Unsupported value format"], tokenValue: value };
};

/** Normalize a parsed variable into a token the importer can consume. */
export const normalizeCssVariable = (variable: ParsedCssVariable): NormalizedCssToken => {
	const raw = variable.raw.trim();
	const alias = raw.match(VAR_RE);

	if (alias) {
		const inferred = inferType(variable.name, variable.propertySyntax);
		return {
			...variable,
			raw,
			status: "ready",
			reasons: alias[2] ? ["Alias has a fallback value"] : [],
			tokenKind: "alias",
			aliasOf: alias[1].replace(/^--/, ""),
			aliasFallback: alias[2]?.trim(),
			tokenType: inferred.tokenType,
			tokenSubType: inferred.tokenSubType,
		};
	}

	const classified = classifyValue(raw);

	// Name-based fallbacks for composite values that `classifyValue` can't parse.
	if (classified.status === "unsupported" && SHADOW_NAME_HINT.test(variable.name)) {
		return { ...variable, raw, status: "ready", reasons: [], tokenKind: "literal", tokenValue: raw, tokenFormat: "shadow", tokenType: "shadow", tokenSubType: "elevation" };
	}
	if (classified.status === "unsupported" && FONT_NAME_HINT.test(variable.name)) {
		return { ...variable, raw, status: "ready", reasons: [], tokenKind: "literal", tokenValue: raw, tokenFormat: "font", tokenType: "font", tokenSubType: "font-family" };
	}
	if (classified.status === "ambiguous" && FONT_WEIGHT_NAME_HINT.test(variable.name)) {
		return { ...variable, raw, status: "ready", reasons: [], tokenKind: "literal", tokenValue: raw, tokenFormat: "number", tokenType: "font", tokenSubType: "font-weight" };
	}
	if (classified.status === "ambiguous" && LINE_HEIGHT_NAME_HINT.test(variable.name)) {
		return { ...variable, raw, status: "ready", reasons: [], tokenKind: "literal", tokenValue: raw, tokenFormat: "number", tokenType: "size", tokenSubType: "line-height" };
	}

	const inferred = inferType(variable.name, variable.propertySyntax, classified.tokenFormat);

	return {
		...variable,
		raw,
		status: classified.status,
		reasons: classified.reasons,
		tokenKind: "literal",
		tokenValue: classified.tokenValue,
		tokenFormat: classified.tokenFormat,
		tokenType: inferred.tokenType,
		tokenSubType: inferred.tokenSubType,
	};
};

export const normalizeCssVariables = (variables: ParsedCssVariable[]): NormalizedCssToken[] => variables.map(normalizeCssVariable);
