import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, RotateCcw, X, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { formatVersionName } from "@/lib/versions";
import type { ProjectVersion } from "@/types/project";
import { Separator } from "./ui/separator";

interface VersionHistoryProps {
	projectName?: string;
	versions: ProjectVersion[];
	/** True while versions are being fetched for the active project. */
	loading?: boolean;
	/** The version currently shown in the canvas preview, if any. */
	previewVersionId: string | null;
	onPreviewVersion: (version: ProjectVersion | null) => void;
	onRestoreVersion: (versionId: string) => void;
	/** The version currently being restored, used to disable its button. */
	restoringVersionId?: string | null;
	onDeleteVersion?: (versionId: string) => void;
	onClose?: () => void;
}

/**
 * Version history rendered inline in the canvas aside. Selecting a version
 * previews it in the canvas beside the list, so browsing and previewing happen
 * together instead of in a modal.
 *
 * The list is intentionally quiet: one surface, divided rows, and actions that
 * appear on hover or focus so the version names stay the focus.
 */
export const VersionHistory = ({ projectName, versions, loading = false, previewVersionId, onPreviewVersion, onRestoreVersion, restoringVersionId, onDeleteVersion, onClose }: VersionHistoryProps) => {
	const showLoading = loading && versions.length === 0;

	return (
		<div className="overflow-hidden w-[25rem] flex flex-col bg-card rounded-2xl mb-4">
			<header className="flex items-start justify-between gap-2 py-6 px-7 border-b border-secondary">
				<div className="min-w-0">
					<h2 className="flex items-center gap-2 text-sm font-semibold leading-tight text-foreground font-display">
						<History className="size-4 shrink-0" />
						Version History
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						{projectName ? `${projectName} · ` : ""}
						{showLoading ? "Loading…" : `${versions.length} version${versions.length === 1 ? "" : "s"}`}
					</p>
				</div>
				{onClose && (
					<Button variant="secondary" size="icon" className="size-7 shrink-0" onClick={onClose} aria-label="Close version history">
						<X className="size-4" />
					</Button>
				)}
			</header>

			<ScrollArea className="min-h-0 flex-1 px-2 bg-card rounded-2xl">
				<div className="flex flex-col gap-4 px-2">
					{showLoading ? (
						<div className="space-y-3 py-2" aria-busy="true" aria-live="polite">
							<span className="sr-only">Loading versions…</span>
							{[0, 1, 2].map((index) => (
								<div key={index} className="flex items-start gap-3 py-2">
									{/*<Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />*/}
									<div className="flex-1 space-y-2">
										<Skeleton className="h-3.5 w-2/3" />
										<Skeleton className="h-3 w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : versions.length === 0 ? (
						<div className="py-10 text-center text-muted-foreground">
							<History className="mx-auto mb-2 size-10 opacity-50" />
							<p className="text-sm">No versions yet</p>
							<p className="mt-1 text-xs">Use Project → Manual save to create one.</p>
						</div>
					) : (
						versions.map((version, index) => {
							const isPreviewing = previewVersionId === version.id;
							const isRestoring = restoringVersionId === version.id;
							const canDelete = !!onDeleteVersion && !version.is_auto_save && index !== 0;

							return (
								<div key={version.id} className={cn("group overflow-hidden flex flex-col gap-3 border rounded-xl bg-card transition-all hover:scale-105 hover:shadow-md", isPreviewing ? "sticky top-2 bottom-2 z-10 bg-primary border-primary outline outline-8 outline-card text-primary-foreground shadow-lg scale-105 transition-transform" : "z-0 hover:bg-accent")}>
									<button type="button" onClick={() => onPreviewVersion(isPreviewing ? null : version)} aria-pressed={isPreviewing} className={cn("flex w-full items-start gap-3 pt-3 px-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring")}>
										{/*<span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isPreviewing ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden="true" />*/}

										<span className="min-w-0 flex-1">
											<span className="flex items-center gap-1.5">
												<span className="flex-1 truncate text-sm font-medium">{formatVersionName(version)}</span>
												{index === 0 && <Badge className="shrink-0 px-1.5 py-0 text-[11px]">Latest</Badge>}
												{version.is_auto_save && (
													<Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[11px]">
														<span className="shrink-0 text-[11px] text-muted-foreground">Auto</span>
													</Badge>
												)}
											</span>
											<span className={cn("mt-0.5 block text-xs text-muted-foreground", isPreviewing && "text-primary-foreground/70")}>
												{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
												{" · "}
												{version.nodes.length} nodes · {version.edges.length} connections
											</span>
										</span>
									</button>

									<div className="flex items-center gap-2 pb-3 px-3">
										<Button size="sm" variant="ghost" className="flex-1 rounded-lg bg-foreground/15 hover:bg-foreground/25" onClick={() => onRestoreVersion(version.id)} disabled={isRestoring}>
											<RotateCcw className="!size-3" />
											{isRestoring ? "Restoring..." : "Restore"}
										</Button>
										{canDelete && (
											<Button size="sm" variant="destructive" className="flex-1 rounded-lg" onClick={() => onDeleteVersion?.(version.id)}>
												<Trash2 className="!size-3" />
												Delete
											</Button>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</ScrollArea>
		</div>
	);
};
