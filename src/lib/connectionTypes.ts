/**
 * Connection/edge metadata, kept free of React and icon imports so it can run
 * in a Web Worker. `componentTypes.ts` re-exports these for the UI.
 */

export type ConnectionKind = "componentVariant" | "tokenUsage" | "group" | "default";

export interface ConnectionTypeMeta {
	id: ConnectionKind;
	/** Label shown in the legend. */
	label: string;
	/** Tailwind background utility for the legend swatch. */
	swatchClass: string;
	/** Stroke color applied to the edge. */
	stroke: string;
}

/**
 * Connection kinds used by the legend. `getConnectionType` resolves which one
 * applies so the legend can't drift from the colors actually drawn.
 */
export const CONNECTION_TYPES: Record<ConnectionKind, ConnectionTypeMeta> = {
	componentVariant: {
		id: "componentVariant",
		label: "Component to Variant",
		swatchClass: "bg-component-main",
		stroke: "hsl(var(--component-main))",
	},
	tokenUsage: {
		id: "tokenUsage",
		label: "Token Usage",
		swatchClass: "bg-component-token",
		stroke: "hsl(var(--component-token))",
	},
	group: {
		id: "group",
		label: "Group Membership",
		swatchClass: "bg-component-group",
		stroke: "hsl(var(--component-group))",
	},
	default: {
		id: "default",
		label: "Component Relationships",
		swatchClass: "bg-muted-foreground",
		stroke: "hsl(var(--muted-foreground))",
	},
};

export const CONNECTION_TYPE_LIST: readonly ConnectionTypeMeta[] = Object.values(CONNECTION_TYPES);

/** Resolve which connection kind an edge between two node types should use. */
export const getConnectionType = (sourceType: string, targetType: string): ConnectionTypeMeta => {
	const isVariantPair = (sourceType === "main-component" && targetType === "variant") || (sourceType === "variant" && targetType === "main-component");

	if (isVariantPair) return CONNECTION_TYPES.componentVariant;
	if (sourceType === "token" || targetType === "token") return CONNECTION_TYPES.tokenUsage;
	if (sourceType === "group" || targetType === "group") return CONNECTION_TYPES.group;
	return CONNECTION_TYPES.default;
};

/** Stroke color for an edge between two node types. */
export const getEdgeColor = (sourceType: string, targetType: string): string => getConnectionType(sourceType, targetType).stroke;
