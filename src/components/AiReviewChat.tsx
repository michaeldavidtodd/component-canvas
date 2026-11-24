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
import { ArrowUp, Check, ChevronDown, Loader2, ShieldCheck, Sparkles, Square, X } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { SEVERITY_META } from "@/components/findingMeta";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport, useMessageScroller } from "@/components/ui/message-scroller";
import { Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoiceDescription, QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireNext, QuestionnairePrevious, QuestionnaireProgress, QuestionnaireSubmit, QuestionnaireTitle } from "@/components/ui/questionnaire";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { isEditableTarget, isModalOpen } from "@/hooks/useKeyboardShortcuts";
import { composeSubmission, FOCUS_CHOICES, FOCUS_PROMPT, INTAKE_ITEMS, RESPONSE_CHOICES, RESPONSE_PROMPT, type IntakeAnswer, type IntakeSubmission } from "@/lib/advisorIntake";
import type { Operation } from "@/lib/documentOperations";
import { PROJECTED_NODE_FIELDS } from "@/lib/documentProjection";
import type { AuditFinding } from "@/lib/tokenAudit";
import { composeReferencedMessage, findingKey, matchFindings, mentionQueryAt, type MentionQuery } from "@/lib/findingReference";
import type { ChatTurn, ReviewFix } from "@/lib/aiReviewStream";
import { cn } from "@/lib/utils";
import { streamReview } from "@/lib/aiReviewClient";
import { FindingList } from "@/components/FindingList";
import { FindingMessage } from "@/components/FindingMessage";

interface AiReviewChatProps {
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
	/**
	 * Apply fixes to the live document as one undoable change. Returns one flag per
	 * fix, in order, so the thread knows which ones landed.
	 */
	onApplyFixes: (fixes: ReviewFix[]) => boolean[];
	/** Point the canvas and the map at the node a finding refers to. */
	onSelectNode?: (nodeId: string) => void;
}

const DISCLOSURE_KEY = "ai-review-disclosure-dismissed";

const wasDisclosureDismissed = (): boolean => {
	try {
		return localStorage.getItem(DISCLOSURE_KEY) === "1";
	} catch {
		return false;
	}
};

/** A referenced finding, in the composer or in a sent message. */
const ReferenceChip = ({ finding, onRemove }: { finding: AuditFinding; onRemove?: () => void }) => {
	const meta = SEVERITY_META[finding.severity];
	const Icon = meta.icon;
	return (
		<span className="flex max-w-full items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
			<Icon className={cn("size-3 shrink-0", meta.className)} />
			<FindingMessage finding={finding} className="truncate" />
			{onRemove && (
				<button type="button" onClick={onRemove} aria-label={`Remove reference to ${finding.message}`} className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
					<X className="size-3" />
				</button>
			)}
		</span>
	);
};

/**
 * The guided start of a conversation. The advisor can answer these from the
 * findings, so the thread opens on a real question instead of a blank prompt.
 */
