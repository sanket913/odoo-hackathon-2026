import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { HeartPulse, Wrench, ArrowRight, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

import { PageHeader, EmptyState, TableSkeleton } from "@/components/common/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/common/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { vehicleApi, maintenanceApi, fuelApi } from "@/lib/api/services";
import type { Vehicle } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/fleet-health")({
  head: () => ({
    meta: [
      { title: "Fleet Health — TransitOps" },
      {
        name: "description",
        content:
          "Fleet Risk Radar — monitor vehicle health, predict service needs, and act before breakdowns.",
      },
    ],
  }),
  component: FleetHealthPage,
});

type RiskLevel = "healthy" | "monitor" | "service_soon" | "critical";
const LEVEL_LABEL: Record<RiskLevel, string> = {
  healthy: "Healthy",
  monitor: "Monitor",
  service_soon: "Service Soon",
  critical: "Critical",
};
const LEVEL_TONE: Record<RiskLevel, string> = {
  healthy: "bg-status-available text-status-available-foreground",
  monitor: "bg-status-active text-status-active-foreground",
  service_soon: "bg-status-warning text-status-warning-foreground",
  critical: "bg-status-critical text-status-critical-foreground",
};

interface Risk {
  vehicle: Vehicle;
  score: number;
  level: RiskLevel;
  reasons: string[];
  factors: { label: string; weight: number; value: number }[];
  lastServiceDays: number | null;
  fuelCount: number;
  activeMaint: number;
  maintCost: number;
}

function computeRisk(
  v: Vehicle,
  activeMaintCount: number,
  fuelCount: number,
  maintCost: number,
): Risk {
  const now = new Date();
  const lastServiceDays = v.lastServiceDate
    ? differenceInDays(now, parseISO(v.lastServiceDate))
    : null;

  const factors: { label: string; weight: number; value: number }[] = [];
  const reasons: string[] = [];

  // Service overdue (0-100)
  const overdue =
    lastServiceDays == null ? 60 : Math.min(100, Math.max(0, (lastServiceDays - 90) * 1.5));
  factors.push({ label: "Service overdue", weight: 25, value: overdue });
  if (overdue > 50) reasons.push(`Last serviced ${lastServiceDays} days ago`);

  // Odometer wear
  const odoRisk = Math.min(100, Math.max(0, (v.odometerKm - 80000) / 1500));
  factors.push({ label: "Kilometres accumulated", weight: 20, value: odoRisk });
  if (odoRisk > 50) reasons.push(`High odometer (${v.odometerKm.toLocaleString()} km)`);

  // Vehicle age
  const age = new Date().getFullYear() - v.manufacturingYear;
  const ageRisk = Math.min(100, age * 8);
  factors.push({ label: "Vehicle age", weight: 15, value: ageRisk });
  if (age > 8) reasons.push(`${age} years old`);

  // Repair frequency (via fuel/maint count proxy)
  const repairRisk = Math.min(100, activeMaintCount * 40);
  factors.push({ label: "Active repairs", weight: 15, value: repairRisk });
  if (activeMaintCount > 0) reasons.push(`${activeMaintCount} active maintenance record(s)`);

  // Maintenance cost trend
  const costRisk = Math.min(100, maintCost / 500);
  factors.push({ label: "Maintenance cost", weight: 15, value: costRisk });

  // Status penalty
  const statusRisk = v.status === "in_shop" ? 100 : v.status === "retired" ? 100 : 0;
  factors.push({ label: "Status penalty", weight: 10, value: statusRisk });
  if (v.status === "in_shop") reasons.push("Currently in shop");

  const score = Math.round(factors.reduce((s, f) => s + (f.value * f.weight) / 100, 0));
  const level: RiskLevel =
    score >= 80 ? "critical" : score >= 60 ? "service_soon" : score >= 30 ? "monitor" : "healthy";

  return {
    vehicle: v,
    score,
    level,
    reasons,
    factors,
    lastServiceDays,
    fuelCount,
    activeMaint: activeMaintCount,
    maintCost,
  };
}

function FleetHealthPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const mQ = useQuery({ queryKey: ["maintenance"], queryFn: maintenanceApi.list });
  const fQ = useQuery({ queryKey: ["fuel"], queryFn: fuelApi.list });

  const risks = useMemo<Risk[]>(() => {
    if (!vQ.data) return [];
    const maint = mQ.data ?? [];
    const fuel = fQ.data ?? [];
    return vQ.data
      .map((v) => {
        const active = maint.filter(
          (m) => m.vehicleId === v.id && (m.status === "open" || m.status === "in_progress"),
        ).length;
        const fuelCount = fuel.filter((f) => f.vehicleId === v.id).length;
        const maintCost = maint
          .filter((m) => m.vehicleId === v.id)
          .reduce((s, m) => s + (m.finalCost ?? m.cost), 0);
        return computeRisk(v, active, fuelCount, maintCost);
      })
      .sort((a, b) => b.score - a.score);
  }, [vQ.data, mQ.data, fQ.data]);

  const kpis = useMemo(() => {
    const counts = { healthy: 0, monitor: 0, service_soon: 0, critical: 0 };
    risks.forEach((r) => counts[r.level]++);
    const avg = risks.length
      ? Math.round(100 - risks.reduce((s, r) => s + r.score, 0) / risks.length)
      : 0;
    return { ...counts, overall: avg };
  }, [risks]);

  const regions = useMemo(
    () => Array.from(new Set(risks.map((r) => r.vehicle.region))).sort(),
    [risks],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return risks.filter((r) => {
      if (filter !== "all" && r.level !== filter) return false;
      if (region !== "all" && r.vehicle.region !== region) return false;
      if (status !== "all" && r.vehicle.status !== status) return false;
      if (
        q &&
        !`${r.vehicle.registrationNumber} ${r.vehicle.modelName} ${r.vehicle.region}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [filter, region, risks, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isLoading = vQ.isLoading || mQ.isLoading || fQ.isLoading;

  useEffect(() => {
    setPage(1);
  }, [filter, region, search, status]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <HeartPulse className="size-5 text-primary" />
            Fleet Health & Risk Radar
          </span>
        }
        description="Predictive health scoring identifies vehicles at risk before they become failures."
      />

      <div className="grid gap-3 md:grid-cols-5">
        <KpiCard label="Overall Fleet Health" value={`${kpis.overall}/100`} />
        <button onClick={() => setFilter("healthy")} className="text-left">
          <KpiCard label="Healthy" value={kpis.healthy} />
        </button>
        <button onClick={() => setFilter("monitor")} className="text-left">
          <KpiCard label="Monitor" value={kpis.monitor} />
        </button>
        <button onClick={() => setFilter("service_soon")} className="text-left">
          <KpiCard label="Service Soon" value={kpis.service_soon} />
        </button>
        <button onClick={() => setFilter("critical")} className="text-left">
          <KpiCard label="Critical" value={kpis.critical} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "critical", "service_soon", "monitor", "healthy"] as const).map((l) => (
          <Button
            key={l}
            size="sm"
            variant={filter === l ? "default" : "outline"}
            onClick={() => setFilter(l)}
          >
            {l === "all" ? "All Vehicles" : LEVEL_LABEL[l]}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 md:flex-row md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicle, model, region..."
          className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter fleet health by region"
        >
          <option value="all">All regions</option>
          {regions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter fleet health by status"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="on_trip">On Trip</option>
          <option value="in_shop">In Shop</option>
          <option value="retired">Retired</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setFilter("all");
            setSearch("");
            setRegion("all");
            setStatus("all");
          }}
        >
          Reset
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No vehicles match this filter" />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((r) => (
              <Card key={r.vehicle.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">
                        {r.vehicle.registrationNumber}
                      </CardTitle>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.vehicle.modelName} · {r.vehicle.region}
                      </div>
                    </div>
                    <Badge className={LEVEL_TONE[r.level]}>{LEVEL_LABEL[r.level]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold tabular">{r.score}</div>
                    <div className="text-xs text-muted-foreground">risk score</div>
                  </div>
                  {r.reasons.length > 0 && (
                    <ul className="space-y-1 text-xs">
                      {r.reasons.slice(0, 3).map((reason) => (
                        <li key={reason} className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-status-warning-foreground" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="space-y-1.5">
                    {r.factors.slice(0, 4).map((f) => (
                      <div key={f.label}>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="tabular">{Math.round(f.value)}</span>
                        </div>
                        <Progress value={f.value} className="h-1" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() =>
                        navigate({
                          to: "/fleet/$vehicleId",
                          params: { vehicleId: r.vehicle.id },
                        })
                      }
                    >
                      Open <ArrowRight className="ml-1 size-3" />
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        navigate({
                          to: "/maintenance/new",
                          search: { vehicleId: r.vehicle.id } as never,
                        })
                      }
                    >
                      <Wrench className="mr-1 size-3" /> Service
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Page {currentPage} of {totalPages} · {filtered.length} vehicle
                {filtered.length === 1 ? "" : "s"}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
