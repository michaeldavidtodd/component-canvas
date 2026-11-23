import type { Node } from "@xyflow/react";

// How far the canvas can zoom out. React Flow defaults to 0.5; Figma-style
// navigation needs a much smaller minimum so large trees fit on screen.
export const MIN_ZOOM = 0.1;

export const FIT_VIEW_OPTIONS = {
	padding: 0.2,
	includeHiddenNodes: false,
	minZoom: MIN_ZOOM,
	maxZoom: 2,
};

/** Vertical gap between the bottom of the tree and a new row of nodes. */
export const BELOW_TREE_GAP = 80;

/** Fallback size used when a node has not been measured yet. */
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

export const getNodeSize = (node: Node): { width: number; height: number } => {
	const width = typeof node.style?.width === "number" ? node.style.width : node.measured?.width ?? DEFAULT_NODE_WIDTH;
	const height = typeof node.style?.height === "number" ? node.style.height : node.measured?.height ?? DEFAULT_NODE_HEIGHT;
	return { width, height };
};

export interface BelowTreePlacement {
	position: { x: number; y: number };
	/** The row the node was placed in, so later nodes can join the same row. */
	rowY: number;
}

/**
 * Place a node in a row beneath the existing tree. Nodes already placed in the
 * same row are appended to the right so repeated additions form a row rather
 * than a vertical stack.
 */
export const getBelowTreePlacement = (nodes: Node[], rowY: number | null): BelowTreePlacement => {
	if (nodes.length === 0) {
		return { position: { x: 0, y: 0 }, rowY: 0 };
	}

	const sizes = nodes.map((node) => ({ node, ...getNodeSize(node) }));
	const maxBottom = Math.max(...sizes.map(({ node, height }) => node.position.y + height));
	const minX = Math.min(...sizes.map(({ node }) => node.position.x));

	// Reuse the previous row when it still sits below the rest of the tree. The
	// row's own nodes are excluded from the "bottom" so adding a second node to
	// the row doesn't push the row down.
	const rowNodes = rowY === null ? [] : sizes.filter(({ node }) => Math.abs(node.position.y - rowY) < 1);
	const rowIds = new Set(rowNodes.map(({ node }) => node.id));
	const otherBottoms = sizes.filter(({ node }) => !rowIds.has(node.id)).map(({ node, height }) => node.position.y + height);
	const maxOtherBottom = otherBottoms.length > 0 ? Math.max(...otherBottoms) : -Infinity;

	const targetY = rowY !== null && rowNodes.length > 0 && rowY >= maxOtherBottom + BELOW_TREE_GAP ? rowY : maxBottom + BELOW_TREE_GAP;

	const targetRowNodes = sizes.filter(({ node }) => Math.abs(node.position.y - targetY) < 1);
	const x = targetRowNodes.length > 0 ? Math.max(...targetRowNodes.map(({ node, width }) => node.position.x + width)) + BELOW_TREE_GAP : minX;

	return { position: { x, y: targetY }, rowY: targetY };
};
