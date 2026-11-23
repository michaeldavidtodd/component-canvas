import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Edge, Node } from "@xyflow/react";
import { Columns3, GripVertical, X } from "lucide-react";

import type { ComponentNodeData, ComponentType } from "@/types/component";
import { getComponentBorderClass, getComponentTypeMeta, getNodeTypeLabel } from "@/lib/componentTypes";
import { formatTokenValue, getDefaultTokenFormat, isAliasToken, isColorToken, toCssColor } from "@/lib/tokenValues";
import { buildTokenLayout, TOKEN_COLUMN_WIDTH, TOKEN_HEADER_HEIGHT, TOKEN_NODE_HEIGHT, TOKEN_NODE_WIDTH, TOKEN_ROW_HEIGHT, type TokenLayoutItem, type TokenLayoutLink } from "@/lib/tokenLayout";
import { canAssignParent } from "@/lib/parentRules";
import { isEditableTarget, isModalOpen } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";

interface GridViewProps {
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	selectedNodeId: string | null;
	onNodeSelect: (node: Node<ComponentNodeData> | null, occurrenceId?: string | null) => void;
	onSwitchToCanvas: () => void;
	/** Mirrors the canvas lock so the token map is read-only too. */
	isLocked?: boolean;
	onUndo: () => void;
	onRedo: () => void;
	onReorder: (siblingIds: string[], draggedId: string, targetId: string) => void;
	onDeleteEdge: (edgeId: string) => void;
	onReconnectEdge: (edgeId: string, endpoint: LinkEndpoint, nodeId: string) => void;
	visibleTypes: ReadonlySet<ComponentType>;
}

type LinkEndpoint = "source" | "target";

const isLinkActive = (link: TokenLayoutLink, activeNodeId: string | null): boolean => !!activeNodeId && (link.sourceId === activeNodeId || link.targetId === activeNodeId);

/** Occurrence-based key, so a node shown under multiple parents stays distinct. */
const getLinkKey = (link: TokenLayoutLink): string => `${link.sourceItemId}-${link.targetItemId}`;

interface ReconnectDrag {
	linkKey: string;
	edgeId: string;
	pointerId: number;
	endpoint: LinkEndpoint;
	/** The endpoint that stays put while the other one follows the pointer. */
	anchorX: number;
	anchorY: number;
	pointerX: number;
	pointerY: number;
	hoverItemId: string | null;
	hoverNodeId: string | null;
	hoverAllowed: boolean;
	hoverReason: string | null;
	color: string;
	sourceId: string;
	targetId: string;
}

interface TokenChipProps {
	item: TokenLayoutItem;
	selected: boolean;
	dimmed: boolean;
	isLocked: boolean;
	isDragging: boolean;
	onSelect: (node: Node<ComponentNodeData>, occurrenceId: string) => void;
	onHover: (nodeId: string | null) => void;
	onReorder: (siblingIds: string[], draggedId: string, targetId: string) => void;
	onDragStart: (itemId: string, nodeId: string) => void;
	onDragEnd: () => void;
}

const TokenChip = memo(({ item, selected, dimmed, isLocked, isDragging, onSelect, onHover, onReorder, onDragStart, onDragEnd }: TokenChipProps) => {
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
				if (!isLocked) onSelect(item.node, item.id);
			}}
			onKeyDown={(event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (!isLocked) onSelect(item.node, item.id);
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
			className={`group absolute flex items-center gap-1.5 rounded-lg border bg-workspace px-2 text-left shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isDragging ? "border-primary ring-2 ring-primary" : selected ? `${getComponentBorderClass(data.componentType)} ring-2 ring-primary/20` : "border-border hover:border-muted-foreground/40"} ${dimmed ? "opacity-40" : "opacity-100"} ${isLocked ? "cursor-default" : "cursor-pointer"}`}
			style={{ left: item.x, top: item.y, width: TOKEN_NODE_WIDTH, height: TOKEN_NODE_HEIGHT }}
		>
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
						onDragStart(item.id, item.node.id);
						try {
							const chip = event.currentTarget.closest("[data-token-chip]");
							if (chip instanceof HTMLElement) {
								const rect = chip.getBoundingClientRect();
								event.dataTransfer.setDragImage(chip, event.clientX - rect.left, event.clientY - rect.top);
							}
						} catch {
							// The browser will fall back to its default drag image.
						}
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
		</div>
	);
});

