import { Fragment, useId, type ReactNode } from "react";

import { SEVERITY_META, SEVERITY_ORDER } from "@/components/findingMeta";
import { FindingMessage } from "@/components/FindingMessage";
import { Badge } from "@/components/ui/badge";
import type { AuditFinding } from "@/lib/tokenAudit";
import { cn } from "@/lib/utils";

interface FindingListProps {
	/** The findings to list, grouped by severity in a fixed order. */
	findings: AuditFinding[];
	/** Called when a row is activated. Without it, rows are not interactive. */
	onSelect?: (finding: AuditFinding) => void;
	/** Rendered under a row, e.g. the button that applies its fix. */
	renderAction?: (finding: AuditFinding) => ReactNode;
	/**
	 * The surface the list sits on. The sticky severity headers inherit it, so it has
	 * to match the scrolling container behind them.
	 */
	className?: string;
}

/**
 * The audit findings, grouped by severity. Shared by the advisor's sidebar and the
 * token health panel so the two cannot drift; each supplies what selecting a row
 * does and, where it applies fixes, the action under the row.
 */
export const FindingList = ({ findings, onSelect, renderAction, className }: FindingListProps) => {
	const listId = useId();
	const groups = SEVERITY_ORDER.map((severity) => ({
		severity,
		findings: findings.filter((finding) => finding.severity === severity),
	})).filter((group) => group.findings.length > 0);

	return (
		<div className={cn("relative flex flex-col gap-3 bg-background", className)}>
			{groups.map(({ severity, findings: groupFindings }) => {
				const meta = SEVERITY_META[severity];
				const Icon = meta.icon;
				// The header scrolls to the list, not to itself: a pinned header reports its
				// stuck position, so scrolling to it would go nowhere.
				const sectionId = `${listId}-findings-${severity}`;

				return (
					<Fragment key={severity}>
						<div className="bg-inherit sticky top-0 bottom-0 not-first:border-t border-b">
							<button
								type="button"
								onClick={() => document.getElementById(sectionId)?.scrollIntoView({ block: "start", behavior: "smooth" })}
								className="flex w-full cursor-pointer items-center gap-1.5 p-3 px-5 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
							>
								<Icon className={cn(meta.className, "size-4")} strokeWidth={3} />
								<span className="text-muted-foreground">{meta.label}</span>
								<Badge variant="secondary">{groupFindings.length}</Badge>
							</button>
						</div>
						<div id={sectionId} className="flex scroll-mt-12 flex-col gap-1 px-3 pb-6">
							<ul className="flex flex-col gap-0.5">
								{groupFindings.map((finding, index) => {
									const nodes = `${finding.nodeIds.length} ${finding.nodeIds.length === 1 ? "node" : "nodes"}`;
									const action = renderAction?.(finding);
									const label = (
										<>
											<FindingMessage finding={finding} className="line-clamp-2 text-sm text-foreground" />
											<span className="mt-0.5 block text-xs text-muted-foreground">{nodes}</span>
										</>
									);

									return (
										<li
											key={`${finding.check}-${index}`}
											className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
										>
											<span className="font-mono text-xs leading-5 text-muted-foreground">{index}</span>
											{onSelect ? (
												<button
													type="button"
													onClick={() => onSelect(finding)}
													className="flex flex-col gap-1 rounded-sm text-start focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
												>
													{label}
												</button>
											) : (
												<div className="flex flex-col gap-1">{label}</div>
											)}
											{action && <div className="col-start-2">{action}</div>}
										</li>
									);
								})}
							</ul>
						</div>
					</Fragment>
				);
			})}
		</div>
	);
};
