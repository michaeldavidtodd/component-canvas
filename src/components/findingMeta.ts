import { AlertTriangle, CircleAlert, Info } from "lucide-react";

import type { AuditSeverity } from "@/lib/tokenAudit";

/**
 * How each audit severity reads. Shared by the token health panel and the advisor
 * sidebar so the two never describe the same finding differently.
 */
export const SEVERITY_META: Record<AuditSeverity, { label: string; icon: typeof AlertTriangle; className: string }> = {
	error: { label: "Errors", icon: CircleAlert, className: "text-destructive" },
	warning: { label: "Warnings", icon: AlertTriangle, className: "text-warning" },
	info: { label: "Notes", icon: Info, className: "text-muted-foreground" },
};

export const SEVERITY_ORDER: AuditSeverity[] = ["error", "warning", "info"];
