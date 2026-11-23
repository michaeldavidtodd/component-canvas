import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { AlertCircle, AlertTriangle, FileUp, Loader2, Upload } from "lucide-react";

import type { ComponentNodeData, TokenType } from "@/types/component";
import type { NormalizedCssToken } from "@/lib/cssTokenNormalize";
import { normalizeCssVariables } from "@/lib/cssTokenNormalize";
import { CssParseError, parseCssVariables } from "@/lib/cssTokens";
import { getTokenIdentityKey } from "@/lib/tokenScope";
import {
	FALLBACK_TAILWIND_VERSIONS,
	TAILWIND_LATEST,
	fetchTailwindTheme,
	fetchTailwindVersions,
	formatTailwindVersion,
	looksLikeTailwindV4,
	mergeTailwindTheme,
} from "@/lib/tailwindTheme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface CssImportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	nodes: Node<ComponentNodeData>[];
	onImport: (source: string, tokens: NormalizedCssToken[]) => void | Promise<void>;
}

type ImportPhase = "idle" | "reading" | "parsing" | "fetching" | "normalizing" | "done";
type StatusFilter = "all" | "ready" | "ambiguous" | "unsupported";

const PROGRESS_BY_PHASE: Record<ImportPhase, number> = {
	idle: 0,
	reading: 25,
	parsing: 55,
	fetching: 70,
	normalizing: 85,
	done: 100,
};

/**
 * Import CSS custom properties as design tokens.
 *
 * The dialog parses and normalizes the stylesheet, then shows a preview so the
 * user can review inferred types, scopes, and unsupported values before
 * committing. The parent owns the graph update so the import lands as a single
 * undoable action.
 */
