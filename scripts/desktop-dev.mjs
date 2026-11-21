#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// Tauri's `devUrl` is static, so it can't follow Vite's automatic port
// fallback. Pick a free port here and hand the same value to both processes.
const START_PORT = 8080;
const MAX_ATTEMPTS = 50;

const canBind = (port, host) =>
	new Promise((resolve) => {
		const server = createServer();
		server.unref();
		server.once("error", (error) => {
			// The address family isn't available on this machine; not a conflict.
			if (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") {
				resolve(null);
			} else {
				resolve(false);
			}
		});
		server.once("listening", () => server.close(() => resolve(true)));
		server.listen(port, host);
	});

// Vite binds to `::` (all interfaces), so probe that first. macOS services such
// as AirPlay Receiver listen on IPv6 only, which an IPv4-only probe would miss.
const isPortFree = async (port) => {
	const ipv6 = await canBind(port, "::");
	if (ipv6 === false) return false;

	const ipv4 = await canBind(port, "127.0.0.1");
	if (ipv4 === false) return false;

	// At least one address family must be available.
	return ipv6 === true || ipv4 === true;
};

let port = START_PORT;
while (port < START_PORT + MAX_ATTEMPTS && !(await isPortFree(port))) {
	port += 1;
}

if (port >= START_PORT + MAX_ATTEMPTS) {
	console.error(`No free port found between ${START_PORT} and ${START_PORT + MAX_ATTEMPTS - 1}.`);
	process.exit(1);
}

const configDir = mkdtempSync(join(tmpdir(), "component-canvas-"));
const configPath = join(configDir, "tauri.dev.conf.json");

// The dev server port can differ from the static 8080 in tauri.conf.json, so
// rebuild the dev CSP around the chosen port. Without this, HMR's WebSocket is
// blocked and the webview only updates when the whole app is restarted.
const devCsp = [
	`default-src 'self' http://localhost:${port}`,
	`img-src 'self' data: blob:`,
	`style-src 'self' 'unsafe-inline'`,
	`font-src 'self' data:`,
	`connect-src 'self' http://localhost:${port} ws://localhost:${port} ws://127.0.0.1:${port} ipc: http://ipc.localhost https://*.supabase.co wss://*.supabase.co`,
	`script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
].join("; ");

writeFileSync(
	configPath,
	JSON.stringify({
		build: { devUrl: `http://localhost:${port}` },
		app: { security: { devCsp } },
	}),
);

// WKWebView can keep serving a stale JS bundle across dev restarts even though
// Vite sends `Cache-Control: no-cache`. Clear only the network cache so modules
// are re-fetched; localStorage (and the auth session) is preserved.
if (process.platform === "darwin") {
	const networkCache = join(homedir(), "Library", "Caches", "app", "WebKit", "NetworkCache");
	try {
		rmSync(networkCache, { recursive: true, force: true });
	} catch {
		// A previous app instance may still hold the cache; it will clear next time.
	}
}

console.log(`Starting desktop dev server on port ${port}.`);

const child = spawn(`npx tauri dev --config "${configPath}"`, {
	stdio: "inherit",
	env: { ...process.env, TAURI_DEV_PORT: String(port) },
	shell: true,
});

child.on("error", (error) => {
	console.error("Failed to start Tauri:", error);
	rmSync(configDir, { recursive: true, force: true });
	process.exit(1);
});

child.on("exit", (code, signal) => {
	rmSync(configDir, { recursive: true, force: true });
	if (signal) {
		process.kill(process.pid, signal);
	} else {
		process.exit(code ?? 0);
	}
});
