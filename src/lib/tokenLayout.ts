import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData, ComponentType } from "@/types/component";
import { getEdgeColor } from "@/lib/componentTypes";
import { getAncestorChain, type TitleLayer } from "@/lib/nodeHierarchy";
import { isAliasToken } from "@/lib/tokenValues";

/**
 * Geometry for the token map. The layout module owns these values so the
 * computed positions and the rendered grid can't drift apart.
 */
export const TOKEN_ROW_HEIGHT = 48;
export const TOKEN_COLUMN_WIDTH = 240;
export const TOKEN_NODE_WIDTH = 200;
export const TOKEN_NODE_HEIGHT = 36;
export const TOKEN_HEADER_HEIGHT = 44;

interface TreeNode {
	node: Node<ComponentNodeData>;
	depth: number;
	children: TreeNode[];
}

export interface TokenLayoutItem {
	node: Node<ComponentNodeData>;
	depth: number;
	/** First row covered by this node's subtree. */
	rowStart: number;
	/** Last row covered by this node's subtree. */
	rowEnd: number;
	x: number;
	y: number;
	/** Structural ancestors shown as a breadcrumb, matching the canvas node. */
	ancestors: TitleLayer[];
	/** Parent in the token tree; `null` for a root block. */
	parentId: string | null;
	/** Sibling group used for row re-ordering. */
	siblingIds: string[];
}

export interface TokenLayoutLink {
	sourceId: string;
	targetId: string;
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
 * Build the structured token map.
 *
 * Each token literal/alias starts a block. The block's rows are its leaves, so
 * a literal → alias → five variants chain occupies three columns and five rows.
 * Internal nodes are vertically centred over their descendants. A second root
 * starts on the next free row, exactly like a table.
 *
 * Only tokens continue the hierarchy; any other node type is treated as a usage
 * leaf. That keeps the view focused on token relationships rather than the full
 * component tree.
 */
export const buildTokenLayout = (nodes: Node<ComponentNodeData>[], edges: Edge[]): TokenLayout => {
	const visibleNodes = nodes.filter((node) => !node.hidden);
	const visibleEdges = edges.filter((edge) => !edge.hidden);

	const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
	const tokenIds = new Set(visibleNodes.filter((node) => node.data.componentType === "token").map((node) => node.id));

	const childrenOf = new Map<string, string[]>();
	const incomingTokenEdge = new Set<string>();

	for (const edge of visibleEdges) {
		if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;

		if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
		childrenOf.get(edge.source)!.push(edge.target);

		if (tokenIds.has(edge.source) && tokenIds.has(edge.target)) {
			incomingTokenEdge.add(edge.target);
		}
	}

	// A token is a root when no other token points at it. Literals sort before
	// aliases so a literal claims an alias reachable through a non-token path.
	// Once the user re-orders roots, the explicit order wins.
	const roots = visibleNodes
		.filter((node) => tokenIds.has(node.id) && !incomingTokenEdge.has(node.id))
		.sort((a, b) => {
			if (a.data.order !== undefined || b.data.order !== undefined) return compareNodeOrder(a, b);

			const aAlias = isAliasToken(a.data.tokenKind) ? 1 : 0;
			const bAlias = isAliasToken(b.data.tokenKind) ? 1 : 0;
			if (aAlias !== bAlias) return aAlias - bAlias;
			return compareNodePositions(a, b);
		});

	const visited = new Set<string>();
	const depthById = new Map<string, number>();
	const parentById = new Map<string, string | null>();
	const siblingsById = new Map<string, string[]>();
	const parentChildPairs: { sourceId: string; targetId: string }[] = [];
	const forest: TreeNode[] = [];

	const buildTree = (node: Node<ComponentNodeData>, depth: number, parentId: string | null): TreeNode => {
		visited.add(node.id);
		depthById.set(node.id, depth);
		parentById.set(node.id, parentId);

		const children: TreeNode[] = [];

		if (node.data.componentType === "token") {
			const childIds = [...new Set(childrenOf.get(node.id) ?? [])];
			for (const childId of childIds) {
				if (visited.has(childId)) continue;
				const child = nodeById.get(childId);
				if (!child) continue;

				children.push(buildTree(child, depth + 1, node.id));
				parentChildPairs.push({ sourceId: node.id, targetId: child.id });
			}
			children.sort(compareTreeNodes);

			const childIdsInOrder = children.map((child) => child.node.id);
			for (const child of children) siblingsById.set(child.node.id, childIdsInOrder);
		}

		return { node, depth, children };
	};

	for (const root of roots) {
		if (visited.has(root.id)) continue;
		forest.push(buildTree(root, 0, null));
	}

	// Tokens caught in a cycle never reach a root; give each one its own block.
	for (const node of visibleNodes) {
		if (!tokenIds.has(node.id) || visited.has(node.id)) continue;
		forest.push(buildTree(node, 0, null));
	}

	// Roots are siblings of each other, so they can be re-ordered as blocks.
	const rootIds = forest.map((tree) => tree.node.id);
	for (const rootId of rootIds) siblingsById.set(rootId, rootIds);

	const rowSpans = new Map<string, { start: number; end: number }>();
	const blocks: TokenLayoutBlock[] = [];
	let nextRow = 0;

	const assignRows = (tree: TreeNode): { start: number; end: number } => {
		if (tree.children.length === 0) {
			const row = nextRow++;
			const span = { start: row, end: row };
			rowSpans.set(tree.node.id, span);
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
		rowSpans.set(tree.node.id, span);
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
		const node = nodeById.get(id);
		if (!node) continue;

		const depth = depthById.get(id) ?? 0;
		const centerRow = (span.start + span.end) / 2;

		const item: TokenLayoutItem = {
			node,
			depth,
			rowStart: span.start,
			rowEnd: span.end,
			x: depth * TOKEN_COLUMN_WIDTH,
			y: (centerRow + 0.5) * TOKEN_ROW_HEIGHT - TOKEN_NODE_HEIGHT / 2,
			ancestors: getAncestorChain(node.id, nodeById, visibleEdges),
			parentId: parentById.get(id) ?? null,
			siblingIds: siblingsById.get(id) ?? [id],
		};

		items.push(item);
		itemById.set(id, item);
	}

	const links: TokenLayoutLink[] = [];

	for (const pair of parentChildPairs) {
		const source = itemById.get(pair.sourceId);
		const target = itemById.get(pair.targetId);
		if (!source || !target) continue;

		const startX = source.x + TOKEN_NODE_WIDTH;
		const startY = source.y + TOKEN_NODE_HEIGHT / 2;
		const endX = target.x;
		const endY = target.y + TOKEN_NODE_HEIGHT / 2;

		links.push({
			sourceId: pair.sourceId,
			targetId: pair.targetId,
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
