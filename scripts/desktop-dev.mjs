#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
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
writeFileSync(configPath, JSON.stringify({ build: { devUrl: `http://localhost:${port}` } }));

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
