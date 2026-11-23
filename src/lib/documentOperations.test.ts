import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { applyOperations } from "@/lib/documentOperations";

const node = (id: string, data: Partial<ComponentNodeData> = {}): Node<ComponentNodeData> => ({
	id,
	type: "component",
	position: { x: 0, y: 0 },
	data: { label: id, componentType: "token", description: "", ...data },
});

const edge = (source: string, target: string): Edge => ({ id: `${source}->${target}`, source, target });

const literal = (id: string) => node(id, { tokenKind: "literal", tokenType: "color", tokenValue: "#3B82F6" });
const alias = (id: string, parentId?: string) => node(id, { tokenKind: "alias", ...(parentId ? { parentId } : {}) });

describe("applyOperations", () => {
	describe("deleteNode", () => {
		it("removes the node and every edge touching it", () => {
			const result = applyOperations([node("a"), node("b"), node("c")], [edge("a", "b"), edge("b", "c")], [{ op: "deleteNode", nodeId: "b" }]);

			expect(result.errors).toEqual([]);
			expect(result.nodes.map((candidate) => candidate.id)).toEqual(["a", "c"]);
			expect(result.edges).toEqual([]);
		});

		it("detaches nodes whose parentId pointed at the deleted node", () => {
			const result = applyOperations([node("parent"), node("child", { parentId: "parent" })], [], [{ op: "deleteNode", nodeId: "parent" }]);

			expect(result.errors).toEqual([]);
			expect(result.nodes.find((candidate) => candidate.id === "child")?.data.parentId).toBeNull();
		});

		it("leaves the document untouched when the node doesn't exist", () => {
			const nodes = [node("a")];
			const edges = [edge("a", "b")];
			const result = applyOperations(nodes, edges, [{ op: "deleteNode", nodeId: "missing" }]);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].reason).toContain("missing");
			expect(result.nodes).toBe(nodes);
			expect(result.edges).toBe(edges);
		});
	});

	describe("updateNode", () => {
		it("merges the patch into the node's data", () => {
			const result = applyOperations([node("a", { label: "Old" })], [], [{ op: "updateNode", nodeId: "a", data: { label: "New" } }]);

			expect(result.errors).toEqual([]);
			expect(result.nodes[0].data.label).toBe("New");
		});
	});

	describe("setParents", () => {
		it("replaces incoming edges and records the primary parent", () => {
			const result = applyOperations([literal("literal"), alias("alias"), literal("stale")], [edge("stale", "alias")], [
				{ op: "setParents", nodeId: "alias", parentIds: ["literal"] },
			]);

			expect(result.errors).toEqual([]);
			expect(result.edges).toHaveLength(1);
			expect(result.edges[0]).toMatchObject({ source: "literal", target: "alias" });
			expect(result.nodes.find((candidate) => candidate.id === "alias")?.data.parentId).toBe("literal");
		});

		it("detaches a node when the parent list is empty", () => {
			const result = applyOperations([alias("alias", "literal"), literal("literal")], [edge("literal", "alias")], [
				{ op: "setParents", nodeId: "alias", parentIds: [] },
			]);

			expect(result.errors).toEqual([]);
			expect(result.edges).toEqual([]);
			expect(result.nodes.find((candidate) => candidate.id === "alias")?.data.parentId).toBeNull();
		});

		it("rejects a parent the rules don't allow", () => {
			const nodes = [node("main", { componentType: "main-component" }), node("other", { componentType: "main-component" }), node("variant", { componentType: "variant", parentId: "main" })];
			const edges = [edge("main", "variant")];
			const result = applyOperations(nodes, edges, [{ op: "setParents", nodeId: "variant", parentIds: ["main", "other"] }]);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].reason).toContain("one main component");
			expect(result.nodes).toBe(nodes);
		});

		it("rejects a node as its own parent", () => {
			const result = applyOperations([literal("a")], [], [{ op: "setParents", nodeId: "a", parentIds: ["a"] }]);

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].reason).toContain("own parent");
		});
	});

	it("is atomic: a later failure leaves the document untouched", () => {
		const nodes = [node("a"), node("b")];
		const edges = [edge("a", "b")];
		const result = applyOperations(nodes, edges, [
			{ op: "deleteNode", nodeId: "a" },
			{ op: "updateNode", nodeId: "missing", data: { label: "x" } },
		]);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].index).toBe(1);
		expect(result.nodes).toBe(nodes);
		expect(result.edges).toBe(edges);
	});

	it("returns the document unchanged for an empty operation list", () => {
		const nodes = [node("a")];
		const result = applyOperations(nodes, [], []);

		expect(result.errors).toEqual([]);
		expect(result.nodes).toBe(nodes);
	});
});
