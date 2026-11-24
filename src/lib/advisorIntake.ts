/**
 * The guided intake that opens a new advisor thread.
 *
 * The questionnaire is the user's real input, so the thread records the answers
 * instead of the prompt the model receives. `composeSubmission` builds both at
 * once: the message that leaves the machine and the answer pairs the transcript
 * shows. Copy and choices live here so the two cannot drift apart.
 */

export const FOCUS_PROMPT = "What should the advisor look at first?";
export const RESPONSE_PROMPT = "How should it answer?";

/** The question is what the advisor is asked; the label is what the user picked. */
export const FOCUS_CHOICES = [
	{
		value: "triage",
		label: "Triage the findings",
		description: "Rank what to fix first.",
		question: "What should I fix first?",
	},
	{
		value: "naming",
		label: "Token naming",
		description: "Check names for consistency.",
		question: "Are my token names consistent?",
	},
	{
		value: "cleanup",
		label: "Dead weight",
		description: "Find unused and duplicate tokens.",
		question: "Which tokens are unused or duplicated?",
	},
];

/** Appended to the question so the first answer arrives in the shape asked for. */
export const RESPONSE_CHOICES = [
	{
		value: "explain",
		label: "Explain only",
		description: "Tell me what is wrong.",
		instruction: "Explain what is wrong for now; don't propose changes yet.",
	},
	{
		value: "fix",
		label: "Propose fixes",
		description: "Return changes I can apply.",
		instruction: "Propose the changes as fixes I can apply.",
	},
];

/** Item definitions the questionnaire validates and shortcuts against. */
export const INTAKE_ITEMS = [
	{ name: "focus", required: true, choices: FOCUS_CHOICES.map(({ value }) => ({ value })) },
	{ name: "response", required: true, choices: RESPONSE_CHOICES.map(({ value }) => ({ value })) },
] as const;

/** One answered prompt, as the thread records it. */
export interface IntakeAnswer {
	question: string;
	answer: string;
}

export interface IntakeSubmission {
	/** What the advisor receives. */
	message: string;
	/** What the user chose, for the transcript. */
	answers: IntakeAnswer[];
}

/**
 * Read the questionnaire into the first message and the answers to show for it.
 * A typed answer arrives under the same name as the choices, so a value that is
 * not a known choice is the user's own question.
 */
export const composeSubmission = (answers: FormData): IntakeSubmission => {
	const focusAnswers = answers.getAll("focus").map((value) => String(value).trim()).filter(Boolean);
	const custom = focusAnswers.find((value) => !FOCUS_CHOICES.some((choice) => choice.value === value));
	const focusValue = custom ?? focusAnswers[0] ?? "";
	const focus = FOCUS_CHOICES.find((choice) => choice.value === focusValue);
	const response = RESPONSE_CHOICES.find((choice) => choice.value === String(answers.get("response") ?? ""));

	const message = [focus?.question ?? focusValue, response?.instruction].filter(Boolean).join("\n\n");
	const recorded: IntakeAnswer[] = [{ question: FOCUS_PROMPT, answer: focus?.label ?? focusValue }];
	if (response) recorded.push({ question: RESPONSE_PROMPT, answer: response.label });

	return { message, answers: recorded.filter((answer) => answer.answer.length > 0) };
};
