import type { Edge } from "@xyflow/react";

import type { ComponentNodeData, ComponentType } from "@/types/component";

/** A single segment of a node's breadcrumb title. */
export interface TitleLayer {
  id: string;
  label: string;
  componentType: ComponentType;
}

/** Stable empty result so selectors don't trigger re-renders for leaf nodes. */
export const EMPTY_TITLE_LAYERS: TitleLayer[] = [];

/** Node types that participate in the component hierarchy. */
const STRUCTURAL_TYPES: ReadonlySet<ComponentType> = new Set(["main-component", "variant", "sub-component"]);

/** Minimal shape of a node lookup entry needed to resolve ancestors. */
type NodeLookupLike = ReadonlyMap<string, { id: string; data: Record<string, unknown> }>;

/**
 * Walk incoming edges from `nodeId` to build the structural ancestor chain,
 * ordered from the root down to the immediate parent.
 *
 * Edges are treated as parent -> child. When a node has multiple parents, the
 * first incoming edge wins so the title stays stable.
 */
export const getAncestorChain = (nodeId: string, nodeLookup: NodeLookupLike, edges: Edge[]): TitleLayer[] => {
  const chain: TitleLayer[] = [];
  const visited = new Set<string>([nodeId]);
  let currentId = nodeId;

  while (true) {
    const incoming = edges.find((edge) => edge.target === currentId);
    if (!incoming || visited.has(incoming.source)) break;
    visited.add(incoming.source);

    const parent = nodeLookup.get(incoming.source);
    if (!parent) break;

    const parentData = parent.data as ComponentNodeData;
    if (STRUCTURAL_TYPES.has(parentData.componentType)) {
      chain.unshift({
        id: parent.id,
        label: parentData.label,
        componentType: parentData.componentType,
      });
    }

    currentId = incoming.source;
  }

  return chain;
};

/** Equality check so a node only re-renders when its breadcrumb actually changes. */
export const titleLayersEqual = (a: TitleLayer[], b: TitleLayer[]): boolean =>
  a.length === b.length &&
  a.every((layer, index) => layer.id === b[index].id && layer.label === b[index].label && layer.componentType === b[index].componentType);
