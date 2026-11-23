import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { PROJECTED_NODE_FIELDS, projectDocument, summarizeProjection } from "@/lib/documentProjection";

const node = (id: string, data: Partial<ComponentNodeData> = {}, extra: Partial<Node<ComponentNodeData>> = {}): Node<ComponentNodeData> => ({
	id,
	type: "component",
	position: { x: 0, y: 0 },
	data: { label: id, componentType: "token", description: "", ...data },
	...extra,
});

const edge = (id: string, source: string, target: string): Edge => ({ id, source, target });

describe("projectDocument", () => {
	it("keeps the document fields the agent needs", () => {
		const [projected] = projectDocument([node("token-1", { label: "Brand", componentType: "token", tokenType: "color", tokenKind: "literal", tokenValue: "#3B82F6", tokenFormat: "hex" })], []).nodes;

		expect(projected).toMatchObject({
			id: "token-1",
			label: "Brand",
			componentType: "token",
			tokenType: "color",
			tokenKind: "literal",
			tokenValue: "#3B82F6",
			tokenFormat: "hex",
		});
	});

	it("drops presentation and React Flow state", () => {
		const [projected] = projectDocument(
			[
				node("token-1", { label: "Brand" }, { position: { x: 120, y: 40 }, selected: true, style: { stroke: "#000" }, measured: { width: 180, height: 60 }, dragging: true }),
			],
			[],
		).nodes;

		expect(projected).not.toHaveProperty("position");
		expect(projected).not.toHaveProperty("selected");
		expect(projected).not.toHaveProperty("style");
		expect(projected).not.toHaveProperty("measured");
		expect(projected).not.toHaveProperty("dragging");
	});

	it("drops the Figma URL, which reveals workspace paths", () => {
		const [projected] = projectDocument([node("comp-1", { label: "Button", componentType: "main-component", url: "https://figma.com/file/secret" })], []).nodes;

		expect(projected).not.toHaveProperty("url");
	});

	it("omits absent optional fields instead of sending nulls", () => {
		const [projected] = projectDocument([node("token-1", { label: "Brand" })], []).nodes;

		expect(projected).not.toHaveProperty("tokenValue");
		expect(projected).not.toHaveProperty("parentId");
		expect(Object.keys(projected).sort()).toEqual(["componentType", "description", "id", "label"]);
	});

	it("keeps an explicit detached parentId", () => {
		const [projected] = projectDocument([node("token-1", { label: "Brand", parentId: null })], []).nodes;

		expect(projected.parentId).toBeNull();
	});

	it("reduces edges to their relationship", () => {
		const [projected] = projectDocument([], [{ ...edge("e1", "a", "b"), style: { stroke: "#000" }, animated: true, selected: true }]).edges;

		expect(projected).toEqual({ id: "e1", source: "a", target: "b" });
	});

	it("includes hidden nodes, which are still part of the document", () => {
		const projection = projectDocument([node("token-1", { label: "Brand" }, { hidden: true })], []);

		expect(projection.nodes).toHaveLength(1);
	});

	it("lists every optional field it forwards", () => {
		expect(PROJECTED_NODE_FIELDS).toContain("tokenValue");
		expect(PROJECTED_NODE_FIELDS).not.toContain("url");
	});

	it("forwards exactly the whitelisted fields when every one is set", () => {
		// Guards against the whitelist list drifting from the projection: a field set
		// on the node must either appear in the list or be dropped.
		const [projected] = projectDocument(
			[
				node("token-1", {
					label: "Brand",
					componentType: "token",
					description: "Primary brand color",
					parentId: "parent-1",
					order: 2,
					tokenType: "color",
					tokenSubType: "background",
					tokenKind: "literal",
					tokenValue: "#3B82F6",
					tokenFormat: "hex",
					tokenAlias: "brand",
					tokenName: "--color-brand",
					tokenScope: ":root",
					tokenTheme: "light",
					tokenSource: "tokens.css",
					url: "https://figma.com/file/secret",
				}),
			],
			[],
		).nodes;

		expect(Object.keys(projected).sort()).toEqual(["componentType", "description", "id", "label", ...PROJECTED_NODE_FIELDS].sort());
	});
});

describe("summarizeProjection", () => {
	it("counts nodes and edges and reports the serialized size", () => {
		const projection = projectDocument([node("a", { label: "A" }), node("b", { label: "B" })], [edge("e1", "a", "b")]);
		const summary = summarizeProjection(projection);

		expect(summary.nodeCount).toBe(2);
		expect(summary.edgeCount).toBe(1);
		expect(summary.bytes).toBe(JSON.stringify(projection).length);
	});
});
