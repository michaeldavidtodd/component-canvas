import type { ComponentNodeData, ComponentType, TokenKind } from "@/types/component";
import { getChildComponentType } from "@/lib/componentTypes";
import { isAliasToken } from "@/lib/tokenValues";

/** Minimal node shape needed to evaluate parent rules. */
export interface ParentNode {
	id: string;
	data: ComponentNodeData;
}

/**
 * How many parents a node may have, and which types are allowed.
 *
 * `allowed` maps a parent type to its maximum count. `Infinity` means the type
 * is unlimited. `maxTotal` caps the combined parent count.
 */
export interface ParentRule {
	/** Explanation shown when a parent isn't allowed. */
	description: string;
	allowed: Partial<Record<ComponentType, number>>;
	maxTotal: number;
	/** If set, only tokens of this kind are allowed as parents. */
	tokenKind?: "literal" | "alias";
}

const ALL_TYPES: ComponentType[] = ["main-component", "variant", "sub-component", "token", "instance"];

/** Node types that drive the structural breadcrumb. */
const STRUCTURAL_TYPES: ReadonlySet<ComponentType> = new Set(["main-component", "variant", "sub-component"]);

const allTypesUnlimited = (): Partial<Record<ComponentType, number>> =>
	Object.fromEntries(ALL_TYPES.map((type) => [type, Infinity])) as Partial<Record<ComponentType, number>>;

export const MAIN_COMPONENT_RULE: ParentRule = {
	description: "Main components can't have parents.",
	allowed: {},
	maxTotal: 0,
};

export const VARIANT_RULE: ParentRule = {
	description: "Variants can have one main component and multiple token parents.",
	allowed: { "main-component": 1, token: Infinity },
	maxTotal: Infinity,
};

export const SUB_COMPONENT_RULE: ParentRule = {
	description: "Sub components can have one main component or one variant parent.",
	allowed: { "main-component": 1, variant: 1 },
	maxTotal: 1,
};

export const TOKEN_LITERAL_RULE: ParentRule = {
	description: "Token literals can have unlimited parents of any type.",
	allowed: allTypesUnlimited(),
	maxTotal: Infinity,
};

export const TOKEN_ALIAS_RULE: ParentRule = {
	description: "Token aliases can only have one token literal parent.",
	allowed: { token: 1 },
	maxTotal: 1,
	tokenKind: "literal",
};

export const INSTANCE_RULE: ParentRule = {
	description: "Instances can have one main component or one variant parent.",
	allowed: { "main-component": 1, variant: 1 },
	maxTotal: 1,
};

export const getParentRule = (child: ComponentNodeData): ParentRule => {
	switch (child.componentType) {
		case "main-component":
			return MAIN_COMPONENT_RULE;
		case "variant":
			return VARIANT_RULE;
		case "sub-component":
			return SUB_COMPONENT_RULE;
		case "token":
			return isAliasToken(child.tokenKind) ? TOKEN_ALIAS_RULE : TOKEN_LITERAL_RULE;
		case "instance":
			return INSTANCE_RULE;
		default:
			return MAIN_COMPONENT_RULE;
	}
};

/** Whether the parent's type (and token kind, when relevant) is allowed at all. */
export const isParentTypeAllowed = (child: ParentNode, parent: ParentNode): boolean => {
	const rule = getParentRule(child.data);
	const maxForType = rule.allowed[parent.data.componentType] ?? 0;
	if (maxForType === 0) return false;
	if (rule.tokenKind && parent.data.componentType === "token" && isAliasToken(parent.data.tokenKind) !== (rule.tokenKind === "alias")) return false;
	return true;
};

export interface ParentCheck {
	allowed: boolean;
	reason?: string;
}

/**
 * Check whether `parent` can be added to `child` given its current parents.
 * Callers that are re-mapping an existing edge should exclude that edge from
 * `existingParents`.
 */
export const canAssignParent = (child: ParentNode, parent: ParentNode, existingParents: ParentNode[]): ParentCheck => {
	const rule = getParentRule(child.data);
	if (rule.maxTotal === 0) return { allowed: false, reason: rule.description };
	if (!isParentTypeAllowed(child, parent)) return { allowed: false, reason: rule.description };
	if (existingParents.some((candidate) => candidate.id === parent.id)) return { allowed: true };

	const maxForType = rule.allowed[parent.data.componentType] ?? 0;
	if (maxForType !== Infinity) {
		const existingOfType = existingParents.filter((candidate) => candidate.data.componentType === parent.data.componentType).length;
		if (existingOfType >= maxForType) return { allowed: false, reason: rule.description };
	}

	if (existingParents.length >= rule.maxTotal) return { allowed: false, reason: rule.description };

	return { allowed: true };
};

