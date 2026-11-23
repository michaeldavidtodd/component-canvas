import { useCallback, useState, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, addEdge, Connection, Edge, Background, Controls, MiniMap, Node, SelectionMode, useReactFlow, useStore } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { ComponentNode } from "./nodes/ComponentNode";
import SimpleDeleteEdge from "./edges/SimpleDeleteEdge";
import { NodeDock, VersionPreviewDock } from "./NodeDock";
import { GridView } from "./GridView";
import { WorkspaceHeader } from "./WorkspaceHeader";

import { PropertiesPanel } from "./PropertiesPanel";
import { ConnectionLegend } from "./ConnectionLegend";
import { VersionHistory } from "@/components/VersionHistory";
import { VersionPreview } from "@/components/VersionPreview";
import { ProjectBrowser } from "@/components/ProjectBrowser";
import { AutoSaveHandler } from "./AutoSaveHandler";
import { ProjectManager } from "./ProjectManager";
import { OnboardingFlow } from "./OnboardingFlow";
import { ComponentNodeData, ComponentType } from "@/types/component";
import { COMPONENT_TYPES, CONNECTION_TYPES, getComponentColor, getEdgeColor } from "@/lib/componentTypes";
import { FIT_VIEW_OPTIONS, MIN_ZOOM } from "@/lib/canvas";
import { normalizeEdges } from "@/lib/edges";
import { normalizeNodes } from "@/lib/nodes";
import { canAssignParent, getPrimaryParentId } from "@/lib/parentRules";
import type { ProjectVersion, SharedProjectData } from "@/types/project";
import type { ViewMode } from "@/types/view";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/project-context";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts, isEditableTarget, isModalOpen } from "@/hooks/useKeyboardShortcuts";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { formatVersionName } from "@/lib/versions";
import { cn } from "@/lib/utils";

// The version preview shows the whole saved version, so it ignores the live
// type filters used by the editable grid.
const ALL_COMPONENT_TYPES: ReadonlySet<ComponentType> = new Set(COMPONENT_TYPES.map((meta) => meta.type));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "TB") => {
	// Create a fresh graph instance each time
	const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

	// Configure dagre for hierarchical layout
	dagreGraph.setGraph({
		rankdir: direction,
		ranksep: 150, // Vertical spacing between levels
		nodesep: 80, // Horizontal spacing between nodes (reduced from 120)
		edgesep: 20, // Edge separation
		marginx: 50, // Margin around the graph
		marginy: 50,
	});

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const newNodes = nodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		return {
			...node,
			position: {
				x: nodeWithPosition.x - nodeWidth / 2,
				y: nodeWithPosition.y - nodeHeight / 2,
			},
		};
	});

	return { nodes: newNodes, edges };
};

// Start with empty arrays to avoid loading default content
const layoutedNodes: Node[] = [];
const layoutedEdges: Edge[] = [];

const nodeTypes = {
	component: ComponentNode,
};

const edgeTypes = {
	default: SimpleDeleteEdge,
};

/**
 * Floating explanation for an ineligible connection target. Rendered inside the
 * ReactFlow wrapper so it can be positioned in screen coordinates.
 */
const ConnectionRuleTooltip = ({ hover }: { hover: { nodeId: string; reason: string } | null }) => {
	const position = useStore((state) => {
		if (!hover) return null;
		const node = state.nodeLookup.get(hover.nodeId);
		if (!node) return null;
		const [tx, ty, zoom] = state.transform;
		const width = node.measured?.width ?? 200;
		const height = node.measured?.height ?? 80;
		return {
			x: node.position.x * zoom + tx + (width * zoom) / 2,
			y: node.position.y * zoom + ty + height * zoom + 10,
		};
	});

	if (!hover || !position) return null;

	return (
		<div className="pointer-events-none absolute z-50 w-max max-w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md" style={{ left: position.x, top: position.y }} role="status">
			{hover.reason}
		</div>
	);
};

// Component for auto layout functionality
const AutoLayoutHandler = ({ autoSmartLayout, onLayout }: { autoSmartLayout: boolean; onLayout: (direction?: string) => void }) => {
	const reactFlowInstance = useReactFlow();
	const lastNodeCountRef = useRef(0);

	// Auto layout when nodes are added
	useEffect(() => {
		if (autoSmartLayout && reactFlowInstance) {
			const currentNodes = reactFlowInstance.getNodes();
			const currentCount = currentNodes.length;

			// Only trigger if nodes were added (not removed or just position changes)
			if (currentCount > lastNodeCountRef.current && currentCount > 0) {
				setTimeout(() => {
					onLayout("TB");
					// Focus on the newest node after layout
					setTimeout(() => {
						const nodes = reactFlowInstance.getNodes();
						if (nodes.length > 0) {
							// Get the most recently created node (highest timestamp in ID)
							const newestNode = nodes.reduce((newest, node) => {
								const currentId = parseInt(node.id.split("-")[1] || "0");
								const newestId = parseInt(newest.id.split("-")[1] || "0");
								return currentId > newestId ? node : newest;
							});

							// Fit view to just the new node
							reactFlowInstance.fitView({
								nodes: [newestNode],
								padding: 0.3,
								includeHiddenNodes: false,
							});
						}
					}, 100);
				}, 100);
			}

			lastNodeCountRef.current = currentCount;
		}
	}, [autoSmartLayout, reactFlowInstance, onLayout]);

	return null;
};

// Approximate size of a newly added node, used to center it on the viewport.
const NEW_NODE_WIDTH = 200;
const NEW_NODE_HEIGHT = 100;

/**
 * Registers the canvas keyboard shortcuts. Lives inside ReactFlowProvider so it
 * can place new nodes at the center of the visible canvas, matching the dock.
 */
