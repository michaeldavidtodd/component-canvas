import { useMemo } from "react";
import type { Node } from "@xyflow/react";
import { Activity, History, Redo2, Sparkles, Undo2 } from "lucide-react";

import type { ComponentNodeData, ComponentType } from "@/types/component";
import type { ProjectVersion } from "@/types/project";
import { COMPONENT_TYPES } from "@/lib/componentTypes";
import { formatVersionName } from "@/lib/versions";
import type { ViewMode } from "@/types/view";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VIEW_COPY: Record<ViewMode, { title: string; description: string }> = {
	canvas: { title: "Component Canvas", description: "Design and visualize your component structure" },
	tokens: { title: "Structured Map", description: "Inspect and edit the selected node" },
};

interface WorkspaceHeaderProps {
	viewMode: ViewMode;
	nodes: Node<ComponentNodeData>[];
	visibleTypes: ReadonlySet<ComponentType>;
	onToggleType: (type: ComponentType) => void;
	onSwitchToCanvas: () => void;
	isLocked?: boolean;
	canUndo: boolean;
	canRedo: boolean;
	onUndo: () => void;
	onRedo: () => void;
	onShowHistory?: () => void;
	/** Whether the token health review is open, so its toggle reads as pressed. */
	showTokenHealth?: boolean;
	onToggleTokenHealth?: () => void;
	/** Opens the advisor command bar. Cmd+K is the primary shortcut. */
	onOpenAiReview?: () => void;
	/** Shared projects are read-only, so the editing controls are hidden. */
	readOnly?: boolean;
	/** When set, the header shows the preview context and actions instead of the editor controls. */
	previewVersion?: ProjectVersion | null;
	/** Forces preview mode even before a version resolves (e.g. while history loads). */
	previewMode?: boolean;
	projectName?: string;
	restoringVersionId?: string | null;
	onExitPreview?: () => void;
	onRestoreVersion?: (versionId: string) => void;
}

/**
 * The single header shared by the canvas, the structured map, and version
 * preview. It carries the view title plus the editing controls, only adds the
 * type filters in the map view where they apply, and swaps to the preview
 * actions while a saved version is being previewed. Staying mounted in every
 * mode keeps its height stable, so the floating aside never shifts position.
 */
export const WorkspaceHeader = ({ viewMode, nodes, visibleTypes, onToggleType, onSwitchToCanvas, isLocked = false, canUndo, canRedo, onUndo, onRedo, onShowHistory, showTokenHealth = false, onToggleTokenHealth, onOpenAiReview, readOnly = false, previewVersion = null, previewMode = false, projectName, restoringVersionId, onExitPreview, onRestoreVersion }: WorkspaceHeaderProps) => {
	const isPreviewing = previewMode || !!previewVersion;
	const isMapView = viewMode === "tokens";
	const isRestoring = !!previewVersion && restoringVersionId === previewVersion.id;

	const title = isPreviewing ? "Version Preview" : VIEW_COPY[viewMode].title;
	const description = previewVersion ? `${formatVersionName(previewVersion)}${projectName ? ` · ${projectName}` : ""}` : isPreviewing ? "Loading version…" : VIEW_COPY[viewMode].description;

	// Counts reflect the project, not the current filter, so a hidden type still
	// shows how many nodes the toggle would reveal.
	const typeCounts = useMemo(() => {
		const counts = new Map<ComponentType, number>();
		for (const node of nodes) {
			if (node.hidden) continue;
			const type = node.data.componentType;
			counts.set(type, (counts.get(type) ?? 0) + 1);
		}
		return counts;
	}, [nodes]);

	return (
		<header className="shrink-0 border-b border-border bg-canvas/95 backdrop-blur">
			<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
				<div className="min-w-0">
					<h1 className="truncate font-display text-sm font-semibold leading-tight text-foreground">{title}</h1>
					<p className="truncate text-xs text-muted-foreground">{description}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{isPreviewing ? (
						<>
							<Button variant="outline" size="sm" onClick={onExitPreview}>
								Exit preview
							</Button>
							<Button size="sm" onClick={() => previewVersion && onRestoreVersion?.(previewVersion.id)} disabled={isRestoring || !previewVersion}>
								{isRestoring ? "Restoring..." : "Restore this version"}
							</Button>
						</>
					) : (
						<>
							{isLocked && <Badge variant="outline">Editing locked</Badge>}
							{!readOnly && (
								<div className="flex items-center gap-1">
									<Button variant="outline" size="icon" className="size-8" onClick={onUndo} disabled={isLocked || !canUndo} aria-label="Undo">
										<Undo2 className="size-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="size-8" onClick={onRedo} disabled={isLocked || !canRedo} aria-label="Redo">
										<Redo2 className="size-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="size-8" onClick={onShowHistory} aria-label="Version history">
										<History className="size-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="size-8" onClick={onToggleTokenHealth} aria-label="Token health" aria-pressed={showTokenHealth} title="Token health">
										<Activity className="size-3.5" />
									</Button>
									<Button variant="outline" size="icon" className="size-8" onClick={onOpenAiReview} aria-label="Ask the advisor" title="Ask the advisor (⌘K)">
										<Sparkles className="size-3.5" />
									</Button>
								</div>
							)}
							{isMapView && (
								<Button variant="outline" size="sm" onClick={onSwitchToCanvas}>
									Open canvas
								</Button>
							)}
						</>
					)}
				</div>
			</div>
			{isMapView && (
				<div className={cn("flex flex-wrap items-center gap-1.5 px-6 pb-3", isPreviewing && "invisible")} aria-hidden={isPreviewing || undefined}>
					{COMPONENT_TYPES.map(({ type, label, icon: Icon, bgClass, borderClass }) => {
						const isVisible = visibleTypes.has(type);
						const count = typeCounts.get(type) ?? 0;

						return (
							<button key={type} type="button" aria-pressed={isVisible} title={`${isVisible ? "Hide" : "Show"} ${label}`} onClick={() => onToggleType(type)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isVisible ? `${bgClass} ${borderClass} text-white dark:text-black` : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
								<Icon className="size-3.5" />
								<span>{label}</span>
								<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isVisible ? "bg-black/15 text-white dark:text-black" : "bg-background text-muted-foreground"}`}>{count}</span>
							</button>
						);
					})}
				</div>
			)}
		</header>
	);
};
