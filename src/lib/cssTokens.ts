import { fork, generate } from "css-tree";
import type { CssNode } from "css-tree";

import { detectTheme, type CssTheme } from "@/lib/tokenScope";

/**
 * css-tree doesn't know `@theme` holds declarations. When a theme block also
 * contains a nested at-rule (Tailwind v4 puts `@keyframes` inside `@theme`), the
 * default lookahead parses the block as a rule list and silently drops the
 * declarations. Register `@theme` as a declaration-block at-rule so the whole
 * theme is collected.
 */
type AtruleBlockContext = { Block: (isStyleBlock?: boolean) => CssNode };

const cssSyntax = fork({
	atrule: {
		theme: {
			parse: {
				block(this: AtruleBlockContext) {
					return this.Block(true);
				},
			},
		},
	},
} as unknown as Parameters<typeof fork>[0]);

/** A custom property found in a stylesheet. */
export interface ParsedCssVariable {
	/** Variable name without the leading `--`. */
	name: string;
	/** Value exactly as written in the declaration. */
	raw: string;
	/** Selector/at-rule chain that contains the declaration. */
	scope: string;
	/** Theme inferred from the scope, when one can be detected. */
	theme?: CssTheme;
	/** Declaration order, used to keep the preview stable. */
	sourceOrder: number;
	/** `syntax` from a matching `@property` rule, when present. */
	propertySyntax?: string;
	/** Where the declaration came from: the uploaded CSS or the Tailwind theme. */
	origin?: "upload" | "tailwind";
}

/** An `@import` reference found in the stylesheet. */
export interface CssImportRef {
	/** The full `@import` rule as written. */
	raw: string;
	/** The imported URL or path, normalized. */
	url: string;
	/** True when the import targets Tailwind v4. */
	tailwind: boolean;
	/** Scope chain where the import appeared. */
	scope: string;
}

export interface CssParseResult {
	variables: ParsedCssVariable[];
	/** `@import` references, including Tailwind v4 imports. */
	imports: CssImportRef[];
	/** Signals that the stylesheet targets Tailwind v4. */
	tailwindSignals: string[];
	warnings: string[];
}

/** Raised when the stylesheet cannot be parsed at all. */
export class CssParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CssParseError";
	}
}

const isDeclaration = (node: CssNode): node is Extract<CssNode, { type: "Declaration" }> => node.type === "Declaration";

/** Pull the URL out of an `@import` prelude (`"x"`, `url("x")`, or `url(x)`). */
const extractImportUrl = (prelude: string): string => {
	const trimmed = prelude.trim();
	const urlMatch = trimmed.match(/^url\(\s*(?:["']([^"']+)["']|([^)]+))\s*\)/i);
	if (urlMatch) return (urlMatch[1] ?? urlMatch[2] ?? "").trim();
	const stringMatch = trimmed.match(/^["']([^"']+)["']/);
	if (stringMatch) return stringMatch[1];
	return trimmed.split(/\s+/)[0] ?? "";
};

const findDeclaration = (node: CssNode, property: string): string | undefined => {
	let found: string | undefined;
	const visit = (current: CssNode) => {
		if (found) return;
		if (isDeclaration(current)) {
			if (current.property.toLowerCase() === property) {
				found = generate(current.value).trim();
			}
			return;
		}
		if (current.type === "Rule") {
			current.block.children.forEach(visit);
			return;
		}
		if (current.type === "Atrule" && current.block) {
			current.block.children.forEach(visit);
			return;
		}
		if (current.type === "StyleSheet") {
			current.children.forEach(visit);
		}
	};
	visit(node);
	return found;
};

/**
 * Parse a stylesheet and collect every custom property declaration.
 *
 * The walker keeps the selector/at-rule chain as the scope, so a variable
 * declared in `.dark` or `@media (prefers-color-scheme: dark)` is reported
 * separately from the same name in `:root`.
 */
