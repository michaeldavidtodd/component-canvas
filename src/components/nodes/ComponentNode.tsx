import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow, useStore, NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { ComponentType, ComponentNodeData } from "@/types/component";
import { Plus, ExternalLink } from "lucide-react";
import { getComponentBgClass, getComponentBorderClass, getComponentIcon, getComponentTextClass, getEdgeColor } from "@/lib/componentTypes";

export const ComponentNode = memo(({ data, selected, id, selectable, isConnectable }: NodeProps<Node<ComponentNodeData>>) => {
	const [hoveredSide, setHoveredSide] = useState<"top" | "bottom" | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout>();
	const { setNodes, setEdges, getNodes, getEdges } = useReactFlow();

	// The canvas lock (Controls) clears `selectable`, so treat that as read-only.
	const isLocked = !selectable;

	useEffect(() => {
		if (isLocked) setHoveredSide(null);
	}, [isLocked]);

	// Get the current node to access its style (width)
	const currentNode = useStore((s) => s.nodeLookup.get(id));
	const nodeWidth = currentNode?.style?.width || 200;

	const NodeIcon = getComponentIcon(data.componentType);

	const addNode = useCallback(
		(side: "top" | "bottom") => {
			console.log("ADD NODE CALLED!", side);
			const nodes = getNodes();
			const edges = getEdges();
			const currentNode = nodes.find((n) => n.id === id);

			if (!currentNode) return;

			// Generate new node ID
			const newId = `node-${Date.now()}`;

			// Calculate position based on side
			const offsetY = side === "top" ? -150 : 150;
			const newPosition = {
				x: currentNode.position.x,
				y: currentNode.position.y + offsetY,
			};

			// Create new node with selected: true and proper dimensions
			const newNode = {
				id: newId,
				type: "component",
				position: newPosition,
				selected: true,
				style: { width: 200, height: 80 },
				data: {
					label: "New Component",
					componentType: "main-component" as ComponentType,
					description: "A new component",
				},
			};

			// Use same color logic as onConnect
			const currentType = currentNode.data.componentType as ComponentType;
			const newType = "main-component" as ComponentType;
			const strokeColor = getEdgeColor(currentType, newType);

			// Create new edge
			const newEdge = {
				id: `edge-${Date.now()}`,
				source: side === "top" ? newId : currentNode.id,
				target: side === "top" ? currentNode.id : newId,
				type: "default",
				style: { stroke: strokeColor },
			};

			// Deselect all existing nodes and add the new selected node
			setNodes((nodes) => [...nodes.map((n) => ({ ...n, selected: false })), newNode]);
			setEdges((edges) => [...edges, newEdge]);

			// Dispatch custom event to notify parent component of selection
			setTimeout(() => {
				window.dispatchEvent(
					new CustomEvent("nodeCreated", {
						detail: { node: newNode },
					}),
				);
			}, 0);
		},
		[id, setNodes, setEdges, getNodes, getEdges],
	);

	const handleMouseEnter = (side: "top" | "bottom") => {
		if (isLocked) return;
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setHoveredSide(side);
	};

	const handleMouseLeave = () => {
		timeoutRef.current = setTimeout(() => {
			setHoveredSide(null);
		}, 150);
	};

	return (
		<div
			className={` relative bg-workspace border-2 rounded-lg shadow-md p-3
      	${selected ? getComponentBorderClass(data.componentType) : "border-border"}
       	transition-all duration-200 group`}
		>
			<NodeResizer minWidth={160} minHeight={80} isVisible={selected && !isLocked} keepAspectRatio={false} />
			{/* Top handle with add button */}
			<div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center" onMouseEnter={() => handleMouseEnter("top")} onMouseLeave={handleMouseLeave}>
				<Handle type="target" position={Position.Top} isConnectable={isConnectable} className={`!w-3 !h-3 !bg-border${isConnectable ? " hover:!bg-primary" : ""}`} />
				{!isLocked && hoveredSide === "top" && (
					<div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-8 w-8 h-8 flex items-center justify-center" onMouseEnter={() => handleMouseEnter("top")} onMouseLeave={handleMouseLeave}>
						<button
							className="w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
							onClick={(e) => {
								e.stopPropagation();
								console.log("BUTTON CLICKED TOP!");
								addNode("top");
							}}
							aria-label="Add node above"
						>
							<Plus className="w-3 h-3" />
						</button>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-2 mb-2">
				<div className="flex flex-row justify-between gap-2 items-center">
					<p className={`text-[12px] capitalize ${getComponentTextClass(data.componentType)}`}>{data.componentType.replace("-", " ")}</p>
					<div className={`p-1 gap-1 rounded-md flex items-center text-background ${getComponentBgClass(data.componentType)}`}>
						<NodeIcon className="size-3" />
					</div>
				</div>
				<h3 className="font-medium text-sm text-foreground leading-tight break-words">{data.label}</h3>
				{/* Figma Link Button for main components */}
				{data.componentType === "main-component" && data.url && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							window.open(data.url, "_blank", "noopener,noreferrer");
						}}
						disabled={isLocked}
						className={`p-1.5 rounded-md bg-primary/10 text-primary transition-colors${isLocked ? " opacity-50 cursor-not-allowed" : " hover:bg-primary/20"}`}
						title="Open in Figma"
					>
						<ExternalLink className="w-3 h-3" />
					</button>
				)}
			</div>

			{data.description && <p className="text-xs text-muted-foreground break-words">{data.description}</p>}

			{data.componentType === "token" && data.tokenType && (
				<div className="flex mt-2 pt-1 border-t-2 border-muted-foreground/10 text-xs text-muted-foreground break-words">
					<span>{data.tokenType}</span>
					{data.tokenSubType && <span className="ml-1">• {data.tokenSubType}</span>}
				</div>
			)}

			{/* Bottom handle with add button */}
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-8 h-8 flex items-center justify-center" onMouseEnter={() => handleMouseEnter("bottom")} onMouseLeave={handleMouseLeave}>
				<Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className={`!w-3 !h-3 !bg-border${isConnectable ? " hover:!bg-primary" : ""}`} />
				{!isLocked && hoveredSide === "bottom" && (
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 w-8 h-8 flex items-center justify-center" onMouseEnter={() => handleMouseEnter("bottom")} onMouseLeave={handleMouseLeave}>
						<button
							className="w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full flex items-center justify-center shadow-lg transition-colors z-50"
							onClick={(e) => {
								e.stopPropagation();
								console.log("BUTTON CLICKED BOTTOM!");
								addNode("bottom");
							}}
							aria-label="Add node below"
						>
							<Plus className="w-3 h-3" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
});
