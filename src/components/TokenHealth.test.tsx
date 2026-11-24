import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TokenHealth } from "@/components/TokenHealth";
import type { AuditFinding } from "@/lib/tokenAudit";

const noop = () => {};

describe("TokenHealth", () => {
	it("renders the healthy state when there are no findings", () => {
		const html = renderToStaticMarkup(<TokenHealth findings={[]} onClose={noop} />);
		expect(html).toContain("Token structure looks healthy");
	});

	it("groups findings by severity and counts them", () => {
		const findings: AuditFinding[] = [
			{ check: "invalid-value", severity: "error", message: "Brand color is invalid.", tokenNames: [], nodeIds: ["brand"] },
			{ check: "unused-token", severity: "warning", message: "Unused spacing token.", tokenNames: [], nodeIds: ["space"] },
			{ check: "duplicate-value", severity: "info", message: "2 tokens share a value.", tokenNames: [], nodeIds: ["a", "b"] },
		];

		const html = renderToStaticMarkup(<TokenHealth findings={findings} onClose={noop} />);
		expect(html).toContain("3 findings");
		expect(html).toContain("Errors");
		expect(html).toContain("Warnings");
		expect(html).toContain("Notes");
		expect(html).toContain("Brand color is invalid.");
		expect(html).toContain("2 nodes");
	});

	it("uses the singular when a finding touches one node", () => {
		const findings: AuditFinding[] = [{ check: "unused-token", severity: "warning", message: "Unused token.", tokenNames: [], nodeIds: ["solo"] }];
		const html = renderToStaticMarkup(<TokenHealth findings={findings} onClose={noop} />);
		expect(html).toContain("1 node");
	});

	it("renders the fix as a button when the finding carries one", () => {
		const findings: AuditFinding[] = [
			{
				check: "unused-token",
				severity: "warning",
				message: "Unused token.",
				tokenNames: [],
				nodeIds: ["solo"],
				fix: { summary: "Remove color.unused", operations: [{ op: "deleteNode", nodeId: "solo" }] },
			},
		];

		const html = renderToStaticMarkup(<TokenHealth findings={findings} onApplyFix={noop} onClose={noop} />);
		expect(html).toContain("Remove color.unused");
	});

	it("omits the fix button when no handler is supplied", () => {
		const findings: AuditFinding[] = [
			{
				check: "unused-token",
				severity: "warning",
				message: "Unused token.",
				tokenNames: [],
				nodeIds: ["solo"],
				fix: { summary: "Remove color.unused", operations: [{ op: "deleteNode", nodeId: "solo" }] },
			},
		];

		const html = renderToStaticMarkup(<TokenHealth findings={findings} onClose={noop} />);
		expect(html).not.toContain("Remove color.unused");
	});
});
