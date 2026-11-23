export type ComponentType = "main-component" | "variant" | "sub-component" | "token" | "instance" | "group";

export type TokenType = "color" | "spacing" | "corner-radius" | "size";
export type TokenSubType =
	| "background"
	| "foreground" // for color
	| "padding"
	| "margin"
	| "gap" // for spacing
	| "font-size"
	| "dimensions"; // for size

/** Accepted notations for color token values. */
export type ColorFormat = "hex" | "rgb" | "rgba" | "hsl" | "hsla";

/** Accepted units for spacing, corner radius, and size token values. */
export type DimensionUnit = "px" | "rem" | "em" | "pt" | "%" | "vw" | "vh";

/** The notation a token value is expressed in. */
export type TokenValueFormat = ColorFormat | DimensionUnit;

/** Whether a token holds a concrete value or references another token. */
export type TokenKind = "literal" | "alias";

export interface ComponentNodeData extends Record<string, unknown> {
	label: string;
	componentType: ComponentType;
	description: string;
	url?: string; // URL to Figma component or other external link
	// Token-specific fields
	tokenType?: TokenType;
	tokenSubType?: TokenSubType;
	/** Literal tokens carry a value + format; alias tokens carry a name. */
	tokenKind?: TokenKind;
	/** Raw value as entered, e.g. "#3B82F6", "59 130 246", or "16". */
	tokenValue?: string;
	/** Notation/unit the value is expressed in, e.g. "hex" or "rem". */
	tokenFormat?: TokenValueFormat;
	  /** Name of the token this alias points to. Doubles as the node's display name. */
	  tokenAlias?: string;
	  /**
	   * Explicit parent relationship, independent of canvas edges.
	   * `undefined` falls back to the first incoming edge; `null` means detached.
	   */
	  parentId?: string | null;
	  /**
	   * Manual row order within the token map's sibling order. The user
	   * re-orders rows; the canvas layout ignores it.
	   */
	  order?: number;
	  /** Raw CSS selector/at-rule context a token was imported from. */
	  tokenScope?: string;
	  /** Color mode detected from the scope, e.g. `light` or `dark`. */
	  tokenTheme?: string;
	  /** Source stylesheet name or `pasted` for imported tokens. */
	  tokenSource?: string;
	  /** Original CSS custom property name, without the leading `--`. */
	  tokenName?: string;
	}
