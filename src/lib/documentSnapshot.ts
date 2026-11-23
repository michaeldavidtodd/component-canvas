import type { Edge, Node } from "@xyflow/react";

/**
 * React Flow fields that change as the user interacts with the canvas but do
 * not represent document content: selection, drag state, measured DOM size,
 * and internal handle geometry. Ignoring them keeps auto-save from creating a
 * new version when nothing meaningful changed.
 *
 * Node `position` and `data` are deliberately kept: moving a node on the canvas
 * and re-ordering rows in the grid view (stored as `data.order`) are real
 * document changes and must still create a version.
 */
const VOLATILE_NODE_KEYS = new Set(["selected", "dragging", "resizing", "measured", "internals", "positionAbsolute", "handleBounds"]);

const VOLATILE_EDGE_KEYS = new Set(["selected", "interactionWidth"]);

const stripVolatile = (value: Record<string, unknown>, ignored: ReadonlySet<string>): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (ignored.has(key)) continue;
		result[key] = entry;
	}
	return result;
};

/** JSON with object keys sorted, so key order can't produce a false difference. */
const stableStringify = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, entry]) => entry !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
};

const byId = (a: Record<string, unknown>, b: Record<string, unknown>): number => {
	const left = String(a.id);
	const right = String(b.id);
	return left < right ? -1 : left > right ? 1 : 0;
};

/**
 * A stable, content-only fingerprint of a canvas document. Volatile React Flow
 * state and array order are ignored, so two snapshots are equal exactly when
 * the saved document would be the same.
 */
export const serializeDocument = (nodes: Node[], edges: Edge[]): string => {
	const nodeSnapshots = nodes.map((node) => stripVolatile(node as unknown as Record<string, unknown>, VOLATILE_NODE_KEYS)).sort(byId);
	const edgeSnapshots = edges.map((edge) => stripVolatile(edge as unknown as Record<string, unknown>, VOLATILE_EDGE_KEYS)).sort(byId);

	return stableStringify({ nodes: nodeSnapshots, edges: edgeSnapshots });
};
