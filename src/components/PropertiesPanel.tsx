import { useEffect, useMemo, useState } from "react";
import { Edge, Node } from "@xyflow/react";
import { ComponentNodeData, ComponentType, TokenKind, TokenType, TokenSubType, TokenValueFormat } from "@/types/component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, FileText, Plus, Trash2, X } from "lucide-react";
import { COMPONENT_TYPES, getComponentTypeMeta } from "@/lib/componentTypes";
import { getAncestorChain, type TitleLayer } from "@/lib/nodeHierarchy";
import { buildTokenLayout } from "@/lib/tokenLayout";
import { getParentRule, isParentTypeAllowed, toggleParent, variantNeedsMainComponent } from "@/lib/parentRules";
import { Card } from "./ui/card";
import { Field } from "./ui/field";
import { getDefaultTokenFormat, getTokenFormatOptions, isAliasToken, isColorToken, isValidTokenValue, TOKEN_KIND_OPTIONS, toCssColor } from "@/lib/tokenValues";

interface PropertiesPanelProps {
	selectedNode: Node<ComponentNodeData> | null;
	/** The grid occurrence that was clicked, when the selection came from the map. */
	selectedOccurrenceId?: string;
	nodes: Node<ComponentNodeData>[];
	edges: Edge[];
	visibleTypes: ReadonlySet<ComponentType>;
	onUpdateNode: (id: string, updates: Partial<ComponentNodeData>) => void;
	onDeleteNode: () => void;
	onSetParents: (id: string, parentIds: string[]) => void;
	/** When true, the panel edits a node that hasn't been added to the project yet. */
	draft?: boolean;
	/** Parent ids for the draft, which has no edges yet. */
	draftParentIds?: string[];
	onSaveDraft?: () => void;
	onCancelDraft?: () => void;
}

const componentTypeOptions: { value: ComponentType; label: string }[] = [
	{ value: "main-component", label: "Main Component" },
	{ value: "variant", label: "Variant" },
	{ value: "sub-component", label: "Sub Component" },
	{ value: "token", label: "Design Token" },
	{ value: "instance", label: "Instance" },
];

