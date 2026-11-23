/**
 * Request shaping for the AI review, kept free of Deno and browser globals so it
 * can be unit-tested and typechecked outside the edge runtime.
 *
 * This module deliberately imports nothing: the edge function bundles it for
 * Deno, where the app's `@/` path aliases do not resolve.
 */

/**
 * Models offered in the picker. Verified against the OpenRouter catalog to
 * support tool calling and structured outputs. Model ids churn, so this list is
 * a starting point rather than a contract.
 */
export const RECOMMENDED_MODELS = [
	"anthropic/claude-sonnet-4.5",
	"openai/gpt-5.2",
	"google/gemini-3.1-pro-preview",
	"deepseek/deepseek-v4.1-flash-1017",
] as const;

/** Used when the caller does not name a model. Strongest tool use in the list. */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

/**
 * The operation kinds the agent may propose. Kept in sync with the `Operation`
 * union in `src/lib/documentOperations.ts`; the matching test fails if they drift.
 */
export const PROPOSED_OPERATION_KINDS = ["deleteNode", "updateNode", "setParents"] as const;

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
	role: ChatRole;
	content: string;
}

/** A tool definition in the OpenAI-compatible shape. */
export interface ToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

/** The body the client posts to the edge function. */
export interface ReviewRequest {
	/** Optional model override; falls back to `DEFAULT_MODEL`. */
	model?: string;
	/** The conversation so far, without the system or document context. */
	messages: ChatMessage[];
	/** The whitelisted document projection. */
	document: unknown;
	/** The deterministic audit findings computed client-side. */
	findings: unknown;
}

/** The body sent to OpenRouter's chat completions endpoint. */
export interface OpenRouterRequest {
	model: string;
	messages: ChatMessage[];
	tools: ToolDefinition[];
	stream: true;
	provider: { zdr: true };
}

export const SYSTEM_PROMPT = `You are a design-system advisor embedded in a visual design-system planner. The user is mapping components, variants, and design tokens.

You receive the current document and a list of deterministic audit findings computed from it. Those findings are facts. Do not invent additional problems and do not recount them. Your job is to interpret them and answer questions.

When the user asks a question, answer in plain text. Be specific and brief, and name tokens and components by their labels.

When the user asks for a change, call the propose_fixes tool with concrete operations. Do not describe a change in prose when you could propose it. Keep each fix a minimal, reviewable unit.

Operations available:
- deleteNode: remove a node and its edges
- updateNode: change fields on a node
- setParents: replace a node's parents

Rules:
- Only propose operations the document supports. Reference node ids that exist.
- Never propose a change that contradicts the audit findings without saying why.
- If the request is ambiguous, ask a clarifying question in text instead of proposing fixes.`;

/**
 * The single tool the agent may call. Its parameter schema mirrors the
 * `Operation` union so the model can only express changes the app can apply.
 */
export const PROPOSE_FIXES_TOOL: ToolDefinition = {
	type: "function",
	function: {
		name: "propose_fixes",
		description:
			"Propose concrete changes to the design system. Call this instead of describing changes in prose when the user asks for an edit.",
		parameters: {
			type: "object",
			properties: {
				summary: {
					type: "string",
					description: "One or two sentences describing what the fixes achieve.",
				},
				fixes: {
					type: "array",
					description: "Minimal, independently reviewable changes.",
					items: {
						type: "object",
						properties: {
							description: { type: "string", description: "What this fix changes and why." },
							nodeIds: {
								type: "array",
								items: { type: "string" },
								description: "Every node the fix touches.",
							},
							operations: {
								type: "array",
								items: {
									oneOf: [
										{
											type: "object",
											properties: {
												op: { const: "deleteNode" },
												nodeId: { type: "string" },
											},
											required: ["op", "nodeId"],
										},
										{
											type: "object",
											properties: {
												op: { const: "updateNode" },
												nodeId: { type: "string" },
												data: {
													type: "object",
													description: "Fields to change on the node, e.g. label or tokenValue.",
												},
											},
											required: ["op", "nodeId", "data"],
										},
										{
											type: "object",
											properties: {
												op: { const: "setParents" },
												nodeId: { type: "string" },
												parentIds: { type: "array", items: { type: "string" } },
											},
											required: ["op", "nodeId", "parentIds"],
										},
									],
								},
							},
						},
						required: ["description", "operations"],
					},
				},
			},
			required: ["summary", "fixes"],
		},
	},
};

/**
 * Assemble the OpenRouter request.
 *
 * The document and findings are injected as a second system message so the
 * user's own turns stay clean. Zero data retention is always requested: the
 * document is the user's design system, and the product decision was to send it
 * only to providers that do not retain it.
 */
export const buildChatRequest = (request: ReviewRequest): OpenRouterRequest => ({
	model: request.model?.trim() || DEFAULT_MODEL,
	messages: [
		{ role: "system", content: SYSTEM_PROMPT },
		{
			role: "system",
			content: `Current document:\n${JSON.stringify(request.document)}\n\nDeterministic audit findings:\n${JSON.stringify(request.findings)}`,
		},
		...request.messages,
	],
	tools: [PROPOSE_FIXES_TOOL],
	stream: true,
	provider: { zdr: true },
});
