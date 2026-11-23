import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { getNodeValidationIssues } from "@/lib/nodeValidation";

const tokenNode = (data: Partial<ComponentNodeData>): Node<ComponentNodeData> => ({
	id: "t",
	type: "component",
	position: { x: 0, y: 0 },
	data: { label: "Token", componentType: "token", description: "", ...data },
});

describe("getNodeValidationIssues", () => {
	it("ignores non-token nodes", () => {
		expect(getNodeValidationIssues(tokenNode({ componentType: "main-component" }))).toEqual([]);
	});

	it("ignores alias tokens", () => {
		expect(getNodeValidationIssues(tokenNode({ tokenKind: "alias", tokenAlias: "color.primary" }))).toEqual([]);
	});

	it("ignores literal tokens with no value", () => {
		expect(getNodeValidationIssues(tokenNode({ tokenKind: "literal" }))).toEqual([]);
	});

	it("accepts a valid hex color", () => {
		expect(getNodeValidationIssues(tokenNode({ tokenKind: "literal", tokenType: "color", tokenFormat: "hex", tokenValue: "#3B82F6" }))).toEqual([]);
	});

	it("flags an invalid hex color", () => {
		const issues = getNodeValidationIssues(tokenNode({ tokenKind: "literal", tokenType: "color", tokenFormat: "hex", tokenValue: "not-a-color" }));
		expect(issues).toHaveLength(1);
		expect(issues[0].field).toBe("Value");
		expect(issues[0].message).toContain("HEX");
	});

	it("falls back to the default format when none is set", () => {
		const issues = getNodeValidationIssues(tokenNode({ tokenKind: "literal", tokenType: "spacing", tokenValue: "wide" }));
		expect(issues).toHaveLength(1);
		expect(issues[0].message).toContain("px");
	});

	it("accepts a valid dimension value", () => {
		expect(getNodeValidationIssues(tokenNode({ tokenKind: "literal", tokenType: "spacing", tokenValue: "16" }))).toEqual([]);
	});
});
