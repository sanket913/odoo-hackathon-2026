import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "critical";
  loading?: boolean;
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-card text-card-foreground",
  primary: "bg-card text-card-foreground border-l-4 border-l-primary",
  success: "bg-card text-card-foreground border-l-4 border-l-status-available-foreground",
  warning: "bg-card text-card-foreground border-l-4 border-l-status-warning-foreground",
  critical: "bg-card text-card-foreground border-l-4 border-l-destructive",
};

export function KpiCard({ label, value, hint, icon, tone = "default", loading }: KpiCardProps) {
  return (
    <div className={cn("rounded-lg border p-4 shadow-xs", TONE[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">
        {loading ? (
          <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" />
        ) : (
          value
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
