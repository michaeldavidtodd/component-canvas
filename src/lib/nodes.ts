import { Node } from "@xyflow/react";

/**
 * React Flow caches each node's rendered size in `measured` and uses that cache
 * for hit-testing (box selection, drag bounds). Saved projects persist the
 * cache, so a node whose content changed since the save can carry a stale size
 * and be missed by a selection rectangle that visually covers it. Dropping the
 * cache on load makes React Flow re-measure from the DOM, so selection geometry
 * always matches what's on screen.
 */
export const normalizeNodes = <N extends Node>(nodes: N[]): N[] =>
	nodes.map(({ measured: _measured, dragging: _dragging, ...node }) => node as N);
