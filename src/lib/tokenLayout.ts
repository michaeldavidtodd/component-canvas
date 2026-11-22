import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData, ComponentType } from "@/types/component";
import { getEdgeColor } from "@/lib/componentTypes";
import { getAncestorChain, type TitleLayer } from "@/lib/nodeHierarchy";
import { isAliasToken } from "@/lib/tokenValues";

/**
 * Geometry for the structured map. The layout module owns these values so the
 * computed positions and the rendered grid can't drift apart.
 */
export const TOKEN_ROW_HEIGHT = 48;
export const TOKEN_COLUMN_WIDTH = 240;
export const TOKEN_NODE_WIDTH = 200;
export const TOKEN_NODE_HEIGHT = 36;
export const TOKEN_HEADER_HEIGHT = 44;

interface TreeNode {
	/** Unique per occurrence, so a node can appear under multiple parents. */
	id: string;
	node: Node<ComponentNodeData>;
	depth: number;
	children: TreeNode[];
}

export interface TokenLayoutItem {
	/** Unique per occurrence, so a node can appear under multiple parents. */
	id: string;
	node: Node<ComponentNodeData>;
	depth: number;
	/** First row covered by this occurrence's subtree. */
	rowStart: number;
	/** Last row covered by this occurrence's subtree. */
	rowEnd: number;
	x: number;
	y: number;
	/** Structural ancestors shown as a breadcrumb, matching the canvas node. */
	ancestors: TitleLayer[];
	/** Parent node id; `null` for a root block. */
	parentId: string | null;
	/** Parent occurrence id; `null` for a root block. */
	parentItemId: string | null;
	/** Sibling node ids used for row re-ordering. */
	siblingIds: string[];
}

export interface TokenLayoutLink {
	/** Edge id, used to delete or re-map the connection. */
	edgeId: string;
	/** Occurrence ids, used as the React key so duplicate nodes stay distinct. */
	sourceItemId: string;
	targetItemId: string;
	/** Node ids, used for hover/selection highlighting. */
	sourceId: string;
	targetId: string;
	/** Endpoint coordinates, used to place the reconnect handles. */
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	path: string;
	color: string;
}

export interface TokenLayoutColumn {
	depth: number;
	label: string;
	count: number;
}

export interface TokenLayoutBlock {
	startRow: number;
	endRow: number;
}

export interface TokenLayout {
	items: TokenLayoutItem[];
	links: TokenLayoutLink[];
	columns: TokenLayoutColumn[];
	blocks: TokenLayoutBlock[];
	rowCount: number;
	columnCount: number;
	totalWidth: number;
	gridHeight: number;
}

const COLUMN_LABELS: Record<ComponentType, string> = {
	"main-component": "Main Components",
	variant: "Variants",
	"sub-component": "Sub Components",
	token: "Tokens",
	instance: "Instances",
};

/** Column heading derived from the node types that actually occupy it. */
const getColumnLabel = (nodes: Node<ComponentNodeData>[]): string => {
	if (nodes.length === 0) return "";

	const types = new Set(nodes.map((node) => node.data.componentType));
	if (types.size > 1) return "Mixed";

	const type = [...types][0];
	if (type === "token") {
		const kinds = new Set(nodes.map((node) => (isAliasToken(node.data.tokenKind) ? "alias" : "literal")));
		if (kinds.size === 1) return kinds.has("alias") ? "Aliases" : "Literals";
		return "Tokens";
	}

	return COLUMN_LABELS[type] ?? "Nodes";
};

/** Preserve the canvas arrangement so the table order matches what the user built. */
const compareNodePositions = (a: Node<ComponentNodeData>, b: Node<ComponentNodeData>): number => {
	const ay = a.position?.y ?? 0;
	const by = b.position?.y ?? 0;
	if (ay !== by) return ay - by;

	const ax = a.position?.x ?? 0;
	const bx = b.position?.x ?? 0;
	if (ax !== bx) return ax - bx;

	return a.data.label.localeCompare(b.data.label);
};

