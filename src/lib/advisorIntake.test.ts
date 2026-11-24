import { describe, expect, it } from "vitest";

import { composeSubmission } from "@/lib/advisorIntake";

const form = (entries: [string, string][]) => {
	const data = new FormData();
	for (const [key, value] of entries) data.append(key, value);
	return data;
};

describe("composeSubmission", () => {
	it("maps a choice to the question the advisor can answer", () => {
		const submission = composeSubmission(form([["focus", "triage"], ["response", "fix"]]));

		expect(submission.message).toBe("What should I fix first?\n\nPropose the changes as fixes I can apply.");
		expect(submission.answers).toEqual([
			{ question: "What should the advisor look at first?", answer: "Triage the findings" },
			{ question: "How should it answer?", answer: "Propose fixes" },
		]);
	});

	it("sends a typed answer as the question and records it as the answer", () => {
		const submission = composeSubmission(form([["focus", "Why does color/brand resolve to nothing?"]]));

		expect(submission.message).toBe("Why does color/brand resolve to nothing?");
		expect(submission.answers).toEqual([
			{ question: "What should the advisor look at first?", answer: "Why does color/brand resolve to nothing?" },
		]);
	});

	it("prefers the typed answer when a choice also arrives", () => {
		const submission = composeSubmission(form([["focus", "triage"], ["focus", "Check the aliases"]]));

		expect(submission.message).toBe("Check the aliases");
		expect(submission.answers[0].answer).toBe("Check the aliases");
	});

	it("adds no instruction when no answer shape is given", () => {
		const submission = composeSubmission(form([["focus", "cleanup"]]));

		expect(submission.message).toBe("Which tokens are unused or duplicated?");
		expect(submission.answers).toHaveLength(1);
	});
});