export const PropertiesPanel = ({ selectedNode, selectedOccurrenceId, nodes, edges, visibleTypes, onUpdateNode, onDeleteNode, onSetParents, draft = false, draftParentIds = [], onSaveDraft, onCancelDraft }: PropertiesPanelProps) => {
	const [parentOpen, setParentOpen] = useState(false);

	// Close the parent picker when the selection changes.
	useEffect(() => {
		setParentOpen(false);
	}, [selectedNode?.id]);

	const currentParents = useMemo(() => {
		if (!selectedNode) return [];
		const parentIds = new Set(draft ? draftParentIds : edges.filter((edge) => edge.target === selectedNode.id).map((edge) => edge.source));
		return nodes.filter((node) => parentIds.has(node.id));
	}, [selectedNode, nodes, edges, draft, draftParentIds]);

	const parentRule = selectedNode ? getParentRule(selectedNode.data) : null;

	// A variant that uses a token still needs the main component it belongs to,
	// so a draft can't be created until one is assigned.
	const needsMainComponent = draft && selectedNode?.data.componentType === "variant" && variantNeedsMainComponent(currentParents);

	// The structured map is needed to order the picker and to choose which parent
	// to show when the picker is closed. Compute it when either is needed.
	const layout = useMemo(() => {
		if (draft) return null;
		if (!parentOpen && currentParents.length <= 1) return null;
		return buildTokenLayout(nodes, edges, visibleTypes);
	}, [draft, parentOpen, currentParents.length, nodes, edges, visibleTypes]);

	// Visual order of the structured map, used to break ties between items that
	// share the same breadcrumb prefix.
	const gridOrder = useMemo(() => {
		if (!layout) return new Map<string, number>();
		const order = new Map<string, number>();
		const orderedItems = [...layout.items].sort((a, b) => a.rowStart - b.rowStart || a.x - b.x);
		orderedItems.forEach((item, index) => {
			if (!order.has(item.node.id)) order.set(item.node.id, index);
		});
		return order;
	}, [layout]);

	// When several parents are assigned, prefer the direct parent of the grid
	// occurrence that was clicked. That is the parent the chip is actually
	// displayed under in the structured map. Fall back to row proximity when the
	// selection didn't come from the map or the occurrence is no longer visible.
	const displayParent = useMemo(() => {
		if (!selectedNode || currentParents.length <= 1) return currentParents[0] ?? null;
		if (draft || !layout) return currentParents[0] ?? null;

		const parentById = new Map(currentParents.map((parent) => [parent.id, parent]));
		const itemById = new Map(layout.items.map((item) => [item.id, item]));

		if (selectedOccurrenceId) {
			const clickedItem = itemById.get(selectedOccurrenceId);
			if (clickedItem && clickedItem.node.id === selectedNode.id && clickedItem.parentItemId) {
				const directParentItem = itemById.get(clickedItem.parentItemId);
				const directParent = directParentItem ? parentById.get(directParentItem.node.id) : null;
				if (directParent) return directParent;
			}
		}

		let best: { parent: Node<ComponentNodeData>; distance: number; span: number; rowStart: number } | null = null;

		for (const childItem of layout.items) {
			if (childItem.node.id !== selectedNode.id) continue;
			const parentItem = childItem.parentItemId ? itemById.get(childItem.parentItemId) : null;
			if (!parentItem) continue;
			const parent = parentById.get(parentItem.node.id);
			if (!parent) continue;

			const childCenter = (childItem.rowStart + childItem.rowEnd) / 2;
			const parentCenter = (parentItem.rowStart + parentItem.rowEnd) / 2;
			const distance = Math.abs(childCenter - parentCenter);
			const span = parentItem.rowEnd - parentItem.rowStart;
			const rowStart = parentItem.rowStart;

			if (!best || distance < best.distance || (distance === best.distance && span < best.span) || (distance === best.distance && span === best.span && rowStart < best.rowStart)) {
				best = { parent, distance, span, rowStart };
			}
		}

		return best?.parent ?? currentParents[0] ?? null;
	}, [selectedNode, selectedOccurrenceId, currentParents, layout, draft]);

	// Resolve the picker groups. Descendants are excluded so choosing a parent
	// can't create a cycle.
	const parentGroups = useMemo(() => {
		if (!selectedNode || !parentOpen) return { groups: [], ancestorsById: new Map<string, TitleLayer[]>() };

		const childrenOf = new Map<string, string[]>();
		for (const edge of edges) {
			if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
			childrenOf.get(edge.source)!.push(edge.target);
		}

		const descendants = new Set<string>();
		const stack = [...(childrenOf.get(selectedNode.id) ?? [])];
		while (stack.length > 0) {
			const id = stack.pop()!;
			if (descendants.has(id)) continue;
			descendants.add(id);
			stack.push(...(childrenOf.get(id) ?? []));
		}

		const candidates = nodes.filter((node) => node.id !== selectedNode.id && !descendants.has(node.id) && isParentTypeAllowed(selectedNode, node));
		const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
		const ancestorsById = new Map<string, TitleLayer[]>();
		const prefixById = new Map<string, string>();
		for (const node of candidates) {
			const ancestors = getAncestorChain(node.id, nodeLookup, edges);
			ancestorsById.set(node.id, ancestors);

			const isToken = node.data.componentType === "token";
			const isAlias = isToken && isAliasToken(node.data.tokenKind);
			const tokenKindLabel = isToken ? (isAlias ? "Alias" : "Literal") : null;
			prefixById.set(node.id, [tokenKindLabel, ...ancestors.map((layer) => layer.label)].filter(Boolean).join(" / "));
		}

		// Prefix first, then the order the node occupies in the grid.
		const sortedCandidates = [...candidates].sort((a, b) => {
			const prefixCompare = (prefixById.get(a.id) ?? "").localeCompare(prefixById.get(b.id) ?? "", undefined, { numeric: true, sensitivity: "base" });
			if (prefixCompare !== 0) return prefixCompare;
			return (gridOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (gridOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER);
		});

		const groups = COMPONENT_TYPES.map((meta) => ({
			...meta,
			nodes: sortedCandidates.filter((node) => node.data.componentType === meta.type),
		})).filter((group) => group.nodes.length > 0);

		return { groups, ancestorsById };
	}, [selectedNode, parentOpen, nodes, edges, gridOrder]);

	if (!selectedNode) {
		return (
			<>
				{/*<Card className="flex-1 p-6 overflow-y-auto rounded-xl">
				<div className="flex items-center justify-center h-full">
					<div className="text-center">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
						<h3 className="text-sm font-medium text-foreground mb-1">No Selection</h3>
						<p className="text-xs text-muted-foreground text-balance">Select a component to view and edit its properties</p>
					</div>
				</div>
			</Card>*/}
			</>
		);
	}

	const handleLabelChange = (value: string) => {
		onUpdateNode(selectedNode.id, { label: value });
	};

	const handleDescriptionChange = (value: string) => {
		onUpdateNode(selectedNode.id, { description: value });
	};

	const handleUrlChange = (value: string) => {
		onUpdateNode(selectedNode.id, { url: value });
	};

	const handleTypeChange = (value: ComponentType) => {
		onUpdateNode(selectedNode.id, { componentType: value });
	};

	const handleParentToggle = (parentId: string) => {
		const parent = nodes.find((node) => node.id === parentId);
		if (!parent) return;

		const nextParents = toggleParent(selectedNode, parent, currentParents);
		onSetParents(
			selectedNode.id,
			nextParents.map((node) => node.id),
		);

		// Single-slot rules are done after one choice; multi-slot rules stay open.
		if (parentRule?.maxTotal === 1) setParentOpen(false);
	};

	const handleClearParents = () => {
		onSetParents(selectedNode.id, []);
		setParentOpen(false);
	};

	const handleTokenTypeChange = (value: TokenType) => {
		const isAlias = isAliasToken(selectedNode.data.tokenKind);
		onUpdateNode(selectedNode.id, {
			tokenType: value,
			tokenSubType: undefined, // Reset sub-type when main type changes
			tokenKind: selectedNode.data.tokenKind ?? "literal",
			tokenValue: undefined, // Value notation changes with the type
			tokenFormat: isAlias ? undefined : getDefaultTokenFormat(value),
		});
	};

	const handleTokenSubTypeChange = (value: TokenSubType) => {
		onUpdateNode(selectedNode.id, { tokenSubType: value });
	};

	const handleTokenKindChange = (value: TokenKind) => {
		const isAlias = isAliasToken(value);
		onUpdateNode(selectedNode.id, {
			tokenKind: value,
			// Keep the model honest: aliases have no value/unit, literals have no alias name.
			tokenValue: isAlias ? undefined : selectedNode.data.tokenValue,
			tokenFormat: isAlias ? undefined : selectedNode.data.tokenFormat,
			// The alias is the name, so carry the current name over when switching to alias.
			tokenAlias: isAlias ? selectedNode.data.tokenAlias || selectedNode.data.label : undefined,
		});
	};

	const handleTokenFormatChange = (value: TokenValueFormat) => {
		onUpdateNode(selectedNode.id, { tokenFormat: value });
	};

	const handleTokenValueChange = (value: string) => {
		onUpdateNode(selectedNode.id, { tokenValue: value, tokenFormat });
	};

	const handleTokenAliasChange = (value: string) => {
		// The alias is the component name for alias tokens, so keep both in sync.
		onUpdateNode(selectedNode.id, { tokenAlias: value, label: value });
	};

	// Token type options
	const tokenTypeOptions: { value: TokenType; label: string }[] = [
		{ value: "color", label: "Color" },
		{ value: "spacing", label: "Spacing" },
		{ value: "corner-radius", label: "Corner Radius" },
		{ value: "size", label: "Size" },
	];

	// Dynamic sub-type options based on selected token type
	const getTokenSubTypeOptions = (tokenType: TokenType): { value: TokenSubType; label: string }[] => {
		switch (tokenType) {
			case "color":
				return [
					{ value: "background", label: "Background" },
					{ value: "foreground", label: "Foreground" },
				];
			case "spacing":
				return [
					{ value: "padding", label: "Padding" },
					{ value: "margin", label: "Margin" },
					{ value: "gap", label: "Gap" },
				];
			case "size":
				return [
					{ value: "font-size", label: "Font Size" },
					{ value: "dimensions", label: "Dimensions" },
				];
			default:
				return [];
		}
	};

	// Resolved value notation for the currently selected token type
	const tokenType = selectedNode.data.tokenType;
	const tokenKind = selectedNode.data.tokenKind ?? "literal";
	const tokenIsAlias = isAliasToken(tokenKind);
	// Alias tokens use the alias as their name, so the separate name field is hidden.
	const usesAliasAsName = selectedNode.data.componentType === "token" && tokenIsAlias;
	const tokenKindOption = TOKEN_KIND_OPTIONS.find((option) => option.value === tokenKind);
	const tokenFormat = selectedNode.data.tokenFormat || (tokenType ? getDefaultTokenFormat(tokenType) : undefined);
	const tokenFormatOptions = getTokenFormatOptions(tokenType);
	const tokenFormatPlaceholder = tokenFormatOptions.find((option) => option.value === tokenFormat)?.placeholder;
	const tokenValueIsInvalid = !!selectedNode.data.tokenValue && !isValidTokenValue(selectedNode.data.tokenValue, tokenFormat);
	const tokenColorPreview = isColorToken(tokenType) ? toCssColor(selectedNode.data.tokenValue, tokenFormat) : null;

	const { groups: groupedParentCandidates, ancestorsById } = parentGroups;
	const displayParentMeta = displayParent ? getComponentTypeMeta(displayParent.data.componentType) : null;
	const DisplayParentIcon = displayParentMeta?.icon;

	return (
		<Card className="flex-1 p-2 xl:p-6 flex flex-col gap-4 overflow-y-auto">
			<div>
				<h3 className="text-lg font-semibold text-foreground mb-1">{draft ? "New component" : "Properties"}</h3>
				<p className="text-sm text-muted-foreground">{draft ? "Configure the component before adding it" : "Configure the selected component"}</p>
			</div>

			<div className="flex flex-col gap-4">
				{!usesAliasAsName && (
					<Field>
						<Label htmlFor="component-name">Component Name</Label>
						<Input id="component-name" value={selectedNode.data.label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Enter component name" className="mt-1" />
					</Field>
				)}

				<Field>
					<Label htmlFor="component-type" className="text-sm font-medium">
						Component Type
					</Label>
					<Select value={selectedNode.data.componentType} onValueChange={handleTypeChange}>
						<SelectTrigger className="mt-1">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{componentTypeOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</Field>

				{/* Parent connections, editable for every node type */}
				<Field>
					<Label htmlFor="parent-chip" className="text-sm font-medium">
						Parent Chip
					</Label>
					{parentRule?.maxTotal === 0 ? (
						<div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{parentRule.description}</div>
					) : (
						<>
							<Popover open={parentOpen} onOpenChange={setParentOpen}>
								<PopoverTrigger asChild>
									<Button id="parent-chip" variant="outline" role="combobox" className="w-full justify-between font-normal">
										{displayParent ? (
											<span className="flex min-w-0 items-center gap-2">
												<span className={`flex size-5 shrink-0 items-center justify-center rounded ${displayParentMeta?.bgClass ?? "bg-muted"} text-background`}>{DisplayParentIcon && <DisplayParentIcon className="size-3" />}</span>
												<span className="min-w-0 truncate">{displayParent.data.label}</span>
												{currentParents.length > 1 && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{currentParents.length - 1}</span>}
											</span>
										) : (
											<span className="text-muted-foreground">No parent assigned</span>
										)}
										<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
									<Command>
										<CommandInput placeholder="Search chips..." />
										<CommandList>
											<CommandEmpty>No eligible parents.</CommandEmpty>
											<CommandGroup heading="None">
												<CommandItem value="none" onSelect={handleClearParents}>
													<X className="mr-2 size-4 shrink-0" />
													No parent (detached)
													{currentParents.length === 0 && <Check className="ml-auto size-4 shrink-0" />}
												</CommandItem>
											</CommandGroup>
											{groupedParentCandidates.map((group) => {
												const GroupIcon = group.icon;
												return (
													<CommandGroup key={group.type} heading={group.label}>
														{group.nodes.map((node) => {
															const ancestors = ancestorsById.get(node.id) ?? [];
															const ancestorLabels = ancestors.map((layer) => layer.label).join(" ");
															const isToken = node.data.componentType === "token";
															const isAlias = isToken && isAliasToken(node.data.tokenKind);
															const displayName = isAlias && node.data.tokenAlias ? node.data.tokenAlias : node.data.label;
															const tokenKindLabel = isToken ? (isAlias ? "Alias" : "Literal") : null;
															const searchPrefix = [tokenKindLabel, ancestorLabels].filter(Boolean).join(" ");
															const isSelected = currentParents.some((parent) => parent.id === node.id);
															return (
																<CommandItem key={node.id} value={`${searchPrefix} ${displayName} ${group.label} ${node.id}`} onSelect={() => handleParentToggle(node.id)}>
																	<GroupIcon className={`mr-2 size-4 shrink-0 ${group.textClass}`} />
																	<span className="min-w-0 truncate">
																		{tokenKindLabel && (
																			<span className="opacity-60">
																				{tokenKindLabel}
																				<span className="px-1">/</span>
																			</span>
																		)}
																		{ancestors.map((layer) => (
																			<span key={layer.id} className="opacity-60">
																				{layer.label}
																				<span className="px-1">/</span>
																			</span>
																		))}
																		<span>{displayName}</span>
																	</span>
																	{isSelected && <Check className="ml-auto size-4 shrink-0" />}
																</CommandItem>
															);
														})}
													</CommandGroup>
												);
											})}
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							<p className="text-xs text-muted-foreground">{parentRule?.description}</p>
						</>
					)}
				</Field>

				<Field>
					<Label htmlFor="component-description" className="text-sm font-medium">
						Description
					</Label>
					<Textarea id="component-description" value={selectedNode.data.description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="Describe this component's purpose and usage" className="mt-1 min-h-[80px] resize-none" />
				</Field>

				{/* URL field for main components */}
				{selectedNode.data.componentType === "main-component" && (
					<Field>
						<Label htmlFor="component-url" className="text-sm font-medium">
							Figma component URL
						</Label>
						<Input id="component-url" value={selectedNode.data.url || ""} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://figma.com/..." className="mt-1" type="url" />
					</Field>
				)}

				{/* Token-specific fields */}
				{selectedNode.data.componentType === "token" && (
					<div>
						<Field>
							<Label htmlFor="token-type" className="text-sm font-medium">
								Token Type
							</Label>
							<Select value={selectedNode.data.tokenType || ""} onValueChange={handleTokenTypeChange}>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Select token type" />
								</SelectTrigger>
								<SelectContent>
									{tokenTypeOptions.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						{selectedNode.data.tokenType && getTokenSubTypeOptions(selectedNode.data.tokenType).length > 0 && (
							<>
								<div className="w-0.5 h-6 mx-auto bg-secondary" />
								<Field>
									<Label htmlFor="token-subtype" className="text-sm font-medium text-muted-foreground">
										{selectedNode.data.tokenType === "color" ? "Color Usage" : selectedNode.data.tokenType === "spacing" ? "Spacing Type" : selectedNode.data.tokenType === "size" ? "Size Type" : "Subtype"}
									</Label>
									<Select value={selectedNode.data.tokenSubType || ""} onValueChange={handleTokenSubTypeChange}>
										<SelectTrigger className="mt-1">
											<SelectValue placeholder="Select subtype" />
										</SelectTrigger>
										<SelectContent>
											{getTokenSubTypeOptions(selectedNode.data.tokenType).map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							</>
						)}

						{tokenType && (
							<>
								<div className="w-0.5 h-6 mx-auto bg-secondary" />
								<Field>
									<Label className="text-sm font-medium text-muted-foreground">Token Kind</Label>
									<ToggleGroup
										type="single"
										value={tokenKind}
										onValueChange={(value) => {
											if (value) handleTokenKindChange(value as TokenKind);
										}}
										className="mt-1 w-full rounded-full bg-background p-1"
									>
										{TOKEN_KIND_OPTIONS.map((option) => (
											<ToggleGroupItem key={option.value} value={option.value} size="sm" className="flex-1">
												{option.label}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
									{tokenKindOption && <p className="py-1 text-xs text-muted-foreground">{tokenKindOption.description}</p>}
								</Field>
							</>
						)}

						{tokenIsAlias && (
							<>
								<div className="w-0.5 h-6 mx-auto bg-secondary" />
								<Field>
									<Label htmlFor="token-alias" className="text-sm font-medium text-muted-foreground">
										Component Name
									</Label>
									<Input id="token-alias" value={selectedNode.data.tokenAlias || ""} onChange={(e) => handleTokenAliasChange(e.target.value)} placeholder="color.brand.primary" className="font-mono" />
									<p className="text-xs text-muted-foreground">Alias tokens are named after the token they reference</p>
								</Field>
							</>
						)}

						{!tokenIsAlias && tokenType && (
							<>
								<div className="w-0.5 h-6 mx-auto bg-secondary" />
								<div className="flex flex-row">
									<Field>
										<Label htmlFor="token-format" className="text-sm font-medium text-muted-foreground">
											{isColorToken(tokenType) ? "Color Format" : "Unit"}
										</Label>
										<Select value={tokenFormat} onValueChange={handleTokenFormatChange}>
											<SelectTrigger className="mt-1">
												<SelectValue placeholder="Select format" />
											</SelectTrigger>
											<SelectContent>
												{tokenFormatOptions.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
									<div>
										<div className="w-0.5 h-9 mx-auto bg-secondary" />
										<div className="w-6 h-0.5 mx-auto bg-secondary" />
									</div>
									<Field>
										<Label htmlFor="token-value" className="text-sm font-medium text-muted-foreground">
											Value
										</Label>
										<div className="flex items-center gap-2">
											{isColorToken(tokenType) && <span className="ml-2 size-6 shrink-0 rounded border border-border" style={{ backgroundColor: tokenColorPreview ?? "transparent" }} aria-hidden="true" />}
											<Input id="token-value" value={selectedNode.data.tokenValue || ""} onChange={(e) => handleTokenValueChange(e.target.value)} placeholder={tokenFormatPlaceholder} className="mt-0 border-x-0 border-b-0 rounded-xl" inputMode={isColorToken(tokenType) ? "text" : "decimal"} aria-invalid={tokenValueIsInvalid} />
										</div>
										{tokenValueIsInvalid && <p className="text-xs text-destructive mt-1">Enter a valid {isColorToken(tokenType) ? tokenFormat?.toUpperCase() : tokenFormat} value</p>}
									</Field>
								</div>
							</>
						)}
					</div>
				)}
			</div>

			<div className="mt-auto pt-4 space-y-2">
				{draft ? (
					<>
						<Button size="sm" onClick={onSaveDraft} className="w-full gap-2" disabled={!selectedNode.data.label.trim() || needsMainComponent}>
							<Plus className="w-4 h-4" />
							Create {getComponentTypeMeta(selectedNode.data.componentType).label}
						</Button>
						{needsMainComponent && <p className="text-xs text-muted-foreground">Assign a main component parent before creating this variant.</p>}
						<Button variant="outline" size="sm" onClick={onCancelDraft} className="w-full">
							Cancel
						</Button>
					</>
				) : (
					<Button variant="destructive" size="sm" onClick={onDeleteNode} className="w-full gap-2">
						<Trash2 className="w-4 h-4" />
						Delete Component
					</Button>
				)}
			</div>
		</Card>
	);
};