/**
 * Manual row order wins over canvas position. Nodes without an explicit order
 * sort after the ordered ones, so newly added siblings land at the end.
 */
const compareNodeOrder = (a: Node<ComponentNodeData>, b: Node<ComponentNodeData>): number => {
	const aOrder = a.data.order;
	const bOrder = b.data.order;

	if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
	if (aOrder !== undefined && bOrder === undefined) return -1;
	if (aOrder === undefined && bOrder !== undefined) return 1;

	return compareNodePositions(a, b);
};

const compareTreeNodes = (a: TreeNode, b: TreeNode): number => compareNodeOrder(a.node, b.node);

/**
 * Root ordering when the user hasn't explicitly re-ordered blocks. Parents sort
 * above their children so a main component claims its variants and a token
 * claims its usages before those nodes can start their own block.
 */
const TYPE_RANK: Record<ComponentType, number> = {
	"main-component": 0,
	token: 1,
	variant: 2,
	"sub-component": 3,
	instance: 4,
};

const compareRoots = (a: Node<ComponentNodeData>, b: Node<ComponentNodeData>): number => {
	if (a.data.order !== undefined || b.data.order !== undefined) return compareNodeOrder(a, b);

	const rankDiff = (TYPE_RANK[a.data.componentType] ?? 99) - (TYPE_RANK[b.data.componentType] ?? 99);
	if (rankDiff !== 0) return rankDiff;

	// Keep literals above aliases when both are token roots.
	if (a.data.componentType === "token" && b.data.componentType === "token") {
		const aAlias = isAliasToken(a.data.tokenKind) ? 1 : 0;
		const bAlias = isAliasToken(b.data.tokenKind) ? 1 : 0;
		if (aAlias !== bAlias) return aAlias - bAlias;
	}

	return compareNodePositions(a, b);
};

/**
 * Orthogonal connector with rounded corners: out of the parent, down a shared
 * vertical bus, then into the child. Siblings share the bus x, which gives the
 * map its table-like feel.
 */
const orthogonalPath = (startX: number, startY: number, endX: number, endY: number, radius = 8): string => {
	const midX = startX + (endX - startX) / 2;
	const dy = endY - startY;

	if (Math.abs(dy) < 0.5) return `M ${startX} ${startY} H ${endX}`;

	const direction = dy > 0 ? 1 : -1;
	const r = Math.min(radius, Math.abs(dy) / 2, Math.abs(midX - startX), Math.abs(endX - midX));

	return [
		`M ${startX} ${startY}`,
		`H ${midX - r}`,
		`Q ${midX} ${startY} ${midX} ${startY + direction * r}`,
		`V ${endY - direction * r}`,
		`Q ${midX} ${endY} ${midX + r} ${endY}`,
		`H ${endX}`,
	].join(" ");
};

/**
 * Build the structured map.
 *
 * Each visible root starts a block. The block's rows are its leaves, so a
 * main component → five variants chain occupies two columns and five rows, and
 * a literal → alias → five variants chain occupies three columns and five rows.
 * Internal nodes are vertically centred over their descendants. A second root
 * starts on the next free row, exactly like a table.
 *
 * Visibility is inherited: a node is shown only when its type is enabled and it
 * is reachable from an enabled root. Hiding a parent therefore hides its
 * children, while a child with another visible parent still appears there.
 *
 * A node may appear under every visible parent. Each occurrence gets its own
 * id, so the same variant can be connected to both a token and a main component.
 */
