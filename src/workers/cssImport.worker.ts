import { buildCssImport, type CssImportOptions, type CssImportResult } from "@/lib/importCssTokens";

export interface CssImportWorkerRequest {
	id: number;
	options: CssImportOptions;
}

export type CssImportWorkerResponse = { id: number; result: CssImportResult } | { id: number; error: string };

self.onmessage = (event: MessageEvent<CssImportWorkerRequest>) => {
	const { id, options } = event.data;
	try {
		const result = buildCssImport(options);
		self.postMessage({ id, result } satisfies CssImportWorkerResponse);
	} catch (error) {
		self.postMessage({ id, error: error instanceof Error ? error.message : "Unknown CSS import error" } satisfies CssImportWorkerResponse);
	}
};
