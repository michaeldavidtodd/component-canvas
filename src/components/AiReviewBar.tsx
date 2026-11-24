/**
 * The design-system advisor, as a chat thread in a dialog.
 *
 * A thread rather than a command bar: the canvas stays the product and the
 * resting state stays quiet, so Cmd+K opens the dialog, Enter sends, and Escape
 * closes. The transcript is a message scroller that follows the newest turn, so
 * a streaming answer stays in view without a manual scroll effect. An empty
 * thread opens on a questionnaire rather than a blank composer, so the first
 * question is one the advisor can answer from the findings.
 *
 * The narrative streams as it arrives; proposed fixes only appear once the tool
 * call is complete, and each one is checked against the live document before it
 * can be applied. Stopping the response cancels the upstream generation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronDown, Loader2, ShieldCheck, Sparkles, Square, X } from "lucide-react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
	Questionnaire,
	QuestionnaireActions,
	QuestionnaireChoice,
	QuestionnaireChoiceDescription,
	QuestionnaireChoices,
	QuestionnaireDescription,
	QuestionnaireError,
	QuestionnaireInput,
	QuestionnaireItem,
	QuestionnaireNext,
	QuestionnairePrevious,
	QuestionnaireProgress,
	QuestionnaireSkip,
	QuestionnaireSubmit,
	QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { Textarea } from "@/components/ui/textarea";
import { isEditableTarget, isModalOpen } from "@/hooks/useKeyboardShortcuts";
import { PROJECTED_NODE_FIELDS } from "@/lib/documentProjection";
import type { AuditFinding } from "@/lib/tokenAudit";
import type { ChatTurn, ReviewFix } from "@/lib/aiReviewStream";
import { streamReview } from "@/lib/aiReviewClient";

interface AiReviewBarProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The whitelisted projection that leaves the machine. */
	document: unknown;
	/** The deterministic audit findings the advisor explains. */
	findings: AuditFinding[];
	/**
	 * Check a fix against the live document. Returns one message per problem; an
	 * empty list means the fix can be applied. Parent rules live here, not in the
	 * edge function, so the same rules guard the UI and the advisor.
	 */
	validateFix: (fix: ReviewFix) => string[];
	/** Apply a fix the user approved. */
	onApplyFix: (fix: ReviewFix) => void;
}

const DISCLOSURE_KEY = "ai-review-disclosure-dismissed";

const wasDisclosureDismissed = (): boolean => {
	try {
		return localStorage.getItem(DISCLOSURE_KEY) === "1";
	} catch {
		return false;
	}
};

/** Openers the intake maps onto, chosen from what the audit can actually answer. */
const INTAKE_QUESTIONS: Record<string, string> = {
	triage: "What should I fix first?",
	naming: "Are my token names consistent?",
	cleanup: "Which tokens are unused or duplicated?",
};

/** Appended to the question so the first answer arrives in the shape asked for. */
const RESPONSE_INSTRUCTIONS: Record<string, string> = {
	explain: "Explain what is wrong for now; don't propose changes yet.",
	fix: "Propose the changes as fixes I can apply.",
};

/** Item definitions the questionnaire validates and shortcuts against. */
const INTAKE_ITEMS = [
	{
		name: "focus",
		required: true,
		choices: [{ value: "triage" }, { value: "naming" }, { value: "cleanup" }],
	},
	{ name: "response", choices: [{ value: "explain" }, { value: "fix" }] },
] as const;

/**
 * Turn the intake answers into the first message. The custom answer arrives under
 * the same name as the choices, so a value that is not a known choice wins.
 */
const composeQuestion = (answers: FormData): string => {
	const focus = answers.getAll("focus").map((value) => String(value).trim()).filter(Boolean);
	const custom = focus.find((value) => !(value in INTAKE_QUESTIONS));
	const question = custom ?? INTAKE_QUESTIONS[focus[0] ?? ""];
	const instruction = RESPONSE_INSTRUCTIONS[String(answers.get("response") ?? "")];
	return [question, instruction].filter(Boolean).join("\n\n");
};

/**
 * The guided start of a conversation. The advisor can answer these from the
 * findings, so the thread opens on a real question instead of a blank prompt.
 */
