import { Node } from "@xyflow/react";
import { ComponentNodeData, ComponentType, TokenKind, TokenType, TokenSubType, TokenValueFormat } from "@/types/component";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Trash2, FileText } from "lucide-react";
import { Card } from "./ui/card";
import { Field } from "./ui/field";
import { getDefaultTokenFormat, getTokenFormatOptions, isAliasToken, isColorToken, isValidTokenValue, TOKEN_KIND_OPTIONS, toCssColor } from "@/lib/tokenValues";

interface PropertiesPanelProps {
	selectedNode: Node<ComponentNodeData> | null;
	onUpdateNode: (nodeId: string, updates: Partial<ComponentNodeData>) => void;
	onDeleteNode: () => void;
}

const componentTypeOptions: { value: ComponentType; label: string }[] = [
	{ value: "main-component", label: "Main Component" },
	{ value: "variant", label: "Variant" },
	{ value: "sub-component", label: "Sub Component" },
	{ value: "token", label: "Design Token" },
	{ value: "instance", label: "Instance" },
];

export const PropertiesPanel = ({ selectedNode, onUpdateNode, onDeleteNode }: PropertiesPanelProps) => {
	if (!selectedNode) {
		return (
			<Card className="flex-1 p-6 overflow-y-auto rounded-xl">
				<div className="flex items-center justify-center h-full">
					<div className="text-center">
						<FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
						<h3 className="text-sm font-medium text-foreground mb-1">No Selection</h3>
						<p className="text-xs text-muted-foreground text-balance">Select a component to view and edit its properties</p>
					</div>
				</div>
			</Card>
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
			tokenAlias: isAlias ? selectedNode.data.tokenAlias : undefined,
		});
	};

	const handleTokenFormatChange = (value: TokenValueFormat) => {
		onUpdateNode(selectedNode.id, { tokenFormat: value });
	};

	const handleTokenValueChange = (value: string) => {
		onUpdateNode(selectedNode.id, { tokenValue: value, tokenFormat });
	};

	const handleTokenAliasChange = (value: string) => {
		onUpdateNode(selectedNode.id, { tokenAlias: value });
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
	const tokenKindOption = TOKEN_KIND_OPTIONS.find((option) => option.value === tokenKind);
	const tokenFormat = selectedNode.data.tokenFormat || (tokenType ? getDefaultTokenFormat(tokenType) : undefined);
	const tokenFormatOptions = getTokenFormatOptions(tokenType);
	const tokenFormatPlaceholder = tokenFormatOptions.find((option) => option.value === tokenFormat)?.placeholder;
	const tokenValueIsInvalid = !!selectedNode.data.tokenValue && !isValidTokenValue(selectedNode.data.tokenValue, tokenFormat);
	const tokenColorPreview = isColorToken(tokenType) ? toCssColor(selectedNode.data.tokenValue, tokenFormat) : null;

	return (
		<Card className="flex-1 p-2 xl:p-6 flex flex-col gap-4 overflow-y-auto">
			<div>
				<h3 className="text-lg font-semibold text-foreground mb-1">Properties</h3>
				<p className="text-sm text-muted-foreground">Configure the selected component</p>
			</div>

			<div className="flex flex-col gap-4">
				<Field>
					<Label htmlFor="component-name">Component Name</Label>
					<Input id="component-name" value={selectedNode.data.label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Enter component name" className="mt-1" />
				</Field>

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
								<div className="w-0.5 h-6 mx-auto bg-secondary" />
								{tokenIsAlias ? (
									<Field>
										<Label htmlFor="token-alias" className="text-sm font-medium text-muted-foreground">
											Alias
										</Label>
										<Input id="token-alias" value={selectedNode.data.tokenAlias || ""} onChange={(e) => handleTokenAliasChange(e.target.value)} placeholder="color.brand.primary" />
										<p className="text-xs text-muted-foreground">Name of the token this references</p>
									</Field>
								) : (
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
								)}
							</>
						)}
					</div>
				)}
			</div>

			<div className="mt-auto pt-4 space-y-2">
				<Button variant="destructive" size="sm" onClick={onDeleteNode} className="w-full gap-2">
					<Trash2 className="w-4 h-4" />
					Delete Component
				</Button>
			</div>
		</Card>
	);
};
