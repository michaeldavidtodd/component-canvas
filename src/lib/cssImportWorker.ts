import type { Edge, Node } from "@xyflow/react";

import type { ComponentNodeData } from "@/types/component";
import type { CssImportOptions, CssImportResult } from "@/lib/importCssTokens";
import type { CssImportWorkerRequest, CssImportWorkerResponse } from "@/workers/cssImport.worker";

/**
 * Client for the CSS import worker.
 *
 * The worker runs the parser, normalizer, and graph builder off the main thread
 * so the UI stays responsive. Nodes and edges are sanitized before posting
 * because React Flow attaches non-cloneable internals at runtime.
 */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (result: CssImportResult) => void; reject: (error: Error) => void }>();

/** Strip React Flow internals and functions so the payload is structured-cloneable. */
const sanitizeNode = (node: Node<ComponentNodeData>): Node<ComponentNodeData> => {
	const { internals: _internals, ...rest } = node as Node<ComponentNodeData> & { internals?: unknown };
	return rest;
};

const sanitizeEdge = (edge: Edge): Edge => {
	const { internals: _internals, ...rest } = edge as Edge & { internals?: unknown };
	return rest;
};

const getWorker = (): Worker => {
	if (worker) return worker;

	worker = new Worker(new URL("../workers/cssImport.worker.ts", import.meta.url), { type: "module" });

	worker.onmessage = (event: MessageEvent<CssImportWorkerResponse>) => {
		const { id } = event.data;
		const entry = pending.get(id);
		if (!entry) return;
		pending.delete(id);

		if ("error" in event.data) {
			entry.reject(new Error(event.data.error));
			return;
		}
		entry.resolve(event.data.result);
	};

	worker.onerror = (event) => {
		const error = new Error(event.message || "CSS import worker failed");
		// Drop the broken worker so the next import starts a fresh one.
		worker?.terminate();
		worker = null;
		for (const [id, entry] of pending) {
			entry.reject(error);
			pending.delete(id);
		}
	};

	return worker;
};

/** Run a CSS import in the worker. Rejects if the worker throws. */
export const runCssImport = (options: CssImportOptions): Promise<CssImportResult> =>
	new Promise((resolve, reject) => {
		const id = nextId++;
		pending.set(id, { resolve, reject });

		const request: CssImportWorkerRequest = {
			id,
			options: {
				...options,
				nodes: options.nodes.map(sanitizeNode),
				edges: options.edges.map(sanitizeEdge),
			},
		};

		try {
			getWorker().postMessage(request);
		} catch (error) {
			pending.delete(id);
			reject(error instanceof Error ? error : new Error("Could not start the CSS import worker"));
		}
	});

/** Terminate the worker. Call on unmount or when the import feature is disabled. */
export const disposeCssImportWorker = () => {
	worker?.terminate();
	worker = null;
	for (const [id, entry] of pending) {
		entry.reject(new Error("CSS import worker was disposed"));
		pending.delete(id);
	}
};
