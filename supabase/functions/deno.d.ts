/**
 * Minimal Deno globals for the edge functions.
 *
 * The app is typechecked with the DOM lib, which has no Deno types, and these
 * functions run on Deno rather than Node. Declaring only the APIs they use keeps
 * them typechecked (and the editor quiet) without pulling in Deno's full surface.
 * Add members here when a function starts using more of the Deno API.
 */
declare const Deno: {
	env: {
		get(key: string): string | undefined;
	};
	serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};
