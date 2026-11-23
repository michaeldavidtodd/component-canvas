import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { getEdgeColor } from "@/lib/connectionTypes";
import { canAssignParent, getPrimaryParentId } from "@/lib/parentRules";

/**
 * A typed change to the document.
 *
 * Agents and fixes emit operations instead of returning a whole new document, so
 * every change goes through the same parent-rule checks the UI uses and can be
 * previewed and undone as a single unit. The set is deliberately small: each op
 * maps to a mutation the canvas already performs.
 */
export type Operation =
	| { op: "deleteNode"; nodeId: string }
	| { op: "updateNode"; nodeId: string; data: Partial<ComponentNodeData> }
	| { op: "setParents"; nodeId: string; parentIds: string[] };

/**
 * The operation discriminants, for code that cannot import the union itself —
 * notably the AI tool schema, which runs in Deno. Keep this in sync with
 * `Operation`; a test asserts the tool schema covers exactly these kinds.
 */
export const OPERATION_KINDS = ["deleteNode", "updateNode", "setParents"] as const;

/** The first operation that couldn't be applied, and why. */
export interface OperationError {
	/** Position in the operation list, so a repair turn can point at the culprit. */
	index: number;
	operation: Operation;
	reason: string;
}

export interface ApplyResult {
	/** The document after the operations. The original document when `errors` is non-empty. */
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	/** Empty when every operation applied. */
	errors: OperationError[];
}

interface OpOutcome {
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	/** Set when the operation was rejected; the caller ignores nodes and edges. */
	error?: string;
}

/**
 * Remove a node and every edge touching it. Nodes that named it as their parent
 * are detached rather than left pointing at a node that no longer exists.
 */
const deleteNode = (nodes: Node<ComponentNodeData>[], edges: Edge[], nodeId: string): OpOutcome => {
	const target = nodes.find((node) => node.id === nodeId);
	if (!target) return { nodes, edges, error: `No node with id ${nodeId}.` };

	const nextNodes = nodes
		.filter((node) => node.id !== nodeId)
		.map((node) => (node.data.parentId === nodeId ? { ...node, data: { ...node.data, parentId: null } } : node));
	const nextEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

	return { nodes: nextNodes, edges: nextEdges };
};

const updateNode = (nodes: Node<ComponentNodeData>[], edges: Edge[], nodeId: string, data: Partial<ComponentNodeData>): OpOutcome => {
	const target = nodes.find((node) => node.id === nodeId);
	if (!target) return { nodes, edges, error: `No node with id ${nodeId}.` };

	const nextNodes = nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node));
	return { nodes: nextNodes, edges };
};

/**
 * Replace a node's parents. Every parent is checked against the parent rules in
 * order, so a single illegal parent rejects the whole operation rather than being
 * silently dropped. Incoming edges are rebuilt from the accepted parents.
 */
const setParents = (nodes: Node<ComponentNodeData>[], edges: Edge[], nodeId: string, parentIds: string[]): OpOutcome => {
	const child = nodes.find((node) => node.id === nodeId);
	if (!child) return { nodes, edges, error: `No node with id ${nodeId}.` };

	const parents: Node<ComponentNodeData>[] = [];
	for (const parentId of parentIds) {
		const parent = nodes.find((node) => node.id === parentId);
		if (!parent) return { nodes, edges, error: `No parent node with id ${parentId}.` };
		if (parent.id === child.id) return { nodes, edges, error: `${child.data.label} can't be its own parent.` };
		const check = canAssignParent(child, parent, parents);
		if (!check.allowed) return { nodes, edges, error: check.reason ?? `${parent.data.label} can't be a parent of ${child.data.label}.` };
		parents.push(parent);
	}

	const rebuiltEdges: Edge[] = parents.map((parent) => ({
		id: `edge-${parent.id}-${nodeId}`,
		source: parent.id,
		target: nodeId,
		type: "default",
		style: { stroke: getEdgeColor(parent.data.componentType, child.data.componentType) },
	}));

	const primaryParentId = getPrimaryParentId(parents);
	const nextNodes = nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, parentId: primaryParentId } } : node));

	return { nodes: nextNodes, edges: [...edges.filter((edge) => edge.target !== nodeId), ...rebuiltEdges] };
};

const applyOperation = (nodes: Node<ComponentNodeData>[], edges: Edge[], operation: Operation): OpOutcome => {
	switch (operation.op) {
		case "deleteNode":
			return deleteNode(nodes, edges, operation.nodeId);
		case "updateNode":
			return updateNode(nodes, edges, operation.nodeId, operation.data);
		case "setParents":
			return setParents(nodes, edges, operation.nodeId, operation.parentIds);
	}
};

/**
 * Apply a list of operations to the document.
 *
 * Operations are applied in order and are atomic: if any one fails, the original
 * document is returned untouched so a half-applied fix never lands. Only the first
 * failure is reported, which is what a repair turn needs to try again.
 */
export const applyOperations = (nodes: Node<ComponentNodeData>[], edges: Edge[], operations: Operation[]): ApplyResult => {
	let nextNodes = nodes;
	let nextEdges = edges;

	for (const [index, operation] of operations.entries()) {
		const outcome = applyOperation(nextNodes, nextEdges, operation);
		if (outcome.error) {
			return { nodes, edges, errors: [{ index, operation, reason: outcome.error }] };
		}
		nextNodes = outcome.nodes;
		nextEdges = outcome.edges;
	}

	return { nodes: nextNodes, edges: nextEdges, errors: [] };
};
