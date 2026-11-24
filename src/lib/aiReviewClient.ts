/**
 * Network layer for the AI review.
 *
 * Kept apart from `aiReviewStream` so the parsing module stays free of the
 * Supabase client. That client touches `localStorage` at import time, which the
 * Node test environment does not provide, so mixing them would make the pure
 * parsing untestable.
 */
import { supabase } from "@/integrations/supabase/client";
import { AI_REVIEW_URL } from "@/lib/supabaseEndpoint";
import { describeFailure, describeNetworkFailure, readReviewStream, type ChatTurn, type ReviewOutcome } from "@/lib/aiReviewStream";

/** Options for a review request. */
export interface StreamReviewOptions {
	/** The whitelisted document projection. */
	document: unknown;
	/** The deterministic audit findings. */
	findings: unknown;
	/** The conversation so far, without the document or findings context. */
	messages: ChatTurn[];
	/** Optional model override; the edge function falls back to its default. */
	model?: string;
	/** Aborts the request and the upstream generation. */
	signal?: AbortSignal;
	/** Called with each streamed narrative chunk. */
	onText?: (chunk: string) => void;
}

/**
 * Ask the advisor and stream the answer.
 *
 * The caller's JWT authorizes the edge function; it never reaches OpenRouter.
 * Passing an AbortSignal cancels the upstream generation, not just the read.
 */
export const streamReview = async (options: StreamReviewOptions): Promise<ReviewOutcome> => {
	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	if (!token) throw new Error("Sign in to ask the design-system advisor.");

	let response: Response;
	try {
		response = await fetch(AI_REVIEW_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: options.model,
				messages: options.messages,
				document: options.document,
				findings: options.findings,
			}),
			signal: options.signal,
		});
	} catch (cause) {
		// An abort is the caller's own doing; let it through so the UI can keep the
		// partial answer. Anything else is a transport failure with no status to read.
		if (options.signal?.aborted) throw cause;
		throw new Error(describeNetworkFailure(cause));
	}

	if (!response.ok) {
		throw new Error(describeFailure(response.status, await response.text()));
	}
	if (!response.body) throw new Error("The advisor returned no response body.");

	return readReviewStream(response.body, options.onText);
};
