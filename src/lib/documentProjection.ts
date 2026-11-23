import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData, ComponentType, TokenKind, TokenSubType, TokenType, TokenValueFormat } from "@/types/component";

/**
 * A node as it is sent to the AI provider.
 *
 * This is a whitelist, not a redaction pass: only the fields named here leave the
 * machine. A field added to `ComponentNodeData` later is therefore excluded by
 * default rather than leaking silently.
 */
export interface ProjectedNode {
	id: string;
	componentType: ComponentType;
	label: string;
	description: string;
	parentId?: string | null;
	order?: number;
	tokenType?: TokenType;
	tokenSubType?: TokenSubType;
	tokenKind?: TokenKind;
	tokenValue?: string;
	tokenFormat?: TokenValueFormat;
	tokenAlias?: string;
	tokenName?: string;
	tokenScope?: string;
	tokenTheme?: string;
	tokenSource?: string;
}

/** An edge as it is sent: the relationship only, without presentation. */
export interface ProjectedEdge {
	id: string;
	source: string;
	target: string;
}

export interface ProjectedDocument {
	nodes: ProjectedNode[];
	edges: ProjectedEdge[];
}

/**
 * The optional node fields included in the projection. Kept as a list so the
 * disclosure UI can show users exactly what is sent without duplicating it.
 */
export const PROJECTED_NODE_FIELDS = [
	"parentId",
	"order",
	"tokenType",
	"tokenSubType",
	"tokenKind",
	"tokenValue",
	"tokenFormat",
	"tokenAlias",
	"tokenName",
	"tokenScope",
	"tokenTheme",
	"tokenSource",
] as const satisfies readonly (keyof ComponentNodeData)[];

/**
 * Copy a node's document content, dropping everything presentational.
 *
 * Position, selection, size, and drag state are deliberately excluded: the agent
 * reasons about structure, not layout. `url` is excluded too, because a Figma link
 * reveals workspace paths without helping any structural question.
 */
const projectNode = (node: Node<ComponentNodeData>): ProjectedNode => {
	// Built as a loose record so the whitelist list drives the projection and cannot
	// drift from the output. The assertion is confined to the return below.
	const projected: Record<string, unknown> = {
		id: node.id,
		componentType: node.data.componentType,
		label: node.data.label,
		description: node.data.description,
	};

	// Absent fields are omitted rather than sent as nulls, so the payload stays small.
	for (const field of PROJECTED_NODE_FIELDS) {
		const value = node.data[field];
		if (value !== undefined) projected[field] = value;
	}

	return projected as unknown as ProjectedNode;
};

/**
 * Project the document down to what may be sent to the AI provider.
 *
 * Hidden nodes are included: a node filtered out of view is still part of the
 * document, and leaving it out would misrepresent the structure.
 */
export const projectDocument = (nodes: Node<ComponentNodeData>[], edges: Edge[]): ProjectedDocument => ({
	nodes: nodes.map(projectNode),
	edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
});

/** What the disclosure UI shows before a document is sent. */
export interface ProjectionSummary {
	nodeCount: number;
	edgeCount: number;
	/** Size of the serialized projection, so the user can judge what leaves the machine. */
	bytes: number;
}

export const summarizeProjection = (projection: ProjectedDocument): ProjectionSummary => ({
	nodeCount: projection.nodes.length,
	edgeCount: projection.edges.length,
	bytes: new TextEncoder().encode(JSON.stringify(projection)).length,
});
