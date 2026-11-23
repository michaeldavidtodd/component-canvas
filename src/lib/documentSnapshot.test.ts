import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";

import { serializeDocument } from "@/lib/documentSnapshot";

const node = (id: string, overrides: Record<string, unknown> = {}): Node =>
	({
		id,
		type: "component",
		position: { x: 0, y: 0 },
		data: { label: id, componentType: "main-component", description: "" },
		...overrides,
	}) as Node;

const edge = (id: string, source: string, target: string, overrides: Record<string, unknown> = {}): Edge =>
	({ id, source, target, ...overrides }) as Edge;

describe("serializeDocument", () => {
	it("matches for identical documents", () => {
		expect(serializeDocument([node("a")], [edge("e", "a", "b")])).toBe(serializeDocument([node("a")], [edge("e", "a", "b")]));
	});

	it("ignores volatile React Flow node state", () => {
		const base = serializeDocument([node("a")], []);
		const volatile = serializeDocument([node("a", { selected: true, dragging: true, measured: { width: 10, height: 10 } })], []);
		expect(volatile).toBe(base);
	});

	it("ignores volatile edge state", () => {
		const base = serializeDocument([], [edge("e", "a", "b")]);
		const volatile = serializeDocument([], [edge("e", "a", "b", { selected: true, interactionWidth: 20 })]);
		expect(volatile).toBe(base);
	});

	it("keeps position changes", () => {
		const base = serializeDocument([node("a")], []);
		const moved = serializeDocument([node("a", { position: { x: 40, y: 0 } })], []);
		expect(moved).not.toBe(base);
	});

	it("keeps data changes", () => {
		const base = serializeDocument([node("a")], []);
		const renamed = serializeDocument([node("a", { data: { label: "Renamed", componentType: "main-component", description: "" } })], []);
		expect(renamed).not.toBe(base);
	});

	it("ignores node and edge array order", () => {
		const first = serializeDocument([node("a"), node("b")], [edge("e1", "a", "b"), edge("e2", "b", "c")]);
		const second = serializeDocument([node("b"), node("a")], [edge("e2", "b", "c"), edge("e1", "a", "b")]);
		expect(second).toBe(first);
	});

	it("ignores object key order", () => {
		const first = serializeDocument([node("a", { data: { label: "A", componentType: "main-component", description: "" } })], []);
		const second = serializeDocument([node("a", { data: { description: "", componentType: "main-component", label: "A" } })], []);
		expect(second).toBe(first);
	});

	it("keeps edge endpoint changes", () => {
		const base = serializeDocument([], [edge("e", "a", "b")]);
		const rewired = serializeDocument([], [edge("e", "a", "c")]);
		expect(rewired).not.toBe(base);
	});
});
