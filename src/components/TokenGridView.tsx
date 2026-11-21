import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { Edge, Node } from "@xyflow/react";
import { GripVertical, Palette, Redo2, Undo2 } from "lucide-react";

import type { ComponentNodeData } from "@/types/component";
import { getComponentBorderClass, getComponentTypeMeta, getNodeTypeLabel } from "@/lib/componentTypes";
import { formatTokenValue, getDefaultTokenFormat, isAliasToken, isColorToken, toCssColor } from "@/lib/tokenValues";
import {
	buildTokenLayout,
	TOKEN_COLUMN_WIDTH,
	TOKEN_HEADER_HEIGHT,
	TOKEN_NODE_HEIGHT,
	TOKEN_NODE_WIDTH,
	TOKEN_ROW_HEIGHT,
	type TokenLayoutItem,
	type TokenLayoutLink,
} from "@/lib/tokenLayout";
import { isEditableTarget, isModalOpen } from "@/hooks/useKeyboardShortcuts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TokenGridViewProps {
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	selectedNodeId: string | null;
	onNodeSelect: (node: Node<ComponentNodeData> | null) => void;
	onSwitchToCanvas: () => void;
	/** Mirrors the canvas lock so the token map is read-only too. */
	isLocked?: boolean;
	onUndo: () => void;
	onRedo: () => void;
	canUndo: boolean;
	canRedo: boolean;
	onReorder: (siblingIds: string[], draggedId: string, targetId: string) => void;
}

const isLinkActive = (link: TokenLayoutLink, activeNodeId: string | null): boolean =>
	!!activeNodeId && (link.sourceId === activeNodeId || link.targetId === activeNodeId);

interface TokenChipProps {
	item: TokenLayoutItem;
	selected: boolean;
	dimmed: boolean;
	isLocked: boolean;
	isDragging: boolean;
	isDropTarget: boolean;
	onSelect: (node: Node<ComponentNodeData>) => void;
	onHover: (nodeId: string | null) => void;
	onReorder: (siblingIds: string[], draggedId: string, targetId: string) => void;
	onDragStart: (nodeId: string) => void;
	onDragEnd: () => void;
}

