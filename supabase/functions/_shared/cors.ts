/**
 * CORS for the edge functions.
 *
 * The JWT check (`verify_jwt = true`) is the security boundary; CORS only decides
 * which browser origins may read the response. The desktop shell and the dev
 * server both need to be listed, and the dev server's port is not fixed: Vite
 * falls back when 8080 is taken (AirPlay Receiver holds it on macOS), and the
 * desktop wrapper picks the next free port. A narrow allowlist turns those cases
 * into an opaque "Load failed" in the webview, so loopback origins are allowed on
 * any port.
 *
 * This module imports nothing, so it can be unit-tested outside the edge runtime.
 */

/** Origins the app itself is served from. */
export const DEFAULT_ALLOWED_ORIGINS = [
	// Tauri's custom protocol: `tauri://localhost` on macOS/Linux, and the
	// `http(s)://tauri.localhost` form on Windows/Android.
	"tauri://localhost",
	"http://tauri.localhost",
	"https://tauri.localhost",
	// Vite's documented dev ports.
	"http://localhost:8080",
	"http://localhost:5173",
];

/** Loopback origins on any port, so a dev server that falls back still works. */
const LOOPBACK_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

/** Whether a request origin may read the response. */
export const isAllowedOrigin = (origin: string, configured: readonly string[] = []): boolean =>
	DEFAULT_ALLOWED_ORIGINS.includes(origin) || LOOPBACK_ORIGIN.test(origin) || configured.includes(origin);

/** CORS headers for a request, echoing the origin only when it is allowed. */
export const corsHeaders = (origin: string | null, configured: readonly string[] = []): Record<string, string> => {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		Vary: "Origin",
	};
	if (origin && isAllowedOrigin(origin, configured)) {
		headers["Access-Control-Allow-Origin"] = origin;
	}
	return headers;
};
