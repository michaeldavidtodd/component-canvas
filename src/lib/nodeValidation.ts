import type { Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import { getDefaultTokenFormat, isAliasToken, isColorToken, isValidTokenValue } from "@/lib/tokenValues";

export interface NodeValidationIssue {
	/** Field the issue belongs to, e.g. "Value". */
	field: string;
	/** Short explanation shown in the chip tooltip. */
	message: string;
}

/**
 * Fields that can be saved in an invalid state. The properties panel validates
 * the same values, so the map can flag a node the user hasn't opened yet.
 */
export const getNodeValidationIssues = (node: Node<ComponentNodeData>): NodeValidationIssue[] => {
	const data = node.data;
	if (data.componentType !== "token" || isAliasToken(data.tokenKind) || !data.tokenValue) return [];

	const format = data.tokenFormat ?? (data.tokenType ? getDefaultTokenFormat(data.tokenType) : undefined);
	if (isValidTokenValue(data.tokenValue, format)) return [];

	const expected = isColorToken(data.tokenType) ? (format ?? "color").toUpperCase() : (format ?? "number");
	return [{ field: "Value", message: `"${data.tokenValue}" isn't a valid ${expected} value` }];
};
