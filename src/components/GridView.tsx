import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Edge, Node } from "@xyflow/react";
import { AlertTriangle, Columns3, GripVertical, Plus, X } from "lucide-react";

import type { ComponentNodeData, ComponentType } from "@/types/component";
import { getComponentBorderClass, getComponentTypeMeta, getNodeTypeLabel } from "@/lib/componentTypes";
import { formatTokenValue, getDefaultTokenFormat, isAliasToken } from "@/lib/tokenValues";
import { buildTokenLayout, TOKEN_COLUMN_MAX_WIDTH, TOKEN_COLUMN_MIN_WIDTH, TOKEN_HEADER_HEIGHT, TOKEN_NODE_HEIGHT, TOKEN_ROW_HEIGHT, type TokenLayoutItem, type TokenLayoutLink } from "@/lib/tokenLayout";
import { buildTokenSwatchMap } from "@/lib/tokenColors";
import { getNodeValidationIssues } from "@/lib/nodeValidation";
import { canAssignParent, getChildTypeOptions } from "@/lib/parentRules";
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
	/** Node to scroll into view and vertically center, e.g. a newly created node. */
	revealNodeId?: string | null;
	/** Called after the reveal scroll starts so the parent can clear the request. */
	onRevealComplete?: () => void;
	/** Start a draft beneath the hovered parent, using the chosen child type. */
	onAddChild?: (parent: Node<ComponentNodeData>, type: ComponentType) => void;
}

type LinkEndpoint = "source" | "target";

/** Column widths are a view preference, so they survive switching views. */
const COLUMN_WIDTHS_STORAGE_KEY = "component-canvas:grid-column-widths";
/** Matches the grid's `px-3` scroll padding so the header scrolls in step. */
const GRID_SCROLL_PADDING_X = 12;

const clampColumnWidth = (width: number): number => Math.min(TOKEN_COLUMN_MAX_WIDTH, Math.max(TOKEN_COLUMN_MIN_WIDTH, width));

const readStoredColumnWidths = (): Record<number, number> => {
	if (typeof window === "undefined") return {};

	try {
		const raw = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
		if (!raw) return {};

		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return {};

		const widths: Record<number, number> = {};
		for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
			const depth = Number(key);
			if (!Number.isInteger(depth) || depth < 0 || typeof value !== "number" || !Number.isFinite(value)) continue;
			widths[depth] = clampColumnWidth(value);
		}
		return widths;
	} catch {
		return {};
	}
};

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
	/** Resolved swatch color for color tokens, including aliases. */
	swatchColor: string | null;
	onSelect: (node: Node<ComponentNodeData>, occurrenceId: string) => void;
	onHover: (nodeId: string | null) => void;
	onReorder: (siblingIds: string[], draggedId: string, targetId: string) => void;
	onDragStart: (itemId: string, nodeId: string) => void;
	onDragEnd: () => void;
	onAddChild?: (parent: Node<ComponentNodeData>, type: ComponentType) => void;
}