export const buildTokenLayout = (nodes: Node<ComponentNodeData>[], edges: Edge[], visibleTypes: ReadonlySet<ComponentType>): TokenLayout => {
	const allNodes = nodes.filter((node) => !node.hidden);
	const allEdges = edges.filter((edge) => !edge.hidden);

	const allNodeById = new Map(allNodes.map((node) => [node.id, node]));
	const typeVisible = (node: Node<ComponentNodeData>) => visibleTypes.has(node.data.componentType);

	const childrenOf = new Map<string, string[]>();
	const incomingEdge = new Set<string>();

	for (const edge of allEdges) {
		if (!allNodeById.has(edge.source) || !allNodeById.has(edge.target)) continue;

		if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
		childrenOf.get(edge.source)!.push(edge.target);
		incomingEdge.add(edge.target);
	}

	// Roots are enabled nodes with no incoming edge. Type rank keeps main
	// components above variants and tokens above their usages.
	const roots = allNodes.filter((node) => typeVisible(node) && !incomingEdge.has(node.id)).sort(compareRoots);

	// Visibility flows down from the roots. A node whose parent is hidden is not
	// reachable, so it disappears with that parent. A node with another visible
	// parent remains reachable through that parent.
	const visibleNodeIds = new Set<string>();
	const queue = [...roots];

	while (queue.length > 0) {
		const node = queue.pop()!;
		if (visibleNodeIds.has(node.id)) continue;
		visibleNodeIds.add(node.id);

		for (const childId of childrenOf.get(node.id) ?? []) {
			const child = allNodeById.get(childId);
			if (child && typeVisible(child)) queue.push(child);
		}
	}

	const visibleNodes = allNodes.filter((node) => visibleNodeIds.has(node.id));
	const visibleNodeById = new Map(visibleNodes.map((node) => [node.id, node]));
	const visibleEdges = allEdges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));

	const visibleChildrenOf = new Map<string, string[]>();
	for (const edge of visibleEdges) {
		if (!visibleChildrenOf.has(edge.source)) visibleChildrenOf.set(edge.source, []);
		visibleChildrenOf.get(edge.source)!.push(edge.target);
	}

	const nodeByOccurrenceId = new Map<string, Node<ComponentNodeData>>();
	const depthById = new Map<string, number>();
	const parentById = new Map<string, string | null>();
	const parentItemById = new Map<string, string | null>();
	const siblingsById = new Map<string, string[]>();
	const parentChildPairs: { edgeId: string; sourceItemId: string; targetItemId: string; sourceId: string; targetId: string }[] = [];
	const forest: TreeNode[] = [];

	// The tree collapses duplicate edges between the same pair, so keep the first
	// edge id for each relationship to drive delete/reconnect actions.
	const edgeIdByPair = new Map<string, string>();
	for (const edge of visibleEdges) {
		const pairKey = `${edge.source}->${edge.target}`;
		if (!edgeIdByPair.has(pairKey)) edgeIdByPair.set(pairKey, edge.id);
	}

	const buildTree = (node: Node<ComponentNodeData>, depth: number, parentId: string | null, parentOccurrenceId: string | null, path: Set<string>): TreeNode => {
		const occurrenceId = `${parentOccurrenceId ?? "root"}/${node.id}`;
		nodeByOccurrenceId.set(occurrenceId, node);
		depthById.set(occurrenceId, depth);
		parentById.set(occurrenceId, parentId);
		parentItemById.set(occurrenceId, parentOccurrenceId);

		const children: TreeNode[] = [];

		// The path set is per branch, so a node can appear under multiple parents
		// while cycles still terminate.
		if (!path.has(node.id)) {
			const nextPath = new Set(path);
			nextPath.add(node.id);

			const childIds = [...new Set(visibleChildrenOf.get(node.id) ?? [])];
			for (const childId of childIds) {
				const child = visibleNodeById.get(childId);
				if (!child) continue;

				const childOccurrenceId = `${occurrenceId}/${child.id}`;
				children.push(buildTree(child, depth + 1, node.id, occurrenceId, nextPath));
				parentChildPairs.push({
					edgeId: edgeIdByPair.get(`${node.id}->${child.id}`) ?? "",
					sourceItemId: occurrenceId,
					targetItemId: childOccurrenceId,
					sourceId: node.id,
					targetId: child.id,
				});
			}
			children.sort(compareTreeNodes);

			const childIdsInOrder = children.map((child) => child.node.id);
			for (const child of children) siblingsById.set(child.id, childIdsInOrder);
		}

		return { id: occurrenceId, node, depth, children };
	};

	for (const root of roots) {
		forest.push(buildTree(root, 0, null, null, new Set()));
	}

	// Roots are siblings of each other, so they can be re-ordered as blocks.
	const rootIds = forest.map((tree) => tree.node.id);
	for (const root of forest) siblingsById.set(root.id, rootIds);

	const rowSpans = new Map<string, { start: number; end: number }>();
	const blocks: TokenLayoutBlock[] = [];
	let nextRow = 0;

	const assignRows = (tree: TreeNode): { start: number; end: number } => {
		if (tree.children.length === 0) {
			const row = nextRow++;
			const span = { start: row, end: row };
			rowSpans.set(tree.id, span);
			return span;
		}

		let start = Number.POSITIVE_INFINITY;
		let end = Number.NEGATIVE_INFINITY;

		for (const child of tree.children) {
			const span = assignRows(child);
			start = Math.min(start, span.start);
			end = Math.max(end, span.end);
		}

		const span = { start, end };
		rowSpans.set(tree.id, span);
		return span;
	};

	for (const tree of forest) {
		const startRow = nextRow;
		assignRows(tree);
		blocks.push({ startRow, endRow: nextRow - 1 });
	}

	const items: TokenLayoutItem[] = [];
	const itemById = new Map<string, TokenLayoutItem>();

	for (const [id, span] of rowSpans) {
		const node = nodeByOccurrenceId.get(id);
		if (!node) continue;

		const depth = depthById.get(id) ?? 0;
		const centerRow = (span.start + span.end) / 2;

		const item: TokenLayoutItem = {
			id,
			node,
			depth,
			rowStart: span.start,
			rowEnd: span.end,
			x: depth * TOKEN_COLUMN_WIDTH,
			y: (centerRow + 0.5) * TOKEN_ROW_HEIGHT - TOKEN_NODE_HEIGHT / 2,
			// Ancestors come from the full graph, so a hidden main component still
			// appears in a variant's breadcrumb for context.
			ancestors: getAncestorChain(node.id, allNodeById, allEdges),
			parentId: parentById.get(id) ?? null,
			parentItemId: parentItemById.get(id) ?? null,
			siblingIds: siblingsById.get(id) ?? [node.id],
		};

		items.push(item);
		itemById.set(id, item);
	}

	const links: TokenLayoutLink[] = [];

	for (const pair of parentChildPairs) {
		const source = itemById.get(pair.sourceItemId);
		const target = itemById.get(pair.targetItemId);
		if (!source || !target) continue;

		const startX = source.x + TOKEN_NODE_WIDTH;
		const startY = source.y + TOKEN_NODE_HEIGHT / 2;
		const endX = target.x;
		const endY = target.y + TOKEN_NODE_HEIGHT / 2;

		links.push({
			edgeId: pair.edgeId,
			sourceItemId: pair.sourceItemId,
			targetItemId: pair.targetItemId,
			sourceId: pair.sourceId,
			targetId: pair.targetId,
			startX,
			startY,
			endX,
			endY,
			path: orthogonalPath(startX, startY, endX, endY),
			color: getEdgeColor(source.node.data.componentType, target.node.data.componentType),
		});
	}

	const nodesByDepth = new Map<number, Node<ComponentNodeData>[]>();
	for (const item of items) {
		if (!nodesByDepth.has(item.depth)) nodesByDepth.set(item.depth, []);
		nodesByDepth.get(item.depth)!.push(item.node);
	}

	const columnCount = items.length > 0 ? Math.max(...items.map((item) => item.depth)) + 1 : 0;
	const columns: TokenLayoutColumn[] = Array.from({ length: columnCount }, (_, depth) => {
		const columnNodes = nodesByDepth.get(depth) ?? [];
		return { depth, label: getColumnLabel(columnNodes), count: columnNodes.length };
	});

	const rowCount = nextRow;

	return {
		items,
		links,
		columns,
		blocks,
		rowCount,
		columnCount,
		totalWidth: columnCount * TOKEN_COLUMN_WIDTH,
		gridHeight: rowCount * TOKEN_ROW_HEIGHT,
	};
};
