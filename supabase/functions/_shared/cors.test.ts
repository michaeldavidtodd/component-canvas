import { describe, expect, it } from "vitest";

import { DEFAULT_ALLOWED_ORIGINS, corsHeaders, isAllowedOrigin } from "./cors";

describe("isAllowedOrigin", () => {
	it("allows the Tauri custom protocol on macOS and Linux", () => {
		expect(isAllowedOrigin("tauri://localhost")).toBe(true);
	});

	it("allows the Tauri http(s) origin used on Windows and Android", () => {
		expect(isAllowedOrigin("http://tauri.localhost")).toBe(true);
		expect(isAllowedOrigin("https://tauri.localhost")).toBe(true);
	});

	it("allows loopback dev servers on any port", () => {
		// Vite falls back to the next free port when 8080 is taken, so the port
		// cannot be part of the allowlist.
		expect(isAllowedOrigin("http://localhost:8081")).toBe(true);
		expect(isAllowedOrigin("http://localhost:5173")).toBe(true);
		expect(isAllowedOrigin("http://127.0.0.1:8080")).toBe(true);
		expect(isAllowedOrigin("http://[::1]:8080")).toBe(true);
	});

	it("rejects an unrelated origin", () => {
		expect(isAllowedOrigin("https://evil.example.com")).toBe(false);
	});

	it("rejects a lookalike loopback host", () => {
		expect(isAllowedOrigin("http://localhost.evil.example.com")).toBe(false);
		expect(isAllowedOrigin("http://127.0.0.1.evil.example.com")).toBe(false);
	});

	it("adds configured origins without dropping the defaults", () => {
		const configured = ["https://planner.example.com"];
		expect(isAllowedOrigin("https://planner.example.com", configured)).toBe(true);
		expect(isAllowedOrigin("tauri://localhost", configured)).toBe(true);
		expect(isAllowedOrigin("http://localhost:8081", configured)).toBe(true);
	});
});

describe("corsHeaders", () => {
	it("echoes an allowed origin", () => {
		expect(corsHeaders("http://localhost:8081")["Access-Control-Allow-Origin"]).toBe("http://localhost:8081");
	});

	it("omits the origin header when the origin is not allowed", () => {
		expect(corsHeaders("https://evil.example.com")["Access-Control-Allow-Origin"]).toBeUndefined();
	});

	it("omits the origin header when the request has no origin", () => {
		expect(corsHeaders(null)["Access-Control-Allow-Origin"]).toBeUndefined();
	});

	it("always advertises the preflight headers and methods", () => {
		const headers = corsHeaders(null);
		expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
		expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
		expect(headers.Vary).toBe("Origin");
	});

	it("keeps the documented defaults", () => {
		expect(DEFAULT_ALLOWED_ORIGINS).toContain("tauri://localhost");
	});
});