const Intake = ({ onAsk }: { onAsk: (question: string) => void }) => (
	<Questionnaire
		items={INTAKE_ITEMS}
		shortcuts="letters"
		onSubmit={(event) => {
			event.preventDefault();
			const question = composeQuestion(new FormData(event.currentTarget));
			if (question) onAsk(question);
		}}
	>
		<QuestionnaireProgress />
		<QuestionnaireItem name="focus" required>
			<QuestionnaireTitle>What should the advisor look at first?</QuestionnaireTitle>
			<QuestionnaireChoices>
				<QuestionnaireChoice value="triage">
					<span className="font-medium">Triage the findings</span>
					<QuestionnaireChoiceDescription>Rank what to fix first.</QuestionnaireChoiceDescription>
				</QuestionnaireChoice>
				<QuestionnaireChoice value="naming">
					<span className="font-medium">Token naming</span>
					<QuestionnaireChoiceDescription>Check names for consistency.</QuestionnaireChoiceDescription>
				</QuestionnaireChoice>
				<QuestionnaireChoice value="cleanup">
					<span className="font-medium">Dead weight</span>
					<QuestionnaireChoiceDescription>Find unused and duplicate tokens.</QuestionnaireChoiceDescription>
				</QuestionnaireChoice>
				<QuestionnaireInput aria-label="Ask something else" placeholder="Or ask something else…" />
			</QuestionnaireChoices>
			<QuestionnaireError />
		</QuestionnaireItem>
		<QuestionnaireItem name="response">
			<QuestionnaireTitle>How should it answer?</QuestionnaireTitle>
			<QuestionnaireDescription>Skip this to keep the first answer focused.</QuestionnaireDescription>
			<QuestionnaireChoices>
				<QuestionnaireChoice value="explain">
					<span className="font-medium">Explain only</span>
					<QuestionnaireChoiceDescription>Tell me what is wrong.</QuestionnaireChoiceDescription>
				</QuestionnaireChoice>
				<QuestionnaireChoice value="fix">
					<span className="font-medium">Propose fixes</span>
					<QuestionnaireChoiceDescription>Return changes I can apply.</QuestionnaireChoiceDescription>
				</QuestionnaireChoice>
			</QuestionnaireChoices>
		</QuestionnaireItem>
		<QuestionnaireActions>
			<QuestionnairePrevious />
			<QuestionnaireSkip />
			<QuestionnaireNext />
			<QuestionnaireSubmit>Ask</QuestionnaireSubmit>
		</QuestionnaireActions>
	</Questionnaire>
);

/**
 * The one-time note about what the request sends. It sits in the empty thread,
 * before the first question, open by default so the field list is never hidden
 * behind a click the user has to guess at.
 */
const Disclosure = ({ onDismiss }: { onDismiss: () => void }) => (
	<Collapsible defaultOpen className="rounded-lg border border-border bg-muted/40 px-3 py-2">
		<CollapsibleTrigger className="flex w-full items-center gap-2 text-start text-xs font-medium text-foreground">
			<ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
			What leaves this machine
			<span className="ms-auto hidden font-normal text-muted-foreground sm:inline">Node fields and edges only</span>
			<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
		</CollapsibleTrigger>
		<CollapsibleContent className="pt-2 text-xs text-muted-foreground">
			<p>Node fields: {PROJECTED_NODE_FIELDS.join(", ")}. Edges reduce to id, source, and target.</p>
			<p className="mt-1">Positions, styling, selection, and Figma links are never sent. Requests run with zero data retention.</p>
			<Button variant="ghost" size="xs" className="-ml-2 mt-1" onClick={onDismiss}>
				Don't show again
			</Button>
		</CollapsibleContent>
	</Collapsible>
);

