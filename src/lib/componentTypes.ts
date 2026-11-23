import { Component, Copy, FolderTree, Layers, Palette, Square, type LucideIcon } from "lucide-react";

import type { ComponentType, TokenKind } from "@/types/component";
import { isAliasToken } from "@/lib/tokenValues";

/**
 * Single source of truth for how each node type is presented.
 *
 * The canvas node, add menu, legend, minimap, and version history all read from
 * this module so labels, icons, and colors stay in sync.
 */
export interface ComponentTypeMeta {
  type: ComponentType;
  /** Human-readable name shown in menus, legends, and summaries. */
  label: string;
  /** One-line explanation shown in the add menu. */
  description: string;
  icon: LucideIcon;
  /** Tailwind background utility for tiles and dots. */
  bgClass: string;
  /** Tailwind border utility for a selected node. */
  borderClass: string;
  /** Tailwind text utility matching the node's color. */
  textClass: string;
  /** CSS custom property holding the raw HSL channels, without the leading `--`. */
  colorVar: string;
}

export const COMPONENT_TYPE_META: Record<ComponentType, ComponentTypeMeta> = {
  "main-component": {
    type: "main-component",
    label: "Main Component",
    description: "The source of truth for a component",
    icon: Component,
    bgClass: "bg-component-main",
    borderClass: "border-component-main",
    textClass: "text-component-main",
    colorVar: "--component-main",
  },
  variant: {
    type: "variant",
    label: "Variant",
    description: "A state or size of a main component",
    icon: Layers,
    bgClass: "bg-component-variant",
    borderClass: "border-component-variant",
    textClass: "text-component-variant",
    colorVar: "--component-variant",
  },
  "sub-component": {
    type: "sub-component",
    label: "Sub Component",
    description: "A nested building block",
    icon: Square,
    bgClass: "bg-component-sub",
    borderClass: "border-component-sub",
    textClass: "text-component-sub",
    colorVar: "--component-sub",
  },
  token: {
    type: "token",
    label: "Design Token",
    description: "A shared color, spacing, or size value",
    icon: Palette,
    bgClass: "bg-component-token",
    borderClass: "border-component-token",
    textClass: "text-component-token",
    colorVar: "--component-token",
  },
	  instance: {
	    type: "instance",
	    label: "Instance",
	    description: "A usage of a component in a design",
	    icon: Copy,
	    bgClass: "bg-component-instance",
	    borderClass: "border-component-instance",
	    textClass: "text-component-instance",
	    colorVar: "--component-instance",
	  },
	  group: {
	    type: "group",
	    label: "Group",
	    description: "A collection of related nodes, such as an imported stylesheet",
	    icon: FolderTree,
	    bgClass: "bg-component-group",
	    borderClass: "border-component-group",
	    textClass: "text-component-group",
	    colorVar: "--component-group",
	  },
	};

/** Ordered list for palettes, docks, and legends. */
export const COMPONENT_TYPES: readonly ComponentTypeMeta[] = Object.values(COMPONENT_TYPE_META);

/**
 * The type a child node takes when it is created beneath a node of the given
 * type. Adding below a node builds the hierarchy downward, so the child's type
 * follows from its parent instead of defaulting to a main component.
 */
const CHILD_COMPONENT_TYPE: Record<ComponentType, ComponentType> = {
  "main-component": "variant",
  variant: "sub-component",
  "sub-component": "sub-component",
  token: "token",
  instance: "variant",
  group: "token",
};

/** Resolve the type for a node created as a child of `parentType`. */
export const getChildComponentType = (parentType: string): ComponentType => CHILD_COMPONENT_TYPE[parentType as ComponentType] ?? "main-component";

/**
 * Label shown at the top of a canvas node for its type. Tokens are split into
 * alias and literal so the two kinds are distinguishable at a glance.
 * `tokenKind` falls back to literal, matching the properties panel.
 */
export const getNodeTypeLabel = (type: string, tokenKind?: TokenKind): string => {
  if (type === "token") return isAliasToken(tokenKind) ? "Token Alias" : "Token Literal";
  return type.replace("-", " ");
};

/** Neutral fallback for node types read from persisted data. */
const FALLBACK_META: ComponentTypeMeta = {
  type: "main-component",
  label: "Unknown",
  description: "An unrecognized component type",
  icon: Component,
  bgClass: "bg-muted",
  borderClass: "border-border",
  textClass: "text-muted-foreground",
  colorVar: "--muted",
};

export const getComponentTypeMeta = (type: string): ComponentTypeMeta => COMPONENT_TYPE_META[type as ComponentType] ?? FALLBACK_META;

export const getComponentIcon = (type: string): LucideIcon => getComponentTypeMeta(type).icon;
export const getComponentBgClass = (type: string): string => getComponentTypeMeta(type).bgClass;
export const getComponentBorderClass = (type: string): string => getComponentTypeMeta(type).borderClass;
export const getComponentTextClass = (type: string): string => getComponentTypeMeta(type).textClass;

/** Resolved CSS color for places that need a value rather than a utility class, such as the minimap. */
export const getComponentColor = (type: string): string => `hsl(var(${getComponentTypeMeta(type).colorVar}))`;

// Connection/edge metadata lives in a worker-safe module so the CSS import
// worker can resolve edge colors without pulling in React or icon imports.
export {
  CONNECTION_TYPES,
  CONNECTION_TYPE_LIST,
  getConnectionType,
  getEdgeColor,
  type ConnectionKind,
  type ConnectionTypeMeta,
} from "@/lib/connectionTypes";
