import { useCallback, useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, addEdge, Connection, Edge, Background, Controls, MiniMap, Node, SelectionMode, useReactFlow, useStore } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { ComponentNode } from "./nodes/ComponentNode";
import SimpleDeleteEdge from "./edges/SimpleDeleteEdge";
import { NodeDock } from "./NodeDock";
import { GridView } from "./GridView";

import { PropertiesPanel } from "./PropertiesPanel";
import { ConnectionLegend } from "./ConnectionLegend";
import { VersionHistory } from "@/components/VersionHistory";
import { ProjectBrowser } from "@/components/ProjectBrowser";
import { AutoSaveHandler } from "./AutoSaveHandler";
import { ProjectManager } from "./ProjectManager";
import { OnboardingFlow } from "./OnboardingFlow";
import { ComponentNodeData, ComponentType } from "@/types/component";
import { COMPONENT_TYPES, CONNECTION_TYPES, getComponentColor, getEdgeColor } from "@/lib/componentTypes";
import { normalizeEdges } from "@/lib/edges";
import { normalizeNodes } from "@/lib/nodes";
import { canAssignParent, getPrimaryParentId } from "@/lib/parentRules";
import type { SharedProjectData } from "@/types/project";
import type { ViewMode } from "@/types/view";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from '@/hooks/project-context';
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
		<div
			className="pointer-events-none absolute z-50 w-max max-w-64 -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
			style={{ left: position.x, top: position.y }}
			role="status"
		>
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
const KeyboardShortcuts = ({
	enabled,
	uiToggleEnabled,
	onAddNode,
	onSave,
	onOptimizeLayout,
	onShowHistory,
	onUndo,
	onRedo,
	onToggleUI,
}: {
	enabled: boolean;
	uiToggleEnabled: boolean;
	onAddNode: (type: ComponentType, position: { x: number; y: number }) => void;
	onSave: () => void;
	onOptimizeLayout: () => void;
	onShowHistory: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onToggleUI: () => void;
}) => {
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

const FIT_VIEW_OPTIONS = {
	padding: 0.2,
	includeHiddenNodes: false,
	minZoom: 0.5,
	maxZoom: 2,
};

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
	return (
		<Controls
			className={isInteractive ? undefined : "is-locked"}
			fitViewOptions={FIT_VIEW_OPTIONS}
			onFitView={() => void fitViewWithDockOffset()}
			onInteractiveChange={(interactive) => onLockChange?.(!interactive)}
		/>
	);
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

	const { undo, redo, reset: resetHistory, canUndo, canRedo } = useUndoRedo({
		nodes,
		edges,
		setNodes,
		setEdges,
		enabled: !isSharedView && !isMobile && !isCanvasLocked,
	});

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
			const fallback = nodes.find((node) => node.selected);
			return fallback ? (fallback as Node<ComponentNodeData>) : null;
		});
	}, [nodes]);

	const { currentProject, versions, autoSaveEnabled, setAutoSaveEnabled, saveVersion, autoSave, loadVersion } = useProject();

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

			return canAssignParent(
				targetNode as Node<ComponentNodeData>,
				sourceNode as Node<ComponentNodeData>,
				getExistingParents(targetNode.id),
			).allowed;
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

			const check = canAssignParent(
				child as Node<ComponentNodeData>,
				parent as Node<ComponentNodeData>,
				getExistingParents(child.id),
			);

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

			const check = canAssignParent(
				targetNode as Node<ComponentNodeData>,
				sourceNode as Node<ComponentNodeData>,
				existingParents as Node<ComponentNodeData>[],
			);
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
				setNodes((nds) =>
					nds.map((node) => (node.id === edge.target && node.data.parentId === edge.source ? { ...node, data: { ...node.data, parentId: nextPrimaryParentId } } : node)),
				);
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

			const parentNodes = parentIds
				.map((id) => nodes.find((node) => node.id === id))
				.filter((node): node is Node<ComponentNodeData> => !!node);

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
			<div className="flex h-dvh bg-canvas">
				{!isSharedView && (
					<>
						<ProjectBrowser open={showProjectBrowser} onOpenChange={setShowProjectBrowser} />

						<VersionHistory
							open={showVersionHistory}
							onOpenChange={setShowVersionHistory}
							projectName={currentProject?.name}
							versions={versions}
							onLoadVersion={loadVersion}
							onVersionLoaded={(version) => {
								const versionNodes = normalizeNodes(version.nodes as Node<ComponentNodeData>[]);
								const versionEdges = normalizeEdges(version.edges);
								setNodes(versionNodes);
								setEdges(versionEdges);
								resetHistory({ nodes: versionNodes, edges: versionEdges });
							}}
							nodeTypes={nodeTypes}
						/>
					</>
				)}

				{/* Aside */}
				{!isSharedView && !isMobile && !isUIHidden && (
					<aside className="flex shrink-0 flex-col gap-4 w-80 m-2 xl:m-4">
						<header>
							<h2 className="text-sm font-semibold text-foreground mb-2 leading-tight font-display">{viewMode === "canvas" ? "Component Canvas" : "Structured Map"}</h2>
							<p className="text-xs text-muted-foreground">{viewMode === "canvas" ? "Design and visualize your component structure" : "Inspect and edit the selected node"}</p>
						</header>
						<Badge variant="default" className="md:hidden mt-4">
							Read-only on mobile
						</Badge>
						<PropertiesPanel selectedNode={selectedNode} selectedOccurrenceId={selectedOccurrenceId} nodes={nodes as Node<ComponentNodeData>[]} edges={edges} visibleTypes={visibleTypes} onUpdateNode={updateNodeData} onDeleteNode={deleteSelectedNode} onSetParents={setNodeParents} />
					</aside>
				)}

				<div className="flex-1 min-w-0 relative">
					{/* Mobile Sign-out Button */}
					{isMobile && !isSharedView && (
						<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
							<Button size="sm" variant="outline" onClick={isAnonymous ? () => navigate("/auth") : handleSignOut} className="bg-background/80 backdrop-blur-sm border shadow-lg">
								<LogOut className="h-4 w-4 mr-2" />
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
							selectionKeyCode="Shift"
							selectionMode={SelectionMode.Partial}
							fitViewOptions={FIT_VIEW_OPTIONS}
							className="relative bg-canvas overflow-hidden md:border-l"
						>
							<Background className="[&>*]:!stroke-border" gap={16} />
							<ConnectionRuleTooltip hover={connectionHover} />
							{!isUIHidden && (
								<div id="floating-ui" className="z-10 absolute right-4 top-4 flex flex-col justify-end items-end gap-4">
									<ConnectionLegend />
									<MiniMap
										className="minimap max-lg:hidden relative m-0 border border-border rounded-xl [&>svg]:bg-card overflow-hidden"
										nodeColor={(node) => getComponentColor((node.data as ComponentNodeData).componentType)}
									/>
									<DockAwareControls dockVisible={!isSharedView && !isMobile} onLockChange={handleCanvasLockChange} />
								</div>
							)}
							{/* Auto layout handler */}
							<AutoLayoutHandler autoSmartLayout={autoSmartLayout} onLayout={onLayout} />
							{/* Keyboard shortcuts */}
							<KeyboardShortcuts
								enabled={!isSharedView && !isMobile && !isCanvasLocked && !showOnboarding}
								uiToggleEnabled={!isSharedView && !isMobile && !showOnboarding}
								onAddNode={addNode}
								onSave={handleManualSave}
								onOptimizeLayout={() => onLayout("TB")}
								onShowHistory={() => setShowVersionHistory(true)}
								onUndo={undo}
								onRedo={redo}
								onToggleUI={() => setIsUIHidden((hidden) => !hidden)}
							/>
						</ReactFlow>
					) : (
						<GridView
							nodes={nodes as Node<ComponentNodeData>[]}
							edges={edges}
							selectedNodeId={selectedNode?.id ?? null}
							onNodeSelect={handleNodeSelect}
							onSwitchToCanvas={() => setViewMode("canvas")}
							isLocked={isCanvasLocked}
							onUndo={undo}
							onRedo={redo}
							canUndo={canUndo}
							canRedo={canRedo}
							onReorder={reorderNode}
							onDeleteEdge={deleteEdge}
							onReconnectEdge={reconnectEdge}
							visibleTypes={visibleTypes}
							onToggleType={toggleVisibleType}
						/>
					)}

					{/* Primary navigation: floating dock with add, layout, view, project, and account menus */}
					{!isSharedView && !isMobile && (isUIHidden ? (
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
							<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-display text-foreground">⌘<span className="px-1 text-muted-foreground">+</span>\</kbd>
							<span>to show UI</span>
						</button>
					) : (
						<NodeDock onAddNode={addNode} onSmartLayout={() => onLayout("TB")} onCleanupLayout={cleanupLayout} autoSmartLayout={autoSmartLayout} onToggleAutoSmartLayout={() => setAutoSmartLayout(!autoSmartLayout)} onToggleUI={() => setIsUIHidden(true)} viewMode={viewMode} onViewModeChange={setViewMode} isLocked={isCanvasLocked} onToggleLock={() => handleCanvasLockChange(!isCanvasLocked)} user={user} isAnonymous={isAnonymous} currentProject={currentProject} onSave={handleManualSave} onShowVersions={() => setShowVersionHistory(true)} onShowProjects={() => setShowProjectBrowser(true)} autoSaveEnabled={autoSaveEnabled} onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)} onSignOut={handleSignOut} onNavigateToAuth={() => navigate("/auth")} onResetOnboarding={handleResetOnboarding} />
					))}
					{/* Auto-save handler that needs ReactFlow context - only for authenticated users */}
					{user && !isAnonymous && currentProject && !isSharedView && <AutoSaveHandler currentProject={currentProject} autoSaveEnabled={autoSaveEnabled} isInitialized={isProjectInitialized && loadedProjectId === currentProject?.id} nodes={nodes} edges={edges} onAutoSave={autoSave} />}
				</div>
			</div>

			{/* Onboarding Flow */}
			{showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />}
		</ReactFlowProvider>
	);
};