/** The fixes attached to one answer, each gated by the parent's validation. */
const FixList = ({
	fixes,
	validateFix,
	onApply,
}: {
	fixes: ReviewFix[];
	validateFix: (fix: ReviewFix) => string[];
	onApply: (index: number, fix: ReviewFix) => void;
}) => (
	<div className="flex flex-col gap-2 pt-1">
		<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
			Proposed {fixes.length === 1 ? "fix" : "fixes"}
		</p>
		{fixes.map((fix, index) => {
			const problems = validateFix(fix);
			const operations = `${fix.operations.length} ${fix.operations.length === 1 ? "operation" : "operations"}`;
			const nodes = fix.nodeIds.length > 0 ? ` · ${fix.nodeIds.length} ${fix.nodeIds.length === 1 ? "node" : "nodes"}` : "";
			return (
				<div key={index} className="rounded-lg border border-border bg-background px-3 py-2.5">
					<p className="text-sm text-foreground">{fix.description}</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{operations}
						{nodes}
					</p>
					{problems.length > 0 && <p className="mt-1 text-xs text-destructive">{problems[0]}</p>}
					<Button
						size="sm"
						variant="outline"
						className="mt-2"
						disabled={problems.length > 0}
						onClick={() => onApply(index, fix)}
					>
						Apply
					</Button>
				</div>
			);
		})}
	</div>
);