const KeyboardShortcuts = ({ enabled, uiToggleEnabled, onAddNode, onSave, onOptimizeLayout, onShowHistory, onUndo, onRedo, onToggleUI }: { enabled: boolean; uiToggleEnabled: boolean; onAddNode: (type: ComponentType, position: { x: number; y: number }) => void; onSave: () => void; onOptimizeLayout: () => void; onShowHistory: () => void; onUndo: () => void; onRedo: () => void; onToggleUI: () => void }) => {
	const { getViewport } = useReactFlow();
	const width = useStore((state) => state.width);
	const height = useStore((state) => state.height);

	const handleAddNode = useCallback(() => {
		const { x, y, zoom } = getViewport();
		onAddNode(COMPONENT_TYPES[0].type, {
			x: (width / 2 - x) / zoom - NEW_NODE_WIDTH / 2,
			y: (height / 2 - y) / zoom - NEW_NODE_HEIGHT / 2,
		});
	}, [getViewport, width, height, onAddNode]);

	useKeyboardShortcuts(
		{
			onAddNode: handleAddNode,
			onSave,
			onOptimizeLayout,
			onShowHistory,
			onUndo,
			onRedo,
			onToggleUI,
		},
		{ enabled, uiToggleEnabled },
	);

	return null;
};

// Height the floating dock occupies at the bottom of the canvas. Fit-view
// leaves this much extra room at the bottom so nodes aren't hidden behind it.
const DOCK_CLEARANCE = 68;

// Extra breathing room (in screen pixels) added on every side when fitting the
// view, on top of the proportional padding above.
const FIT_VIEW_MARGIN_PX = 100;

/**
 * React Flow treats a numeric `padding` as a ratio of the viewport. Convert the
 * base ratio to pixels and add a fixed margin so the gutter grows by a
 * consistent amount regardless of canvas size.
 */
const getFitViewPadding = (width: number, height: number): { x: `${number}px`; y: `${number}px` } => {
	const ratioToPx = (viewport: number) => (viewport - viewport / (1 + FIT_VIEW_OPTIONS.padding)) * 0.5;
	return {
		x: `${Math.round(ratioToPx(width) + FIT_VIEW_MARGIN_PX)}px`,
		y: `${Math.round(ratioToPx(height) + FIT_VIEW_MARGIN_PX)}px`,
	};
};

/**
 * Fits the view, then nudges it up so the dock doesn't cover the content.
 * `fitView` is queued rather than applied immediately, so we wait for it to
 * land before shifting the viewport.
 */
const useFitViewWithDockOffset = (offset: number) => {
	const { fitView, getViewport, setViewport } = useReactFlow();
	const width = useStore((s) => s.width);
	const height = useStore((s) => s.height);

	return useCallback(async () => {
		await fitView({ ...FIT_VIEW_OPTIONS, padding: getFitViewPadding(width, height), duration: 0 });
		if (!offset) return;

		const { x, y, zoom } = getViewport();
		setViewport({ x, y: y - offset, zoom }, { duration: 0 });
	}, [fitView, getViewport, setViewport, offset, width, height]);
};

/**
 * React Flow's Controls, with fit-view biased upward to clear the dock. Also
 * performs the initial fit so the first view is offset the same way.
 */
const DockAwareControls = ({ dockVisible, onLockChange }: { dockVisible: boolean; onLockChange?: (locked: boolean) => void }) => {
	const fitViewWithDockOffset = useFitViewWithDockOffset(dockVisible ? DOCK_CLEARANCE : 0);
	const nodesInitialized = useStore((s) => s.nodesInitialized);
	const nodeCount = useStore((s) => s.nodes.length);
	// Mirrors the selector Controls uses internally to decide the lock icon state.
	const isInteractive = useStore((s) => s.nodesDraggable || s.nodesConnectable || s.elementsSelectable);
	const hasFitted = useRef(false);

	useEffect(() => {
		if (!nodesInitialized || nodeCount === 0 || hasFitted.current) return;
		hasFitted.current = true;
		void fitViewWithDockOffset();
	}, [nodesInitialized, nodeCount, fitViewWithDockOffset]);

	// .react-flow__controls
	return <Controls className={isInteractive ? undefined : "is-locked"} fitViewOptions={FIT_VIEW_OPTIONS} onFitView={() => void fitViewWithDockOffset()} onInteractiveChange={(interactive) => onLockChange?.(!interactive)} />;
};

