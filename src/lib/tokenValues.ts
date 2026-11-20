import type { ColorFormat, DimensionUnit, TokenKind, TokenType, TokenValueFormat } from "@/types/component";

/**
 * Single source of truth for token value notations.
 *
 * The properties panel and canvas node both read from this module so the
 * format picker, placeholders, validation, and display stay in sync.
 */
export interface TokenFormatOption {
	value: TokenValueFormat;
	/** Short label shown in the format picker. */
	label: string;
	/** Example value shown in the value input placeholder. */
	placeholder: string;
}

export const COLOR_FORMATS: readonly ColorFormat[] = ["hex", "rgb", "rgba", "hsl", "hsla"];

export const DIMENSION_UNITS: readonly DimensionUnit[] = ["px", "rem", "em", "pt", "%", "vw", "vh"];

export const COLOR_FORMAT_OPTIONS: readonly TokenFormatOption[] = [
	{ value: "hex", label: "HEX", placeholder: "#3B82F6" },
	{ value: "rgb", label: "RGB", placeholder: "59 130 246" },
	{ value: "rgba", label: "RGBA", placeholder: "59 130 246 / 0.5" },
	{ value: "hsl", label: "HSL", placeholder: "217 91% 60%" },
	{ value: "hsla", label: "HSLA", placeholder: "217 91% 60% / 0.5" },
];

export const DIMENSION_UNIT_OPTIONS: readonly TokenFormatOption[] = [
	{ value: "px", label: "px", placeholder: "16" },
	{ value: "rem", label: "rem", placeholder: "1" },
	{ value: "em", label: "em", placeholder: "1" },
	{ value: "pt", label: "pt", placeholder: "12" },
	{ value: "%", label: "%", placeholder: "100" },
	{ value: "vw", label: "vw", placeholder: "50" },
	{ value: "vh", label: "vh", placeholder: "50" },
];

export const isColorToken = (tokenType?: TokenType): boolean => tokenType === "color";

export interface TokenKindOption {
	value: TokenKind;
	label: string;
	/** One-line explanation shown under the kind picker. */
	description: string;
}

export const TOKEN_KIND_OPTIONS: readonly TokenKindOption[] = [
	{ value: "literal", label: "Literal", description: "A concrete value with a unit" },
	{ value: "alias", label: "Alias", description: "A reference to another token by name" },
];

/** Alias tokens carry a name instead of a value + format. */
export const isAliasToken = (kind?: TokenKind): boolean => kind === "alias";

export const isColorFormat = (format?: TokenValueFormat): format is ColorFormat => !!format && (COLOR_FORMATS as readonly string[]).includes(format);

/** Formats available for a token type: color notations or dimension units. */
export const getTokenFormatOptions = (tokenType?: TokenType): readonly TokenFormatOption[] => (isColorToken(tokenType) ? COLOR_FORMAT_OPTIONS : DIMENSION_UNIT_OPTIONS);

/** Sensible default notation when a token type is first selected. */
export const getDefaultTokenFormat = (tokenType?: TokenType): TokenValueFormat => (isColorToken(tokenType) ? "hex" : "px");

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUMBER_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/;

/** Wrap bare channels in their CSS function, leaving full functions untouched. */
const toCssColorFunction = (value: string, format: ColorFormat): string => {
	const trimmed = value.trim();
	if (/^(?:rgb|rgba|hsl|hsla)\(/i.test(trimmed)) return trimmed;
	return `${format}(${trimmed})`;
};

const isSupportedCssColor = (css: string): boolean => {
	if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
	return CSS.supports("color", css);
};

/**
 * Resolve a token value to a CSS color string, or `null` when it can't be
 * interpreted. Used for the swatch preview and canvas node.
 */
export const toCssColor = (value?: string, format?: TokenValueFormat): string | null => {
	const trimmed = (value ?? "").trim();
	if (!trimmed || !isColorFormat(format)) return null;

	if (format === "hex") return HEX_PATTERN.test(trimmed) ? trimmed : null;

	const css = toCssColorFunction(trimmed, format);
	return isSupportedCssColor(css) ? css : null;
};

/** Whether a value is valid for the given notation. Empty values are invalid. */
export const isValidTokenValue = (value: string | undefined, format?: TokenValueFormat): boolean => {
	const trimmed = (value ?? "").trim();
	if (!trimmed) return false;
	if (!format) return true;

	if (format === "hex") return HEX_PATTERN.test(trimmed);
	if (isColorFormat(format)) return toCssColor(trimmed, format) !== null;

	return NUMBER_PATTERN.test(trimmed);
};

/** Human-readable value for the canvas node, e.g. "#3B82F6" or "16px". */
export const formatTokenValue = (value?: string, format?: TokenValueFormat): string => {
	const trimmed = (value ?? "").trim();
	if (!trimmed) return "";

	if (isColorFormat(format)) return toCssColor(trimmed, format) ?? trimmed;
	return format ? `${trimmed}${format}` : trimmed;
};
