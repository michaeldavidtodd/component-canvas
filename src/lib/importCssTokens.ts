import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import type { NormalizedCssToken } from "@/lib/cssTokenNormalize";
import { getEdgeColor } from "@/lib/connectionTypes";
import { getScopePrefix, getTokenIdentityKey } from "@/lib/tokenScope";

const TOKEN_NODE_WIDTH = 200;
const TOKEN_NODE_HEIGHT = 60;
const GROUP_NODE_WIDTH = 220;
const GROUP_NODE_HEIGHT = 64;
/** Horizontal gap between the existing graph and a new import group. */
const IMPORT_GAP = 120;

export interface CssImportOptions {
	/** File name or `pasted` for the source stylesheet. */
	source: string;
	tokens: NormalizedCssToken[];
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
}

export interface CssImportResult {
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	groupId: string;
	/** Tokens created by this import. */
	imported: number;
	/** Existing tokens whose values were updated. */
	updated: number;
	/** Existing tokens in the group that are no longer present in the CSS. */
	removed: number;
	warnings: string[];
}

/** Build a readable description that keeps the original CSS value and scope. */
const buildDescription = (token: NormalizedCssToken): string => {
	const lines = [`CSS value: ${token.raw}`, `Scope: ${token.scope}`];
	if (token.theme) lines.push(`Theme: ${token.theme}`);
	if (token.status !== "ready") {
		const reason = token.reasons.length > 0 ? ` (${token.reasons.join("; ")})` : "";
		lines.push(`Status: ${token.status}${reason}`);
	}
	if (token.aliasFallback) lines.push(`Fallback: ${token.aliasFallback}`);
	return lines.join("\n");
};

/** Convert a normalized CSS variable into the app's token node data. */
const buildTokenData = (token: NormalizedCssToken, label: string, source: string): ComponentNodeData => ({
	label,
	componentType: "token",
	description: buildDescription(token),
	tokenKind: token.tokenKind,
	tokenType: token.tokenType,
	tokenSubType: token.tokenSubType,
	tokenValue: token.tokenKind === "literal" ? token.tokenValue : undefined,
	tokenFormat: token.tokenKind === "literal" ? token.tokenFormat : undefined,
	tokenAlias: token.tokenKind === "alias" ? token.aliasOf : undefined,
	tokenScope: token.scope,
	tokenTheme: token.theme,
	tokenSource: source,
	tokenName: token.name,
});

/** Place a new import group to the right of everything already on the canvas. */
const findGroupPosition = (nodes: Node<ComponentNodeData>[]): { x: number; y: number } => {
	if (nodes.length === 0) return { x: 0, y: 0 };
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	for (const node of nodes) {
		const width = node.measured?.width ?? (typeof node.style?.width === "number" ? node.style.width : TOKEN_NODE_WIDTH);
		maxX = Math.max(maxX, node.position.x + width);
		minY = Math.min(minY, node.position.y);
	}
	return { x: maxX + IMPORT_GAP, y: minY };
};

/** Lay out the group subtree with Dagre and return top-left positions. */
const layoutGroup = (group: Node<ComponentNodeData>, members: Node<ComponentNodeData>[], groupEdges: Edge[]): Map<string, { x: number; y: number }> => {
	const graph = new dagre.graphlib.Graph();
	graph.setGraph({ rankdir: "LR", ranksep: 90, nodesep: 40, marginx: 20, marginy: 20 });
	graph.setDefaultEdgeLabel(() => ({}));
	graph.setNode(group.id, { width: GROUP_NODE_WIDTH, height: GROUP_NODE_HEIGHT });
	for (const node of members) graph.setNode(node.id, { width: TOKEN_NODE_WIDTH, height: TOKEN_NODE_HEIGHT });
	for (const edge of groupEdges) {
		if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target);
	}
	dagre.layout(graph);

	const positions = new Map<string, { x: number; y: number }>();
	for (const node of [group, ...members]) {
		const position = graph.node(node.id);
		if (!position) continue;
		const width = node.id === group.id ? GROUP_NODE_WIDTH : TOKEN_NODE_WIDTH;
		const height = node.id === group.id ? GROUP_NODE_HEIGHT : TOKEN_NODE_HEIGHT;
		positions.set(node.id, { x: position.x - width / 2, y: position.y - height / 2 });
	}
	return positions;
};

