import { Edge } from "@xyflow/react";

/**
 * Connections always render as solid lines. Stripping `animated` here keeps
 * edges saved by older builds (which flagged drag-created connections as
 * animated) consistent with edges created any other way.
 */
export const normalizeEdges = (edges: Edge[]): Edge[] => edges.map(({ animated: _animated, ...edge }) => ({ ...edge, type: "default" }));
