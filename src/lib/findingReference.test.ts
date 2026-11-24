import { describe, expect, it } from "vitest";

import { composeReferencedMessage, matchFindings, mentionQueryAt } from "@/lib/findingReference";
import type { AuditFinding } from "@/lib/tokenAudit";

const FINDINGS: AuditFinding[] = [
	{ check: "invalid-value", severity: "error", message: "Brand color is invalid.", tokenNames: [], nodeIds: ["brand"] },
	{ check: "unused-token", severity: "warning", message: "Unused spacing token.", tokenNames: [], nodeIds: ["space", "space-2"] },
];

describe("composeReferencedMessage", () => {
	it("puts the referenced findings above the question", () => {
		const message = composeReferencedMessage("Why is this wrong?", [FINDINGS[0]]);

		expect(message).toBe("About these findings:\n- [error] Brand color is invalid. (brand)\n\nWhy is this wrong?");
	});

	it("returns the question untouched when nothing is referenced", () => {
		expect(composeReferencedMessage("  Hello  ", [])).toBe("Hello");
	});

	it("keeps the findings when there is no question yet", () => {
		expect(composeReferencedMessage("", [FINDINGS[1]])).toContain("- [warning] Unused spacing token. (space, space-2)");
	});
});

describe("mentionQueryAt", () => {
	it("reads an empty mention at the start of the text", () => {
		expect(mentionQueryAt("@", 1)).toEqual({ query: "", start: 0 });
	});

	it("reads the query after a mention following a space", () => {
		expect(mentionQueryAt("look at @unus", 13)).toEqual({ query: "unus", start: 8 });
	});

	it("ignores an @ inside a word", () => {
		expect(mentionQueryAt("mail me@example", 15)).toBeNull();
	});

	it("ignores a mention that the caret has left", () => {
		expect(mentionQueryAt("@unused is broken", 17)).toBeNull();
	});
});

describe("matchFindings", () => {
	it("matches on message text, case-insensitively", () => {
		expect(matchFindings(FINDINGS, "SPACING")).toEqual([FINDINGS[1]]);
	});

	it("returns every finding for an empty query", () => {
		expect(matchFindings(FINDINGS, "  ")).toEqual(FINDINGS);
	});
});
