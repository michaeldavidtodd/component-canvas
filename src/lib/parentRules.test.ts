import { describe, expect, it } from "vitest";

import type { ComponentType, TokenKind } from "@/types/component";
import {
	canAssignParent,
	getChildDraft,
	getChildTypeOptions,
	getParentRule,
	getPrimaryParentId,
	isParentTypeAllowed,
	toggleParent,
	variantNeedsMainComponent,
	type ParentNode,
} from "@/lib/parentRules";

const node = (id: string, componentType: ComponentType, tokenKind?: TokenKind): ParentNode => ({
	id,
	data: {
		label: id,
		componentType,
		description: "",
		...(tokenKind ? { tokenKind } : {}),
	},
});

describe("getParentRule", () => {
	it("gives main components no parent slot", () => {
		expect(getParentRule(node("main", "main-component").data).maxTotal).toBe(0);
	});

	it("treats alias tokens differently from literal tokens", () => {
		expect(getParentRule(node("alias", "token", "alias").data).maxTotal).toBe(1);
		expect(getParentRule(node("literal", "token", "literal").data).maxTotal).toBe(Infinity);
	});
});

describe("canAssignParent", () => {
	it("rejects a parent for a main component", () => {
		expect(canAssignParent(node("main", "main-component"), node("variant", "variant"), []).allowed).toBe(false);
	});

	it("allows a variant to take one main component", () => {
		expect(canAssignParent(node("variant", "variant"), node("main", "main-component"), []).allowed).toBe(true);
	});

	it("rejects a second main component on a variant", () => {
		const first = node("main-a", "main-component");
		expect(canAssignParent(node("variant", "variant"), node("main-b", "main-component"), [first]).allowed).toBe(false);
	});

	it("allows unlimited token parents on a variant", () => {
		const tokens = [node("t1", "token", "literal"), node("t2", "token", "literal")];
		expect(canAssignParent(node("variant", "variant"), node("t3", "token", "literal"), tokens).allowed).toBe(true);
	});

	it("caps sub components at one parent", () => {
		const main = node("main", "main-component");
		expect(canAssignParent(node("sub", "sub-component"), node("variant", "variant"), [main]).allowed).toBe(false);
	});

	it("allows a token alias only one token parent", () => {
		const first = node("t1", "token", "literal");
		expect(canAssignParent(node("alias", "token", "alias"), first, []).allowed).toBe(true);
		expect(canAssignParent(node("alias", "token", "alias"), node("t2", "token", "literal"), [first]).allowed).toBe(false);
	});

	it("rejects a parent for a group", () => {
		expect(canAssignParent(node("group", "group"), node("main", "main-component"), []).allowed).toBe(false);
	});

	it("treats an already-attached parent as allowed", () => {
		const main = node("main", "main-component");
		expect(canAssignParent(node("variant", "variant"), main, [main]).allowed).toBe(true);
	});
});

describe("isParentTypeAllowed", () => {
	it("rejects a token parent for a main component", () => {
		expect(isParentTypeAllowed(node("main", "main-component"), node("token", "token", "literal"))).toBe(false);
	});

	it("accepts a token parent for a variant", () => {
		expect(isParentTypeAllowed(node("variant", "variant"), node("token", "token", "literal"))).toBe(true);
	});
});

describe("getChildTypeOptions", () => {
	it("offers a variant beneath a main component", () => {
		const variant = getChildTypeOptions(node("main", "main-component")).find((option) => option.type === "variant");
		expect(variant?.allowed).toBe(true);
		expect(variant?.requiresMainComponent).toBe(false);
	});

	it("defaults a token child beneath a token alias to a literal", () => {
		const token = getChildTypeOptions(node("alias", "token", "alias")).find((option) => option.type === "token");
		expect(token?.tokenKind).toBe("literal");
		expect(token?.allowed).toBe(true);
	});

	it("marks a variant beneath a token as needing a main component", () => {
		const variant = getChildTypeOptions(node("literal", "token", "literal")).find((option) => option.type === "variant");
		expect(variant?.allowed).toBe(true);
		expect(variant?.requiresMainComponent).toBe(true);
	});
});

describe("getChildDraft", () => {
	it("creates an alias token beneath a token literal", () => {
		const draft = getChildDraft(node("literal", "token", "literal"));
		expect(draft.type).toBe("token");
		expect(draft.allowed).toBe(true);
		expect(draft.requiresMainComponent).toBe(false);
	});

	it("creates a variant beneath a token alias", () => {
		const draft = getChildDraft(node("alias", "token", "alias"));
		expect(draft.type).toBe("variant");
		expect(draft.allowed).toBe(true);
		expect(draft.requiresMainComponent).toBe(true);
	});
});

describe("variantNeedsMainComponent", () => {
	it("is true when a variant has token parents but no main component", () => {
		expect(variantNeedsMainComponent([node("t", "token", "literal")])).toBe(true);
	});

	it("is false once a main component is present", () => {
		expect(variantNeedsMainComponent([node("main", "main-component"), node("t", "token", "literal")])).toBe(false);
	});
});

describe("getPrimaryParentId", () => {
	it("prefers a structural parent over a token parent", () => {
		expect(getPrimaryParentId([node("t", "token", "literal"), node("main", "main-component")])).toBe("main");
	});

	it("falls back to the first parent", () => {
		expect(getPrimaryParentId([node("t", "token", "literal")])).toBe("t");
	});

	it("returns null when there are no parents", () => {
		expect(getPrimaryParentId([])).toBeNull();
	});
});

describe("toggleParent", () => {
	it("removes a parent that is already attached", () => {
		const main = node("main", "main-component");
		expect(toggleParent(node("variant", "variant"), main, [main])).toEqual([]);
	});

	it("appends an additional token parent to a variant", () => {
		const main = node("main", "main-component");
		const token = node("t", "token", "literal");
		expect(toggleParent(node("variant", "variant"), token, [main])).toEqual([main, token]);
	});

	it("replaces the parent when the rule allows only one", () => {
		const main = node("main", "main-component");
		const variant = node("variant", "variant");
		expect(toggleParent(node("sub", "sub-component"), variant, [main])).toEqual([variant]);
	});

	it("leaves the parents untouched when none are allowed", () => {
		expect(toggleParent(node("main", "main-component"), node("variant", "variant"), [])).toEqual([]);
	});
});
