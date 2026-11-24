/**
 * Parsing for the AI review's server-sent events.
 *
 * The proxy streams OpenRouter's SSE response through unchanged, so this module
 * owns two things: turning that byte stream into deltas, and assembling the
 * `propose_fixes` tool call the model emits. The narrative streams as text; the
 * fixes only exist once the tool call is complete, so a stopped response never
 * yields a half-parsed fix.
 *
 * This module imports no browser or Supabase code, so the parsing can be tested
 * against a synthetic ReadableStream in Node. The network layer lives in
 * `aiReviewClient`.
 */
import type { Operation } from "@/lib/documentOperations";

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
	role: ChatRole;
	content: string;
}

/** A fix the model proposed. `operations` are validated before they are applied. */
export interface ReviewFix {
	description: string;
	/** Every node the fix touches, as the model reported it. */
	nodeIds: string[];
	operations: Operation[];
}

/** What a completed review produced. */
export interface ReviewOutcome {
	/** The streamed narrative. Empty when the model answered only with a tool call. */
	text: string;
	/** The model's one-line summary of the fixes. Empty when it proposed none. */
	summary: string;
	fixes: ReviewFix[];
	/** Fixes the model proposed that could not be read as valid operations. */
	skipped: number;
}

/** The shape of one streamed tool-call fragment. */
export interface ToolCallFragment {
	index: number;
	id?: string;
	name?: string;
	arguments?: string;
}

/** A tool call after its fragments have been concatenated. */
export interface AssembledToolCall {
	id: string;
	name: string;
	arguments: string;
}

/** Text and/or a tool-call fragment carried by one streamed event. */
export interface StreamDelta {
	text?: string;
	toolCall?: ToolCallFragment;
}

/**
 * Split complete SSE events off the front of a buffer, returning the incomplete
 * tail. Normalizes CRLF first so a chunk boundary landing between `\r` and `\n`
 * still separates events correctly on the next read.
 */
export const splitSseBlocks = (buffer: string): { blocks: string[]; rest: string } => {
	const parts = buffer.replace(/\r\n/g, "\n").split("\n\n");
	const rest = parts.pop() ?? "";
	return { blocks: parts.filter((block) => block.trim() !== ""), rest };
};

/** Read the `data:` payload of one SSE event, or null when it carries none. */
export const sseData = (block: string): string | null => {
	const lines = block
		.split("\n")
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice("data:".length).replace(/^ /, ""));
	return lines.length === 0 ? null : lines.join("\n");
};

/** Pull the text and tool-call parts out of one OpenRouter chunk. */
export const readDelta = (payload: unknown): StreamDelta => {
	const choices = (payload as { choices?: unknown }).choices;
	if (!Array.isArray(choices) || choices.length === 0) return {};
	const delta = (choices[0] as { delta?: unknown }).delta;
	if (typeof delta !== "object" || delta === null) return {};

	const result: StreamDelta = {};
	const content = (delta as { content?: unknown }).content;
	if (typeof content === "string" && content.length > 0) result.text = content;

	const toolCalls = (delta as { tool_calls?: unknown }).tool_calls;
	if (Array.isArray(toolCalls) && toolCalls.length > 0) {
		const raw = toolCalls[0] as { index?: unknown; id?: unknown; function?: { name?: unknown; arguments?: unknown } };
		const call = raw.function ?? {};
		result.toolCall = {
			index: typeof raw.index === "number" ? raw.index : 0,
			id: typeof raw.id === "string" ? raw.id : undefined,
			name: typeof call.name === "string" ? call.name : undefined,
			arguments: typeof call.arguments === "string" ? call.arguments : undefined,
		};
	}

	return result;
};

/** Concatenate streamed fragments into whole tool calls, ordered by index. */
export const assembleToolCalls = (fragments: ToolCallFragment[]): AssembledToolCall[] => {
	const byIndex = new Map<number, AssembledToolCall>();
	for (const fragment of fragments) {
		const current = byIndex.get(fragment.index) ?? { id: "", name: "", arguments: "" };
		byIndex.set(fragment.index, {
			id: fragment.id ?? current.id,
			name: fragment.name ?? current.name,
			arguments: current.arguments + (fragment.arguments ?? ""),
		});
	}
	return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
};

/** Whether a parsed value is one of the operations the app can apply. */
const isOperation = (value: unknown): value is Operation => {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as { op?: unknown; nodeId?: unknown; data?: unknown; parentIds?: unknown };
	if (typeof candidate.nodeId !== "string") return false;
	switch (candidate.op) {
		case "deleteNode":
			return true;
		case "updateNode":
			return typeof candidate.data === "object" && candidate.data !== null;
		case "setParents":
			return Array.isArray(candidate.parentIds) && candidate.parentIds.every((id) => typeof id === "string");
		default:
			return false;
	}
};

/** A proposal as parsed from the tool call. */
export interface ParsedProposal {
	summary: string;
	fixes: ReviewFix[];
	skipped: number;
}

