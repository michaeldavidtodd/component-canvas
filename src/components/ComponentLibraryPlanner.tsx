import { useCallback, useState, useEffect, useRef } from "react";
import { ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, addEdge, Connection, Edge, Background, Controls, MiniMap, Node, useReactFlow, useStore } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { ComponentNode } from "./nodes/ComponentNode";
import SimpleDeleteEdge from "./edges/SimpleDeleteEdge";
import { NodeDock } from "./NodeDock";

import { PropertiesPanel } from "./PropertiesPanel";
import { ConnectionLegend } from "./ConnectionLegend";
import { VersionHistory } from "./VersionHistory";
import { AutoSaveHandler } from "./AutoSaveHandler";
import { ProjectManager } from "./ProjectManager";
import { OnboardingFlow } from "./OnboardingFlow";
import { ComponentNodeData, ComponentType } from "@/types/component";
import { CONNECTION_TYPES, getComponentColor, getEdgeColor } from "@/lib/componentTypes";
import type { SharedProjectData } from "@/types/project";
import { useAuth } from "@/hooks/useAuth";
import { useProjectPersistence } from "@/hooks/useProjectPersistence";
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
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const [isProjectInitialized, setIsProjectInitialized] = useState(false);
	const [autoSmartLayout, setAutoSmartLayout] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(false);
	// Mirrors the Controls lock button so canvas handlers can be disabled while locked.
	const [isCanvasLocked, setIsCanvasLocked] = useState(false);
	const { user, isAnonymous, signOut } = useAuth();
	const navigate = useNavigate();
	const isMobile = useIsMobile();

	const { currentProject, projects, versions, loading, autoSaveEnabled, setCurrentProject, setAutoSaveEnabled, saveVersion, autoSave, loadVersion } = useProjectPersistence();

	// Force set currentProject if we have projects but no currentProject
	useEffect(() => {
		if (!currentProject && projects.length > 0 && user && !isAnonymous && !isSharedView) {
			console.log("🔧 ComponentLibraryPlanner: Force setting currentProject to:", projects[0]);
			setCurrentProject(projects[0]);
		}
	}, [projects, currentProject, user, isAnonymous, setCurrentProject, isSharedView]);

	// Load shared project data
	useEffect(() => {
		if (isSharedView && sharedProjectData) {
			console.log("📋 Loading shared project data:", sharedProjectData);
			const latestVersion = sharedProjectData.versions[0];
			if (latestVersion) {
				setNodes(latestVersion.nodes as Node<ComponentNodeData>[]);
				setEdges(latestVersion.edges);
			}
			setIsProjectInitialized(true);
		}
	}, [isSharedView, sharedProjectData, setNodes, setEdges]);

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

	// Update existing edges to use default type (for delete button functionality)
	useEffect(() => {
		setEdges((currentEdges) =>
			currentEdges.map((edge) => ({
				...edge,
				type: "default",
			})),
		);
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

	const onConnect = useCallback(
		(params: Connection) => {
			const sourceNode = nodes.find((n) => n.id === params.source);
			const targetNode = nodes.find((n) => n.id === params.target);

			const strokeColor =
				sourceNode && targetNode ? getEdgeColor(sourceNode.data.componentType as ComponentType, targetNode.data.componentType as ComponentType) : CONNECTION_TYPES.default.stroke;

			const newEdge = {
				...params,
				type: "default",
				animated: true,
				style: { stroke: strokeColor },
			};

			setEdges((eds) => addEdge(newEdge, eds));

			// Persist the logical parent so the variant can be detached from the canvas later.
			if (sourceNode?.data.componentType === "main-component" && params.target) {
				setNodes((nds) =>
					nds.map((node) =>
						node.id === params.target && node.data.componentType === "variant" ? { ...node, data: { ...node.data, parentId: params.source } } : node,
					),
				);
			}
		},
		[nodes, setEdges, setNodes],
	);

	const handleNodeSelect = useCallback((node: Node<ComponentNodeData> | null) => {
		setSelectedNode(node);
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
			setNodes(loadedNodes);
			setEdges(loadedEdges);
		},
		[setNodes, setEdges],
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
					<VersionHistory
						open={showVersionHistory}
						onOpenChange={setShowVersionHistory}
						versions={versions}
						onLoadVersion={loadVersion}
						onVersionLoaded={(version) => {
							setNodes(version.nodes as Node<ComponentNodeData>[]);
							setEdges(version.edges);
						}}
						nodeTypes={nodeTypes}
					/>
				)}

				{/* Aside */}
				{!isSharedView && !isMobile && (
					<aside className="flex flex-col gap-4 w-80 m-2 xl:m-4">
						<header>
							<h2 className="text-sm font-semibold text-foreground mb-2 leading-tight font-display">Component Canvas</h2>
							<p className="text-xs text-muted-foreground">Design and visualize your component structure</p>
						</header>
						<Badge variant="default" className="md:hidden mt-4">
							Read-only on mobile
						</Badge>
						<PropertiesPanel selectedNode={selectedNode} nodes={nodes as Node<ComponentNodeData>[]} edges={edges} onUpdateNode={updateNodeData} onDeleteNode={deleteSelectedNode} />
					</aside>
				)}

				<div className="flex-1 relative">
					{/* Mobile Sign-out Button */}
					{isMobile && !isSharedView && (
						<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
							<Button size="sm" variant="outline" onClick={isAnonymous ? () => navigate("/auth") : handleSignOut} className="bg-background/80 backdrop-blur-sm border shadow-lg">
								<LogOut className="h-4 w-4 mr-2" />
								{isAnonymous ? "Sign In" : "Sign Out"}
							</Button>
						</div>
					)}

					<ReactFlow nodes={nodes} edges={edges} onNodesChange={isSharedView || isMobile ? undefined : onNodesChange} onEdgesChange={isSharedView || isMobile ? undefined : onEdgesChange} onConnect={isSharedView || isMobile || isCanvasLocked ? undefined : onConnect} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodeClick={isSharedView || isMobile || isCanvasLocked ? undefined : (_, node) => handleNodeSelect(node as Node<ComponentNodeData>)} onPaneClick={isSharedView || isMobile || isCanvasLocked ? undefined : () => handleNodeSelect(null)} nodesDraggable={!isSharedView && !isMobile} nodesConnectable={!isSharedView && !isMobile} elementsSelectable={!isSharedView && !isMobile} fitViewOptions={FIT_VIEW_OPTIONS} className="relative bg-canvas overflow-hidden md:border-l">
						<Background className="[&>*]:!stroke-border" gap={16} />
						<div className="z-10 absolute right-4 top-4 flex flex-col justify-end items-end gap-4">
							<ConnectionLegend />
							<MiniMap
								className="minimap max-lg:hidden relative m-0 border border-border rounded-xl [&>svg]:bg-card overflow-hidden"
								nodeColor={(node) => getComponentColor((node.data as ComponentNodeData).componentType)}
							/>
							<DockAwareControls dockVisible={!isSharedView && !isMobile} onLockChange={handleCanvasLockChange} />
						</div>
						{/* Primary navigation: floating dock with add, layout, project, and account menus */}
						{!isSharedView && !isMobile && <NodeDock onAddNode={addNode} onSmartLayout={() => onLayout("TB")} onCleanupLayout={cleanupLayout} autoSmartLayout={autoSmartLayout} onToggleAutoSmartLayout={() => setAutoSmartLayout(!autoSmartLayout)} user={user} isAnonymous={isAnonymous} currentProject={currentProject} onProjectUpdate={(updatedProject) => setCurrentProject(updatedProject)} onSave={handleManualSave} onShowVersions={() => setShowVersionHistory(true)} autoSaveEnabled={autoSaveEnabled} onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)} onSignOut={handleSignOut} onNavigateToAuth={() => navigate("/auth")} onResetOnboarding={handleResetOnboarding} />}
						{/* Auto-save handler that needs ReactFlow context - only for authenticated users */}
						{user && !isAnonymous && currentProject && !isSharedView && <AutoSaveHandler currentProject={currentProject} autoSaveEnabled={autoSaveEnabled} isInitialized={isProjectInitialized} nodes={nodes} edges={edges} onAutoSave={autoSave} />}
						{/* Auto layout handler */}
						<AutoLayoutHandler autoSmartLayout={autoSmartLayout} onLayout={onLayout} />
					</ReactFlow>
				</div>
			</div>

			{/* Onboarding Flow */}
			{showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />}
		</ReactFlowProvider>
	);
};
