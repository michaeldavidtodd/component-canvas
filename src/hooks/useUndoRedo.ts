import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Edge, Node } from "@xyflow/react";

export interface UndoRedoSnapshot {
	nodes: Node[];
	edges: Edge[];
}

interface UseUndoRedoOptions {
	nodes: Node[];
	edges: Edge[];
	setNodes: (nodes: Node[]) => void;
	setEdges: (edges: Edge[]) => void;
	enabled?: boolean;
	/** Milliseconds of inactivity before a change is committed to history. */
	debounceMs?: number;
	maxHistory?: number;
}

/**
 * Document signature that ignores transient React Flow fields (selection,
 * dragging, measured dimensions) so those don't create undo steps.
 */
const getSignature = (nodes: Node[], edges: Edge[]): string =>
	JSON.stringify({
		nodes: nodes.map((node) => [node.id, node.position.x, node.position.y, node.style?.width, node.style?.height, node.data]),
		edges: edges.map((edge) => [edge.id, edge.source, edge.target, edge.data]),
	});

/**
 * Snapshot-based undo/redo for the canvas document.
 *
 * Changes are coalesced with a short debounce so a drag or a burst of typing
 * becomes a single history entry. Loading a project should call `reset` with
 * the loaded snapshot so it doesn't become undoable.
 */
export const useUndoRedo = ({ nodes, edges, setNodes, setEdges, enabled = true, debounceMs = 300, maxHistory = 100 }: UseUndoRedoOptions) => {
	const past = useRef<UndoRedoSnapshot[]>([]);
	const future = useRef<UndoRedoSnapshot[]>([]);
	const lastCommitted = useRef<UndoRedoSnapshot>({ nodes, edges });
	const lastSignature = useRef(getSignature(nodes, edges));
	const skipNext = useRef<UndoRedoSnapshot | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const [, forceRender] = useReducer((value: number) => value + 1, 0);

	nodesRef.current = nodes;
	edgesRef.current = edges;

	const clearTimer = useCallback(() => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);

	const commit = useCallback(
		(snapshot: UndoRedoSnapshot, signature: string) => {
			past.current.push(lastCommitted.current);
			if (past.current.length > maxHistory) past.current.shift();
			future.current = [];
			lastCommitted.current = snapshot;
			lastSignature.current = signature;
			forceRender();
		},
		[maxHistory],
	);

	useEffect(() => {
		if (!enabled) return;

		// Ignore the state update that undo/redo just applied.
		if (skipNext.current && nodes === skipNext.current.nodes && edges === skipNext.current.edges) {
			skipNext.current = null;
			return;
		}

		timer.current = setTimeout(() => {
			const signature = getSignature(nodes, edges);
			if (signature === lastSignature.current) return;
			commit({ nodes, edges }, signature);
		}, debounceMs);

		return clearTimer;
	}, [nodes, edges, enabled, debounceMs, commit, clearTimer]);

	const apply = useCallback(
		(snapshot: UndoRedoSnapshot) => {
			skipNext.current = snapshot;
			lastCommitted.current = snapshot;
			lastSignature.current = getSignature(snapshot.nodes, snapshot.edges);
			setNodes(snapshot.nodes);
			setEdges(snapshot.edges);
			forceRender();
		},
		[setNodes, setEdges],
	);

	const undo = useCallback(() => {
		clearTimer();
		const currentNodes = nodesRef.current;
		const currentEdges = edgesRef.current;
		const signature = getSignature(currentNodes, currentEdges);

		// Flush a pending change so the current state is captured first.
		if (signature !== lastSignature.current) {
			commit({ nodes: currentNodes, edges: currentEdges }, signature);
		}

		const previous = past.current.pop();
		if (!previous) return;

		future.current.push({ nodes: currentNodes, edges: currentEdges });
		apply(previous);
	}, [apply, clearTimer, commit]);

	const redo = useCallback(() => {
		const next = future.current.pop();
		if (!next) return;

		past.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
		apply(next);
	}, [apply]);

	const reset = useCallback(
		(snapshot?: UndoRedoSnapshot) => {
			clearTimer();
			past.current = [];
			future.current = [];
			skipNext.current = null;
			const next = snapshot ?? { nodes: nodesRef.current, edges: edgesRef.current };
			lastCommitted.current = next;
			lastSignature.current = getSignature(next.nodes, next.edges);
			forceRender();
		},
		[clearTimer],
	);

	return {
		undo,
		redo,
		reset,
		canUndo: past.current.length > 0,
		canRedo: future.current.length > 0,
	};
};
