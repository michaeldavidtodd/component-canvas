import { generate, parse } from "css-tree";
import type { CssNode } from "css-tree";

import { detectTheme, type CssTheme } from "@/lib/tokenScope";

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
}

export interface CssParseResult {
	variables: ParsedCssVariable[];
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
		ast = parse(css, { parseCustomProperty: true });
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
				warnings.push(`Skipped @import: ${generate(node).trim()}. Referenced stylesheets aren't loaded, so their tokens won't be imported. Paste their contents to include them.`);
				return;
			}
			const prelude = node.prelude ? generate(node.prelude).trim() : "";
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

	return { variables, warnings };
};
