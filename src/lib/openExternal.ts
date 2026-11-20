import { isTauri } from "@tauri-apps/api/core";

/**
 * Open a URL in the user's default browser.
 *
 * Tauri blocks `window.open` and would otherwise open the link inside the app
 * webview, so route through the opener plugin when running as a desktop app.
 */
export const openExternal = async (url: string): Promise<void> => {
	if (isTauri()) {
		const { openUrl } = await import("@tauri-apps/plugin-opener");
		await openUrl(url);
		return;
	}

	window.open(url, "_blank", "noopener,noreferrer");
};
