/**
 * Origin of the hosted web app.
 *
 * In the Tauri desktop shell `window.location.origin` is `tauri://localhost`,
 * so share links and Supabase email redirects must point at the real web app.
 * Set `VITE_WEB_ORIGIN` for desktop builds; it falls back to the current origin
 * on the web.
 */
export const WEB_ORIGIN =
	(import.meta.env.VITE_WEB_ORIGIN as string | undefined)?.replace(/\/+$/, "") || window.location.origin;