const TokenChip = memo(
	({ item, selected, dimmed, isLocked, isDragging, isDropTarget, onSelect, onHover, onReorder, onDragStart, onDragEnd }: TokenChipProps) => {
		const data = item.node.data;
		const meta = getComponentTypeMeta(data.componentType);
		const Icon = meta.icon;

		const isToken = data.componentType === "token";
		const isAlias = isToken && isAliasToken(data.tokenKind);
		const tokenFormat = data.tokenFormat ?? (data.tokenType ? getDefaultTokenFormat(data.tokenType) : undefined);
		const displayName = isAlias && data.tokenAlias ? data.tokenAlias : data.label;
		const valueLabel = isToken && !isAlias && data.tokenValue ? formatTokenValue(data.tokenValue, tokenFormat) : undefined;
		const colorPreview = isToken && isColorToken(data.tokenType) ? toCssColor(data.tokenValue, tokenFormat) : null;
		const typeLabel = isToken ? getNodeTypeLabel(data.componentType, data.tokenKind) : meta.label;

		const fullName = [...item.ancestors.map((layer) => layer.label), displayName].join(" / ");
		const siblingIndex = item.siblingIds.indexOf(item.node.id);
		const canReorder = !isLocked && item.siblingIds.length > 1;

		const moveByKeyboard = (direction: "up" | "down") => {
			const targetIndex = direction === "up" ? siblingIndex - 1 : siblingIndex + 1;
			if (targetIndex < 0 || targetIndex >= item.siblingIds.length) return;
			onReorder(item.siblingIds, item.node.id, item.siblingIds[targetIndex]);
		};

		return (
			<div
				data-token-chip
				role="button"
				tabIndex={0}
				aria-pressed={selected}
				aria-disabled={isLocked}
				aria-label={`${typeLabel}: ${fullName}${valueLabel ? ` (${valueLabel})` : ""}`}
				title={`${typeLabel}: ${fullName}${valueLabel ? ` (${valueLabel})` : ""}`}
				onClick={(event) => {
					event.stopPropagation();
					if (!isLocked) onSelect(item.node);
				}}
				onKeyDown={(event) => {
					if (event.target !== event.currentTarget) return;
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						if (!isLocked) onSelect(item.node);
					}
				}}
				onMouseEnter={() => onHover(item.node.id)}
				onMouseLeave={() => onHover(null)}
				onFocus={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as globalThis.Node)) return;
					onHover(item.node.id);
				}}
				onBlur={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as globalThis.Node)) return;
					onHover(null);
				}}
				className={`group absolute flex items-center gap-1.5 rounded-lg border bg-workspace px-2 text-left shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
					isDropTarget
						? "border-primary ring-2 ring-primary"
						: selected
							? `${getComponentBorderClass(data.componentType)} ring-2 ring-primary/20`
							: "border-border hover:border-muted-foreground/40"
				} ${isDragging || dimmed ? "opacity-40" : "opacity-100"} ${isLocked ? "cursor-default" : "cursor-pointer"}`}
				style={{ left: item.x, top: item.y, width: TOKEN_NODE_WIDTH, height: TOKEN_NODE_HEIGHT }}
			>
				{canReorder && (
					<span
						draggable
						role="button"
						tabIndex={0}
						aria-label="Drag to reorder"
						title="Drag to reorder"
						onDragStart={(event) => {
							event.dataTransfer.effectAllowed = "move";
							event.dataTransfer.setData("text/plain", item.node.id);
							onDragStart(item.node.id);
						}}
						onDragEnd={() => onDragEnd()}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => {
							if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
							event.preventDefault();
							event.stopPropagation();
							moveByKeyboard(event.key === "ArrowUp" ? "up" : "down");
						}}
						className="flex size-4 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-user-drag:element]"
					>
						<GripVertical className="size-3.5" />
					</span>
				)}
				<span className={`flex size-5 shrink-0 items-center justify-center rounded ${meta.bgClass} text-background`}>
					<Icon className="size-3" />
				</span>
				<span className={`min-w-0 flex-1 truncate text-xs ${isAlias ? "font-mono" : ""}`}>
					{item.ancestors.map((layer) => (
						<span key={layer.id} className="text-muted-foreground">
							{layer.label}
							<span className="px-1 text-muted-foreground/60">/</span>
						</span>
					))}
					<span className="font-medium text-foreground">{displayName}</span>
				</span>
				{colorPreview && <span className="size-3 shrink-0 rounded-sm border border-border" style={{ backgroundColor: colorPreview }} aria-hidden="true" />}
				{valueLabel && <span className="max-w-[35%] shrink-0 truncate font-mono text-[10px] text-muted-foreground">{valueLabel}</span>}
			</div>
		);
	},
);

TokenChip.displayName = "TokenChip";

/**
 * Structured, table-like view of the token graph.
 *
 * Columns are hierarchy levels and rows are leaves. Connections are drawn as
 * compact orthogonal lines over a rigid grid, so the map stays readable as the
 * number of tokens and usages grows.
 */