const TokenChip = memo(({ item, selected, dimmed, isLocked, isDragging, swatchColor, onSelect, onHover, onReorder, onDragStart, onDragEnd, onAddChild }: TokenChipProps) => {
	const data = item.node.data;
	const meta = getComponentTypeMeta(data.componentType);
	const Icon = meta.icon;

	const isToken = data.componentType === "token";
	const isAlias = isToken && isAliasToken(data.tokenKind);
	const tokenFormat = data.tokenFormat ?? (data.tokenType ? getDefaultTokenFormat(data.tokenType) : undefined);
	const displayName = isAlias && data.tokenAlias ? data.tokenAlias : data.label;
	const valueLabel = isToken && !isAlias && data.tokenValue ? formatTokenValue(data.tokenValue, tokenFormat) : undefined;
	const issues = getNodeValidationIssues(item.node);
	const issueSummary = issues.map((issue) => `${issue.field}: ${issue.message}`).join("; ");
	const typeLabel = isToken ? getNodeTypeLabel(data.componentType, data.tokenKind) : meta.label;
	// Every child type this node could produce, and whether the rules allow it.
	const childOptions = getChildTypeOptions(item.node);
	const allowedChildren = childOptions.filter((option) => option.allowed);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close the radial menu when clicking anywhere outside it.
	useEffect(() => {
		if (!menuOpen) return;
		const handlePointerDown = (event: PointerEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as globalThis.Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [menuOpen]);

	const fullName = [...item.ancestors.map((layer) => layer.label), displayName].join(" / ");
	const siblingIndex = item.siblingIds.indexOf(item.node.id);
	const canReorder = !isLocked && item.siblingIds.length > 1;
	const ariaLabel = `${typeLabel}: ${fullName}${valueLabel ? ` (${valueLabel})` : ""}${issueSummary ? `. ${issueSummary}` : ""}`;

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
			aria-label={ariaLabel}
			title={ariaLabel}
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
			className={`group absolute flex items-center gap-1.5 rounded-lg border bg-workspace px-2 text-left shadow-xs transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${isDragging ? "border-primary ring-2 ring-primary" : selected ? `${getComponentBorderClass(data.componentType)} ring-2 ring-primary/20` : "border-border hover:border-muted-foreground/40"} ${dimmed ? "opacity-40" : "opacity-100"} ${isLocked ? "cursor-default" : "cursor-pointer"}`}
			style={{ left: item.x, top: item.y, width: item.width, height: TOKEN_NODE_HEIGHT }}
		>
			<span className={`flex size-5 shrink-0 items-center justify-center rounded-md ${meta.bgClass} text-background`}>
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
			{swatchColor && <span className="size-3.5 shrink-0 rounded-[3px] border border-border" style={{ backgroundColor: swatchColor }} aria-hidden="true" />}
			{valueLabel && <span className="max-w-[35%] min-w-0 shrink truncate font-mono text-[10px] text-muted-foreground">{valueLabel}</span>}
			{issues.length > 0 && (
				<span title={issueSummary} className="flex size-4 shrink-0 items-center justify-center text-destructive" aria-hidden="true">
					<AlertTriangle className="size-3.5" />
				</span>
			)}
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
					className="flex size-4 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground active:cursor-grabbing focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [-webkit-user-drag:element]"
				>
					<GripVertical className="size-3.5" />
				</span>
			)}
			{!isLocked && onAddChild && (
				<div ref={menuRef} className="absolute flex items-center gap-1" style={{ left: "100%", top: "50%", transform: "translateY(-50%)" }}>
					<button
						type="button"
						disabled={allowedChildren.length === 0}
						aria-label={allowedChildren.length > 0 ? `Add a child to ${displayName}` : `Can't add a child to ${displayName}`}
						title={allowedChildren.length > 0 ? "Add a child" : "No child types allowed"}
						onClick={(event) => {
							event.stopPropagation();
							setMenuOpen((open) => !open);
						}}
						className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-workspace text-muted-foreground shadow-xs transition-opacity focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${allowedChildren.length > 0 ? (menuOpen ? "opacity-100" : "opacity-0 hover:border-muted-foreground hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100") : "cursor-not-allowed opacity-0 group-hover:opacity-40"}`}
					>
						<Plus className="size-4" />
					</button>
					{menuOpen &&
						allowedChildren.map((option) => {
							const optionMeta = getComponentTypeMeta(option.type);
							const OptionIcon = optionMeta.icon;
							return (
								<button
									key={option.type}
									type="button"
									title={`Add a ${optionMeta.label.toLowerCase()}${option.requiresMainComponent ? " (needs a main component)" : ""}`}
									onClick={(event) => {
										event.stopPropagation();
										onAddChild(item.node, option.type);
										setMenuOpen(false);
									}}
									className={`flex size-7 shrink-0 items-center justify-center rounded-full ${optionMeta.bgClass} text-background shadow-md transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring`}
								>
									<OptionIcon className="size-4" />
								</button>
							);
						})}
				</div>
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
export const GridView = ({ nodes, edges, selectedNodeId, onNodeSelect, onSwitchToCanvas, isLocked = false, onUndo, onRedo, onReorder, onDeleteEdge, onReconnectEdge, onAddChild, visibleTypes, revealNodeId = null, onRevealComplete }: GridViewProps) => {
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
	const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);
	const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);
	const [reconnectDrag, setReconnectDragState] = useState<ReconnectDrag | null>(null);
	const [columnWidths, setColumnWidths] = useState<Record<number, number>>(readStoredColumnWidths);
	const [resizingDepth, setResizingDepth] = useState<number | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const headerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<number | null>(null);
	const columnResizeRef = useRef<{ depth: number; startX: number; startWidth: number; pointerId: number } | null>(null);
	// Safari/WKWebView can deliver `dragover` before React commits the state
	// update from `dragstart`, so keep synchronous copies of the dragged ids.
	const draggedItemIdRef = useRef<string | null>(null);
	const draggedNodeIdRef = useRef<string | null>(null);
	// The pointer handlers read the live drag state without re-subscribing on
	// every move, and the release handler needs the latest hovered chip.
	const reconnectDragRef = useRef<ReconnectDrag | null>(null);
	// Only reveal a given node once, so later layout changes don't yank the
	// scroll position around.
	const lastRevealedNodeIdRef = useRef<string | null>(null);

	const setReconnectDrag = useCallback((next: ReconnectDrag | null) => {
		reconnectDragRef.current = next;
		setReconnectDragState(next);
	}, []);

	const activeNodeId = hoveredNodeId ?? selectedNodeId;

	// Keep the column labels aligned with the grid when it scrolls sideways.
	const handleGridScroll = useCallback(() => {
		const grid = scrollRef.current;
		const header = headerRef.current;
		if (!grid || !header) return;
		header.scrollLeft = grid.scrollLeft;
	}, []);

	// The committed layout. Drag previews are derived from this so the target
	// lookup stays stable while the rows are visually re-ordered.
	const baseLayout = useMemo(() => buildTokenLayout(nodes, edges, visibleTypes, columnWidths), [nodes, edges, visibleTypes, columnWidths]);

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

	const layout = useMemo(() => (previewNodes === nodes ? baseLayout : buildTokenLayout(previewNodes, edges, visibleTypes, columnWidths)), [previewNodes, nodes, edges, baseLayout, visibleTypes, columnWidths]);

	// A resize can shrink the scrollable width, and the browser may clamp the
	// grid's scroll position without firing a scroll event.
	useEffect(() => {
		handleGridScroll();
	}, [layout.totalWidth, handleGridScroll]);

	// Resolve swatches once per graph so alias tokens can show the color they
	// point at, not just their own (empty) value.
	const swatchByNodeId = useMemo(() => buildTokenSwatchMap(nodes, edges), [nodes, edges]);

	useEffect(() => {
		// Debounce so a drag doesn't hit localStorage on every pointer move.
		const timeout = window.setTimeout(() => {
			try {
				window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
			} catch {
				// Storage can be unavailable (private mode, quota); widths still work for the session.
			}
		}, 200);

		return () => window.clearTimeout(timeout);
	}, [columnWidths]);

	// A resize drag owns the pointer, so keep the resize cursor and suppress
	// text selection until it ends.
	useEffect(() => {
		if (resizingDepth === null) return;

		const previousUserSelect = document.body.style.userSelect;
		const previousCursor = document.body.style.cursor;
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.body.style.userSelect = previousUserSelect;
			document.body.style.cursor = previousCursor;
		};
	}, [resizingDepth]);

	const handleColumnResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>, depth: number, width: number) => {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		columnResizeRef.current = { depth, startX: event.clientX, startWidth: width, pointerId: event.pointerId };
		setResizingDepth(depth);
	}, []);

	const handleColumnResizeMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		const current = columnResizeRef.current;
		if (!current || event.pointerId !== current.pointerId) return;

		const next = clampColumnWidth(current.startWidth + event.clientX - current.startX);
		setColumnWidths((widths) => (widths[current.depth] === next ? widths : { ...widths, [current.depth]: next }));
	}, []);

	const handleColumnResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		const current = columnResizeRef.current;
		if (!current || event.pointerId !== current.pointerId) return;

		columnResizeRef.current = null;
		setResizingDepth(null);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
	}, []);

	const resetColumnWidth = useCallback((depth: number) => {
		setColumnWidths((widths) => {
			if (!(depth in widths)) return widths;
			const next = { ...widths };
			delete next[depth];
			return next;
		});
	}, []);

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
				if (x < item.x - padding || x > item.x + item.width + padding) continue;
				if (y < item.y - padding || y > item.y + TOKEN_NODE_HEIGHT + padding) continue;

				const dx = x - (item.x + item.width / 2);
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
		// A newly created node is centered by the reveal effect below.
		if (revealNodeId === selectedNodeId) return;

		const item = layout.items.find((entry) => entry.node.id === selectedNodeId);
		const container = scrollRef.current;
		if (!item || !container) return;

		const itemTop = TOKEN_HEADER_HEIGHT + item.y;
		const itemBottom = itemTop + TOKEN_NODE_HEIGHT;
		const visibleTop = container.scrollTop + TOKEN_HEADER_HEIGHT;
		const visibleBottom = container.scrollTop + container.clientHeight;

		if (itemTop < visibleTop || itemBottom > visibleBottom) {
			const target = itemTop - TOKEN_HEADER_HEIGHT - (container.clientHeight - TOKEN_NODE_HEIGHT) / 2;
			container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
		}
	}, [selectedNodeId, layout.items, revealNodeId]);

	// Center a newly created node's row in the scroll area. This runs once per
	// reveal id so editing the node afterwards doesn't move the viewport.
	useEffect(() => {
		if (!revealNodeId) return;
		if (lastRevealedNodeIdRef.current === revealNodeId) return;

		const item = layout.items.find((entry) => entry.node.id === revealNodeId);
		const container = scrollRef.current;
		if (!item || !container) return;

		lastRevealedNodeIdRef.current = revealNodeId;
		const rowCenter = ((item.rowStart + item.rowEnd + 1) * TOKEN_ROW_HEIGHT) / 2;
		// Center within the area below the sticky header, not the full container.
		const visibleCenter = TOKEN_HEADER_HEIGHT + (container.clientHeight - TOKEN_HEADER_HEIGHT) / 2;
		const target = rowCenter - visibleCenter;
		container.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
		onRevealComplete?.();
	}, [revealNodeId, layout.items, onRevealComplete]);

	if (layout.items.length === 0) {
		const hasNodes = nodes.some((node) => !node.hidden);
		const hasVisibleTypes = visibleTypes.size > 0;
		const title = !hasNodes ? "Nothing to map yet" : !hasVisibleTypes ? "No node types selected" : "No nodes match the current filters";
		const description = !hasNodes ? "Add components, variants, or tokens from the Add menu or the canvas, then connect them. They'll appear here as a structured map." : !hasVisibleTypes ? "Turn on a node type in the header to see it in the map." : "The current filters hide every node. Turn on a node type in the header to see it.";

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
			<div ref={headerRef} className="shrink-0 overflow-x-hidden border-b border-border bg-canvas/95 backdrop-blur" style={{ height: TOKEN_HEADER_HEIGHT }}>
				<div className="flex h-full" style={{ width: layout.totalWidth + GRID_SCROLL_PADDING_X * 2 }}>
					{layout.columns.map((column) => (
						<div key={column.depth} className="relative flex shrink-0 items-center justify-between gap-2 border-r px-6 last:border-r-0" style={{ width: column.width }}>
							<span className="truncate text-xs font-medium text-foreground">{column.label}</span>
							<span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{column.count}</span>
							<div
								role="separator"
								aria-orientation="vertical"
								aria-label={`Resize ${column.label ? `${column.label} ` : ""}column`}
								aria-valuenow={Math.round(column.width)}
								aria-valuemin={TOKEN_COLUMN_MIN_WIDTH}
								aria-valuemax={TOKEN_COLUMN_MAX_WIDTH}
								tabIndex={0}
								title="Drag to resize · double-click to reset"
								onPointerDown={(event) => handleColumnResizeStart(event, column.depth, column.width)}
								onPointerMove={handleColumnResizeMove}
								onPointerUp={handleColumnResizeEnd}
								onPointerCancel={handleColumnResizeEnd}
								onClick={(event) => event.stopPropagation()}
								onDoubleClick={(event) => {
									event.stopPropagation();
									resetColumnWidth(column.depth);
								}}
								onKeyDown={(event) => {
									if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
									event.preventDefault();
									event.stopPropagation();
									const step = event.shiftKey ? 32 : 8;
									const delta = event.key === "ArrowLeft" ? -step : step;
									setColumnWidths((widths) => {
										const current = widths[column.depth] ?? column.width;
										const next = clampColumnWidth(current + delta);
										return next === current ? widths : { ...widths, [column.depth]: next };
									});
								}}
								className={`absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none transition-colors hover:bg-primary/40 focus-visible:bg-primary/40 focus-visible:outline-hidden ${resizingDepth === column.depth ? "bg-primary/60" : "bg-transparent"}`}
							/>
						</div>
					))}
				</div>
			</div>

			<div ref={scrollRef} className="flex-1 overflow-auto px-3 pt-0.5 pb-24" onScroll={handleGridScroll}>
				<div className="relative min-w-full!" style={{ width: layout.totalWidth }}>
					<div
						ref={gridRef}
						className={`relative ${reconnectDrag ? "touch-none cursor-grabbing *:data-token-chip:pointer-events-none" : ""}`}
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
									x1={column.x}
									x2={column.x}
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
							<TokenChip key={item.id} item={item} selected={item.node.id === selectedNodeId} dimmed={!!activeNeighbors && !activeNeighbors.has(item.node.id) && item.node.id !== draggedNodeId && item.node.id !== dropTargetId} isLocked={isLocked} isDragging={item.id === draggedItemId} swatchColor={swatchByNodeId.get(item.node.id) ?? null} onSelect={onNodeSelect} onHover={handleChipHover} onReorder={onReorder} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onAddChild={onAddChild} />
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
											className="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-lg transition-colors hover:bg-destructive/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
											style={{ left: midX, top: midY }}
										>
											<X className="size-3.5" />
										</button>

										<button type="button" tabIndex={-1} aria-label="Reconnect source" title="Drag to reconnect" onPointerDown={(event) => startReconnect(event, link, "source")} onClick={(event) => event.stopPropagation()} onMouseEnter={() => showLinkControls(linkKey)} onMouseLeave={() => scheduleHideLinkControls(linkKey)} className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab rounded-full border-2 border-background bg-primary shadow transition-transform hover:scale-125 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" style={{ left: link.startX, top: link.startY }} />

										<button type="button" tabIndex={-1} aria-label="Reconnect target" title="Drag to reconnect" onPointerDown={(event) => startReconnect(event, link, "target")} onClick={(event) => event.stopPropagation()} onMouseEnter={() => showLinkControls(linkKey)} onMouseLeave={() => scheduleHideLinkControls(linkKey)} className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab rounded-full border-2 border-background bg-primary shadow transition-transform hover:scale-125 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing" style={{ left: link.endX, top: link.endY }} />
									</div>
								);
							})}

						{/* Live preview while an endpoint is being dragged. */}
						{reconnectDrag && (
							<svg className="pointer-events-none absolute inset-0" width={layout.totalWidth} height={layout.gridHeight} aria-hidden="true">
								<line x1={reconnectDrag.anchorX} y1={reconnectDrag.anchorY} x2={reconnectDrag.pointerX} y2={reconnectDrag.pointerY} stroke={reconnectDrag.color} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" opacity={0.9} />
								<circle cx={reconnectDrag.pointerX} cy={reconnectDrag.pointerY} r={5} fill={reconnectDrag.color} className="stroke-background" strokeWidth={2} />
								{reconnectHoverItem && <rect x={reconnectHoverItem.x - 2} y={reconnectHoverItem.y - 2} width={reconnectHoverItem.width + 4} height={TOKEN_NODE_HEIGHT + 4} rx={10} fill="none" stroke={reconnectDrag.hoverAllowed ? reconnectDrag.color : "hsl(var(--destructive))"} strokeWidth={2} strokeDasharray="4 3" />}
							</svg>
						)}

						{/* Explain why a hovered chip can't be used as the new parent. */}
						{reconnectDrag?.hoverReason && (
							<div className="pointer-events-none absolute z-50 max-w-60 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md" style={{ left: reconnectDrag.pointerX + 12, top: reconnectDrag.pointerY + 12 }}>
								{reconnectDrag.hoverReason}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