/**
 * Read a `propose_fixes` tool call into fixes.
 *
 * Returns null when the call is a different tool or its arguments are not JSON.
 * Fixes whose operations are structurally invalid are dropped and counted in
 * `skipped`, so a partly-garbled proposal cannot half-apply.
 */
export const parseProposal = (call: AssembledToolCall): ParsedProposal | null => {
	if (call.name !== "propose_fixes") return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(call.arguments);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null) return null;

	const summary = (parsed as { summary?: unknown }).summary;
	const rawFixes = (parsed as { fixes?: unknown }).fixes;
	if (!Array.isArray(rawFixes)) return null;

	const fixes: ReviewFix[] = [];
	let skipped = 0;
	for (const raw of rawFixes) {
		if (typeof raw !== "object" || raw === null) {
			skipped += 1;
			continue;
		}
		const fix = raw as { description?: unknown; nodeIds?: unknown; operations?: unknown };
		const operations = Array.isArray(fix.operations) ? fix.operations : [];
		if (typeof fix.description !== "string" || operations.length === 0 || !operations.every(isOperation)) {
			skipped += 1;
			continue;
		}
		fixes.push({
			description: fix.description,
			nodeIds: Array.isArray(fix.nodeIds) ? fix.nodeIds.filter((id): id is string => typeof id === "string") : [],
			operations,
		});
	}

	return { summary: typeof summary === "string" ? summary : "", fixes, skipped };
};

/**
 * Turn the SSE body into a completed review.
 *
 * Text is reported as it arrives so the UI can stream the narrative. The tool
 * call is only assembled after the stream ends, so an aborted response produces
 * text and no fixes.
 */
export const readReviewStream = async (body: ReadableStream<Uint8Array>, onText?: (chunk: string) => void): Promise<ReviewOutcome> => {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	const fragments: ToolCallFragment[] = [];
	let buffer = "";
	let text = "";
	let finished = false;

	try {
		while (!finished) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });

			const { blocks, rest } = splitSseBlocks(buffer);
			buffer = rest;
			for (const block of blocks) {
				const data = sseData(block);
				if (data === null) continue;
				if (data === "[DONE]") {
					finished = true;
					break;
				}
				let payload: unknown;
				try {
					payload = JSON.parse(data);
				} catch {
					continue;
				}
				const delta = readDelta(payload);
				if (delta.text) {
					text += delta.text;
					onText?.(delta.text);
				}
				if (delta.toolCall) fragments.push(delta.toolCall);
			}
		}
	} finally {
		// Releasing the lock lets the caller abort the fetch without leaving the
		// stream hanging.
		reader.releaseLock();
	}

	const proposal = assembleToolCalls(fragments)
		.map(parseProposal)
		.find((parsed): parsed is ParsedProposal => parsed !== null);

	return {
		text,
		summary: proposal?.summary ?? "",
		fixes: proposal?.fixes ?? [],
		skipped: proposal?.skipped ?? 0,
	};
};


/**
 * Turn a fetch-level failure into a message a person can act on.
 *
 * A blocked request (CORS, offline, DNS) rejects the fetch itself, so there is no
 * status or body to report. WebKit renders that as the bare "Load failed", which
 * says nothing about the cause.
 */
export const describeNetworkFailure = (cause: unknown): string => {
	const detail = cause instanceof Error ? cause.message : String(cause);
	return `Couldn't reach the advisor service. This is usually a network problem or a CORS rejection: check that the ai-review function is deployed and that this app's origin is allowed. (${detail})`;
};

/**
 * Turn a failed response into a message a person can act on.
 *
 * A zero-data-retention-only request fails when no provider for the chosen model
 * offers ZDR, so that case is named explicitly rather than surfaced as a generic
 * HTTP error. A missing server secret is likewise named, since it is a setup
 * problem the person can fix rather than a transient failure.
 */
export const describeFailure = (status: number, body: string): string => {
	try {
		const parsed = JSON.parse(body) as { detail?: unknown; error?: unknown; model?: unknown };
		const detail = typeof parsed.detail === "string" ? parsed.detail : "";
		const error = typeof parsed.error === "string" ? parsed.error : "";
		const model = typeof parsed.model === "string" ? parsed.model : "";
		if (/no allowed providers|no provider|zero data retention|zdr/i.test(detail)) {
			return `No zero-data-retention provider is available for ${model || "that model"}. Choose another model, or allow non-ZDR routing.`;
		}
		if (error === "OPENROUTER_API_KEY is not configured") {
			return "The advisor isn't configured: the ai-review function has no OPENROUTER_API_KEY secret. Set it with `supabase secrets set OPENROUTER_API_KEY=…` and try again.";
		}
		if (detail) return `The advisor request failed (${status}). ${detail}`;
		if (error) return `The advisor request failed (${status}). ${error}`;
	} catch {
		// Not JSON; fall through to the raw body.
	}
	const trimmed = body.trim();
	return trimmed ? `The advisor request failed (${status}). ${trimmed}` : `The advisor request failed (${status}).`;
};

