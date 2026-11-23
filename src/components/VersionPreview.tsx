import { ReactFlow, ReactFlowProvider, Background, Controls, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FIT_VIEW_OPTIONS, MIN_ZOOM } from "@/lib/canvas";
import { normalizeEdges } from "@/lib/edges";
import type { ProjectVersion } from "@/types/project";

interface VersionPreviewProps {
	version: ProjectVersion;
	nodeTypes?: NodeTypes;
}

/**
 * Read-only canvas preview of a saved version. Rendered in the main canvas
 * area while the version list stays visible in the aside. Its context and
 * actions live in the shared workspace header, so the layout height stays
 * constant when entering and leaving preview.
 */
export const VersionPreview = ({ version, nodeTypes }: VersionPreviewProps) => {
	return (
		<div className="absolute inset-0 bg-canvas">
			<ReactFlowProvider>
				<ReactFlow nodes={version.nodes} edges={normalizeEdges(version.edges)} nodeTypes={nodeTypes} fitView fitViewOptions={FIT_VIEW_OPTIONS} minZoom={MIN_ZOOM} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} className="bg-canvas">
					<Background className="[&>*]:!stroke-border" gap={16} />
					<div className="p-4">
						<Controls showInteractive={false} fitViewOptions={FIT_VIEW_OPTIONS} />
					</div>
				</ReactFlow>
			</ReactFlowProvider>
		</div>
	);
};
