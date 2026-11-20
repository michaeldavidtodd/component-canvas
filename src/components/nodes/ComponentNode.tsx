import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow, useStore, NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { ComponentType, ComponentNodeData } from "@/types/component";
import { Plus, ExternalLink } from "lucide-react";
import { getComponentBgClass, getComponentBorderClass, getComponentIcon, getComponentTextClass, getEdgeColor } from "@/lib/componentTypes";
import { formatTokenValue, getDefaultTokenFormat, isAliasToken, isColorToken, toCssColor } from "@/lib/tokenValues";
import { EMPTY_TITLE_LAYERS, getAncestorChain, titleLayersEqual, type TitleLayer } from "@/lib/nodeHierarchy";

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

	// Variants and sub-components show their structural ancestors as a breadcrumb title.
	const showsAncestorChain = data.componentType === "variant" || data.componentType === "sub-component";
	const ancestorChain = useStore((s) => (showsAncestorChain ? getAncestorChain(id, s.nodeLookup, s.edges) : EMPTY_TITLE_LAYERS), titleLayersEqual);
	const titleLayers: TitleLayer[] | null =
		showsAncestorChain && ancestorChain.length > 0 ? [...ancestorChain, { id, label: data.label, componentType: data.componentType }] : null;

	// Highlight variants whose parent is the currently selected main component.
	const selectedMainComponentId = useStore((s) => {
		const selectedMain = s.nodes.find((node) => node.selected && (node.data as ComponentNodeData).componentType === "main-component");
		return selectedMain?.id;
	});
	const immediateParentId = ancestorChain[ancestorChain.length - 1]?.id;
	const isChildOfSelectedMain = data.componentType === "variant" && selectedMainComponentId !== undefined && immediateParentId === selectedMainComponentId;

	const NodeIcon = getComponentIcon(data.componentType);

	// Fall back to the token type's default notation for nodes saved before formats existed.
	const tokenFormat = data.tokenFormat ?? (data.tokenType ? getDefaultTokenFormat(data.tokenType) : undefined);
	const tokenIsAlias = isAliasToken(data.tokenKind);
	const tokenValueLabel = tokenIsAlias ? data.tokenAlias : data.tokenValue ? formatTokenValue(data.tokenValue, tokenFormat) : undefined;

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

			// Deselect all existing nodes and add the new selected node.
			// When a new parent is added above a variant, persist the relationship.
			setNodes((nodes) => [
				...nodes.map((n) => {
					const updated = { ...n, selected: false };
					if (side === "top" && n.id === currentNode.id && currentType === "variant") {
						return { ...updated, data: { ...n.data, parentId: newId } };
					}
					return updated;
				}),
				newNode,
			]);
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
			data-highlighted={isChildOfSelectedMain || undefined}
			className={` relative bg-workspace border-2 rounded-lg shadow-md p-3
      	${selected ? getComponentBorderClass(data.componentType) : isChildOfSelectedMain ? "border-component-main ring-2 ring-component-main" : "border-border"}
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
				<h3 className="font-medium text-sm text-foreground leading-tight break-words">
					{titleLayers ? (
						<span className="flex flex-wrap items-baseline gap-x-1">
							{titleLayers.map((layer, index) => {
								const isLast = index === titleLayers.length - 1;
								return (
									<span
										key={layer.id}
										className={`title-layer inline-flex min-w-0 items-baseline gap-1 ${isLast ? "text-foreground" : "text-muted-foreground"}`}
										data-depth={index}
										data-component-type={layer.componentType}
										data-current={isLast}
									>
										<span className="title-layer-label break-words">{layer.label}</span>
										{!isLast && (
											<span className="title-layer-separator text-muted-foreground/60" aria-hidden="true">
												/
											</span>
										)}
									</span>
								);
							})}
						</span>
					) : (
						data.label
					)}
				</h3>
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
				<div className="mt-2 pt-1 border-t-2 border-muted-foreground/10 text-xs text-muted-foreground">
					<div className="flex items-center justify-between gap-2">
						<span className="min-w-0 truncate">
							{data.tokenType}
							{data.tokenSubType && <span> • {data.tokenSubType}</span>}
						</span>
						{tokenValueLabel && (
							<span className="flex min-w-0 items-center gap-1 font-mono text-foreground">
								{tokenIsAlias ? <span aria-hidden="true">→</span> : isColorToken(data.tokenType) && <span className="size-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: toCssColor(data.tokenValue, tokenFormat) ?? "transparent" }} aria-hidden="true" />}
								<span className="truncate">{tokenValueLabel}</span>
							</span>
						)}
					</div>
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
