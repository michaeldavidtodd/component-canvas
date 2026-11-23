import { describe, expect, it } from "vitest";

import { OPERATION_KINDS } from "@/lib/documentOperations";
import { DEFAULT_MODEL, PROPOSE_FIXES_TOOL, SYSTEM_PROMPT, buildChatRequest } from "./aiReview";

/** The shape of one `oneOf` branch in the operations schema. */
interface OperationBranch {
	properties: { op: { const: string } };
	required: string[];
}

interface ProposeFixesSchema {
	function: {
		parameters: {
			properties: {
				fixes: {
					items: {
						properties: {
							operations: { items: { oneOf: OperationBranch[] } };
						};
					};
				};
			};
		};
	};
}

const schema = PROPOSE_FIXES_TOOL as unknown as ProposeFixesSchema;

/** The `oneOf` branches that describe each operation the schema accepts. */
const operationBranches = (): OperationBranch[] => schema.function.parameters.properties.fixes.items.properties.operations.items.oneOf;

const request = (overrides: Record<string, unknown> = {}) => ({
	messages: [{ role: "user" as const, content: "Will this token structure hold up?" }],
	document: { nodes: [{ id: "token-1", label: "Brand" }], edges: [] },
	findings: [{ check: "unused-token", message: "Brand isn't used." }],
	...overrides,
});

describe("buildChatRequest", () => {
	it("falls back to the default model", () => {
		expect(buildChatRequest(request()).model).toBe(DEFAULT_MODEL);
	});

	it("uses a named model and trims whitespace", () => {
		expect(buildChatRequest(request({ model: "  openai/gpt-5.2  " })).model).toBe("openai/gpt-5.2");
	});

	it("always requests zero data retention and streaming", () => {
		const built = buildChatRequest(request());
		expect(built.provider).toEqual({ zdr: true });
		expect(built.stream).toBe(true);
	});

	it("injects the document and findings as a system message", () => {
		const built = buildChatRequest(request());
		const context = built.messages[1];
		expect(context.role).toBe("system");
		expect(context.content).toContain("token-1");
		expect(context.content).toContain("unused-token");
	});

	it("keeps the user's turns after the system messages", () => {
		const built = buildChatRequest(request());
		expect(built.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
		expect(built.messages).toHaveLength(3);
		expect(built.messages[2]).toEqual({ role: "user", content: "Will this token structure hold up?" });
	});

	it("sends the single propose_fixes tool", () => {
		const built = buildChatRequest(request());
		expect(built.tools).toHaveLength(1);
		expect(built.tools[0].function.name).toBe("propose_fixes");
	});
});

describe("propose_fixes schema", () => {
	it("accepts exactly the operation kinds the app can apply", () => {
		expect(operationBranches().map((branch) => branch.properties.op.const).sort()).toEqual([...OPERATION_KINDS].sort());
	});

	it("requires an operation's identifying fields", () => {
		for (const branch of operationBranches()) {
			expect(branch.required).toContain("op");
			expect(branch.required).toContain("nodeId");
		}
	});
});