/** The type a child takes beneath `parent`, plus whether the rules allow it. */
export interface ChildDraftCheck {
	type: ComponentType;
	allowed: boolean;
	reason?: string;
	/** True when the child needs a main component parent before it can be created. */
	requiresMainComponent: boolean;
}

/**
 * Resolve the child a hovered parent would produce. A token literal produces an
 * alias token; a token alias produces a variant that uses the token. Variants
 * need a main component parent, so a token alias's draft starts incomplete
 * until one is assigned.
 */
export const getChildDraft = (parent: ParentNode): ChildDraftCheck => {
	const parentIsTokenAlias = parent.data.componentType === "token" && isAliasToken(parent.data.tokenKind);
	const type: ComponentType = parentIsTokenAlias ? "variant" : getChildComponentType(parent.data.componentType);
	const child: ParentNode = {
		id: "__draft__",
		data: {
			label: "",
			componentType: type,
			description: "",
			...(type === "token" ? { tokenKind: "alias" as const } : {}),
		},
	};
	const check = canAssignParent(child, parent, []);
	// A variant whose parent is already a main component is complete; a variant
	// hanging off a token still needs its main component assigned.
	const requiresMainComponent = type === "variant" && parent.data.componentType !== "main-component";
	return { type, allowed: check.allowed, reason: check.reason, requiresMainComponent };
};

/**
 * Whether a variant's parents include a token but no main component. A variant
 * that uses a token still needs the main component it belongs to.
 */
export const variantNeedsMainComponent = (parents: ParentNode[]): boolean =>
	parents.some((parent) => parent.data.componentType === "token") && !parents.some((parent) => parent.data.componentType === "main-component");

/** A child type that can be created beneath a parent, with its availability. */
export interface ChildTypeOption {
	type: ComponentType;
	/** Whether the parent rules allow this child type. */
	allowed: boolean;
	/** Explanation when the type isn't allowed. */
	reason?: string;
	/** True when a variant child needs a main component parent before it can be created. */
	requiresMainComponent: boolean;
	/** For token children, the kind to default to. */
	tokenKind?: TokenKind;
}

const CHILD_CANDIDATE_TYPES: ComponentType[] = ["main-component", "variant", "sub-component", "token", "instance"];

/**
 * Enumerate every child type that could be created beneath `parent`, with its
 * availability. Token children default to an alias when the parent is a token
 * literal, and to a literal when the parent is a token alias.
 */
export const getChildTypeOptions = (parent: ParentNode): ChildTypeOption[] => {
	const parentIsTokenAlias = parent.data.componentType === "token" && isAliasToken(parent.data.tokenKind);

	return CHILD_CANDIDATE_TYPES.map((type) => {
		const tokenKind: TokenKind | undefined = type === "token" ? (parentIsTokenAlias ? "literal" : "alias") : undefined;
		const child: ParentNode = {
			id: "__draft__",
			data: {
				label: "",
				componentType: type,
				description: "",
				...(tokenKind ? { tokenKind } : {}),
			},
		};
		const check = canAssignParent(child, parent, []);
		const requiresMainComponent = type === "variant" && parent.data.componentType !== "main-component";
		return { type, allowed: check.allowed, reason: check.reason, requiresMainComponent, tokenKind };
	});
};

/** Whether a parent contributes to the structural breadcrumb. */
export const isStructuralParent = (parent: ParentNode): boolean => STRUCTURAL_TYPES.has(parent.data.componentType);

/**
 * Pick the parent that should drive a node's breadcrumb. Structural parents win
 * so a variant with token parents still points at its main component.
 */
export const getPrimaryParentId = (parents: ParentNode[]): string | null => {
	const structural = parents.find(isStructuralParent);
	return structural?.id ?? parents[0]?.id ?? null;
};

/**
 * Toggle a parent in the properties panel. Single-slot rules replace the
 * existing parent; multi-slot rules replace a full type slot or append.
 */
export const toggleParent = (child: ParentNode, parent: ParentNode, existingParents: ParentNode[]): ParentNode[] => {
	if (existingParents.some((candidate) => candidate.id === parent.id)) {
		return existingParents.filter((candidate) => candidate.id !== parent.id);
	}

	const rule = getParentRule(child.data);
	if (rule.maxTotal === 0) return existingParents;
	if (!isParentTypeAllowed(child, parent)) return existingParents;

	if (rule.maxTotal === 1) return [parent];

	const maxForType = rule.allowed[parent.data.componentType] ?? 0;
	if (maxForType === 1) {
		return [...existingParents.filter((candidate) => candidate.data.componentType !== parent.data.componentType), parent];
	}

	return [...existingParents, parent];
};
