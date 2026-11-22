import { ReactFlow, ReactFlowProvider, Background, Controls, type NodeTypes } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FIT_VIEW_OPTIONS, MIN_ZOOM } from "@/lib/canvas";
import { normalizeEdges } from "@/lib/edges";
import { formatVersionName } from "@/lib/versions";
import type { ProjectVersion } from "@/types/project";

interface VersionPreviewProps {
	version: ProjectVersion;
	projectName?: string;
	nodeTypes?: NodeTypes;
	onRestore: (versionId: string) => void;
	onExit: () => void;
	restoring?: boolean;
}

/**
 * Read-only canvas preview of a saved version. Rendered in the main canvas
 * area while the version list stays visible in the aside.
 */
export const VersionPreview = ({ version, projectName, nodeTypes, onRestore, onExit, restoring = false }: VersionPreviewProps) => {
	return (
		<div className="absolute inset-0 flex flex-col bg-canvas">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4">
				<div className="flex min-w-0 items-center gap-2">
					<History className="size-4 shrink-0 text-muted-foreground" />
					<div className="min-w-0">
						<p className="truncate text-sm font-medium" aria-live="polite">
							Previewing {formatVersionName(version)}
							{projectName && <span className="font-normal text-muted-foreground"> · {projectName}</span>}
						</p>
						<p className="text-xs text-muted-foreground">
							{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })} · {version.nodes.length} nodes · {version.edges.length} connections
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					<Button variant="outline" onClick={onExit} className="gap-1.5">
						<X />
						Exit preview
					</Button>
					<Button onClick={() => onRestore(version.id)} disabled={restoring} className="gap-1.5">
						<RotateCcw />
						{restoring ? "Restoring..." : "Restore this version"}
					</Button>
				</div>
			</div>

			<div className="relative flex-1 overflow-hidden">
				<ReactFlowProvider>
					<ReactFlow nodes={version.nodes} edges={normalizeEdges(version.edges)} nodeTypes={nodeTypes} fitView fitViewOptions={FIT_VIEW_OPTIONS} minZoom={MIN_ZOOM} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} className="bg-canvas">
						<Background className="[&>*]:!stroke-border" gap={16} />
						<div className="float-right p-4">
							<Controls showInteractive={false} fitViewOptions={FIT_VIEW_OPTIONS} />
						</div>
					</ReactFlow>
				</ReactFlowProvider>
			</div>
		</div>
	);
};