export const parseCssVariables = (css: string): CssParseResult => {
	const warnings: string[] = [];
	let ast: CssNode;

	try {
		// Keep custom property values as raw text. Parsing them as values makes
		// css-tree re-serialize and collapse whitespace, which corrupts values like
		// `oklch(63.7% 0.237 25.331)` and multi-part shadows.
		ast = cssSyntax.parse(css);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown parser error";
		throw new CssParseError(`Could not parse the CSS: ${message}`);
	}

	// Collect `@property` syntax declarations first so a variable can reference
	// its registered syntax regardless of source order.
	const propertySyntax = new Map<string, string>();
	const collectProperties = (node: CssNode) => {
		if (node.type === "Atrule" && node.name.toLowerCase() === "property" && node.prelude) {
			const name = generate(node.prelude).trim().replace(/^--/, "");
			const syntax = findDeclaration(node, "syntax");
			if (name && syntax) propertySyntax.set(name, syntax.replace(/^["']|["']$/g, ""));
		}
		if (node.type === "Rule") {
			node.block.children.forEach(collectProperties);
			return;
		}
		if (node.type === "Atrule" && node.block) {
			node.block.children.forEach(collectProperties);
			return;
		}
		if (node.type === "StyleSheet") {
			node.children.forEach(collectProperties);
		}
	};
	collectProperties(ast);

	const variables: ParsedCssVariable[] = [];
	const imports: CssImportRef[] = [];
	const tailwindSignals: string[] = [];
	let sourceOrder = 0;

	const visit = (node: CssNode, scope: string) => {
		if (isDeclaration(node)) {
			if (!node.property.startsWith("--")) return;
			const name = node.property.slice(2);
			variables.push({
				name,
				raw: generate(node.value).trim(),
				scope: scope || ":root",
				theme: detectTheme(scope),
				sourceOrder: sourceOrder++,
				propertySyntax: propertySyntax.get(name),
			});
			return;
		}

		if (node.type === "Rule") {
			const selector = generate(node.prelude).trim();
			const nextScope = scope ? `${scope} ${selector}` : selector;
			node.block.children.forEach((child) => visit(child, nextScope));
			return;
		}

		if (node.type === "Atrule") {
			const name = node.name.toLowerCase();
			if (name === "import") {
				const raw = generate(node).trim();
				const prelude = node.prelude ? generate(node.prelude).trim() : "";
				const url = extractImportUrl(prelude);
				const tailwind = url === "tailwindcss" || url.startsWith("tailwindcss/");
				imports.push({ raw, url, tailwind, scope: scope || ":root" });
				if (tailwind) {
					tailwindSignals.push(`@import ${url}`);
				} else {
					warnings.push(`Skipped @import: ${raw}. Referenced stylesheets aren't loaded, so their tokens won't be imported. Paste their contents to include them.`);
				}
				return;
			}
			const prelude = node.prelude ? generate(node.prelude).trim() : "";
			if (name === "tailwind") {
				warnings.push(`Tailwind v3 directive @tailwind${prelude ? ` ${prelude}` : ""} isn't supported. Upload compiled CSS or use Tailwind v4.`);
				return;
			}
			if (name === "theme") {
				tailwindSignals.push(`@theme${prelude ? ` ${prelude}` : ""}`);
			}
			if (name === "layer" && /\btheme\b/i.test(prelude)) {
				tailwindSignals.push(`@layer ${prelude}`);
			}
			const nextScope = scope ? `${scope} @${name}${prelude ? ` ${prelude}` : ""}` : `@${name}${prelude ? ` ${prelude}` : ""}`;
			if (node.block) {
				node.block.children.forEach((child) => visit(child, nextScope));
			}
			return;
		}

		if (node.type === "StyleSheet") {
			node.children.forEach((child) => visit(child, scope));
		}
	};

	visit(ast, "");

	return { variables, imports, tailwindSignals, warnings };
};