const Intake = ({ onSubmit }: { onSubmit: (submission: IntakeSubmission) => void }) => (
	<Questionnaire
		items={INTAKE_ITEMS}
		shortcuts="letters"
		onSubmit={(event) => {
			event.preventDefault();
			const submission = composeSubmission(new FormData(event.currentTarget));
			if (submission.message) onSubmit(submission);
		}}
	>
		<QuestionnaireProgress />
		<QuestionnaireItem name="focus" required>
			<QuestionnaireTitle>{FOCUS_PROMPT}</QuestionnaireTitle>
			<QuestionnaireChoices>
				{FOCUS_CHOICES.map((choice) => (
					<QuestionnaireChoice key={choice.value} value={choice.value}>
						<span className="font-medium">{choice.label}</span>
						<QuestionnaireChoiceDescription>{choice.description}</QuestionnaireChoiceDescription>
					</QuestionnaireChoice>
				))}
				<QuestionnaireInput aria-label="Ask something else" placeholder="Or ask something else…" />
			</QuestionnaireChoices>
			<QuestionnaireError />
		</QuestionnaireItem>
		<QuestionnaireItem name="response" required>
			<QuestionnaireTitle>{RESPONSE_PROMPT}</QuestionnaireTitle>
			<QuestionnaireDescription>Choose the shape of the first answer.</QuestionnaireDescription>
			<QuestionnaireChoices>
				{RESPONSE_CHOICES.map((choice) => (
					<QuestionnaireChoice key={choice.value} value={choice.value}>
						<span className="font-medium">{choice.label}</span>
						<QuestionnaireChoiceDescription>{choice.description}</QuestionnaireChoiceDescription>
					</QuestionnaireChoice>
				))}
			</QuestionnaireChoices>
		</QuestionnaireItem>
		<QuestionnaireActions>
			<QuestionnairePrevious radius="full" />
			<QuestionnaireNext radius="full"/>
			<QuestionnaireSubmit radius="full">Ask</QuestionnaireSubmit>
		</QuestionnaireActions>
	</Questionnaire>
);

/**
 * The questionnaire answers as they appear in the thread. The first turn is a form
 * submission rather than typed text, so it shows what was picked instead of the
 * prompt the model receives.
 */
const IntakeAnswerCard = ({ answers }: { answers: IntakeAnswer[] }) => (
	<dl className="flex flex-col gap-2">
		{answers.map((answer) => (
			<div key={answer.question}>
				<dt className="text-xs text-muted-foreground">{answer.question}</dt>
				<dd className="text-sm text-foreground">{answer.answer}</dd>
			</div>
		))}
	</dl>
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

/** A turn in the thread. The extra fields are display context, never sent. */
interface ThreadTurn extends ChatTurn {
	/** What the user typed, when `content` also carries machine-facing context. */
	text?: string;
	intake?: IntakeAnswer[];
	references?: AuditFinding[];
}

/** A fix as it moves through the thread: proposed, then applied. */
interface FixEntry {
	/** Stable for the session; also the anchor the edits sidebar links to. */
	id: string;
	turnIndex: number;
	fix: ReviewFix;
	status: "proposed" | "applied";
}

/** One line of scope, shared by the card, the trace, and the sidebar. */
const operationSummary = (fix: ReviewFix): string => {
	const edits = `${fix.operations.length} ${fix.operations.length === 1 ? "edit" : "edits"}`;
	const nodes = fix.nodeIds.length > 0 ? ` · ${fix.nodeIds.length} ${fix.nodeIds.length === 1 ? "node" : "nodes"}` : "";
	return `${edits}${nodes}`;
};

const formatValue = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	if (value === null || value === undefined) return "—";
	return JSON.stringify(value);
};

/** Describe one operation with the ids the advisor reported. */
const describeOperation = (operation: Operation): string => {
	switch (operation.op) {
		case "deleteNode":
			return `Delete ${operation.nodeId}`;
		case "setParents":
			return `Move ${operation.nodeId} under ${operation.parentIds.join(", ") || "no parent"}`;
		case "updateNode": {
			const fields = Object.entries(operation.data)
				.map(([field, value]) => `${field} = ${formatValue(value)}`)
				.join(", ");
			return `Update ${operation.nodeId} · ${fields}`;
		}
	}
};

/** A fix the advisor proposed and the user has not applied yet. */
const ProposedFix = ({ entry, problems, onApply }: { entry: FixEntry; problems: string[]; onApply: (entry: FixEntry) => void }) => (
	<div className="rounded-lg border border-border bg-background px-3 py-2.5">
		<p className="text-sm text-foreground">{entry.fix.description}</p>
		<p className="mt-0.5 text-xs text-muted-foreground">{operationSummary(entry.fix)}</p>
		{problems.length > 0 && <p className="mt-1 text-xs text-destructive">{problems[0]}</p>}
		<Button size="sm" variant="outline" className="mt-2" disabled={problems.length > 0} onClick={() => onApply(entry)}>
			Apply
		</Button>
	</div>
);