/** True when adding `from -> to` would close a cycle in the existing edges. */
const createsCycle = (edges: Edge[], from: string, to: string): boolean => {
	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const list = adjacency.get(edge.source) ?? [];
		list.push(edge.target);
		adjacency.set(edge.source, list);
	}
	const stack = [to];
	const seen = new Set<string>();
	while (stack.length > 0) {
		const current = stack.pop() as string;
		if (current === from) return true;
		if (seen.has(current)) continue;
		seen.add(current);
		for (const next of adjacency.get(current) ?? []) stack.push(next);
	}
	return false;
};

/**
 * Merge parsed CSS variables into the canvas graph.
 *
 * Identity is `(source, scope, variable name)`, so re-importing the same file
 * updates tokens in place instead of duplicating them. Literal tokens hang off
 * the import group; alias tokens hang off the token they reference. Alias
 * chains are supported, and missing targets become placeholder literals so the
 * alias always has a parent.
 */
export const buildCssImport = ({ source, tokens, nodes, edges }: CssImportOptions): CssImportResult => {
	const warnings: string[] = [];
	const existingGroup = nodes.find((node) => node.data.componentType === "group" && node.data.tokenSource === source);
	const groupId = existingGroup?.id ?? `css-group-${Date.now()}`;
	const groupPosition = existingGroup?.position ?? findGroupPosition(nodes);

	const existingTokens = nodes.filter((node) => node.data.componentType === "token" && node.data.tokenSource === source);
	const existingByIdentity = new Map<string, Node<ComponentNodeData>>();
	for (const node of existingTokens) {
		const identity = getTokenIdentityKey(source, node.data.tokenScope ?? "", node.data.tokenName ?? node.data.label);
		existingByIdentity.set(identity, node);
	}

	// Count names across the existing group and the new import so duplicate
	// names in different scopes get a readable prefix.
	const nameCounts = new Map<string, number>();
	for (const node of existingTokens) {
		const name = node.data.tokenName ?? node.data.label;
		nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
	}
	for (const token of tokens) nameCounts.set(token.name, (nameCounts.get(token.name) ?? 0) + 1);

	const usedLabels = new Set(existingTokens.map((node) => node.data.label));
	const labelByIdentity = new Map<string, string>();
	const scopeByIdentity = new Map<string, string>();
	const identityByName = new Map<string, string[]>();

	for (const node of existingTokens) {
		const name = node.data.tokenName ?? node.data.label;
		const identity = getTokenIdentityKey(source, node.data.tokenScope ?? "", name);
		scopeByIdentity.set(identity, node.data.tokenScope ?? "");
		const list = identityByName.get(name) ?? [];
		list.push(identity);
		identityByName.set(name, list);
	}

	for (const token of tokens) {
		const identity = getTokenIdentityKey(source, token.scope, token.name);
		scopeByIdentity.set(identity, token.scope);
		const list = identityByName.get(token.name) ?? [];
		list.push(identity);
		identityByName.set(token.name, list);

		const existing = existingByIdentity.get(identity);
		if (existing) {
			labelByIdentity.set(identity, existing.data.label);
			continue;
		}

		const count = nameCounts.get(token.name) ?? 1;
		const prefix = count > 1 ? getScopePrefix(token.scope, token.theme) : "";
		let label = prefix ? `${prefix}/${token.name}` : token.name;
		let suffix = 2;
		while (usedLabels.has(label)) label = `${prefix ? `${prefix}/` : ""}${token.name}-${suffix++}`;
		usedLabels.add(label);
		labelByIdentity.set(identity, label);
	}

	// Build or update the token nodes. Existing nodes keep their id and position.
	const tokenNodes: Node<ComponentNodeData>[] = [];
	const tokenNodeByIdentity = new Map<string, Node<ComponentNodeData>>();
	let updated = 0;
	for (const token of tokens) {
		const identity = getTokenIdentityKey(source, token.scope, token.name);
		const existing = existingByIdentity.get(identity);
		const label = labelByIdentity.get(identity) ?? token.name;
		const data = buildTokenData(token, label, source);
		if (existing) {
			updated += 1;
			const merged: Node<ComponentNodeData> = { ...existing, data: { ...existing.data, ...data } };
			tokenNodes.push(merged);
			tokenNodeByIdentity.set(identity, merged);
		} else {
			const node: Node<ComponentNodeData> = {
				id: `css-token-${Date.now()}-${tokenNodes.length}`,
				type: "component",
				position: { x: 0, y: 0 },
				data,
			};
			tokenNodes.push(node);
			tokenNodeByIdentity.set(identity, node);
		}
	}

	// Resolve alias targets, preferring the same scope.
	const resolveAliasTarget = (token: NormalizedCssToken): string | undefined => {
		if (!token.aliasOf) return undefined;
		const candidates = identityByName.get(token.aliasOf);
		if (!candidates || candidates.length === 0) return undefined;
		const sameScope = candidates.find((identity) => scopeByIdentity.get(identity) === token.scope);
		return sameScope ?? candidates[0];
	};

	const nodeIdByIdentity = new Map<string, string>();
	for (const node of existingTokens) {
		const identity = getTokenIdentityKey(source, node.data.tokenScope ?? "", node.data.tokenName ?? node.data.label);
		nodeIdByIdentity.set(identity, node.id);
	}
	for (const [identity, node] of tokenNodeByIdentity) nodeIdByIdentity.set(identity, node.id);

	const placeholders: Node<ComponentNodeData>[] = [];
	const placeholderByIdentity = new Map<string, Node<ComponentNodeData>>();
	const groupEdges: Edge[] = [];
	const edgeIds = new Set<string>();

	// Existing edges inside the group participate in cycle detection so a new
	// alias edge can't close a loop that already exists.
	const existingGroupNodeIds = new Set<string>([groupId, ...existingTokens.map((node) => node.id)]);
	const cycleEdges: Edge[] = edges.filter((edge) => existingGroupNodeIds.has(edge.source) && existingGroupNodeIds.has(edge.target));

	const addEdge = (edge: Edge) => {
		if (edgeIds.has(edge.id)) return;
		edgeIds.add(edge.id);
		groupEdges.push(edge);
	};

	for (const token of tokens) {
		if (token.tokenKind !== "alias") continue;
		const identity = getTokenIdentityKey(source, token.scope, token.name);
		const aliasNode = tokenNodeByIdentity.get(identity);
		if (!aliasNode) continue;

		const targetIdentity = resolveAliasTarget(token);
		const targetId = targetIdentity ? nodeIdByIdentity.get(targetIdentity) : undefined;

		if (targetId) {
			if (createsCycle([...cycleEdges, ...groupEdges], targetId, aliasNode.id)) {
				warnings.push(`Skipped alias edge for ${token.name} because it would create a cycle.`);
				continue;
			}
			addEdge({
				id: `css-edge-${targetId}-${aliasNode.id}`,
				source: targetId,
				target: aliasNode.id,
				type: "default",
				style: { stroke: getEdgeColor("token", "token") },
			});
			continue;
		}

		// The alias points at a variable that isn't in the import. Create a
		// placeholder literal so the alias still has a parent.
		const placeholderIdentity = getTokenIdentityKey(source, token.scope, token.aliasOf ?? token.name);
		let placeholder = placeholderByIdentity.get(placeholderIdentity);
		if (!placeholder) {
			placeholder = {
				id: `css-placeholder-${Date.now()}-${placeholders.length}`,
				type: "component",
				position: { x: 0, y: 0 },
				data: {
					label: token.aliasOf ?? token.name,
					componentType: "token",
					description: `Referenced by ${token.name} but not defined in the imported CSS.`,
					tokenKind: "literal",
					tokenValue: token.aliasFallback,
					tokenScope: token.scope,
					tokenTheme: token.theme,
					tokenSource: source,
					tokenName: token.aliasOf,
				},
			};
			placeholders.push(placeholder);
			placeholderByIdentity.set(placeholderIdentity, placeholder);
			nodeIdByIdentity.set(placeholderIdentity, placeholder.id);
		}
		addEdge({
			id: `css-edge-${placeholder.id}-${aliasNode.id}`,
			source: placeholder.id,
			target: aliasNode.id,
			type: "default",
			style: { stroke: getEdgeColor("token", "token") },
		});
	}

	// Group membership edges point at literal tokens and placeholders. Alias
	// tokens are reached through the token they reference. Existing group edges
	// are dropped below and rebuilt here, so every literal gets a fresh edge.
	for (const node of tokenNodes) {
		if (node.data.tokenKind === "alias") continue;
		addEdge({
			id: `css-edge-${groupId}-${node.id}`,
			source: groupId,
			target: node.id,
			type: "default",
			style: { stroke: getEdgeColor("group", "token") },
		});
	}
	for (const placeholder of placeholders) {
		addEdge({
			id: `css-edge-${groupId}-${placeholder.id}`,
			source: groupId,
			target: placeholder.id,
			type: "default",
			style: { stroke: getEdgeColor("group", "token") },
		});
	}

	// Aliases caught in a cycle can end up without a parent. Attach those to the
	// group so they stay reachable from the import root.
	const aliasTargets = new Set(groupEdges.filter((edge) => edge.source !== groupId).map((edge) => edge.target));
	for (const node of tokenNodes) {
		if (node.data.tokenKind !== "alias" || aliasTargets.has(node.id)) continue;
		addEdge({
			id: `css-edge-${groupId}-${node.id}`,
			source: groupId,
			target: node.id,
			type: "default",
			style: { stroke: getEdgeColor("group", "token") },
		});
	}

	const groupNode: Node<ComponentNodeData> = existingGroup
		? { ...existingGroup, selected: true, data: { ...existingGroup.data, tokenSource: source } }
		: {
				id: groupId,
				type: "component",
				position: groupPosition,
				selected: true,
				data: {
					label: `CSS Import: ${source}`,
					componentType: "group",
					description: `Imported CSS custom properties from ${source}.`,
					tokenSource: source,
				},
			};

	// Merge the group's nodes by id so updated tokens replace their old copies.
	const groupNodeById = new Map<string, Node<ComponentNodeData>>();
	for (const node of existingTokens) groupNodeById.set(node.id, node);
	for (const node of tokenNodes) groupNodeById.set(node.id, node);
	for (const node of placeholders) groupNodeById.set(node.id, node);
	const allGroupNodes = [...groupNodeById.values()];

	const groupNodeIds = new Set([groupId, ...allGroupNodes.map((node) => node.id)]);
	const groupTokenIds = new Set(allGroupNodes.map((node) => node.id));
	const groupEdgesForLayout = edges.filter((edge) => groupNodeIds.has(edge.source) && groupNodeIds.has(edge.target));
	for (const edge of groupEdges) groupEdgesForLayout.push(edge);

	const positions = layoutGroup(groupNode, allGroupNodes, groupEdgesForLayout);
	const groupLayout = positions.get(groupId);
	const offsetX = groupLayout ? groupPosition.x - groupLayout.x : 0;
	const offsetY = groupLayout ? groupPosition.y - groupLayout.y : 0;

	const positionedGroupNodes = allGroupNodes.map((node) => {
		const position = positions.get(node.id);
		if (!position) return node;
		return { ...node, position: { x: position.x + offsetX, y: position.y + offsetY } };
	});
	const positionedGroup: Node<ComponentNodeData> = { ...groupNode, position: groupPosition };

	// Replace the group and its tokens, keep everything else untouched.
	const untouched = nodes.filter((node) => !groupNodeIds.has(node.id));
	const finalNodes = [...untouched, positionedGroup, ...positionedGroupNodes];

	// Drop stale group and token-to-alias edges, then add the new ones. Edges
	// from variants or other nodes to an alias are preserved. Group edges to
	// tokens that are no longer in the file are kept so they stay reachable.
	const importedAliasIds = new Set(tokenNodes.filter((node) => node.data.tokenKind === "alias").map((node) => node.id));
	const importedTokenIds = new Set([...tokenNodes.map((node) => node.id), ...placeholders.map((node) => node.id)]);
	const keptEdges = edges.filter((edge) => {
		if (edge.source === groupId && importedTokenIds.has(edge.target)) return false;
		if (groupTokenIds.has(edge.source) && importedAliasIds.has(edge.target)) return false;
		return true;
	});
	const finalEdges = [...keptEdges, ...groupEdges];

	const importedIdentities = new Set(tokens.map((token) => getTokenIdentityKey(source, token.scope, token.name)));
	const removed = existingTokens.filter((node) => !importedIdentities.has(getTokenIdentityKey(source, node.data.tokenScope ?? "", node.data.tokenName ?? node.data.label))).length;

	return {
		nodes: finalNodes,
		edges: finalEdges,
		groupId,
		imported: tokenNodes.length - updated,
		updated,
		removed,
		warnings,
	};
};