TokenChip.displayName = "TokenChip";

/**
 * Structured, table-like view of the token graph.
 *
 * Columns are hierarchy levels and rows are leaves. Connections are drawn as
 * compact orthogonal lines over a rigid grid, so the map stays readable as the
 * number of tokens and usages grows.
 */
export const GridView = ({ nodes, edges, selectedNodeId, onNodeSelect, onSwitchToCanvas, isLocked = false, onUndo, onRedo, onReorder, onDeleteEdge, onReconnectEdge, visibleTypes }: GridViewProps) => {
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
	const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);
	const [reconnectDrag, setReconnectDragState] = useState<ReconnectDrag | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<number | null>(null);
	// Safari/WKWebView can deliver `dragover` before React commits the state
	// update from `dragstart`, so keep synchronous copies of the dragged ids.
	const draggedItemIdRef = useRef<string | null>(null);
	const draggedNodeIdRef = useRef<string | null>(null);
	// The pointer handlers read the live drag state without re-subscribing on
	// every move, and the release handler needs the latest hovered chip.
	const reconnectDragRef = useRef<ReconnectDrag | null>(null);

	const setReconnectDrag = useCallback((next: ReconnectDrag | null) => {
		reconnectDragRef.current = next;
		setReconnectDragState(next);
	}, []);

	const activeNodeId = hoveredNodeId ?? selectedNodeId;

	// The committed layout. Drag previews are derived from this so the target
	// lookup stays stable while the rows are visually re-ordered.
	const baseLayout = useMemo(() => buildTokenLayout(nodes, edges, visibleTypes), [nodes, edges, visibleTypes]);

	// Stage the re-ordered rows while dragging. The actual document is only
	// updated on drop, so cancelling a drag restores the original order.
	const previewNodes = useMemo(() => {
		if (!draggedItemId || !dropTargetId) return nodes;

		const draggedItem = baseLayout.items.find((item) => item.id === draggedItemId);
		if (!draggedItem) return nodes;

		const fromIndex = draggedItem.siblingIds.indexOf(draggedItem.node.id);
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
	}, [nodes, draggedItemId, dropTargetId, baseLayout.items]);

	const layout = useMemo(() => (previewNodes === nodes ? baseLayout : buildTokenLayout(previewNodes, edges, visibleTypes)), [previewNodes, nodes, edges, baseLayout, visibleTypes]);

	const showLinkControls = useCallback((key: string) => {
		if (hoverTimeoutRef.current !== null) {
			window.clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setHoveredLinkKey(key);
	}, []);

	// The controls sit just outside the line's hit area, so hide them on a short
	// delay that a move onto the controls can cancel.
	const scheduleHideLinkControls = useCallback((key: string) => {
		if (hoverTimeoutRef.current !== null) window.clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = window.setTimeout(() => {
			hoverTimeoutRef.current = null;
			setHoveredLinkKey((current) => (current === key ? null : current));
		}, 120);
	}, []);

	useEffect(
		() => () => {
			if (hoverTimeoutRef.current !== null) window.clearTimeout(hoverTimeoutRef.current);
		},
		[],
	);

	// Hit-test the grid in layout coordinates so the drag doesn't depend on DOM
	// stacking order. A little padding makes the chip edges forgiving.
	const findItemAt = useCallback(
		(x: number, y: number): TokenLayoutItem | null => {
			const padding = 8;
			let best: TokenLayoutItem | null = null;
			let bestDistance = Number.POSITIVE_INFINITY;

			for (const item of layout.items) {
				if (x < item.x - padding || x > item.x + TOKEN_NODE_WIDTH + padding) continue;
				if (y < item.y - padding || y > item.y + TOKEN_NODE_HEIGHT + padding) continue;

				const dx = x - (item.x + TOKEN_NODE_WIDTH / 2);
				const dy = y - (item.y + TOKEN_NODE_HEIGHT / 2);
				const distance = dx * dx + dy * dy;
				if (distance < bestDistance) {
					best = item;
					bestDistance = distance;
				}
			}

			return best;
		},
		[layout.items],
	);

	const evaluateReconnectTarget = useCallback(
		(drag: ReconnectDrag, nodeId: string): { allowed: boolean; reason: string | null } => {
			const edge = edges.find((candidate) => candidate.id === drag.edgeId);
			if (!edge) return { allowed: false, reason: "This connection no longer exists." };

			const nextSource = drag.endpoint === "source" ? nodeId : edge.source;
			const nextTarget = drag.endpoint === "target" ? nodeId : edge.target;
			if (nextSource === nextTarget) return { allowed: false, reason: "A node can't be its own parent." };

			const child = nodes.find((node) => node.id === nextTarget);
			const parent = nodes.find((node) => node.id === nextSource);
			if (!child || !parent) return { allowed: false, reason: "That node is no longer available." };

			const existingParents = edges
				.filter((candidate) => candidate.id !== drag.edgeId && candidate.target === nextTarget)
				.map((candidate) => nodes.find((node) => node.id === candidate.source))
				.filter((node): node is Node<ComponentNodeData> => !!node);

			const check = canAssignParent(child, parent, existingParents);
			if (!check.allowed) return { allowed: false, reason: check.reason ?? "This parent isn't allowed." };

			if (edges.some((candidate) => candidate.id !== drag.edgeId && candidate.source === nextSource && candidate.target === nextTarget)) {
				return { allowed: false, reason: "That connection already exists." };
			}

			return { allowed: true, reason: null };
		},
		[edges, nodes],
	);

	// Keep the highlight stable while an endpoint is being dragged; the pointer
	// sweeping over chips shouldn't re-light the whole map mid-drag.
	const handleChipHover = useCallback((nodeId: string | null) => {
		if (reconnectDragRef.current) return;
		setHoveredNodeId(nodeId);
	}, []);

	const startReconnect = useCallback(
		(event: ReactPointerEvent<HTMLButtonElement>, link: TokenLayoutLink, endpoint: LinkEndpoint) => {
			if (isLocked || reconnectDragRef.current || event.button !== 0) return;
			event.preventDefault();
			event.stopPropagation();
			setHoveredNodeId(null);

			const rect = gridRef.current?.getBoundingClientRect();
			if (!rect) return;

			setReconnectDrag({
				linkKey: getLinkKey(link),
				edgeId: link.edgeId,
				pointerId: event.pointerId,
				endpoint,
				anchorX: endpoint === "source" ? link.endX : link.startX,
				anchorY: endpoint === "source" ? link.endY : link.startY,
				pointerX: event.clientX - rect.left,
				pointerY: event.clientY - rect.top,
				hoverItemId: null,
				hoverNodeId: null,
				hoverAllowed: false,
				hoverReason: null,
				color: link.color,
				sourceId: link.sourceId,
				targetId: link.targetId,
			});
		},
		[isLocked, setReconnectDrag],
	);

	const isReconnecting = reconnectDrag !== null;

	// Track the pointer on the window so the drag survives leaving the grid. The
	// edge is only re-mapped on release, which lets the layout settle afterwards.
	useEffect(() => {
		if (!isReconnecting) return;

		const handlePointerMove = (event: PointerEvent) => {
			const current = reconnectDragRef.current;
			const rect = gridRef.current?.getBoundingClientRect();
			if (!current || !rect || event.pointerId !== current.pointerId) return;

			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const item = findItemAt(x, y);
			const evaluation = item ? evaluateReconnectTarget(current, item.node.id) : { allowed: false, reason: null };

			setReconnectDrag({
				...current,
				pointerX: x,
				pointerY: y,
				hoverItemId: item?.id ?? null,
				hoverNodeId: item?.node.id ?? null,
				hoverAllowed: evaluation.allowed,
				hoverReason: evaluation.reason,
			});
		};

		const handlePointerUp = (event: PointerEvent) => {
			const current = reconnectDragRef.current;
			if (!current || event.pointerId !== current.pointerId) return;
			if (current.hoverNodeId && current.hoverAllowed) {
				onReconnectEdge(current.edgeId, current.endpoint, current.hoverNodeId);
			}
			setReconnectDrag(null);
		};

		const handlePointerCancel = (event: PointerEvent) => {
			const current = reconnectDragRef.current;
			if (!current || event.pointerId !== current.pointerId) return;
			setReconnectDrag(null);
		};

		const previousUserSelect = document.body.style.userSelect;
		const previousCursor = document.body.style.cursor;
		document.body.style.userSelect = "none";
		document.body.style.cursor = "grabbing";

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerCancel);

		return () => {
			document.body.style.userSelect = previousUserSelect;
			document.body.style.cursor = previousCursor;
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerCancel);
		};
	}, [isReconnecting, findItemAt, evaluateReconnectTarget, onReconnectEdge, setReconnectDrag]);

	const reconnectHoverItem = useMemo(() => {
		if (!reconnectDrag?.hoverItemId) return null;
		return layout.items.find((item) => item.id === reconnectDrag.hoverItemId) ?? null;
	}, [reconnectDrag?.hoverItemId, layout.items]);


	// Locking the canvas clears the selection; drop any lingering drag state too.
	useEffect(() => {
		if (isLocked) {
			draggedItemIdRef.current = null;
			draggedNodeIdRef.current = null;
			setHoveredNodeId(null);
			setDraggedItemId(null);
			setDraggedNodeId(null);
			setDropTargetId(null);
			setHoveredLinkKey(null);
			setReconnectDrag(null);
		}
	}, [isLocked, setReconnectDrag]);

	// Escape cancels a drag or clears the selection; Cmd+Z / Shift+Cmd+Z (or
	// Shift+Cmd+R) undo and redo. The canvas shortcut handler is unmounted in
	// this view, so the token map owns these keys while it is visible.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target) || isModalOpen()) return;

			if (event.key === "Escape") {
				if (reconnectDragRef.current) {
					setReconnectDrag(null);
					return;
				}
				if (draggedItemIdRef.current) {
					draggedItemIdRef.current = null;
					draggedNodeIdRef.current = null;
					setDraggedItemId(null);
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
	}, [onNodeSelect, onUndo, onRedo, isLocked, setReconnectDrag]);

	const handleDragStart = useCallback((itemId: string, nodeId: string) => {
		draggedItemIdRef.current = itemId;
		draggedNodeIdRef.current = nodeId;
		setDraggedItemId(itemId);
		setDraggedNodeId(nodeId);
		setDropTargetId(null);
	}, []);

	const handleDragEnd = useCallback(() => {
		draggedItemIdRef.current = null;
		draggedNodeIdRef.current = null;
		setDraggedItemId(null);
		setDraggedNodeId(null);
		setDropTargetId(null);
	}, []);

	const handleDragOver = useCallback((nodeId: string) => {
		setDropTargetId((current) => (current === nodeId ? current : nodeId));
	}, []);

	const handleGridDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			const draggedId = draggedItemIdRef.current;
			if (!draggedId) return;

			const draggedItem = baseLayout.items.find((item) => item.id === draggedId);
			if (!draggedItem || draggedItem.siblingIds.length <= 1) return;

			const rect = event.currentTarget.getBoundingClientRect();
			const y = event.clientY - rect.top;
			const row = Math.max(0, Math.min(baseLayout.rowCount - 1, Math.floor(y / TOKEN_ROW_HEIGHT)));

			// Keep the current order while the pointer is still over the dragged item's
			// own rows. A parent spanning an even number of rows has a half-row centre,
			// so without this it can be closer to a sibling's centre and stage a move
			// as soon as the drag starts.
			if (row >= draggedItem.rowStart && row <= draggedItem.rowEnd) return;

			// Use the sibling occurrences under the same parent occurrence, not the
			// first occurrence of each sibling node.
			const siblingItems = baseLayout.items.filter((item) => item.parentItemId === draggedItem.parentItemId);
			if (siblingItems.length === 0) return;

			const target = siblingItems.reduce((closest, item) => {
				const closestDistance = Math.abs((closest.rowStart + closest.rowEnd) / 2 - row);
				const itemDistance = Math.abs((item.rowStart + item.rowEnd) / 2 - row);
				return itemDistance < closestDistance ? item : closest;
			});

			if (target.node.id === draggedItem.node.id) return;

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

			const draggedId = draggedItemIdRef.current;
			if (!draggedId || !dropTargetId) {
				handleDragEnd();
				return;
			}

			const draggedItem = baseLayout.items.find((item) => item.id === draggedId);
			if (!draggedItem) {
				handleDragEnd();
				return;
			}

			onReorder(draggedItem.siblingIds, draggedItem.node.id, dropTargetId);
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

	const activeItems = useMemo(() => layout.items.filter((item) => item.node.id === activeNodeId), [activeNodeId, layout.items]);

	// Bring the selected node into view when the view opens or the selection
	// changes, but leave it alone when the node is already visible.
	useEffect(() => {
		if (!selectedNodeId) return;
		if (draggedItemIdRef.current) return;

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
		const hasNodes = nodes.some((node) => !node.hidden);
		const hasVisibleTypes = visibleTypes.size > 0;
		const title = !hasNodes ? "Nothing to map yet" : !hasVisibleTypes ? "No node types selected" : "No nodes match the current filters";
		const description = !hasNodes ? "Add components, variants, or tokens on the canvas, then connect them. They'll appear here as a structured map." : !hasVisibleTypes ? "Turn on a node type in the header to see it in the map." : "The current filters hide every node. Turn on a node type in the header to see it.";

		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 bg-canvas p-8 text-center" onClick={() => onNodeSelect(null)}>
				<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Columns3 className="size-6" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-medium text-foreground">{title}</h3>
					<p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
				</div>
				<Button variant="outline" size="sm" onClick={onSwitchToCanvas}>
					Open canvas
				</Button>
			</div>
		);
	}

	return (
		<div
			className="flex h-full flex-col bg-canvas"
			onClick={() => {
				setHoveredLinkKey(null);
				onNodeSelect(null);
			}}
		>
			{/* Column labels mirror the grid columns; the shared header lives outside. */}
			<div className="flex shrink-0 border-b border-border bg-canvas/95 backdrop-blur" style={{ height: TOKEN_HEADER_HEIGHT }}>
				{layout.columns.map((column) => (
					<div key={column.depth} className="flex items-center justify-between gap-2 border-r px-6 last:border-r-0" style={{ width: TOKEN_COLUMN_WIDTH }}>
						<span className="truncate text-xs font-medium text-foreground">{column.label}</span>
						<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{column.count}</span>
					</div>
				))}
			</div>

			<div ref={scrollRef} className="flex-1 overflow-auto px-3 pt-0.5 pb-24">
				<div className="relative !min-w-full" style={{ width: layout.totalWidth }}>
					<div
						ref={gridRef}
						className={`relative ${reconnectDrag ? "touch-none cursor-grabbing [&_[data-token-chip]]:pointer-events-none" : ""}`}
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
						{activeItems.map((item) => (
							<div
								key={item.id}
								className="pointer-events-none absolute inset-x-0 bg-primary/5"
								style={{
									top: item.rowStart * TOKEN_ROW_HEIGHT,
									height: (item.rowEnd - item.rowStart + 1) * TOKEN_ROW_HEIGHT,
								}}
							/>
						))}

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
									const linkKey = getLinkKey(link);
									const isReconnectingLink = reconnectDrag?.edgeId === link.edgeId;
									return (
										<g key={linkKey}>
											<path d={link.path} fill="none" stroke={link.color} strokeWidth={isActive ? 2 : 1.5} strokeLinecap="round" opacity={isReconnectingLink ? 0.15 : activeNodeId && !isActive ? 0.2 : 0.75} />
											{!isLocked && (
												<path
													d={link.path}
													fill="none"
													stroke="transparent"
													strokeWidth={20}
													style={{ pointerEvents: "stroke", cursor: reconnectDrag ? "grabbing" : "pointer" }}
													onMouseEnter={() => {
														if (!reconnectDragRef.current) showLinkControls(linkKey);
													}}
													onMouseLeave={() => {
														if (!reconnectDragRef.current) scheduleHideLinkControls(linkKey);
													}}
													onClick={(event) => {
														event.stopPropagation();
														showLinkControls(linkKey);
													}}
												/>
											)}
										</g>
									);
								})}
						</svg>

						{layout.items.map((item) => (
							<TokenChip key={item.id} item={item} selected={item.node.id === selectedNodeId} dimmed={!!activeNeighbors && !activeNeighbors.has(item.node.id) && item.node.id !== draggedNodeId && item.node.id !== dropTargetId} isLocked={isLocked} isDragging={item.id === draggedItemId} onSelect={onNodeSelect} onHover={handleChipHover} onReorder={onReorder} onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
						))}

						{/* Connection controls: a delete button at the midpoint and a
						    draggable handle on each end, revealed on hover. */}
						{!isLocked &&
							layout.links.map((link) => {
								const linkKey = getLinkKey(link);
								const showControls = hoveredLinkKey === linkKey || reconnectDrag?.linkKey === linkKey;
								if (!showControls) return null;

								const midX = (link.startX + link.endX) / 2;
								const midY = (link.startY + link.endY) / 2;

								return (
									<div key={`controls-${linkKey}`} className="pointer-events-none absolute inset-0">
										<button
											type="button"
											aria-label="Delete connection"
											title="Delete connection"
											onPointerDown={(event) => event.stopPropagation()}
											onClick={(event) => {
												event.stopPropagation();
												setHoveredLinkKey(null);
												onDeleteEdge(link.edgeId);
											}}
											onMouseEnter={() => showLinkControls(linkKey)}
											onMouseLeave={() => scheduleHideLinkControls(linkKey)}
											className="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-lg transition-colors hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											style={{ left: midX, top: midY }}
										>
											<X className="size-3.5" />
										</button>

										<button type="button" tabIndex={-1} aria-label="Reconnect source" title="Drag to reconnect" onPointerDown={(event) => startReconnect(event, link, "source")} onClick={(event) => event.stopPropagation()} onMouseEnter={() => showLinkControls(linkKey)} onMouseLeave={() => scheduleHideLinkControls(linkKey)} className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab rounded-full border-2 border-background bg-primary shadow transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" style={{ left: link.startX, top: link.startY }} />

										<button type="button" tabIndex={-1} aria-label="Reconnect target" title="Drag to reconnect" onPointerDown={(event) => startReconnect(event, link, "target")} onClick={(event) => event.stopPropagation()} onMouseEnter={() => showLinkControls(linkKey)} onMouseLeave={() => scheduleHideLinkControls(linkKey)} className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab rounded-full border-2 border-background bg-primary shadow transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" style={{ left: link.endX, top: link.endY }} />
									</div>
								);
							})}

						{/* Live preview while an endpoint is being dragged. */}
						{reconnectDrag && (
							<svg className="pointer-events-none absolute inset-0" width={layout.totalWidth} height={layout.gridHeight} aria-hidden="true">
								<line x1={reconnectDrag.anchorX} y1={reconnectDrag.anchorY} x2={reconnectDrag.pointerX} y2={reconnectDrag.pointerY} stroke={reconnectDrag.color} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" opacity={0.9} />
								<circle cx={reconnectDrag.pointerX} cy={reconnectDrag.pointerY} r={5} fill={reconnectDrag.color} className="stroke-background" strokeWidth={2} />
								{reconnectHoverItem && <rect x={reconnectHoverItem.x - 2} y={reconnectHoverItem.y - 2} width={TOKEN_NODE_WIDTH + 4} height={TOKEN_NODE_HEIGHT + 4} rx={10} fill="none" stroke={reconnectDrag.hoverAllowed ? reconnectDrag.color : "hsl(var(--destructive))"} strokeWidth={2} strokeDasharray="4 3" />}
							</svg>
						)}

						{/* Explain why a hovered chip can't be used as the new parent. */}
						{reconnectDrag?.hoverReason && (
							<div className="pointer-events-none absolute z-50 max-w-[240px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md" style={{ left: reconnectDrag.pointerX + 12, top: reconnectDrag.pointerY + 12 }}>
								{reconnectDrag.hoverReason}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
