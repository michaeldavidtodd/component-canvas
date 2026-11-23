import { describe, expect, it } from "vitest";

import {
	assembleToolCalls,
	describeFailure,
	parseProposal,
	readDelta,
	readReviewStream,
	splitSseBlocks,
	sseData,
} from "@/lib/aiReviewStream";

/** Build a stream from string chunks, as the network would deliver them. */
const streamOf = (chunks: string[]): ReadableStream<Uint8Array> => {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
};

/** One SSE block carrying a JSON payload. */
const event = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

const textChunk = (text: string) => event({ choices: [{ delta: { content: text } }] });

const toolChunk = (fragment: Record<string, unknown>) => event({ choices: [{ delta: { tool_calls: [fragment] } }] });

describe("splitSseBlocks", () => {
	it("separates complete events and keeps the incomplete tail", () => {
		const { blocks, rest } = splitSseBlocks("data: a\n\ndata: b\n\ndata: c");
		expect(blocks).toEqual(["data: a", "data: b"]);
		expect(rest).toBe("data: c");
	});

	it("normalizes CRLF so a split pair still separates", () => {
		const { blocks, rest } = splitSseBlocks("data: a\r\n\r\ndata: b\r\n");
		expect(blocks).toEqual(["data: a"]);
		// The trailing newline is half of a separator, so it stays in the tail.
		expect(rest).toBe("data: b\n");
	});

	it("returns no blocks for a partial event", () => {
		expect(splitSseBlocks("data: a").blocks).toEqual([]);
	});
});

describe("sseData", () => {
	it("reads the payload after the colon and space", () => {
		expect(sseData("data: {\"a\":1}")).toBe("{\"a\":1}");
	});

	it("joins multiple data lines per the SSE spec", () => {
		expect(sseData("data: one\ndata: two")).toBe("one\ntwo");
	});

	it("returns null for a block with no data line", () => {
		expect(sseData(": keep-alive")).toBeNull();
	});
});

describe("readDelta", () => {
	it("reads streamed text", () => {
		expect(readDelta({ choices: [{ delta: { content: "Hello" } }] }).text).toBe("Hello");
	});

	it("reads a tool-call fragment", () => {
		const delta = readDelta({
			choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "propose_fixes", arguments: "{" } }] } }],
		});
		expect(delta.toolCall).toEqual({ index: 0, id: "call_1", name: "propose_fixes", arguments: "{" });
	});

	it("ignores a chunk with no choices", () => {
		expect(readDelta({ choices: [] })).toEqual({});
	});
});

describe("assembleToolCalls", () => {
	it("concatenates argument fragments across chunks", () => {
		const calls = assembleToolCalls([
			{ index: 0, id: "call_1", name: "propose_fixes", arguments: "{\"summary\":" },
			{ index: 0, arguments: "\"Hi\"}" },
		]);
		expect(calls).toEqual([{ id: "call_1", name: "propose_fixes", arguments: "{\"summary\":\"Hi\"}" }]);
	});

	it("keeps separate calls in index order", () => {
		const calls = assembleToolCalls([
			{ index: 1, id: "b", name: "propose_fixes", arguments: "{}" },
			{ index: 0, id: "a", name: "propose_fixes", arguments: "{}" },
		]);
		expect(calls.map((call) => call.id)).toEqual(["a", "b"]);
	});
});

describe("parseProposal", () => {
	const call = (argumentsJson: string, name = "propose_fixes") => ({ id: "call_1", name, arguments: argumentsJson });

	it("reads a valid fix", () => {
		const parsed = parseProposal(
			call(
				JSON.stringify({
					summary: "Remove the unused brand token.",
					fixes: [{ description: "Delete Brand", nodeIds: ["token-1"], operations: [{ op: "deleteNode", nodeId: "token-1" }] }],
				}),
			),
		);
		expect(parsed?.summary).toBe("Remove the unused brand token.");
		expect(parsed?.fixes).toHaveLength(1);
		expect(parsed?.skipped).toBe(0);
	});

	it("drops a fix whose operations are structurally invalid", () => {
		const parsed = parseProposal(
			call(
				JSON.stringify({
					summary: "Mixed",
					fixes: [
						{ description: "Good", operations: [{ op: "deleteNode", nodeId: "a" }] },
						{ description: "Bad", operations: [{ op: "deleteNode" }] },
					],
				}),
			),
		);
		expect(parsed?.fixes.map((fix) => fix.description)).toEqual(["Good"]);
		expect(parsed?.skipped).toBe(1);
	});

	it("returns null for a different tool", () => {
		expect(parseProposal(call("{}", "something_else"))).toBeNull();
	});

	it("returns null when the arguments are not JSON", () => {
		expect(parseProposal(call("not json"))).toBeNull();
	});
});

describe("readReviewStream", () => {
	it("streams text and assembles the fix once the stream ends", async () => {
		const seen: string[] = [];
		const outcome = await readReviewStream(
			streamOf([
				textChunk("Your token "),
				textChunk("structure is sound."),
				toolChunk({ index: 0, id: "call_1", function: { name: "propose_fixes", arguments: "{\"summary\":\"Tidy\"," } }),
				toolChunk({ index: 0, function: { arguments: "\"fixes\":[]}" } }),
				"data: [DONE]\n\n",
			]),
			(chunk) => seen.push(chunk),
		);

		expect(outcome.text).toBe("Your token structure is sound.");
		expect(seen).toEqual(["Your token ", "structure is sound."]);
		expect(outcome.summary).toBe("Tidy");
		expect(outcome.fixes).toEqual([]);
	});

	it("survives events split across chunk boundaries", async () => {
		const outcome = await readReviewStream(
			streamOf(['data: {"choices":[{"delta":{"content":"Hel', 'lo"}}]}\n\n']),
		);
		expect(outcome.text).toBe("Hello");
	});

	it("reports no fixes when the stream is cut before the tool call completes", async () => {
		const outcome = await readReviewStream(
			streamOf([textChunk("Thinking…"), toolChunk({ index: 0, id: "call_1", function: { name: "propose_fixes", arguments: "{\"summary\":" } })]),
		);
		expect(outcome.text).toBe("Thinking…");
		expect(outcome.fixes).toEqual([]);
	});
});

describe("describeFailure", () => {
	it("names the model when no ZDR provider is available", () => {
		const message = describeFailure(
			404,
			JSON.stringify({ error: "Not Found", detail: "No allowed providers are available for the selected model", model: "openai/gpt-5.2" }),
		);
		expect(message).toContain("openai/gpt-5.2");
		expect(message).toContain("zero-data-retention");
	});

	it("falls back to the raw body for a plain error", () => {
		expect(describeFailure(500, "boom")).toContain("boom");
	});
});
