import type { AuditFinding } from "@/lib/tokenAudit";

/** Matches the markdown renderer's inline code, so findings and answers agree. */
const CODE_CLASSNAME = "rounded-md bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground";

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The message split into prose and the token names it mentions. Longest name
 * first, so a name that starts another one still matches as a whole.
 */
const splitMessage = (message: string, tokenNames: string[]): { text: string; isToken: boolean }[] => {
	const names = [...new Set(tokenNames)].filter(Boolean).sort((a, b) => b.length - a.length);
	if (names.length === 0) return [{ text: message, isToken: false }];

	const pattern = new RegExp(`(${names.map(escapeRegExp).join("|")})`, "g");
	return message
		.split(pattern)
		.filter((part) => part !== "")
		.map((part) => ({ text: part, isToken: names.includes(part) }));
};

/** A finding's message, with the token names it mentions set as inline code. */
export const FindingMessage = ({ finding, className }: { finding: AuditFinding; className?: string }) => (
	<span className={className}>
		{splitMessage(finding.message, finding.tokenNames).map((part, index) =>
			part.isToken ? (
				<code key={index} className={CODE_CLASSNAME}>
					{part.text}
				</code>
			) : (
				part.text
			),
		)}
	</span>
);