export const CssImportDialog = ({ open, onOpenChange, nodes, onImport }: CssImportDialogProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const parseTimerRef = useRef<number | null>(null);
	const [source, setSource] = useState("pasted");
	const [cssText, setCssText] = useState("");
	const [tokens, setTokens] = useState<NormalizedCssToken[]>([]);
	const [warnings, setWarnings] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [phase, setPhase] = useState<ImportPhase>("idle");
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [typeOverrides, setTypeOverrides] = useState<Map<string, TokenType | "auto">>(new Map());
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [isImporting, setIsImporting] = useState(false);
	const [detectedTailwind, setDetectedTailwind] = useState(false);
	const [tailwindEnabled, setTailwindEnabled] = useState(false);
	const [tailwindVersion, setTailwindVersion] = useState<string>(TAILWIND_LATEST);
	const [tailwindVersions, setTailwindVersions] = useState<string[]>([...FALLBACK_TAILWIND_VERSIONS]);
	const [tailwindError, setTailwindError] = useState<string | null>(null);
	const [tailwindNote, setTailwindNote] = useState<string | null>(null);

	// Tokens already imported from this source, so the preview can flag updates.
	const existingIdentities = useMemo(() => {
		const identities = new Set<string>();
		for (const node of nodes) {
			if (node.data.componentType !== "token" || !node.data.tokenSource) continue;
			identities.add(getTokenIdentityKey(node.data.tokenSource, node.data.tokenScope ?? "", node.data.tokenName ?? node.data.label));
		}
		return identities;
	}, [nodes]);

	const resetPreview = useCallback(() => {
		setTokens([]);
		setWarnings([]);
		setError(null);
		setSelected(new Set());
		setTypeOverrides(new Map());
		setDetectedTailwind(false);
		setTailwindError(null);
		setTailwindNote(null);
		setPhase("idle");
	}, []);

	// Live detection so the badge appears as soon as Tailwind CSS is loaded or
	// pasted, before the user parses.
	const tailwindDetected = useMemo(() => detectedTailwind || looksLikeTailwindV4(cssText), [cssText, detectedTailwind]);

	// Populate the version picker from jsDelivr the first time the dialog opens.
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		void fetchTailwindVersions().then((versions) => {
			if (!cancelled) setTailwindVersions(versions);
		});
		return () => {
			cancelled = true;
		};
	}, [open]);

	useEffect(
		() => () => {
			if (parseTimerRef.current !== null) window.clearTimeout(parseTimerRef.current);
		},
		[],
	);

	const handleFile = useCallback(async (file: File) => {
		if (!file.name.toLowerCase().endsWith(".css")) {
			setError("Choose a .css file.");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setError("That file is larger than 5 MB. Try a smaller stylesheet.");
			return;
		}
		setPhase("reading");
		setError(null);
		try {
			const text = await file.text();
			setCssText(text);
			setSource(file.name);
			setPhase("idle");
		} catch {
			setPhase("idle");
			setError("Could not read that file.");
		}
	}, []);

	const handleParse = useCallback(async () => {
		if (!cssText.trim()) {
			setError("Add a CSS file or paste some CSS first.");
			return;
		}
		setError(null);
		setWarnings([]);
		setTokens([]);
		setSelected(new Set());
		setTypeOverrides(new Map());
		setTailwindError(null);
		setTailwindNote(null);
		setPhase("parsing");

		// Yield so the progress state paints before the synchronous parse.
		await new Promise<void>((resolve) => {
			parseTimerRef.current = window.setTimeout(resolve, 0);
		});

		try {
			const parsed = parseCssVariables(cssText);
			setDetectedTailwind(parsed.tailwindSignals.length > 0);

			let variables = parsed.variables;
			if (tailwindEnabled) {
				setPhase("fetching");
				try {
					const fetched = await fetchTailwindTheme(tailwindVersion);
					const merged = mergeTailwindTheme(variables, fetched);
					variables = merged.variables;
					setTailwindNote(
						merged.backfilled > 0
							? `Added ${merged.backfilled} tokens from Tailwind ${formatTailwindVersion(tailwindVersion)}.`
							: `Tailwind ${formatTailwindVersion(tailwindVersion)} added no new tokens; your CSS already defines them.`,
					);
				} catch (caught) {
					setTailwindError(caught instanceof Error ? caught.message : "Could not fetch the Tailwind theme.");
				}
			}

			setPhase("normalizing");
			const normalized = normalizeCssVariables(variables);
			if (normalized.length === 0) {
				setPhase("idle");
				setError("No CSS custom properties found. Add declarations like --color-brand: #0055ff;");
				return;
			}
			setTokens(normalized);
			setWarnings(parsed.warnings);
			setSelected(new Set(normalized.map((token) => getTokenIdentityKey(source, token.scope, token.name))));
			setPhase("done");
		} catch (caught) {
			setPhase("idle");
			setError(caught instanceof CssParseError ? caught.message : "Could not parse that CSS.");
		}
	}, [cssText, source, tailwindEnabled, tailwindVersion]);

	const toggleSelected = useCallback((identity: string) => {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(identity)) next.delete(identity);
			else next.add(identity);
			return next;
		});
	}, []);

	const setTypeOverride = useCallback((identity: string, value: TokenType | "auto") => {
		setTypeOverrides((current) => {
			const next = new Map(current);
			next.set(identity, value);
			return next;
		});
	}, []);

	const handleImport = useCallback(async () => {
		const chosen = tokens
			.filter((token) => selected.has(getTokenIdentityKey(source, token.scope, token.name)))
			.map((token) => {
				const identity = getTokenIdentityKey(source, token.scope, token.name);
				const override = typeOverrides.get(identity);
				return override && override !== "auto" ? { ...token, tokenType: override } : token;
			});

		if (chosen.length === 0) {
			setError("Select at least one token to import.");
			return;
		}

		setError(null);
		setIsImporting(true);
		try {
			await onImport(source, chosen);
			onOpenChange(false);
			resetPreview();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not import those tokens.");
		} finally {
			setIsImporting(false);
		}
	}, [onImport, onOpenChange, resetPreview, selected, source, tokens, typeOverrides]);

	const filteredTokens = useMemo(
		() => (statusFilter === "all" ? tokens : tokens.filter((token) => token.status === statusFilter)),
		[statusFilter, tokens],
	);

	// Backfilled tokens are the ones merged in from the Tailwind theme. They can be
	// excluded in bulk without touching the tokens from the uploaded CSS.
	const backfilledIdentities = useMemo(
		() => tokens.filter((token) => token.origin === "tailwind").map((token) => getTokenIdentityKey(source, token.scope, token.name)),
		[tokens, source],
	);
	const tailwindCount = backfilledIdentities.length;
	const uploadCount = tokens.length - tailwindCount;
	const hasBackfilled = tailwindCount > 0;
	// The switch reads as "are Tailwind tokens included at all?", so it stays on
	// while any backfilled token is selected, even if the user trimmed the set.
	const backfilledIncluded = backfilledIdentities.some((identity) => selected.has(identity));

	const toggleBackfilled = useCallback(
		(include: boolean) => {
			setSelected((current) => {
				const next = new Set(current);
				for (const identity of backfilledIdentities) {
					if (include) next.add(identity);
					else next.delete(identity);
				}
				return next;
			});
		},
		[backfilledIdentities],
	);

	const progress = PROGRESS_BY_PHASE[phase];
	const isBusy = phase === "reading" || phase === "parsing" || phase === "fetching" || phase === "normalizing";

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				// Keep the dialog open while the import runs so the pending state stays
				// visible and the canvas can't be edited mid-import.
				if (!isImporting) onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Import CSS tokens</DialogTitle>
					<DialogDescription>
						Upload a stylesheet or paste CSS. Custom properties become design tokens; scopes, themes, and aliases are preserved.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept=".css,text/css"
							className="hidden"
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) void handleFile(file);
								event.target.value = "";
							}}
						/>
						<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
							<FileUp className="size-4" />
							Choose CSS file
						</Button>
						<span className="text-xs text-muted-foreground">
							Source: <span className="font-mono">{source}</span>
						</span>
						{(cssText || tokens.length > 0) && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setCssText("");
									setSource("pasted");
									resetPreview();
								}}
								disabled={isBusy}
							>
								Clear
							</Button>
						)}
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor="css-import-text">
							Or paste CSS
						</label>
						<Textarea
							id="css-import-text"
							value={cssText}
							onChange={(event) => setCssText(event.target.value)}
							placeholder={":root {\n  --color-bg: 0 0% 100%;\n  --color-fg: var(--color-bg);\n}"}
							className="min-h-28 font-mono text-xs"
							disabled={isBusy}
						/>
					</div>

					<div className="space-y-3 rounded-md border px-3 py-3">
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">Tailwind v4 theme backfill</span>
									{tailwindDetected && <Badge variant="secondary">Detected</Badge>}
								</div>
								<p className="text-xs text-muted-foreground">
									Fetch Tailwind&apos;s default theme from the CDN and merge it with your CSS. Your CSS wins on collisions. This makes a network request.
								</p>
							</div>
							<Switch
								checked={tailwindEnabled}
								onCheckedChange={setTailwindEnabled}
								disabled={isBusy}
								aria-label="Backfill Tailwind v4 theme"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground">Version</span>
							<Select value={tailwindVersion} onValueChange={setTailwindVersion} disabled={isBusy}>
								<SelectTrigger className="h-8 w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={TAILWIND_LATEST}>{formatTailwindVersion(TAILWIND_LATEST)}</SelectItem>
									{tailwindVersions.map((version) => (
										<SelectItem key={version} value={version}>
											{formatTailwindVersion(version)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{tailwindDetected && !tailwindEnabled && (
							<p className="text-xs text-amber-700 dark:text-amber-300">Tailwind v4 detected. Turn on backfill to include its default tokens.</p>
						)}
						{tailwindNote && <p className="text-xs text-muted-foreground">{tailwindNote}</p>}
						{tailwindError && (
							<div className="flex items-start gap-2 text-xs text-destructive">
								<AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
								<span>{tailwindError} Uploaded tokens were still parsed.</span>
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" onClick={() => void handleParse()} disabled={isBusy}>
							{isBusy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
							Parse CSS
						</Button>
						{tokens.length > 0 && (
							<span className="text-xs text-muted-foreground">
								{tokens.length} variables · {selected.size} selected
							</span>
						)}
					</div>

					{isBusy && <Progress value={progress} className="h-2" />}

					{error && (
						<div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							<AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>{error}</span>
						</div>
					)}

					{warnings.length > 0 && (
						<div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
							{warnings.map((warning) => (
								<div key={warning} className="flex items-start gap-2">
									<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
									<span>{warning}</span>
								</div>
							))}
						</div>
					)}

					{tokens.length > 0 && (
						<div className="space-y-2">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex flex-wrap items-center gap-2">
									<Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set(tokens.map((token) => getTokenIdentityKey(source, token.scope, token.name))))}>
										Select all
									</Button>
									<Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>
										Select none
									</Button>
									{hasBackfilled && (
										<label className="flex items-center gap-2 text-xs text-muted-foreground">
											<Switch checked={backfilledIncluded} onCheckedChange={toggleBackfilled} aria-label="Include Tailwind tokens" />
											Include Tailwind tokens
										</label>
									)}
								</div>
								<Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
									<SelectTrigger className="h-8 w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All statuses</SelectItem>
										<SelectItem value="ready">Ready</SelectItem>
										<SelectItem value="ambiguous">Ambiguous</SelectItem>
										<SelectItem value="unsupported">Unsupported</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
								<span>{uploadCount} from your CSS</span>
								{hasBackfilled && <span>{tailwindCount} from Tailwind</span>}
								<span>{selected.size} selected</span>
							</div>

							<div className="max-h-80 overflow-auto rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-10" />
											<TableHead>Variable</TableHead>
											<TableHead>Value</TableHead>
											<TableHead className="w-40">Type</TableHead>
											<TableHead>Scope</TableHead>
											<TableHead className="w-28">Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredTokens.map((token) => {
											const identity = getTokenIdentityKey(source, token.scope, token.name);
											const isSelected = selected.has(identity);
											const isUpdate = existingIdentities.has(identity);
											const override = typeOverrides.get(identity) ?? "auto";
											return (
												<TableRow key={identity} data-state={isSelected ? "selected" : undefined}>
													<TableCell>
														<Checkbox checked={isSelected} onCheckedChange={() => toggleSelected(identity)} aria-label={`Select ${token.name}`} />
													</TableCell>
													<TableCell>
														<div className="flex flex-col gap-1">
															<span className="font-mono text-xs">{token.name}</span>
															<div className="flex flex-wrap items-center gap-1">
																{hasBackfilled && (
																	<Badge variant={token.origin === "tailwind" ? "secondary" : "outline"} className="text-[10px]">
																		{token.origin === "tailwind" ? "Tailwind" : "Upload"}
																	</Badge>
																)}
																{isUpdate && <span className="text-[10px] text-muted-foreground">Updates existing token</span>}
															</div>
														</div>
													</TableCell>
													<TableCell className="max-w-48 truncate font-mono text-xs" title={token.raw}>
														{token.raw}
													</TableCell>
													<TableCell>
														<Select value={override} onValueChange={(value) => setTypeOverride(identity, value as TokenType | "auto")}>
															<SelectTrigger className="h-8">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="auto">Auto ({token.tokenType ?? "untyped"})</SelectItem>
																<SelectItem value="color">Color</SelectItem>
																<SelectItem value="spacing">Spacing</SelectItem>
																<SelectItem value="corner-radius">Corner radius</SelectItem>
																<SelectItem value="size">Size</SelectItem>
																<SelectItem value="shadow">Shadow</SelectItem>
																<SelectItem value="font">Font</SelectItem>
																<SelectItem value="ratio">Ratio</SelectItem>
															</SelectContent>
														</Select>
													</TableCell>
													<TableCell className="text-xs">
														<div className="flex flex-col">
															<span>{token.scope}</span>
															{token.theme && <span className="text-muted-foreground">{token.theme}</span>}
														</div>
													</TableCell>
													<TableCell>
														<Badge variant={token.status === "ready" ? "secondary" : token.status === "ambiguous" ? "outline" : "destructive"}>{token.status}</Badge>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</div>
					)}

					{isImporting && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
							<Loader2 className="size-4 animate-spin" aria-hidden="true" />
							Importing tokens…
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isImporting}>
						Cancel
					</Button>
					<Button type="button" onClick={handleImport} disabled={selected.size === 0 || isBusy || isImporting}>
						{isImporting && <Loader2 className="size-4 animate-spin" />}
						{isImporting ? "Importing…" : `Import ${selected.size > 0 ? `${selected.size} tokens` : "tokens"}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
