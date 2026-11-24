import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FindingList } from "@/components/FindingList";
import type { AuditFinding } from "@/lib/tokenAudit";

const FINDINGS: AuditFinding[] = [
	{ check: "invalid-value", severity: "error", message: "color/brand is invalid.", tokenNames: ["color/brand"], nodeIds: ["brand"] },
	{ check: "unused-token", severity: "warning", message: "space/legacy isn't used.", tokenNames: ["space/legacy"], nodeIds: ["space"], fix: { summary: "Remove space/legacy", operations: [{ op: "deleteNode", nodeId: "space" }] } },
	{ check: "duplicate-value", severity: "info", message: "2 tokens share a value.", tokenNames: [], nodeIds: ["a", "b"] },
];

const buttonCount = (html: string) => html.match(/<button/g)?.length ?? 0;

describe("FindingList", () => {
	it("groups the findings by severity, in order", () => {
		const html = renderToStaticMarkup(<FindingList findings={FINDINGS} />);

		expect(html.indexOf("Errors")).toBeLessThan(html.indexOf("Warnings"));
		expect(html.indexOf("Warnings")).toBeLessThan(html.indexOf("Notes"));
		expect(html).toContain("color/brand");
		expect(html).toContain("2 nodes");
	});

	it("renders the action under a row that has one", () => {
		const html = renderToStaticMarkup(<FindingList findings={FINDINGS} renderAction={(finding) => finding.fix?.summary} />);

		expect(html).toContain("Remove space/legacy");
	});

	it("makes rows selectable only when a handler is supplied", () => {
		// Three severity headers, plus one row button per finding.
		expect(buttonCount(renderToStaticMarkup(<FindingList findings={FINDINGS} onSelect={() => {}} />))).toBe(6);
		expect(buttonCount(renderToStaticMarkup(<FindingList findings={FINDINGS} />))).toBe(3);
	});

	it("gives each instance its own scroll targets", () => {
		const html = renderToStaticMarkup(
			<>
				<FindingList findings={FINDINGS} />
				<FindingList findings={FINDINGS} />
			</>,
		);
		const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);

		expect(ids).toHaveLength(6);
		expect(new Set(ids).size).toBe(6);
	});
});
