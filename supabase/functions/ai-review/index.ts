/**
 * Stateless proxy from the app to OpenRouter.
 *
 * The OpenRouter key lives in Supabase secrets and never reaches the client. The
 * gateway verifies the caller's JWT (`verify_jwt = true` in config.toml), so this
 * function does not re-implement auth. It forwards the request with zero data
 * retention enforced and streams the response back unchanged.
 */
import { buildChatRequest, type ReviewRequest } from "../_shared/aiReview.ts";
import { corsHeaders } from "../_shared/cors.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Extra origins from ALLOWED_ORIGINS (comma-separated). These are added to the
 * defaults in `_shared/cors.ts` rather than replacing them, so a production web
 * origin can be added without breaking the desktop shell or local dev.
 */
const configuredOrigins = (): string[] => {
	const configured = Deno.env.get("ALLOWED_ORIGINS");
	if (!configured) return [];
	return configured
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
};

const json = (body: unknown, status: number, origin: string | null): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders(origin, configuredOrigins()), "Content-Type": "application/json" },
	});

Deno.serve(async (request) => {
	const origin = request.headers.get("origin");

	if (request.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders(origin, configuredOrigins()) });
	}
	if (request.method !== "POST") {
		return json({ error: "Method not allowed" }, 405, origin);
	}

	try {
		const apiKey = Deno.env.get("OPENROUTER_API_KEY");
		if (!apiKey) {
			return json({ error: "OPENROUTER_API_KEY is not configured" }, 500, origin);
		}

		let body: ReviewRequest;
		try {
			body = await request.json();
		} catch {
			return json({ error: "Request body must be JSON" }, 400, origin);
		}
		if (!Array.isArray(body?.messages) || body.messages.length === 0) {
			return json({ error: "messages must be a non-empty array" }, 400, origin);
		}

		const chatRequest = buildChatRequest(body);

		let upstream: Response;
		try {
			upstream = await fetch(OPENROUTER_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"X-Title": "Design System Planner",
				},
				body: JSON.stringify(chatRequest),
				// Propagate the client's disconnect so stopping the response also stops
				// generation, rather than paying for tokens nobody reads.
				signal: request.signal,
			});
		} catch (error) {
			return json({ error: "OpenRouter request failed", model: chatRequest.model, detail: String(error) }, 502, origin);
		}

		if (!upstream.ok) {
			// Include the model so the client can name it when ZDR-only routing leaves
			// no provider for that model.
			const detail = await upstream.text();
			return json({ error: "OpenRouter rejected the request", model: chatRequest.model, status: upstream.status, detail }, upstream.status, origin);
		}

		return new Response(upstream.body, {
			status: 200,
			headers: {
				...corsHeaders(origin, configuredOrigins()),
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		// An unhandled throw would otherwise leave the runtime's bare 500 without
		// CORS headers, which the browser reports as "Load failed" with no detail.
		return json({ error: "The advisor function failed", detail: String(error) }, 500, origin);
	}
});