/**
 * A fix that landed, kept where it was proposed so the thread shows what changed.
 * The id is the anchor the edits sidebar scrolls back to.
 */
const AppliedFix = ({ entry }: { entry: FixEntry }) => (
	<Trace id={`edit-${entry.id}`} className="mt-0.5">
		<TraceCollapsible>
			<TraceCollapsibleTrigger>
				<TraceLine>
					<TraceIcon>
						<Check className="size-3.5 text-success" />
					</TraceIcon>
					<TraceTitle>{entry.fix.description}</TraceTitle>
					<TraceDescription>{operationSummary(entry.fix)}</TraceDescription>
				</TraceLine>
			</TraceCollapsibleTrigger>
			<TraceCollapsibleContent>
				<div className="flex flex-col gap-1">
					{entry.fix.operations.map((operation, index) => (
						<TraceLine key={index} className="text-xs">
							{describeOperation(operation)}
						</TraceLine>
					))}
				</div>
			</TraceCollapsibleContent>
		</TraceCollapsible>
	</Trace>
);

/**
 * The advisor's standing summary: the edits applied so far, and the audit findings
 * the advisor is working from. Selecting an edit scrolls the thread back to the
 * trace it came from; selecting a finding references it in the next message and
 * points the canvas at its node.
 */
const AdvisorSidebar = ({ entries, findings, onSelectNode, onReference }: { entries: FixEntry[]; findings: AuditFinding[]; onSelectNode?: (nodeId: string) => void; onReference: (finding: AuditFinding) => void }) => {
	const { scrollToMessage } = useMessageScroller();

	const goTo = (entry: FixEntry) => {
		// Bring the turn into view first: its scroller item is content-visibility hidden
		// until it is near the viewport, so its layout is not yet measurable.
		scrollToMessage(`turn-${entry.turnIndex}`, { align: "start" });
		requestAnimationFrame(() => {
			document.getElementById(`edit-${entry.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
		});
	};

		return (
		<aside className="hidden w-80 xl:w-100 2xl:w-120 shrink-0 flex-col border-s border-border lg:flex" aria-label="Advisor sidebar">
			<Tabs defaultValue={entries.length > 0 ? "edits" : "findings"} className="flex min-h-0 flex-1 flex-col">
				<div className="border-b border-border p-2">
					<TabsList className="grid h-9 w-full grid-cols-2">
						<TabsTrigger value="edits" className="gap-1.5 text-xs">
							Edits
							<span className="text-muted-foreground tabular-nums">{entries.length}</span>
						</TabsTrigger>
						<TabsTrigger value="findings" className="gap-1.5 text-xs">
							Findings
							<span className="text-muted-foreground tabular-nums">{findings.length}</span>
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="edits" className="mt-0 min-h-0 flex-1 overflow-y-auto p-2">
					{entries.length === 0 ? (
						<p className="px-2 py-3 text-xs text-muted-foreground">Edits you apply from the thread collect here.</p>
					) : (
						<ul className="flex flex-col gap-0.5">
							{entries.map((entry) => (
								<li key={entry.id}>
									<button type="button" onClick={() => goTo(entry)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
										<Check className="mt-0.5 size-3.5 shrink-0 text-success" />
										<span className="min-w-0 flex-1">
											<span className="line-clamp-2 text-sm text-foreground">{entry.fix.description}</span>
											<span className="mt-0.5 block text-xs text-muted-foreground">{operationSummary(entry.fix)}</span>
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</TabsContent>

				<TabsContent value="findings" className="mt-0 min-h-0 flex-1 overflow-y-auto ">
					{findings.length === 0 ? (
						<p className="px-2 py-3 text-xs text-muted-foreground">No token health findings.</p>
					) : (
						<FindingList
							findings={findings}
							onSelect={(finding) => {
								onReference(finding);
								const nodeId = finding.nodeIds[0];
								if (nodeId) onSelectNode?.(nodeId);
							}}
						/>
					)}
				</TabsContent>
			</Tabs>
		</aside>
	);
};

export const AiReviewChat = ({ open, onOpenChange, document: projection, findings, validateFix, onApplyFixes, onSelectNode }: AiReviewChatProps) => {
	const [input, setInput] = useState("");
	const [references, setReferences] = useState<AuditFinding[]>([]);
	const [mention, setMention] = useState<MentionQuery | null>(null);
	const [mentionIndex, setMentionIndex] = useState(0);
	const [turns, setTurns] = useState<ThreadTurn[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [liveText, setLiveText] = useState("");
	const [fixes, setFixes] = useState<FixEntry[]>([]);
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

	/** Add a finding to the next message, ignoring repeats. */
	const addReference = useCallback((finding: AuditFinding) => {
		setReferences((current) => (current.some((item) => findingKey(item) === findingKey(finding)) ? current : [...current, finding]));
	}, []);

	const removeReference = useCallback((finding: AuditFinding) => {
		setReferences((current) => current.filter((item) => findingKey(item) !== findingKey(finding)));
	}, []);

	/** Reference a finding from the sidebar and put the caret back in the composer. */
	const referenceFromSidebar = useCallback(
		(finding: AuditFinding) => {
			addReference(finding);
			composerRef.current?.focus();
		},
		[addReference],
	);

	/** Re-read the @mention under the caret after the text or the caret changes. */
	const syncMention = useCallback(() => {
		const field = composerRef.current;
		if (!field) return;
		setMention(mentionQueryAt(field.value, field.selectionStart ?? field.value.length));
		setMentionIndex(0);
	}, []);

	/** Swap the @query for a reference chip. */
	const chooseMention = useCallback(
		(finding: AuditFinding) => {
			const field = composerRef.current;
			if (!field || !mention) return;
			const caret = field.selectionStart ?? input.length;
			const next = input.slice(0, mention.start) + input.slice(caret);
			setInput(next);
			addReference(finding);
			setMention(null);
			requestAnimationFrame(() => {
				field.focus();
				field.setSelectionRange(mention.start, mention.start);
			});
		},
		[input, mention, addReference],
	);

	const mentionMatches = mention ? matchFindings(findings, mention.query) : [];

	/**
	 * Send one question. The composer passes its text and any referenced findings; the
	 * intake passes the answers it recorded. Both are display context as well as
	 * input: the thread shows them, and the request carries the composed message.
	 */
	const send = useCallback(
		async (raw: string, intake?: IntakeAnswer[], referenced: AuditFinding[] = []) => {
			const trimmed = raw.trim();
			if (!trimmed || streaming) return;

			const nextTurns: ThreadTurn[] = [...turns, { role: "user", content: composeReferencedMessage(trimmed, referenced), text: trimmed, intake, references: referenced }];
			setTurns(nextTurns);
			setInput("");
			setReferences([]);
			setMention(null);
			setStreaming(true);
			setLiveText("");
			liveTextRef.current = "";
			setSkipped(0);
			setError(null);

			const controller = new AbortController();
			abortRef.current = controller;

			try {
				const outcome = await streamReview({
					document: projection,
					findings,
					// The intake answers are for the thread only; the request carries the text.
					messages: nextTurns.map(({ role, content }) => ({ role, content })),
					signal: controller.signal,
					onText: (chunk) => {
						liveTextRef.current += chunk;
						setLiveText(liveTextRef.current);
					},
				});
				const answerTurn = nextTurns.length;
				setTurns([...nextTurns, { role: "assistant", content: outcome.text }]);
				if (outcome.fixes.length > 0) {
					setFixes((current) => [
						...current,
						...outcome.fixes.map((fix, index) => ({
							id: `fix-${answerTurn}-${index}`,
							turnIndex: answerTurn,
							fix,
							status: "proposed" as const,
						})),
					]);
				}
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
		},
		[streaming, turns, projection, findings],
	);

	/**
	 * Apply one fix or a whole group. The parent applies them to the live document in
	 * a single update, so an "apply all" is one undo step.
	 */
	const handleApplyEntries = useCallback(
		(entries: FixEntry[]) => {
			if (entries.length === 0) return;
			const accepted = onApplyFixes(entries.map((entry) => entry.fix));
			const appliedIds = new Set(entries.filter((_, index) => accepted[index]).map((entry) => entry.id));
			if (appliedIds.size === 0) return;
			setFixes((current) => current.map((entry) => (appliedIds.has(entry.id) ? { ...entry, status: "applied" as const } : entry)));
		},
		[onApplyFixes],
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

	const appliedEdits = fixes.filter((entry) => entry.status === "applied");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				variant="fullscreen"
				showCloseButton={false}
				onEscapeKeyDown={(event) => {
					// Escape closes the mention picker first; the dialog stays open.
					if (!mention) return;
					event.preventDefault();
					setMention(null);
				}}
			>
				<DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
					<Sparkles className="size-4 shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<DialogTitle className="text-sm font-medium">Design-system advisor</DialogTitle>
						<DialogDescription className="truncate text-xs">Ask whether your token structure holds up. It reads the current map and the token health findings.</DialogDescription>
					</div>
					<kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-display text-xs text-muted-foreground sm:block">⌘K</kbd>
					<DialogClose asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Close advisor">
							<X className="size-4" />
						</Button>
					</DialogClose>
				</DialogHeader>

				<MessageScrollerProvider autoScroll>
					<div className="flex min-h-0 flex-1">
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="min-h-0 flex-1">
								{turns.length === 0 && !streaming ? (
									<div className="scroll-fade-b h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
										<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
											<div className="my-auto flex flex-col gap-4">
												<Intake onSubmit={(submission) => void send(submission.message, submission.answers, references)} />
												{showDisclosure && <Disclosure onDismiss={dismissDisclosure} />}
											</div>
										</div>
									</div>
								) : (
									<MessageScroller>
										<MessageScrollerViewport aria-label="Advisor conversation">
											<MessageScrollerContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
												{turns.map((turn, index) => {
													const isUser = turn.role === "user";
													const intake = turn.intake;
													const turnReferences = turn.references ?? [];
													const isLatestAnswer = !isUser && index === turns.length - 1;
													const body = isUser ? intake ? <IntakeAnswerCard answers={intake} /> : (turn.text ?? turn.content) : <Markdown>{turn.content}</Markdown>;
													const turnFixes = fixes.filter((entry) => entry.turnIndex === index);
													const proposed = turnFixes.filter((entry) => entry.status === "proposed");
													const applicable = proposed.filter((entry) => validateFix(entry.fix).length === 0);
													return (
														<MessageScrollerItem key={`turn-${index}`} messageId={`turn-${index}`} scrollAnchor={isUser}>
															<Message align={isUser ? "end" : "start"}>
																<MessageContent>
																	{turnReferences.length > 0 && (
																		<div className="flex flex-wrap justify-end gap-1 self-end">
																			{turnReferences.map((finding) => (
																				<ReferenceChip key={findingKey(finding)} finding={finding} />
																			))}
																		</div>
																	)}
																	<Bubble variant={isUser ? (intake ? "muted" : "default") : "ghost"} align={isUser ? "end" : "start"}>
																		<BubbleContent className={isUser && !intake ? "whitespace-pre-wrap" : undefined}>{body}</BubbleContent>
																	</Bubble>
																	{turnFixes.length > 0 && (
																		<div className="flex flex-col gap-2 pt-1">
																			{proposed.length > 0 && (
																				<div className="flex items-center justify-between gap-2">
																					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Proposed {proposed.length === 1 ? "fix" : "fixes"}</p>
																					<Button size="xs" variant="secondary" disabled={applicable.length === 0} onClick={() => handleApplyEntries(applicable)}>
																						Apply all
																					</Button>
																				</div>
																			)}
																			{turnFixes.map((entry) => (entry.status === "applied" ? <AppliedFix key={entry.id} entry={entry} /> : <ProposedFix key={entry.id} entry={entry} problems={validateFix(entry.fix)} onApply={(target) => handleApplyEntries([target])} />))}
																		</div>
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
																	<BubbleContent>
																		{liveText ? (
																			<Markdown streaming>{liveText}</Markdown>
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
								)}
							</div>

							<form
								className="shrink-0 border-t border-border px-4 py-3 sm:px-6"
								onSubmit={(event) => {
									event.preventDefault();
									void send(input, undefined, references);
								}}
							>
								<div className="relative mx-auto w-full max-w-3xl">
									{mention && mentionMatches.length > 0 && (
										<div className="absolute inset-x-0 bottom-full mb-2 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
											<p className="px-2.5 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Reference a finding</p>
											<ul role="listbox" aria-label="Findings" className="max-h-64 overflow-y-auto">
												{mentionMatches.map((finding, index) => {
													const meta = SEVERITY_META[finding.severity];
													const Icon = meta.icon;
													return (
														<li key={findingKey(finding)}>
															<button type="button" role="option" aria-selected={index === mentionIndex} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setMentionIndex(index)} onClick={() => chooseMention(finding)} className={cn("flex w-full items-start gap-2 px-2.5 py-1.5 text-start transition-colors", index === mentionIndex ? "bg-muted" : "hover:bg-muted/60")}>
																<Icon className={cn("mt-0.5 size-3.5 shrink-0", meta.className)} />
																<span className="min-w-0 flex-1">
																	<FindingMessage finding={finding} className="line-clamp-2 text-sm text-foreground" />
																	<span className="block text-xs text-muted-foreground">
																		{finding.nodeIds.length} {finding.nodeIds.length === 1 ? "node" : "nodes"}
																	</span>
																</span>
															</button>
														</li>
													);
												})}
											</ul>
										</div>
									)}

									<div className="rounded-xl border border-border bg-card p-2 transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15">
										{references.length > 0 && (
											<div className="mb-1.5 flex flex-wrap gap-1.5 px-1">
												{references.map((finding) => (
													<ReferenceChip key={findingKey(finding)} finding={finding} onRemove={() => removeReference(finding)} />
												))}
											</div>
										)}
										<div className="flex items-end gap-2">
											<Textarea
												ref={composerRef}
												autoFocus
												rows={1}
												value={input}
												placeholder="Ask about your token structure…"
												onChange={(event) => {
													setInput(event.target.value);
													syncMention();
												}}
												onClick={syncMention}
												onBlur={() => setMention(null)}
												onKeyDown={(event) => {
													if (event.nativeEvent.isComposing) return;
													if (mention && mentionMatches.length > 0) {
														if (event.key === "ArrowDown") {
															event.preventDefault();
															setMentionIndex((index) => (index + 1) % mentionMatches.length);
															return;
														}
														if (event.key === "ArrowUp") {
															event.preventDefault();
															setMentionIndex((index) => (index - 1 + mentionMatches.length) % mentionMatches.length);
															return;
														}
														if (event.key === "Enter" || event.key === "Tab") {
															event.preventDefault();
															chooseMention(mentionMatches[mentionIndex]);
															return;
														}
													}
													if (event.key === "Enter" && !event.shiftKey) {
														event.preventDefault();
														void send(input, undefined, references);
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
									</div>
									<p className="mt-1.5 px-1 text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line · @ to reference a finding</p>
								</div>
							</form>
						</div>

						<AdvisorSidebar entries={appliedEdits} findings={findings} onSelectNode={onSelectNode} onReference={referenceFromSidebar} />
					</div>
				</MessageScrollerProvider>
			</DialogContent>
		</Dialog>
	);
};
