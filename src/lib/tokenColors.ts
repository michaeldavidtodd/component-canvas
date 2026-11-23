import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { getDefaultTokenFormat, isAliasToken, isColorToken, toCssColor } from "@/lib/tokenValues";

/**
 * Resolve a swatch color for every token node.
 *
 * Literal color tokens use their own value. Alias tokens only store a name, so
 * they follow their incoming edge to the token they reference, which lets the
 * map show the color an alias resolves to.
 */
export const buildTokenSwatchMap = (nodes: Node<ComponentNodeData>[], edges: Edge[]): Map<string, string> => {
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const parentIdByNodeId = new Map<string, string>();
	for (const edge of edges) {
		if (!parentIdByNodeId.has(edge.target)) parentIdByNodeId.set(edge.target, edge.source);
	}

	const swatches = new Map<string, string>();

	const resolve = (nodeId: string, seen: Set<string>): string | null => {
		if (seen.has(nodeId)) return null;
		seen.add(nodeId);

		const node = nodeById.get(nodeId);
		if (!node || node.data.componentType !== "token") return null;

		const data = node.data;
		if (isAliasToken(data.tokenKind)) {
			const parentId = parentIdByNodeId.get(nodeId);
			return parentId ? resolve(parentId, seen) : null;
		}

		if (!isColorToken(data.tokenType)) return null;
		const format = data.tokenFormat ?? getDefaultTokenFormat(data.tokenType);
		return toCssColor(data.tokenValue, format);
	};

	for (const node of nodes) {
		if (node.data.componentType !== "token") continue;
		const color = resolve(node.id, new Set());
		if (color) swatches.set(node.id, color);
	}

	return swatches;
};
