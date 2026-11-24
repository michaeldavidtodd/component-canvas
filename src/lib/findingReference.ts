/**
 * Referencing audit findings in a message.
 *
 * A reference does two things: it tells the advisor which findings the message is
 * about, and it gives the thread something to show besides the typed text. The
 * message the model receives is built here so the two cannot drift.
 */
import type { AuditFinding } from "@/lib/tokenAudit";

/** The audit does not give findings ids, so identity comes from their content. */
export const findingKey = (finding: AuditFinding): string =>
	`${finding.check}:${finding.message}:${finding.nodeIds.join(",")}`;

const SEVERITY_LABEL: Record<AuditFinding["severity"], string> = {
	error: "error",
	warning: "warning",
	info: "note",
};

/** One line per referenced finding, in the shape the advisor can quote back. */
export const referenceBlock = (findings: AuditFinding[]): string =>
	findings
		.map(
			(finding) =>
				`- [${SEVERITY_LABEL[finding.severity]}] ${finding.message} (${finding.nodeIds.join(", ")})`,
		)
		.join("\n");

/** The message the advisor receives: the referenced findings, then the question. */
export const composeReferencedMessage = (text: string, findings: AuditFinding[]): string => {
	const question = text.trim();
	if (findings.length === 0) return question;
	const block = `About these findings:\n${referenceBlock(findings)}`;
	return question ? `${block}\n\n${question}` : block;
};

export interface MentionQuery {
	/** What has been typed after the @. */
	query: string;
	/** Where the @ sits, so the mention can be replaced. */
	start: number;
}

/**
 * The @mention immediately before the caret, or null. A mention starts at the
 * beginning of the text or after whitespace and runs to the caret without spaces.
 */
export const mentionQueryAt = (text: string, caret: number): MentionQuery | null => {
	const before = text.slice(0, caret);
	const match = /(^|\s)@([^\s@]*)$/.exec(before);
	if (!match) return null;
	const query = match[2] ?? "";
	return { query, start: caret - query.length - 1 };
};

/** Findings whose message matches the query, case-insensitively. */
export const matchFindings = (findings: AuditFinding[], query: string): AuditFinding[] => {
	const needle = query.trim().toLowerCase();
	if (!needle) return findings;
	return findings.filter((finding) => finding.message.toLowerCase().includes(needle));
};
