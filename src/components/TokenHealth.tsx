import { AlertTriangle, CircleAlert, Info, X } from "lucide-react";

import type { AuditFinding, AuditFix, AuditSeverity } from "@/lib/tokenAudit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TokenHealthProps {
	findings: AuditFinding[];
	/** Select the node a finding points at, so the canvas and map can show it. */
	onSelectNode?: (nodeId: string) => void;
	/** Apply a finding's fix. Findings without a fix render no button. */
	onApplyFix?: (fix: AuditFix) => void;
	onClose: () => void;
}

const SEVERITY_META: Record<AuditSeverity, { label: string; icon: typeof AlertTriangle; className: string }> = {
	error: { label: "Errors", icon: CircleAlert, className: "text-destructive" },
	warning: { label: "Warnings", icon: AlertTriangle, className: "text-warning" },
	info: { label: "Notes", icon: Info, className: "text-muted-foreground" },
};

const SEVERITY_ORDER: AuditSeverity[] = ["error", "warning", "info"];

/**
 * Read-only review of the deterministic token audit. Findings are grouped by
 * severity and selecting one points the canvas and map at the affected node.
 */
export const TokenHealth = ({ findings, onSelectNode, onApplyFix, onClose }: TokenHealthProps) => {
	const groups = SEVERITY_ORDER.map((severity) => ({ severity, findings: findings.filter((finding) => finding.severity === severity) })).filter((group) => group.findings.length > 0);

	return (
		<Card className="flex-1 p-2 xl:p-6 flex flex-col gap-4 overflow-y-auto">
			<div className="flex items-start justify-between gap-2">
				<div>
					<h3 className="text-lg font-semibold text-foreground mb-1">Token health</h3>
					<p className="text-sm text-muted-foreground">{findings.length === 0 ? "No issues found" : `${findings.length} ${findings.length === 1 ? "finding" : "findings"}`}</p>
				</div>
				<Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close token health">
					<X className="size-4" />
				</Button>
			</div>

			{findings.length === 0 ? (
				<div className="flex flex-1 items-center justify-center text-center">
					<div>
						<p className="text-sm font-medium text-foreground">Token structure looks healthy</p>
						<p className="mt-1 text-xs text-muted-foreground">No invalid values, dangling aliases, or unused tokens.</p>
					</div>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{groups.map(({ severity, findings: groupFindings }) => {
						const meta = SEVERITY_META[severity];
						const Icon = meta.icon;
						return (
							<div key={severity} className="flex flex-col gap-2">
								<div className="flex items-center gap-2">
									<Icon className={cn("size-4", meta.className)} />
									<h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{meta.label} · {groupFindings.length}
									</h4>
								</div>
								<ul className="flex flex-col gap-1.5">
									{groupFindings.map((finding, index) => {
										const fix = finding.fix;
										return (
											<li key={`${finding.check}-${index}`} className="rounded-lg border border-border bg-card px-3 py-2">
												<button
													type="button"
													onClick={() => onSelectNode?.(finding.nodeIds[0])}
													className="block w-full text-left text-sm transition-colors hover:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
												>
													<span className="block text-foreground">{finding.message}</span>
													<span className="mt-0.5 block text-xs text-muted-foreground">{finding.nodeIds.length === 1 ? "1 node" : `${finding.nodeIds.length} nodes`}</span>
												</button>
												{fix && onApplyFix && (
													<Button variant="outline" size="sm" className="mt-2" onClick={() => onApplyFix(fix)}>
														{fix.summary}
													</Button>
												)}
											</li>
										);
									})}
								</ul>
							</div>
						);
					})}
				</div>
			)}
		</Card>
	);
};
