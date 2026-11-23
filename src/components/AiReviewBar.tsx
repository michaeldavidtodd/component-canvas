/**
 * The command bar for the design-system advisor.
 *
 * A command bar rather than a chat sidebar: the canvas stays the product and the
 * resting state stays quiet. Cmd+K opens it, Enter sends, Escape closes.
 *
 * The narrative streams as it arrives; proposed fixes only appear once the tool
 * call is complete, and each one is checked against the live document before it
 * can be applied. Stopping the response cancels the upstream generation.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
	const transcriptRef = useRef<HTMLDivElement | null>(null);

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

	// Keep the transcript scrolled to the newest text as it streams.
	useEffect(() => {
		transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
	}, [turns, liveText]);

	const handleStop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const handleSubmit = useCallback(async () => {
		const trimmed = input.trim();
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
	}, [input, streaming, turns, projection, findings]);

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
			<DialogContent className="top-24 max-w-2xl translate-y-0 gap-3 p-4">
				<DialogHeader className="space-y-1">
					<DialogTitle className="flex items-center gap-2 text-sm font-medium">
						<Sparkles className="size-4 text-primary" />
						Design-system advisor
					</DialogTitle>
					<DialogDescription className="text-xs">
						Ask whether your token structure holds up. It reads the current map and the token health findings.
					</DialogDescription>
				</DialogHeader>

				{showDisclosure && (
					<div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
						<p className="mb-1 font-medium text-foreground">What leaves this machine</p>
						<p>Node fields: {PROJECTED_NODE_FIELDS.join(", ")}. Edges reduce to id, source, and target.</p>
						<p className="mt-1">Positions, styling, selection, and Figma links are never sent. Requests run with zero data retention.</p>
						<Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={dismissDisclosure}>
							Don't show again
						</Button>
					</div>
				)}

				{(turns.length > 0 || liveText) && (
					<div ref={transcriptRef} className="max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-3 text-sm">
						{turns.map((turn, index) => (
							<p key={index} className={turn.role === "user" ? "mb-2 font-medium text-foreground" : "mb-2 whitespace-pre-wrap text-muted-foreground"}>
								{turn.content}
							</p>
						))}
						{liveText && <p className="whitespace-pre-wrap text-muted-foreground">{liveText}</p>}
						{streaming && !liveText && (
							<p className="flex items-center gap-2 text-xs text-muted-foreground">
								<Loader2 className="size-3 animate-spin" /> Thinking…
							</p>
						)}
					</div>
				)}

				{error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}

				{skipped > 0 && (
					<p className="text-xs text-muted-foreground">
						{skipped} proposed {skipped === 1 ? "fix" : "fixes"} couldn't be read and were dropped.
					</p>
				)}

				{fixes.length > 0 && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-foreground">Proposed fixes</p>
						{fixes.map((fix, index) => {
							const problems = validateFix(fix);
							return (
								<div key={index} className="rounded-lg border border-border bg-card p-3">
									<p className="text-sm text-foreground">{fix.description}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{fix.operations.length} {fix.operations.length === 1 ? "operation" : "operations"}
										{fix.nodeIds.length > 0 && ` · ${fix.nodeIds.length} ${fix.nodeIds.length === 1 ? "node" : "nodes"}`}
									</p>
									{problems.length > 0 && <p className="mt-1 text-xs text-destructive">{problems[0]}</p>}
									<Button
										size="sm"
										variant="outline"
										className="mt-2 h-7 px-2 text-xs"
										disabled={problems.length > 0}
										onClick={() => {
										onApplyFix(fix);
										setFixes((current) => current.filter((_, position) => position !== index));
									}}
									>
										Apply
									</Button>
								</div>
							);
						})}
					</div>
				)}

				<div className="flex items-center gap-2">
					<Input
						autoFocus
						value={input}
						placeholder="Ask about your token structure…"
						disabled={streaming}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								void handleSubmit();
							}
						}}
					/>
					{streaming ? (
						<Button variant="outline" size="sm" onClick={handleStop}>
							<Square className="mr-1 size-3" /> Stop
						</Button>
					) : (
						<Button size="sm" onClick={() => void handleSubmit()} disabled={!input.trim()}>
							Ask
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