export const AiReviewBar = ({ open, onOpenChange, document: projection, findings, validateFix, onApplyFix }: AiReviewBarProps) => {
	const [input, setInput] = useState("");
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [liveText, setLiveText] = useState("");
	const [fixes, setFixes] = useState<ReviewFix[]>([]);
	const [skipped, setSkipped] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [showDisclosure, setShowDisclosure] = useState(() => !wasDisclosureDismissed());

	const abortRef = useRef<AbortController | null>(null);
	// Mirrors the streamed text so an aborted run can keep what the user already saw.
	const liveTextRef = useRef("");
	const composerRef = useRef<HTMLTextAreaElement | null>(null);

	// Cmd+K toggles the bar. Closing is handled here rather than in the dialog so the
	// shortcut works while the bar is open; the shared guards keep it out of inputs
	// and out of other modals.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
			if (event.key.toLowerCase() !== "k") return;
			if (open) {
				event.preventDefault();
				onOpenChange(false);
				return;
			}
			if (isEditableTarget(event.target) || isModalOpen()) return;
			event.preventDefault();
			onOpenChange(true);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onOpenChange]);

	// Abort on unmount so a closed app never leaves a generation running.
	useEffect(() => () => abortRef.current?.abort(), []);

	// Grow the composer with its content; the field's max height caps it and
	// scrolls instead. Done here rather than with `field-sizing`, which the macOS
	// webview does not support yet.
	useEffect(() => {
		const field = composerRef.current;
		if (!field) return;
		field.style.height = "auto";
		field.style.height = `${field.scrollHeight}px`;
	}, [input]);

	const handleStop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	/** Send one question. Starter prompts pass their text; the composer passes its value. */
	const send = useCallback(async (raw: string) => {
		const trimmed = raw.trim();
		if (!trimmed || streaming) return;

		const nextTurns: ChatTurn[] = [...turns, { role: "user", content: trimmed }];
		setTurns(nextTurns);
		setInput("");
		setStreaming(true);
		setLiveText("");
		liveTextRef.current = "";
		setFixes([]);
		setSkipped(0);
		setError(null);

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const outcome = await streamReview({
				document: projection,
				findings,
				messages: nextTurns,
				signal: controller.signal,
				onText: (chunk) => {
					liveTextRef.current += chunk;
					setLiveText(liveTextRef.current);
				},
			});
			setTurns([...nextTurns, { role: "assistant", content: outcome.text }]);
			setFixes(outcome.fixes);
			setSkipped(outcome.skipped);
			setLiveText("");
			liveTextRef.current = "";
		} catch (cause) {
			if (controller.signal.aborted) {
				// A stopped run keeps the partial answer as a turn, so the transcript
				// stays readable. No fixes are offered for a partial response.
				const partial = liveTextRef.current;
				setTurns(partial ? [...nextTurns, { role: "assistant", content: partial }] : nextTurns);
				setLiveText("");
				liveTextRef.current = "";
			} else {
				setError(cause instanceof Error ? cause.message : String(cause));
			}
		} finally {
			setStreaming(false);
			abortRef.current = null;
		}
	}, [streaming, turns, projection, findings]);

	const handleApply = useCallback(
		(index: number, fix: ReviewFix) => {
			onApplyFix(fix);
			setFixes((current) => current.filter((_, position) => position !== index));
		},
		[onApplyFix],
	);

	const dismissDisclosure = useCallback(() => {
		setShowDisclosure(false);
		try {
			localStorage.setItem(DISCLOSURE_KEY, "1");
		} catch {
			// Storage is unavailable (private mode, desktop webview); the card simply
			// reappears next time.
		}
	}, []);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent variant="fullscreen" showCloseButton={false}>
				<DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
					<Sparkles className="size-4 shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<DialogTitle className="text-sm font-medium">Design-system advisor</DialogTitle>
						<DialogDescription className="truncate text-xs">
							Ask whether your token structure holds up. It reads the current map and the token health findings.
						</DialogDescription>
					</div>
					<kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-display text-xs text-muted-foreground sm:block">
						⌘K
					</kbd>
					<DialogClose asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Close advisor">
							<X className="size-4" />
						</Button>
					</DialogClose>
				</DialogHeader>

				<div className="min-h-0 flex-1">
					{turns.length === 0 && !streaming ? (
						<div className="scroll-fade-b h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
							<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
								<div className="my-auto flex flex-col gap-4">
									<Intake onAsk={(question) => void send(question)} />
									{showDisclosure && <Disclosure onDismiss={dismissDisclosure} />}
								</div>
							</div>
						</div>
					) : (
						<MessageScrollerProvider autoScroll>
							<MessageScroller>
								<MessageScrollerViewport aria-label="Advisor conversation">
									<MessageScrollerContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
										{turns.map((turn, index) => {
											const isUser = turn.role === "user";
											const isLatestAnswer = !isUser && index === turns.length - 1;
											return (
												<MessageScrollerItem key={`turn-${index}`} messageId={`turn-${index}`} scrollAnchor={isUser}>
													<Message align={isUser ? "end" : "start"}>
														<MessageContent>
															<Bubble variant={isUser ? "default" : "ghost"} align={isUser ? "end" : "start"}>
																<BubbleContent className="whitespace-pre-wrap">{turn.content}</BubbleContent>
															</Bubble>
															{isLatestAnswer && fixes.length > 0 && (
																<FixList fixes={fixes} validateFix={validateFix} onApply={handleApply} />
															)}
															{isLatestAnswer && skipped > 0 && (
																<MessageFooter>
																	{skipped} proposed {skipped === 1 ? "fix" : "fixes"} couldn't be read and were dropped.
																</MessageFooter>
															)}
														</MessageContent>
													</Message>
												</MessageScrollerItem>
											);
										})}

										{streaming && (
											<MessageScrollerItem messageId="pending-answer">
												<Message align="start">
													<MessageContent>
														<Bubble variant="ghost">
															<BubbleContent className="whitespace-pre-wrap">
																{liveText}
																{liveText ? (
																	<span
																		aria-hidden="true"
																		className="ms-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse rounded-full bg-foreground/50"
																	/>
																) : (
																	<span className="flex items-center gap-2 text-muted-foreground">
																		<Loader2 className="size-3.5 animate-spin" />
																		Thinking…
																	</span>
																)}
															</BubbleContent>
														</Bubble>
													</MessageContent>
												</Message>
											</MessageScrollerItem>
										)}

										{error && (
											<MessageScrollerItem messageId="error">
												<Message align="start">
													<MessageContent>
														<Bubble variant="destructive">
															<BubbleContent>{error}</BubbleContent>
														</Bubble>
													</MessageContent>
												</Message>
											</MessageScrollerItem>
										)}
									</MessageScrollerContent>
								</MessageScrollerViewport>
								<MessageScrollerButton />
							</MessageScroller>
						</MessageScrollerProvider>
					)}
				</div>

				<form
					className="shrink-0 border-t border-border px-4 py-3 sm:px-6"
					onSubmit={(event) => {
						event.preventDefault();
						void send(input);
					}}
				>
					<div className="mx-auto w-full max-w-3xl">
						<div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15">
						<Textarea
							ref={composerRef}
							autoFocus
							rows={1}
							value={input}
							placeholder="Ask about your token structure…"
							onChange={(event) => setInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.nativeEvent.isComposing) return;
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
									void send(input);
								}
							}}
							className="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm shadow-none focus-visible:ring-0"
						/>
						{streaming ? (
							<Button type="button" size="default" variant="outline" onClick={handleStop} className="gap-1.5">
								<Square className="size-3" />
								Stop
							</Button>
						) : (
							<Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send question">
								<ArrowUp />
							</Button>
						)}
					</div>
						<p className="mt-1.5 px-1 text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
};