export const TokenGridView = ({
	nodes,
	edges,
	selectedNodeId,
	onNodeSelect,
	onSwitchToCanvas,
	isLocked = false,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
	onReorder,
}: TokenGridViewProps) => {
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	// Safari/WKWebView can deliver `dragover` before React commits the state
	// update from `dragstart`, so keep a synchronous copy of the dragged id.
	const draggedNodeIdRef = useRef<string | null>(null);

	const activeNodeId = hoveredNodeId ?? selectedNodeId;

	// The committed layout. Drag previews are derived from this so the target
	// lookup stays stable while the rows are visually re-ordered.
	const baseLayout = useMemo(() => buildTokenLayout(nodes, edges), [nodes, edges]);

	// Stage the re-ordered rows while dragging. The actual document is only
	// updated on drop, so cancelling a drag restores the original order.
	const previewNodes = useMemo(() => {
		if (!draggedNodeId || !dropTargetId || draggedNodeId === dropTargetId) return nodes;

		const draggedItem = baseLayout.items.find((item) => item.node.id === draggedNodeId);
		if (!draggedItem) return nodes;

		const fromIndex = draggedItem.siblingIds.indexOf(draggedNodeId);
		const toIndex = draggedItem.siblingIds.indexOf(dropTargetId);
		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return nodes;

		const reordered = [...draggedItem.siblingIds];
		const [moved] = reordered.splice(fromIndex, 1);
		reordered.splice(toIndex, 0, moved);

		const orderById = new Map(reordered.map((id, index) => [id, index]));

		return nodes.map((node) => {
			const order = orderById.get(node.id);
			return order === undefined ? node : { ...node, data: { ...node.data, order } };
		});
	}, [nodes, draggedNodeId, dropTargetId, baseLayout.items]);

	const layout = useMemo(() => (previewNodes === nodes ? baseLayout : buildTokenLayout(previewNodes, edges)), [previewNodes, nodes, edges, baseLayout]);

	// Locking the canvas clears the selection; drop any lingering drag state too.
	useEffect(() => {
		if (isLocked) {
			draggedNodeIdRef.current = null;
			setHoveredNodeId(null);
			setDraggedNodeId(null);
			setDropTargetId(null);
		}
	}, [isLocked]);

	// Escape cancels a drag or clears the selection; Cmd+Z / Shift+Cmd+Z (or
	// Shift+Cmd+R) undo and redo. The canvas shortcut handler is unmounted in
	// this view, so the token map owns these keys while it is visible.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target) || isModalOpen()) return;

			if (event.key === "Escape") {
				if (draggedNodeIdRef.current) {
					draggedNodeIdRef.current = null;
					setDraggedNodeId(null);
					setDropTargetId(null);
					return;
				}
				onNodeSelect(null);
				return;
			}

			if (isLocked) return;

			const command = event.metaKey;
			const key = event.key.toLowerCase();

			if (command && !event.shiftKey && !event.altKey && key === "z") {
				event.preventDefault();
				onUndo();
				return;
			}

			if (command && event.shiftKey && !event.altKey && (key === "z" || key === "r")) {
				event.preventDefault();
				onRedo();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onNodeSelect, onUndo, onRedo, isLocked]);

	const handleDragStart = useCallback((nodeId: string) => {
		draggedNodeIdRef.current = nodeId;
		setDraggedNodeId(nodeId);
		setDropTargetId(null);
	}, []);

	const handleDragEnd = useCallback(() => {
		draggedNodeIdRef.current = null;
		setDraggedNodeId(null);
		setDropTargetId(null);
	}, []);

	const handleDragOver = useCallback((nodeId: string) => {
		setDropTargetId((current) => (current === nodeId ? current : nodeId));
	}, []);

	const handleGridDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			const draggedId = draggedNodeIdRef.current;
			if (!draggedId) return;

			const draggedItem = baseLayout.items.find((item) => item.node.id === draggedId);
			if (!draggedItem || draggedItem.siblingIds.length <= 1) return;

			const rect = event.currentTarget.getBoundingClientRect();
			const y = event.clientY - rect.top;
			const row = Math.max(0, Math.min(baseLayout.rowCount - 1, Math.floor(y / TOKEN_ROW_HEIGHT)));

			const siblingItems = draggedItem.siblingIds
				.map((id) => baseLayout.items.find((item) => item.node.id === id))
				.filter((item): item is TokenLayoutItem => !!item);

			if (siblingItems.length === 0) return;

			const target = siblingItems.reduce((closest, item) => {
				const closestDistance = Math.abs((closest.rowStart + closest.rowEnd) / 2 - row);
				const itemDistance = Math.abs((item.rowStart + item.rowEnd) / 2 - row);
				return itemDistance < closestDistance ? item : closest;
			});

			if (target.node.id === draggedId) return;

			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			handleDragOver(target.node.id);
		},
		[baseLayout.items, baseLayout.rowCount, handleDragOver],
	);

	const handleGridDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as globalThis.Node)) return;
		setDropTargetId(null);
	}, []);

	const handleGridDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			event.preventDefault();

			const draggedId = draggedNodeIdRef.current;
			if (!draggedId || !dropTargetId) {
				handleDragEnd();
				return;
			}

			const draggedItem = baseLayout.items.find((item) => item.node.id === draggedId);
			if (!draggedItem) {
				handleDragEnd();
				return;
			}

			onReorder(draggedItem.siblingIds, draggedId, dropTargetId);
			handleDragEnd();
		},
		[baseLayout.items, dropTargetId, handleDragEnd, onReorder],
	);

	const activeNeighbors = useMemo(() => {
		if (!activeNodeId) return null;

		const neighbors = new Set<string>([activeNodeId]);
		for (const link of layout.links) {
			if (link.sourceId === activeNodeId) neighbors.add(link.targetId);
			if (link.targetId === activeNodeId) neighbors.add(link.sourceId);
		}
		return neighbors;
	}, [activeNodeId, layout.links]);

	const activeItem = useMemo(() => layout.items.find((item) => item.node.id === activeNodeId) ?? null, [activeNodeId, layout.items]);

	// Bring the selected node into view when the view opens or the selection
	// changes, but leave it alone when the node is already visible.
	useEffect(() => {
		if (!selectedNodeId) return;

		const item = layout.items.find((entry) => entry.node.id === selectedNodeId);
		const container = scrollRef.current;
		if (!item || !container) return;

		const itemTop = TOKEN_HEADER_HEIGHT + item.y;
		const itemBottom = itemTop + TOKEN_NODE_HEIGHT;
		const visibleTop = container.scrollTop + TOKEN_HEADER_HEIGHT;
		const visibleBottom = container.scrollTop + container.clientHeight;

		if (itemTop < visibleTop || itemBottom > visibleBottom) {
			const target = itemTop - TOKEN_HEADER_HEIGHT - (container.clientHeight - TOKEN_HEADER_HEIGHT) / 2;
			container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
		}
	}, [selectedNodeId, layout.items]);

	if (layout.items.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas p-8 text-center" onClick={() => onNodeSelect(null)}>
				<div className="flex size-12 items-center justify-center rounded-full bg-component-token/10 text-component-token">
					<Palette className="size-6" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-medium text-foreground">No tokens to map yet</h3>
					<p className="mx-auto max-w-sm text-xs text-muted-foreground">
						Add token literals and aliases on the canvas, then connect them to the components that use them. They'll appear here as a structured map.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={onSwitchToCanvas}>
					Open canvas
				</Button>
			</div>
		);
	}

	const tokenItems = layout.items.filter((item) => item.node.data.componentType === "token");
	const literalCount = tokenItems.filter((item) => !isAliasToken(item.node.data.tokenKind)).length;
	const aliasCount = tokenItems.filter((item) => isAliasToken(item.node.data.tokenKind)).length;
	const usageCount = layout.items.length - tokenItems.length;

	return (
		<div className="flex h-full flex-col bg-canvas" onClick={() => onNodeSelect(null)}>
			<header className="flex flex-wrap items-center justify-end gap-3 px-6 py-4">
				<div className="flex flex-wrap items-center gap-2">
					{isLocked && <Badge variant="outline">Canvas locked</Badge>}
					<Badge variant="outline">{literalCount} literals</Badge>
					<Badge variant="outline">{aliasCount} aliases</Badge>
					<Badge variant="outline">{usageCount} usages</Badge>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={(event) => {
								event.stopPropagation();
								onUndo();
							}}
							disabled={isLocked || !canUndo}
							aria-label="Undo"
						>
							<Undo2 className="size-3.5" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="size-8"
							onClick={(event) => {
								event.stopPropagation();
								onRedo();
							}}
							disabled={isLocked || !canRedo}
							aria-label="Redo"
						>
							<Redo2 className="size-3.5" />
						</Button>
					</div>
					<Button variant="outline" size="sm" onClick={onSwitchToCanvas}>
						Open canvas
					</Button>
				</div>
			</header>

			<div ref={scrollRef} className="flex-1 flex px-1 overflow-auto">
				<div className="relative flex-1" style={{ width: layout.totalWidth }}>
					<div className="sticky top-0 z-20 flex border-b border-border bg-canvas/95 backdrop-blur" style={{ height: TOKEN_HEADER_HEIGHT }}>
						{layout.columns.map((column) => (
							<div key={column.depth} className="flex items-center justify-between gap-2 border-r border-border/40 px-4 last:border-r-0" style={{ width: TOKEN_COLUMN_WIDTH }}>
								<span className="truncate text-xs font-medium text-foreground">{column.label}</span>
								<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{column.count}</span>
							</div>
						))}
					</div>

					<div
						className="relative flex-1 flex"
						style={{ height: layout.gridHeight }}
						role="group"
						aria-label="Token map"
						onDragOver={handleGridDragOver}
						onDragEnter={(event) => {
							if (draggedNodeIdRef.current) event.preventDefault();
						}}
						onDragLeave={handleGridDragLeave}
						onDrop={handleGridDrop}
					>
						{activeItem && (
							<div
								className="pointer-events-none absolute inset-x-0 bg-primary/5"
								style={{
									top: activeItem.rowStart * TOKEN_ROW_HEIGHT,
									height: (activeItem.rowEnd - activeItem.rowStart + 1) * TOKEN_ROW_HEIGHT,
								}}
							/>
						)}

						<svg className="pointer-events-none absolute inset-0" width={layout.totalWidth} height={layout.gridHeight} aria-hidden="true">
							{/*{Array.from({ length: layout.rowCount + 1 }).map((_, index) => (
								<line key={`row-${index}`} x1={0} x2={layout.totalWidth} y1={index * TOKEN_ROW_HEIGHT} y2={index * TOKEN_ROW_HEIGHT} className="stroke-border/40" strokeWidth={1} />
							))}*/}
							{/*{layout.columns.map((column) => (
								<line
									key={`column-${column.depth}`}
									x1={column.depth * TOKEN_COLUMN_WIDTH}
									x2={column.depth * TOKEN_COLUMN_WIDTH}
									y1={0}
									y2={layout.gridHeight}
									className="stroke-border/30"
									strokeWidth={1}
								/>
							))}*/}
							{/*{layout.blocks.slice(1).map((block) => (
								<line key={`block-${block.startRow}`} x1={0} x2={layout.totalWidth} y1={block.startRow * TOKEN_ROW_HEIGHT} y2={block.startRow * TOKEN_ROW_HEIGHT} className="stroke-border" strokeWidth={2} />
							))}*/}
							{[...layout.links]
								.sort((a, b) => Number(isLinkActive(a, activeNodeId)) - Number(isLinkActive(b, activeNodeId)))
								.map((link) => {
									const isActive = isLinkActive(link, activeNodeId);
									return (
										<path
											key={`${link.sourceId}-${link.targetId}`}
											d={link.path}
											fill="none"
											stroke={link.color}
											strokeWidth={isActive ? 2 : 1.5}
											strokeLinecap="round"
											opacity={activeNodeId && !isActive ? 0.2 : 0.75}
										/>
									);
								})}
						</svg>

						{layout.items.map((item) => (
							<TokenChip
								key={item.node.id}
								item={item}
								selected={item.node.id === selectedNodeId}
								dimmed={!!activeNeighbors && !activeNeighbors.has(item.node.id) && item.node.id !== draggedNodeId && item.node.id !== dropTargetId}
								isLocked={isLocked}
								isDragging={item.node.id === draggedNodeId}
								isDropTarget={item.node.id === dropTargetId}
								onSelect={onNodeSelect}
								onHover={setHoveredNodeId}
								onReorder={onReorder}
								onDragStart={handleDragStart}
								onDragEnd={handleDragEnd}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};
