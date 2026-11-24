import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FindingMessage } from "@/components/FindingMessage";
import type { AuditFinding } from "@/lib/tokenAudit";

const finding = (message: string, tokenNames: string[]): AuditFinding => ({ check: "unused-token", severity: "warning", message, tokenNames, nodeIds: ["node"] });

const codeCount = (html: string) => html.match(/<code/g)?.length ?? 0;

describe("FindingMessage", () => {
	it("sets the token names as code and leaves the prose as text", () => {
		const html = renderToStaticMarkup(<FindingMessage finding={finding("color/brand is an alias with no token to resolve to.", ["color/brand"])} />);

		expect(html).toContain("<code");
		expect(html).toContain(">color/brand</code>");
		expect(html).toContain(" is an alias with no token to resolve to.");
	});

	it("prefers the longest name when one starts another", () => {
		const html = renderToStaticMarkup(<FindingMessage finding={finding("color/brand/base is invalid.", ["color/brand", "color/brand/base"])} />);

		expect(codeCount(html)).toBe(1);
		expect(html).toContain(">color/brand/base</code>");
	});

	it("matches names that contain regex characters", () => {
		const html = renderToStaticMarkup(<FindingMessage finding={finding("space/legacy[1] isn't used.", ["space/legacy[1]"])} />);

		expect(codeCount(html)).toBe(1);
		expect(html).toContain(">space/legacy[1]</code>");
	});

	it("renders a message with no token names as plain text", () => {
		const html = renderToStaticMarkup(<FindingMessage finding={finding("2 tokens share the value #3B82F6.", [])} />);

		expect(codeCount(html)).toBe(0);
		expect(html).toContain("2 tokens share the value #3B82F6.");
	});
});
