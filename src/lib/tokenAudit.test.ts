import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { auditTokenMap } from "@/lib/tokenAudit";

const token = (id: string, data: Partial<ComponentNodeData> = {}): Node<ComponentNodeData> => ({
	id,
	type: "component",
	position: { x: 0, y: 0 },
	data: { label: id, componentType: "token", description: "", ...data },
});

const consumer = (id: string): Node<ComponentNodeData> => ({
	id,
	type: "component",
	position: { x: 0, y: 0 },
	data: { label: id, componentType: "variant", description: "" },
});

const edge = (source: string, target: string): Edge => ({ id: `${source}->${target}`, source, target });

const checks = (nodes: Node<ComponentNodeData>[], edges: Edge[] = []) => auditTokenMap(nodes, edges).map((finding) => finding.check);

describe("auditTokenMap", () => {
	it("reports nothing for a healthy token", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		expect(checks([literal, consumer("variant")], [edge("color.brand", "variant")])).toEqual([]);
	});

	it("flags an invalid literal value", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "not-a-color", tokenFormat: "hex" });
		expect(checks([literal])).toContain("invalid-value");
	});

	it("flags an alias with no parent", () => {
		const alias = token("color.alias", { tokenKind: "alias", tokenAlias: "color.brand" });
		expect(checks([alias])).toContain("unresolved-alias");
	});

	it("treats a detached alias as unresolved", () => {
		const alias = token("color.alias", { tokenKind: "alias", tokenAlias: "color.brand", parentId: null });
		expect(checks([alias])).toContain("unresolved-alias");
	});

	it("resolves an alias through its parent edge", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		const alias = token("color.alias", { tokenKind: "alias", tokenAlias: "color.brand" });
		expect(checks([literal, alias], [edge("color.brand", "color.alias")])).not.toContain("unresolved-alias");
	});

	it("resolves an alias through an explicit parentId", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		const alias = token("color.alias", { tokenKind: "alias", tokenAlias: "color.brand", parentId: "color.brand" });
		expect(checks([literal, alias])).not.toContain("unresolved-alias");
	});

	it("flags an alias that points at another alias", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		const first = token("color.a", { tokenKind: "alias", tokenAlias: "color.brand" });
		const second = token("color.b", { tokenKind: "alias", tokenAlias: "color.a" });
		const findings = auditTokenMap([literal, first, second], [edge("color.brand", "color.a"), edge("color.a", "color.b")]);
		const chained = findings.find((finding) => finding.check === "alias-chain");
		expect(chained?.nodeIds).toContain("color.b");
	});

	it("flags a token nothing depends on", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		expect(checks([literal])).toContain("unused-token");
	});

	it("counts a parentId reference as usage", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6", tokenFormat: "hex" });
		const alias = token("color.alias", { tokenKind: "alias", tokenAlias: "color.brand", parentId: "color.brand" });
		const findings = auditTokenMap([literal, alias]);
		expect(findings.some((finding) => finding.check === "unused-token" && finding.nodeIds.includes("color.brand"))).toBe(false);
	});

	it("flags duplicate literal values", () => {
		const first = token("spacing.a", { tokenKind: "literal", tokenType: "spacing", tokenValue: "16", tokenFormat: "px" });
		const second = token("spacing.b", { tokenKind: "literal", tokenType: "spacing", tokenValue: "16", tokenFormat: "px" });
		const duplicate = auditTokenMap([first, second]).find((finding) => finding.check === "duplicate-value");
		expect(duplicate?.nodeIds).toEqual(["spacing.a", "spacing.b"]);
	});

	it("flags mixed formats within a token type", () => {
		const first = token("spacing.a", { tokenKind: "literal", tokenType: "spacing", tokenValue: "16", tokenFormat: "px" });
		const second = token("spacing.b", { tokenKind: "literal", tokenType: "spacing", tokenValue: "1", tokenFormat: "rem" });
		expect(checks([first, second])).toContain("mixed-formats");
	});

	it("orders findings by severity", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "not-a-color", tokenFormat: "hex" });
		const findings = auditTokenMap([literal]);
		expect(findings[0].severity).toBe("error");
	});
});

describe("auditTokenMap fixes", () => {
	const findingFor = (nodes: Node<ComponentNodeData>[], edges: Edge[], check: string) => auditTokenMap(nodes, edges).find((finding) => finding.check === check);

	it("offers a delete fix for an unused token", () => {
		const unused = token("color.unused", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6" });
		const finding = findingFor([unused], [], "unused-token");

		expect(finding?.fix?.operations).toEqual([{ op: "deleteNode", nodeId: "color.unused" }]);
	});

	it("offers a repoint fix for an alias chain, aimed at the literal ancestor", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6" });
		const first = token("color.a", { tokenKind: "alias" });
		const second = token("color.b", { tokenKind: "alias" });
		const edges = [edge("color.brand", "color.a"), edge("color.a", "color.b")];

		const finding = findingFor([literal, first, second], edges, "alias-chain");

		expect(finding?.fix?.operations).toEqual([{ op: "setParents", nodeId: "color.b", parentIds: ["color.brand"] }]);
	});

	it("offers no fix when the alias chain has no literal to point at", () => {
		const first = token("color.a", { tokenKind: "alias" });
		const second = token("color.b", { tokenKind: "alias" });
		const finding = findingFor([first, second], [edge("color.a", "color.b")], "alias-chain");

		expect(finding).toBeDefined();
		expect(finding?.fix).toBeUndefined();
	});

	it("offers no fix for a finding that needs a judgement call", () => {
		const invalid = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "not-a-color" });
		const finding = findingFor([invalid], [], "invalid-value");

		expect(finding).toBeDefined();
		expect(finding?.fix).toBeUndefined();
	});
});

describe("finding token names", () => {
	const tokenNamesOf = (nodes: Node<ComponentNodeData>[], edges: Edge[], check: string) => auditTokenMap(nodes, edges).find((finding) => finding.check === check)?.tokenNames;

	it("names the token its message mentions", () => {
		const unused = token("color.unused", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6" });

		expect(tokenNamesOf([unused], [], "unused-token")).toEqual(["color.unused"]);
	});

	it("names both tokens in an alias chain", () => {
		const literal = token("color.brand", { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6" });
		const first = token("color.a", { tokenKind: "alias", tokenAlias: "color.brand" });
		const second = token("color.b", { tokenKind: "alias", tokenAlias: "color.a" });

		expect(tokenNamesOf([literal, first, second], [edge("color.brand", "color.a"), edge("color.a", "color.b")], "alias-chain")).toEqual(["color.b", "color.a"]);
	});

	it("names no token when the message only reports a value or a type", () => {
		const first = token("spacing.a", { tokenKind: "literal", tokenType: "spacing", tokenValue: "16", tokenFormat: "px" });
		const second = token("spacing.b", { tokenKind: "literal", tokenType: "spacing", tokenValue: "16", tokenFormat: "px" });

		expect(tokenNamesOf([first, second], [], "duplicate-value")).toEqual([]);
	});
});