export const ComponentLibraryPlanner = ({
	isSharedView = false,
	sharedProjectData = null,
}: {
	isSharedView?: boolean;
	sharedProjectData?: SharedProjectData | null;
} = {}) => {
	const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);
	const [selectedNode, setSelectedNode] = useState<Node<ComponentNodeData> | null>(null);
	// The specific grid occurrence that was clicked. A node can appear in several
	// places in the structured map, so this disambiguates which parent to show.
	const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	// The version currently being previewed in the canvas while the history
	// list stays open in the aside.
	const [previewVersion, setPreviewVersion] = useState<ProjectVersion | null>(null);
	const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
	// Restoring replaces the canvas, so it waits for confirmation first.
	const [pendingRestoreVersion, setPendingRestoreVersion] = useState<ProjectVersion | null>(null);
	const [showProjectBrowser, setShowProjectBrowser] = useState(false);
	const [isProjectInitialized, setIsProjectInitialized] = useState(false);
	// Tracks which project's data is currently on the canvas so auto-save can't
	// write the previous project's nodes into a newly selected project.
	const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
	const [autoSmartLayout, setAutoSmartLayout] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(false);
	// Mirrors the Controls lock button so canvas handlers can be disabled while locked.
	const [isCanvasLocked, setIsCanvasLocked] = useState(false);
	// Hides the properties panel, floating UI, and dock so the canvas can be
	// viewed unobstructed. Cmd+\ toggles it back.
	const [isUIHidden, setIsUIHidden] = useState(false);
	// The canvas is the free-form editor; the structured map is a table-like read
	// of the same nodes and edges.
	const [viewMode, setViewMode] = useState<ViewMode>("canvas");
	// Which node types are shown in the structured map. Kept here so the filter
	// survives switching between the canvas and the map.
	const [visibleTypes, setVisibleTypes] = useState<Set<ComponentType>>(() => new Set(COMPONENT_TYPES.map((meta) => meta.type)));
	// Tracks an in-progress canvas connection so ineligible targets can explain
	// themselves while the user drags.
	const [connectionDrag, setConnectionDrag] = useState<{ startNodeId: string; handleType: "source" | "target" } | null>(null);
	const [connectionHover, setConnectionHover] = useState<{ nodeId: string; reason: string } | null>(null);
	const { user, isAnonymous, signOut } = useAuth();
	const navigate = useNavigate();
	const isMobile = useIsMobile();

	const {
		undo,
		redo,
		reset: resetHistory,
		canUndo,
		canRedo,
	} = useUndoRedo({
		nodes,
		edges,
		setNodes,
		setEdges,
		enabled: !isSharedView && !isMobile && !isCanvasLocked,
	});

	// The selection-sync effect below runs on node changes, not view changes, so
	// it reads the current view mode from a ref. That keeps a grid selection from
	// being cleared when the user switches back to the canvas.
	const viewModeRef = useRef(viewMode);
	useEffect(() => {
		viewModeRef.current = viewMode;
	}, [viewMode]);

	// Keep the properties panel pointed at the live node object after undo/redo,
	// when the selected node is removed, or when it's deselected (Shift+click
	// toggles a node off). Position-only updates (dragging) keep the same data
	// reference, so they don't trigger an extra render. When the current node is
	// deselected but other nodes remain selected, fall back to one of them so the
	// panel doesn't go blank during a multi-selection.
	useEffect(() => {
		setSelectedNode((current) => {
			if (!current) return null;
			const next = nodes.find((node) => node.id === current.id);
			if (next?.selected) {
				return next.data === current.data ? current : (next as Node<ComponentNodeData>);
			}
			// The structured map tracks its selection separately from the node's
			// `selected` flag, so editing a property there shouldn't clear the panel.
			// Keep the live node as long as it still exists.
			if (viewModeRef.current === "tokens" && next) {
				return next.data === current.data ? current : (next as Node<ComponentNodeData>);
			}
			const fallback = nodes.find((node) => node.selected);
			return fallback ? (fallback as Node<ComponentNodeData>) : null;
		});
	}, [nodes]);

	const { currentProject, versions, versionsLoading, autoSaveEnabled, setAutoSaveEnabled, saveVersion, autoSave, loadVersion, deleteVersion } = useProject();
	const { toast } = useToast();

	// Load shared project data
	useEffect(() => {
		if (isSharedView && sharedProjectData) {
			console.log("📋 Loading shared project data:", sharedProjectData);
			const latestVersion = sharedProjectData.versions[0];
			if (latestVersion) {
				const sharedNodes = normalizeNodes(latestVersion.nodes as Node<ComponentNodeData>[]);
				const sharedEdges = normalizeEdges(latestVersion.edges);
				setNodes(sharedNodes);
				setEdges(sharedEdges);
				resetHistory({ nodes: sharedNodes, edges: sharedEdges });
			}
			setIsProjectInitialized(true);
		}
	}, [isSharedView, sharedProjectData, setNodes, setEdges, resetHistory]);

	// Check if user should see onboarding
	useEffect(() => {
		if (!isSharedView && user && isProjectInitialized) {
			const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
			if (!hasSeenOnboarding) {
				setShowOnboarding(true);
			}
		}
	}, [isSharedView, user, isProjectInitialized]);

	// Debug currentProject changes
	useEffect(() => {
		console.log("🔍 ComponentLibraryPlanner: currentProject changed:", currentProject?.name);
	}, [currentProject]);

	// Normalize existing edges: default type (for delete button) and solid lines
	useEffect(() => {
		setEdges((currentEdges) => normalizeEdges(currentEdges));
	}, [setEdges]); // Run once on mount

	// Debug logging
	console.log("🔍 ComponentLibraryPlanner state:", {
		user: !!user,
		isAnonymous,
		currentProject: !!currentProject,
		projectName: currentProject?.name,
		projectId: currentProject?.id,
		autoSaveEnabled,
		isProjectInitialized,
		versionsCount: versions.length,
	});

	// Update edge colors when node types change
	useEffect(() => {
		setEdges((currentEdges) =>
			currentEdges.map((edge) => {
				const sourceNode = nodes.find((n) => n.id === edge.source);
				const targetNode = nodes.find((n) => n.id === edge.target);

				if (sourceNode && targetNode) {
					const newColor = getEdgeColor(sourceNode.data.componentType as ComponentType, targetNode.data.componentType as ComponentType);
					return {
						...edge,
						style: { ...edge.style, stroke: newColor },
					};
				}
				return edge;
			}),
		);
	}, [nodes, setEdges]);

	const getExistingParents = useCallback(
		(nodeId: string, excludeEdgeId?: string) =>
			edges
				.filter((edge) => edge.target === nodeId && edge.id !== excludeEdgeId)
				.map((edge) => nodes.find((node) => node.id === edge.source))
				.filter((node): node is Node<ComponentNodeData> => !!node),
		[edges, nodes],
	);

	const onConnect = useCallback(
		(params: Connection) => {
			const sourceNode = nodes.find((n) => n.id === params.source);
			const targetNode = nodes.find((n) => n.id === params.target);
			if (!sourceNode || !targetNode) return;
			if (sourceNode.id === targetNode.id) return;

			const existingParents = getExistingParents(targetNode.id);
			const check = canAssignParent(targetNode as Node<ComponentNodeData>, sourceNode as Node<ComponentNodeData>, existingParents);
			if (!check.allowed) return;

			const strokeColor = getEdgeColor(sourceNode.data.componentType as ComponentType, targetNode.data.componentType as ComponentType);

			const newEdge = {
				...params,
				type: "default",
				style: { stroke: strokeColor },
			};

			setEdges((eds) => addEdge(newEdge, eds));

			// Keep the target's logical parent in sync with the new edge. Structural
			// parents win so a variant's breadcrumb stays anchored to its main component.
			const primaryParentId = getPrimaryParentId([...existingParents, sourceNode as Node<ComponentNodeData>]);
			setNodes((nds) => nds.map((node) => (node.id === targetNode.id ? { ...node, data: { ...node.data, parentId: primaryParentId } } : node)));
		},
		[nodes, getExistingParents, setEdges, setNodes],
	);

	const isValidConnection = useCallback(
		(connection: Connection | Edge) => {
			const sourceNode = nodes.find((n) => n.id === connection.source);
			const targetNode = nodes.find((n) => n.id === connection.target);
			if (!sourceNode || !targetNode) return false;
			if (sourceNode.id === targetNode.id) return false;

			return canAssignParent(targetNode as Node<ComponentNodeData>, sourceNode as Node<ComponentNodeData>, getExistingParents(targetNode.id)).allowed;
		},
		[nodes, getExistingParents],
	);

	const onConnectStart = useCallback((_: unknown, params: { nodeId: string | null; handleType: "source" | "target" | null }) => {
		if (!params.nodeId || !params.handleType) return;
		setConnectionDrag({ startNodeId: params.nodeId, handleType: params.handleType });
	}, []);

	const onConnectEnd = useCallback(() => {
		setConnectionDrag(null);
		setConnectionHover(null);
	}, []);

	const onNodeMouseEnter = useCallback(
		(_: ReactMouseEvent, node: Node) => {
			if (!connectionDrag) return;
			const startNode = nodes.find((n) => n.id === connectionDrag.startNodeId);
			if (!startNode) return;

			const parent = connectionDrag.handleType === "source" ? startNode : node;
			const child = connectionDrag.handleType === "source" ? node : startNode;
			if (parent.id === child.id) {
				setConnectionHover({ nodeId: node.id, reason: "A node can't be its own parent." });
				return;
			}

			const check = canAssignParent(child as Node<ComponentNodeData>, parent as Node<ComponentNodeData>, getExistingParents(child.id));

			setConnectionHover(check.allowed ? null : { nodeId: node.id, reason: check.reason ?? "This parent isn't allowed." });
		},
		[connectionDrag, nodes, getExistingParents],
	);

	const onNodeMouseLeave = useCallback(() => {
		setConnectionHover(null);
	}, []);

	const handleNodeSelect = useCallback((node: Node<ComponentNodeData> | null, occurrenceId: string | null = null) => {
		setSelectedNode(node);
		setSelectedOccurrenceId(node ? occurrenceId : null);
	}, []);

	const toggleVisibleType = useCallback((type: ComponentType) => {
		setVisibleTypes((current) => {
			const next = new Set(current);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	}, []);

	// Locking the canvas should also drop any existing selection so the
	// properties panel can't keep editing a node while the canvas is read-only.
	const handleCanvasLockChange = useCallback(
		(locked: boolean) => {
			setIsCanvasLocked(locked);
			if (!locked) return;
			setSelectedNode(null);
			setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
			setEdges((eds) => eds.map((e) => (e.selected ? { ...e, selected: false } : e)));
		},
		[setNodes, setEdges],
	);

	// Listen for custom nodeCreated events to update selection
	useEffect(() => {
		const handleNodeCreated = (event: CustomEvent<{ node: Node<ComponentNodeData> }>) => {
			const newNode = event.detail.node;
			setSelectedNode(newNode);
		};

		window.addEventListener("nodeCreated", handleNodeCreated as EventListener);

		return () => {
			window.removeEventListener("nodeCreated", handleNodeCreated as EventListener);
		};
	}, []);

	const addNode = useCallback(
		(type: ComponentType, position?: { x: number; y: number }) => {
			const newNode = {
				id: `node-${Date.now()}`,
				type: "component",
				position: position ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
				selected: true,
				data: {
					label: "New Component",
					componentType: type,
					description: "",
				},
			};

			setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
			setSelectedNode(newNode);
		},
		[setNodes],
	);

	const updateNodeData = useCallback(
		(nodeId: string, updates: Partial<ComponentNodeData>) => {
			setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node)));

			// Update selected node if it's the one being modified
			if (selectedNode && selectedNode.id === nodeId) {
				setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...updates } } : null));
			}
		},
		[setNodes, selectedNode],
	);

	const deleteSelectedNode = useCallback(() => {
		if (selectedNode) {
			setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
			setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
			setSelectedNode(null);
		}
	}, [selectedNode, setNodes, setEdges]);

	// Re-order a node within its token-map sibling group by moving it to the
	// target's position and assigning an explicit `order` to every sibling. The
	// canvas layout ignores this field.
	const reorderNode = useCallback(
		(siblingIds: string[], draggedId: string, targetId: string) => {
			const fromIndex = siblingIds.indexOf(draggedId);
			const toIndex = siblingIds.indexOf(targetId);
			if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

			const reordered = [...siblingIds];
			const [moved] = reordered.splice(fromIndex, 1);
			reordered.splice(toIndex, 0, moved);

			setNodes((nds) =>
				nds.map((node) => {
					const order = reordered.indexOf(node.id);
					return order === -1 ? node : { ...node, data: { ...node.data, order } };
				}),
			);
		},
		[setNodes],
	);

	const deleteEdge = useCallback(
		(edgeId: string) => {
			setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
		},
		[setEdges],
	);

	// Re-map one end of an existing connection. The token map only commits this on
	// pointer release, so the affected chip relocates once the drag is finished.
	const reconnectEdge = useCallback(
		(edgeId: string, endpoint: "source" | "target", nodeId: string) => {
			const edge = edges.find((candidate) => candidate.id === edgeId);
			if (!edge) return;

			const nextSource = endpoint === "source" ? nodeId : edge.source;
			const nextTarget = endpoint === "target" ? nodeId : edge.target;
			if (nextSource === nextTarget) return;
			if (edges.some((candidate) => candidate.id !== edgeId && candidate.source === nextSource && candidate.target === nextTarget)) return;

			const sourceNode = nodes.find((node) => node.id === nextSource);
			const targetNode = nodes.find((node) => node.id === nextTarget);
			if (!sourceNode || !targetNode) return;

			const existingParents = edges
				.filter((candidate) => candidate.id !== edgeId && candidate.target === nextTarget)
				.map((candidate) => nodes.find((node) => node.id === candidate.source))
				.filter((node): node is Node<ComponentNodeData> => !!node);

			const check = canAssignParent(targetNode as Node<ComponentNodeData>, sourceNode as Node<ComponentNodeData>, existingParents as Node<ComponentNodeData>[]);
			if (!check.allowed) return;

			const stroke = getEdgeColor(sourceNode.data.componentType as ComponentType, targetNode.data.componentType as ComponentType);

			setEdges((eds) => eds.map((candidate) => (candidate.id === edgeId ? { ...candidate, source: nextSource, target: nextTarget, style: { ...candidate.style, stroke } } : candidate)));

			// Keep the target's logical parent in sync with the new edge. Structural
			// parents win so a variant's breadcrumb stays anchored to its main component.
			const primaryParentId = getPrimaryParentId([...existingParents, sourceNode as Node<ComponentNodeData>]);
			setNodes((nds) => nds.map((node) => (node.id === nextTarget ? { ...node, data: { ...node.data, parentId: primaryParentId } } : node)));

			// Re-point the old target's breadcrumb when the edge no longer connects it
			// to the old source. The new parent was set above.
			const detachStaleParent = () => {
				const stillConnected = edges.some((candidate) => candidate.id !== edgeId && candidate.source === edge.source && candidate.target === edge.target);
				if (stillConnected) return;
				const remainingParents = edges
					.filter((candidate) => candidate.id !== edgeId && candidate.target === edge.target)
					.map((candidate) => nodes.find((node) => node.id === candidate.source))
					.filter((node): node is Node<ComponentNodeData> => !!node);
				const nextPrimaryParentId = getPrimaryParentId(remainingParents);
				setNodes((nds) => nds.map((node) => (node.id === edge.target && node.data.parentId === edge.source ? { ...node, data: { ...node.data, parentId: nextPrimaryParentId } } : node)));
			};

			if ((endpoint === "source" && edge.source !== nextSource) || (endpoint === "target" && edge.target !== nextTarget)) {
				detachStaleParent();
			}
		},
		[edges, nodes, setEdges, setNodes],
	);

	// Replace the selected node's parent connections from the properties panel.
	// The picker computes the valid set; this validates it again and rewrites the
	// incoming edges so the canvas and grid stay in sync.
	const setNodeParents = useCallback(
		(nodeId: string, parentIds: string[]) => {
			const child = nodes.find((node) => node.id === nodeId);
			if (!child) return;

			const parentNodes = parentIds.map((id) => nodes.find((node) => node.id === id)).filter((node): node is Node<ComponentNodeData> => !!node);

			const validParents: Node<ComponentNodeData>[] = [];
			for (const parent of parentNodes) {
				const check = canAssignParent(child as Node<ComponentNodeData>, parent, validParents);
				if (check.allowed) validParents.push(parent);
			}

			setEdges((eds) => {
				const withoutIncoming = eds.filter((edge) => edge.target !== nodeId);
				const newEdges = validParents.map((parent, index) => ({
					id: `edge-${Date.now()}-${index}-${parent.id}`,
					source: parent.id,
					target: nodeId,
					type: "default",
					style: { stroke: getEdgeColor(parent.data.componentType as ComponentType, child.data.componentType as ComponentType) },
				}));
				return [...withoutIncoming, ...newEdges];
			});

			const primaryParentId = getPrimaryParentId(validParents);
			setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, parentId: primaryParentId } } : node)));
		},
		[nodes, setEdges, setNodes],
	);

	const onLayout = useCallback(
		(direction = "TB") => {
			console.log("🔧 LAYOUT STARTED:", { direction, nodesCount: nodes.length, edgesCount: edges.length });

			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);

			console.log("🔧 LAYOUT RESULT:", {
				originalNodes: nodes.map((n) => ({ id: n.id, pos: n.position })),
				newNodes: layoutedNodes.map((n) => ({ id: n.id, pos: n.position })),
			});

			setNodes([...layoutedNodes]);
			setEdges([...layoutedEdges]);
		},
		[nodes, edges, setNodes, setEdges],
	);

	const cleanupLayout = useCallback(() => {
		const gridSize = 50; // Grid snap size
		const minSpacing = 200; // Minimum spacing between nodes

		setNodes((nds) => {
			// Group nodes by approximate Y position (rows)
			const tolerance = 100; // Y position tolerance for same row
			const rows: { y: number; nodes: typeof nds }[] = [];

			nds.forEach((node) => {
				const existingRow = rows.find((row) => Math.abs(row.y - node.position.y) <= tolerance);
				if (existingRow) {
					existingRow.nodes.push(node);
				} else {
					rows.push({ y: node.position.y, nodes: [node] });
				}
			});

			// Process each row separately
			return nds.map((node) => {
				const currentRow = rows.find((row) => row.nodes.includes(node))!;
				const rowNodes = currentRow.nodes.sort((a, b) => a.position.x - b.position.x);
				const nodeIndex = rowNodes.findIndex((n) => n.id === node.id);

				// Snap Y to grid and use row average
				const avgY = currentRow.nodes.reduce((sum, n) => sum + n.position.y, 0) / currentRow.nodes.length;
				const snappedY = Math.round(avgY / gridSize) * gridSize;

				// For X position, maintain order but ensure minimum spacing
				let newX = node.position.x;

				if (nodeIndex > 0) {
					const prevNode = rowNodes[nodeIndex - 1];
					const minX = prevNode.position.x + minSpacing;
					if (newX < minX) {
						newX = minX;
					}
				}

				// Snap X to grid
				newX = Math.round(newX / gridSize) * gridSize;

				return {
					...node,
					position: { x: newX, y: snappedY },
				};
			});
		});
	}, [setNodes]);

	// Handle project data loading
	const handleProjectLoaded = useCallback(
		(loadedNodes: Node[], loadedEdges: Edge[]) => {
			console.log("📋 Loading project data:", { nodesCount: loadedNodes.length, edgesCount: loadedEdges.length });
			const normalizedNodes = normalizeNodes(loadedNodes as Node<ComponentNodeData>[]);
			const normalizedEdges = normalizeEdges(loadedEdges);
			setNodes(normalizedNodes);
			setEdges(normalizedEdges);
			resetHistory({ nodes: normalizedNodes, edges: normalizedEdges });
			setLoadedProjectId(currentProject?.id ?? null);
		},
		[setNodes, setEdges, resetHistory, currentProject?.id],
	);

	const handleManualSave = useCallback(async () => {
		if (!currentProject) return;

		const versionName = `Version ${new Date().toLocaleString()}`;
		await saveVersion(currentProject.id, nodes, edges, undefined, versionName, false);
	}, [currentProject, nodes, edges, saveVersion]);

	// Restore a saved version onto the live canvas, then leave preview mode and
	// return the aside to the properties panel.
	const handleRestoreVersion = useCallback(
		async (versionId: string) => {
			setRestoringVersionId(versionId);
			try {
				const version = await loadVersion(versionId);
				if (!version) return;

				const versionNodes = normalizeNodes(version.nodes as Node<ComponentNodeData>[]);
				const versionEdges = normalizeEdges(version.edges);
				setNodes(versionNodes);
				setEdges(versionEdges);
				resetHistory({ nodes: versionNodes, edges: versionEdges });
				setPreviewVersion(null);
				setShowVersionHistory(false);
				setPendingRestoreVersion(null);
				toast({
					title: "Version restored",
					description: `"${formatVersionName(version)}" is now on the canvas.`,
				});
			} finally {
				setRestoringVersionId(null);
			}
		},
		[loadVersion, setNodes, setEdges, resetHistory, toast],
	);

	// Ask for confirmation before replacing the canvas with a saved version.
	const requestRestoreVersion = useCallback(
		(versionId: string) => {
			const version = versions.find((item) => item.id === versionId);
			if (version) setPendingRestoreVersion(version);
		},
		[versions],
	);

	const handleDeleteVersion = useCallback(
		(versionId: string) => {
			if (previewVersion?.id === versionId) {
				// Keep preview and history in sync: fall back to the next version,
				// or leave preview mode entirely when the last one is removed.
				const index = versions.findIndex((version) => version.id === versionId);
				const next = versions[index + 1] ?? versions[index - 1] ?? null;
				if (next) {
					setPreviewVersion(next);
				} else {
					setShowVersionHistory(false);
					setPreviewVersion(null);
				}
			}
			void deleteVersion(versionId);
		},
		[previewVersion?.id, versions, deleteVersion],
	);

	const handleCloseVersionHistory = useCallback(() => {
		setShowVersionHistory(false);
		setPreviewVersion(null);
	}, []);

	const handleToggleVersionHistory = useCallback(() => {
		if (showVersionHistory) {
			setShowVersionHistory(false);
			setPreviewVersion(null);
			return;
		}
		// Nothing to preview yet, so don't enter a state we can't represent.
		if (versions.length === 0 && !versionsLoading) return;
		// Entering history always previews the latest version, so the canvas is
		// never left editable while the history panel is open.
		setShowVersionHistory(true);
		setPreviewVersion(versions[0] ?? null);
	}, [showVersionHistory, versions, versionsLoading]);

	// The history panel is only meaningful while a version is previewed, so
	// selecting a version never clears the preview.
	const handlePreviewVersion = useCallback((version: ProjectVersion | null) => {
		if (version) setPreviewVersion(version);
	}, []);

	// Position of the previewed version in the history list (newest first).
	const previewVersionIndex = previewVersion ? versions.findIndex((version) => version.id === previewVersion.id) : -1;

	// Normalize once per previewed version so the read-only grid doesn't rebuild
	// its layout on every parent render.
	const previewEdges = useMemo(() => (previewVersion ? normalizeEdges(previewVersion.edges) : []), [previewVersion]);

	// Step through history: -1 moves to a newer version, +1 to an older one.
	const stepPreviewVersion = useCallback(
		(direction: -1 | 1) => {
			setPreviewVersion((current) => {
				if (!current) return current;
				const index = versions.findIndex((version) => version.id === current.id);
				if (index === -1) return current;
				const nextIndex = index + direction;
				if (nextIndex < 0 || nextIndex >= versions.length) return current;
				return versions[nextIndex];
			});
		},
		[versions],
	);

	// Arrow keys step through versions while previewing, mirroring the dock.
	useEffect(() => {
		if (!previewVersion) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
			if (isEditableTarget(event.target) || isModalOpen()) return;
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

			const index = versions.findIndex((version) => version.id === previewVersion.id);
			if (index === -1) return;

			const nextIndex = event.key === "ArrowLeft" ? index - 1 : index + 1;
			if (nextIndex < 0 || nextIndex >= versions.length) return;

			event.preventDefault();
			setPreviewVersion(versions[nextIndex]);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [previewVersion, versions]);

	// Leaving the history panel should also drop any canvas preview so the live
	// canvas comes back.
	useEffect(() => {
		if (!showVersionHistory) setPreviewVersion(null);
	}, [showVersionHistory]);

	// Keep the two modes exclusive: while history is open, always preview a
	// version. This covers versions arriving after the panel opens and a project
	// switch clearing the preview.
	useEffect(() => {
		if (!showVersionHistory || previewVersion) return;
		if (versions.length > 0) {
			setPreviewVersion(versions[0]);
		} else if (!versionsLoading) {
			setShowVersionHistory(false);
		}
	}, [showVersionHistory, previewVersion, versions, versionsLoading]);

	// The history lives in the aside, so opening it must reveal the UI even if
	// the user had hidden it.
	useEffect(() => {
		if (showVersionHistory) setIsUIHidden(false);
	}, [showVersionHistory]);

	// A project switch invalidates any preview from the previous project.
	useEffect(() => {
		setPreviewVersion(null);
	}, [currentProject?.id]);

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth");
	};

	const handleOnboardingComplete = () => {
		localStorage.setItem("hasSeenOnboarding", "true");
		setShowOnboarding(false);
	};

	const handleOnboardingSkip = () => {
		localStorage.setItem("hasSeenOnboarding", "true");
		setShowOnboarding(false);
	};

	const handleResetOnboarding = () => {
		localStorage.removeItem("hasSeenOnboarding");
		setShowOnboarding(true);
	};

	return (
		<ReactFlowProvider>
			{!isSharedView && <ProjectManager onProjectLoaded={handleProjectLoaded} onInitialized={setIsProjectInitialized} />}
			<div className="flex h-dvh flex-col bg-canvas overflow-hidden">
				{!isSharedView && <ProjectBrowser open={showProjectBrowser} onOpenChange={setShowProjectBrowser} />}

				{/* Global header shared by the canvas, the structured map, and version preview */}
				{!isUIHidden && (
					<WorkspaceHeader
						viewMode={viewMode}
						nodes={nodes as Node<ComponentNodeData>[]}
						visibleTypes={visibleTypes}
						onToggleType={toggleVisibleType}
						onSwitchToCanvas={() => setViewMode("canvas")}
						isLocked={isCanvasLocked}
						canUndo={canUndo}
						canRedo={canRedo}
						onUndo={undo}
						onRedo={redo}
						onShowHistory={handleToggleVersionHistory}
						readOnly={isSharedView}
						previewVersion={previewVersion}
						previewMode={showVersionHistory}
						projectName={currentProject?.name}
						restoringVersionId={restoringVersionId}
						onExitPreview={handleCloseVersionHistory}
						onRestoreVersion={requestRestoreVersion}
					/>
				)}

				<div className="relative flex flex-1 min-h-0">
					{/* Aside */}
					{!isSharedView && !isMobile && !isUIHidden &&
						<aside className={cn("absolute z-10 top-0 right-4 h-full w-100 flex shrink-0 flex-col gap-4 my-4 pb-4 min-h-0", showVersionHistory ? '' : '')}>
							{showVersionHistory ? (
								<VersionHistory
									projectName={currentProject?.name}
									versions={versions}
									loading={versionsLoading}
									previewVersionId={previewVersion?.id ?? null}
									onPreviewVersion={handlePreviewVersion}
									onRestoreVersion={requestRestoreVersion}
									restoringVersionId={restoringVersionId}
									onDeleteVersion={handleDeleteVersion}
									onClose={handleCloseVersionHistory}
								/>
							) : (
								<div className="flex-1 flex flex-col gap-4 pb-4">
									<PropertiesPanel selectedNode={selectedNode} selectedOccurrenceId={selectedOccurrenceId} nodes={nodes as Node<ComponentNodeData>[]} edges={edges} visibleTypes={visibleTypes} onUpdateNode={updateNodeData} onDeleteNode={deleteSelectedNode} onSetParents={setNodeParents} />
								</div>
							)}
						</aside>
					}

					<div className="flex-1 min-w-0 relative">
						{showVersionHistory ? (
							previewVersion ? (
								<>
									{viewMode === "tokens" ? (
										<GridView
											nodes={previewVersion.nodes as Node<ComponentNodeData>[]}
											edges={previewEdges}
											selectedNodeId={null}
											onNodeSelect={() => {}}
											onSwitchToCanvas={() => setViewMode("canvas")}
											isLocked
											onUndo={() => {}}
											onRedo={() => {}}
											onReorder={() => {}}
											onDeleteEdge={() => {}}
											onReconnectEdge={() => {}}
											visibleTypes={ALL_COMPONENT_TYPES}
										/>
									) : (
										<VersionPreview version={previewVersion} nodeTypes={nodeTypes} />
									)}
									{!isSharedView && !isMobile && !isUIHidden && (
										<VersionPreviewDock
											versionName={formatVersionName(previewVersion)}
											index={previewVersionIndex}
											total={versions.length}
											canGoNewer={previewVersionIndex > 0}
											canGoOlder={previewVersionIndex >= 0 && previewVersionIndex < versions.length - 1}
											onGoNewer={() => stepPreviewVersion(-1)}
											onGoOlder={() => stepPreviewVersion(1)}
											onExit={handleCloseVersionHistory}
										/>
									)}
								</>
							) : (
								<div className="absolute inset-0 bg-canvas" aria-busy="true" />
							)
						) : (
							<>
								{/* Mobile Sign-out Button */}
								{isMobile && !isSharedView && (
									<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
										<Button size="sm" variant="outline" onClick={isAnonymous ? () => navigate("/auth") : handleSignOut} className="bg-background/80 backdrop-blur-sm border shadow-lg">
											<LogOut className="size-4 mr-2" />
											{isAnonymous ? "Sign In" : "Sign Out"}
										</Button>
									</div>
								)}

								{viewMode === "canvas" ? (
									<ReactFlow
										nodes={nodes}
										edges={edges}
										onNodesChange={isSharedView || isMobile ? undefined : onNodesChange}
										onEdgesChange={isSharedView || isMobile ? undefined : onEdgesChange}
										onConnect={isSharedView || isMobile || isCanvasLocked ? undefined : onConnect}
										onConnectStart={isSharedView || isMobile || isCanvasLocked ? undefined : onConnectStart}
										onConnectEnd={isSharedView || isMobile || isCanvasLocked ? undefined : onConnectEnd}
										onNodeMouseEnter={isSharedView || isMobile || isCanvasLocked ? undefined : onNodeMouseEnter}
										onNodeMouseLeave={isSharedView || isMobile || isCanvasLocked ? undefined : onNodeMouseLeave}
										isValidConnection={isSharedView || isMobile || isCanvasLocked ? undefined : isValidConnection}
										nodeTypes={nodeTypes}
										edgeTypes={edgeTypes}
										onNodeClick={isSharedView || isMobile || isCanvasLocked ? undefined : (_, node) => handleNodeSelect(node as Node<ComponentNodeData>)}
										onPaneClick={isSharedView || isMobile || isCanvasLocked ? undefined : () => handleNodeSelect(null)}
										nodesDraggable={!isSharedView && !isMobile && !isCanvasLocked}
										nodesConnectable={!isSharedView && !isMobile && !isCanvasLocked}
										elementsSelectable={!isSharedView && !isMobile && !isCanvasLocked}
										multiSelectionKeyCode="Shift"
										// Figma-style navigation: plain drag marquee-selects, two-finger
										// scroll pans, pinch zooms, and middle-mouse (or Space) drags pan.
										selectionKeyCode={null}
										selectionOnDrag
										selectionMode={SelectionMode.Partial}
										panOnDrag={[1]}
										panOnScroll
										minZoom={MIN_ZOOM}
										fitViewOptions={FIT_VIEW_OPTIONS}
										className="relative bg-canvas overflow-hidden"
									>
										<Background className="[&>*]:!stroke-border" gap={16} />
										<ConnectionRuleTooltip hover={connectionHover} />
										{!isUIHidden && (
											<div id="floating-ui" className="z-10 absolute left-4 top-4 flex flex-col gap-4">
												<ConnectionLegend />
												<MiniMap className="minimap max-lg:hidden relative m-0 border border-border rounded-xl [&>svg]:bg-card overflow-hidden" nodeColor={(node) => getComponentColor((node.data as ComponentNodeData).componentType)} />
												<DockAwareControls dockVisible={!isSharedView && !isMobile} onLockChange={handleCanvasLockChange} />
											</div>
										)}
										{/* Auto layout handler */}
										<AutoLayoutHandler autoSmartLayout={autoSmartLayout} onLayout={onLayout} />
										{/* Keyboard shortcuts */}
										<KeyboardShortcuts enabled={!isSharedView && !isMobile && !isCanvasLocked && !showOnboarding} uiToggleEnabled={!isSharedView && !isMobile && !showOnboarding} onAddNode={addNode} onSave={handleManualSave} onOptimizeLayout={() => onLayout("TB")} onShowHistory={handleToggleVersionHistory} onUndo={undo} onRedo={redo} onToggleUI={() => setIsUIHidden((hidden) => !hidden)} />
									</ReactFlow>
								) : (
									<GridView nodes={nodes as Node<ComponentNodeData>[]} edges={edges} selectedNodeId={selectedNode?.id ?? null} onNodeSelect={handleNodeSelect} onSwitchToCanvas={() => setViewMode("canvas")} isLocked={isCanvasLocked} onUndo={undo} onRedo={redo} onReorder={reorderNode} onDeleteEdge={deleteEdge} onReconnectEdge={reconnectEdge} visibleTypes={visibleTypes} />
								)}

								{/* Primary navigation: floating dock with add, layout, view, project, and account menus */}
								{!isSharedView &&
									!isMobile &&
									(isUIHidden ? (
										<button
											type="button"
											onPointerDown={(event) => event.stopPropagation()}
											onClick={(event) => {
												event.stopPropagation();
												setIsUIHidden(false);
											}}
											className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<span>Press</span>
											<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-display text-foreground">
												⌘<span className="px-1 text-muted-foreground">+</span>\
											</kbd>
											<span>to show UI</span>
										</button>
									) : (
										<NodeDock onAddNode={addNode} onSmartLayout={() => onLayout("TB")} onCleanupLayout={cleanupLayout} autoSmartLayout={autoSmartLayout} onToggleAutoSmartLayout={() => setAutoSmartLayout(!autoSmartLayout)} onToggleUI={() => setIsUIHidden(true)} viewMode={viewMode} onViewModeChange={setViewMode} isLocked={isCanvasLocked} onToggleLock={() => handleCanvasLockChange(!isCanvasLocked)} user={user} isAnonymous={isAnonymous} currentProject={currentProject} onSave={handleManualSave} onShowVersions={handleToggleVersionHistory} onShowProjects={() => setShowProjectBrowser(true)} autoSaveEnabled={autoSaveEnabled} onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)} onSignOut={handleSignOut} onNavigateToAuth={() => navigate("/auth")} onResetOnboarding={handleResetOnboarding} />
									))}
								{/* Auto-save handler that needs ReactFlow context - only for authenticated users */}
								{user && !isAnonymous && currentProject && !isSharedView && <AutoSaveHandler currentProject={currentProject} autoSaveEnabled={autoSaveEnabled} isInitialized={isProjectInitialized && loadedProjectId === currentProject?.id} nodes={nodes} edges={edges} onAutoSave={autoSave} />}
								</>
							)}
					</div>
				</div>
			</div>

			{/* Restore confirmation */}
			<AlertDialog
				open={!!pendingRestoreVersion}
				onOpenChange={(open) => {
					if (!open) setPendingRestoreVersion(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Restore this version?</AlertDialogTitle>
						<AlertDialogDescription>This replaces the current canvas with {pendingRestoreVersion ? `"${formatVersionName(pendingRestoreVersion)}"` : "this version"}. Any unsaved changes will be lost.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!pendingRestoreVersion) return;
								const versionId = pendingRestoreVersion.id;
								setPendingRestoreVersion(null);
								void handleRestoreVersion(versionId);
							}}
						>
							Restore version
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Onboarding Flow */}
			{showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />}
		</ReactFlowProvider>
	);
};
