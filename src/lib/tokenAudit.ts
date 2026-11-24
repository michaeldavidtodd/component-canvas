import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import type { Operation } from "@/lib/documentOperations";
import { getNodeValidationIssues } from "@/lib/nodeValidation";
import { getDefaultTokenFormat, isAliasToken } from "@/lib/tokenValues";

/** How serious a finding is. Errors make a token invalid; warnings suggest cleanup; info is context. */
export type AuditSeverity = "error" | "warning" | "info";

/** Stable ids so the token health panel and the agent can refer to a check. */
export type AuditCheckId =
	| "invalid-value"
	| "unresolved-alias"
	| "alias-chain"
	| "unused-token"
	| "duplicate-value"
	| "mixed-formats";

/**
 * A change that resolves a finding. Only findings whose fix is unambiguous carry
 * one; anything requiring a judgement call (a new value, which duplicate to keep)
 * is left for the agent to propose.
 */
export interface AuditFix {
	/** Action-phrased, and used as the label of the button that applies it. */
	summary: string;
	operations: Operation[];
}

export interface AuditFinding {
	check: AuditCheckId;
	severity: AuditSeverity;
	/** Human-readable summary shown in the token health panel. */
	message: string;
	/**
	 * Token names the message mentions, so wherever the message is shown they can be
	 * set as inline code.
	 */
	tokenNames: string[];
	/** Every node the finding applies to. */
	nodeIds: string[];
	/** Set when the finding can be resolved without a judgement call. */
	fix?: AuditFix;
}

type TokenNode = Node<ComponentNodeData>;

const SEVERITY_RANK: Record<AuditSeverity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Resolve a node's parent the same way the canvas and grid do: an explicit
 * `parentId` wins (including `null` for a detached node), otherwise the first
 * incoming edge.
 */
const getParentId = (node: TokenNode, edges: Edge[]): string | null | undefined => {
	if (node.data.parentId !== undefined) return node.data.parentId;
	return edges.find((edge) => edge.target === node.id)?.source;
};

/** The format a literal token is expressed in, falling back to its type's default. */
const resolveFormat = (data: ComponentNodeData): string | undefined =>
	data.tokenFormat ?? (data.tokenType ? getDefaultTokenFormat(data.tokenType) : undefined);

/**
 * Walk up from an alias to the first literal it eventually resolves to. Returns
 * undefined when the chain dead-ends or loops, so a fix is only offered when there
 * is a literal to point at.
 */
const findLiteralAncestor = (start: TokenNode, tokenById: Map<string, TokenNode>, edges: Edge[]): TokenNode | undefined => {
	const seen = new Set<string>();
	let current: TokenNode | undefined = start;
	while (current && !seen.has(current.id)) {
		seen.add(current.id);
		if (!isAliasToken(current.data.tokenKind)) return current;
		const parentId = getParentId(current, edges);
		current = parentId ? tokenById.get(parentId) : undefined;
	}
	return undefined;
};

/**
 * Run the deterministic token checks.
 *
 * These are the facts an AI review needs to be grounded in. Each finding is
 * computed from the document, so the agent explains and proposes fixes rather
 * than inventing problems. Findings are ordered by severity, most serious first.
 *
 * Aliases resolve by edge, not by name: an alias's parent is the token it points
 * at. That means an alias with no parent is the dangling case, and an alias whose
 * parent is another alias is a chain.
 */
export const auditTokenMap = (nodes: TokenNode[], edges: Edge[] = []): AuditFinding[] => {
	const findings: AuditFinding[] = [];
	const tokens = nodes.filter((node) => node.data.componentType === "token");
	const tokenById = new Map(tokens.map((node) => [node.id, node]));

	// Usage counts both edge connections and explicit `parentId` links, so a token
	// that is only referenced through a saved parent relationship isn't reported
	// as unused.
	const outgoingCount = new Map<string, number>();
	for (const edge of edges) {
		outgoingCount.set(edge.source, (outgoingCount.get(edge.source) ?? 0) + 1);
	}
	for (const node of nodes) {
		const parentId = node.data.parentId;
		if (parentId) outgoingCount.set(parentId, (outgoingCount.get(parentId) ?? 0) + 1);
	}

	for (const node of tokens) {
		const data = node.data;

		for (const issue of getNodeValidationIssues(node)) {
			findings.push({
				check: "invalid-value",
				severity: "error",
				message: `${data.label}: ${issue.message}`,
				tokenNames: [data.label],
				nodeIds: [node.id],
			});
		}

		if (isAliasToken(data.tokenKind)) {
			const parentId = getParentId(node, edges);
			const parent = parentId ? tokenById.get(parentId) : undefined;
			if (!parent) {
				findings.push({
					check: "unresolved-alias",
					severity: "warning",
					message: `${data.label} is an alias with no token to resolve to.`,
					tokenNames: [data.label],
					nodeIds: [node.id],
				});
			} else if (isAliasToken(parent.data.tokenKind)) {
				const literal = findLiteralAncestor(parent, tokenById, edges);
				findings.push({
					check: "alias-chain",
					severity: "warning",
					message: `${data.label} points to another alias (${parent.data.label}). Point aliases at a literal token.`,
					tokenNames: [data.label, parent.data.label],
					nodeIds: [node.id, parent.id],
					fix: literal
						? {
								summary: `Point ${data.label} at ${literal.data.label}`,
								operations: [{ op: "setParents", nodeId: node.id, parentIds: [literal.id] }],
							}
						: undefined,
				});
			}
		}

		if ((outgoingCount.get(node.id) ?? 0) === 0) {
			findings.push({
				check: "unused-token",
				severity: "warning",
				message: `${data.label} isn't used by any component or token.`,
				tokenNames: [data.label],
				nodeIds: [node.id],
				fix: { summary: `Remove ${data.label}`, operations: [{ op: "deleteNode", nodeId: node.id }] },
			});
		}
	}

	const byValue = new Map<string, TokenNode[]>();
	for (const node of tokens) {
		const data = node.data;
		if (isAliasToken(data.tokenKind) || !data.tokenValue) continue;
		const key = `${data.tokenType ?? ""}::${resolveFormat(data) ?? ""}::${data.tokenValue.trim()}`;
		const group = byValue.get(key);
		if (group) group.push(node);
		else byValue.set(key, [node]);
	}
	for (const group of byValue.values()) {
		if (group.length < 2) continue;
		findings.push({
			check: "duplicate-value",
			severity: "info",
			message: `${group.length} tokens share the value ${group[0].data.tokenValue}.`,
			tokenNames: [],
			nodeIds: group.map((node) => node.id),
		});
	}

	const formatsByType = new Map<string, Set<string>>();
	for (const node of tokens) {
		const data = node.data;
		if (isAliasToken(data.tokenKind) || !data.tokenType) continue;
		const format = resolveFormat(data);
		if (!format) continue;
		const formats = formatsByType.get(data.tokenType) ?? new Set<string>();
		formats.add(format);
		formatsByType.set(data.tokenType, formats);
	}
	for (const [tokenType, formats] of formatsByType) {
		if (formats.size < 2) continue;
		findings.push({
			check: "mixed-formats",
			severity: "info",
			message: `${tokenType} tokens use more than one format (${[...formats].join(", ")}).`,
			tokenNames: [],
			nodeIds: tokens.filter((node) => node.data.tokenType === tokenType).map((node) => node.id),
		});
	}

	return findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
};
