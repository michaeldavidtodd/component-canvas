import { X } from "lucide-react";

import type { AuditFinding, AuditFix } from "@/lib/tokenAudit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FindingList } from "@/components/FindingList";

interface TokenHealthProps {
	findings: AuditFinding[];
	/** Select the node a finding points at, so the canvas and map can show it. */
	onSelectNode?: (nodeId: string) => void;
	/** Apply a finding's fix. Findings without a fix render no button. */
	onApplyFix?: (fix: AuditFix) => void;
	onClose: () => void;
}

/**
 * Read-only review of the deterministic token audit. Findings are grouped by
 * severity and selecting one points the canvas and map at the affected node.
 */
export const TokenHealth = ({ findings, onSelectNode, onApplyFix, onClose }: TokenHealthProps) => (
	<Card className="flex-1 p-0 gap-0 flex flex-col">
		<div className="flex items-start justify-between gap-2 p-3 px-5">
			<div>
				<h3 className="text-lg font-semibold text-foreground mb-1">Token health</h3>
				<p className="text-sm text-muted-foreground">{findings.length === 0 ? "No issues found" : `${findings.length} ${findings.length === 1 ? "finding" : "findings"}`}</p>
			</div>
			<Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Close token health">
				<X className="size-4" />
			</Button>
		</div>

		{findings.length === 0 ? (
			<div className="flex flex-1 items-center justify-center p-6 text-center">
				<div>
					<p className="text-sm font-medium text-foreground">Token structure looks healthy</p>
					<p className="mt-1 text-xs text-muted-foreground">No invalid values, dangling aliases, or unused tokens.</p>
				</div>
			</div>
		) : (
			<FindingList
				className="bg-card overflow-y-auto"
				findings={findings}
				onSelect={
					onSelectNode
						? (finding) => {
								const nodeId = finding.nodeIds[0];
								if (nodeId) onSelectNode(nodeId);
							}
						: undefined
				}
				renderAction={(finding) => {
					const fix = finding.fix;
					if (!fix || !onApplyFix) return null;
					return (
						<Button variant="outline" size="sm" className="whitespace-normal text-left h-auto py-1 hover:bg-primary hover:text-primary-foreground" onClick={() => onApplyFix(fix)}>
							{fix.summary}
						</Button>
					);
				}}
			/>
		)}
	</Card>
);
