import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { KpiCard } from "@/components/common/kpi-card";
import { formatCurrency, formatNumber, pct } from "@/lib/utils/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TransitOps" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const sQ = useQuery({ queryKey: ["analytics-summary"], queryFn: analyticsApi.summary });
  const bQ = useQuery({ queryKey: ["analytics-by-vehicle"], queryFn: analyticsApi.byVehicle });

  const byVehicle = bQ.data ?? [];
  const topCost = [...byVehicle].sort((a, b) => b.opCost - a.opCost).slice(0, 5);
  const topEff = [...byVehicle]
    .filter((r) => r.efficiency)
    .sort((a, b) => (b.efficiency ?? 0) - (a.efficiency ?? 0))
    .slice(0, 5);
  const topRoi = [...byVehicle]
    .filter((r) => r.roi != null)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .slice(0, 5);

  function exportCsv() {
    if (!byVehicle.length) return;
    const rows = byVehicle.map((r) => ({
      registration: r.vehicle.registrationNumber,
      model: r.vehicle.modelName,
      revenue: r.revenue,
      fuelCost: r.fuelCost,
      maintCost: r.maintCost,
      opCost: r.opCost,
      distance: r.distance,
      efficiency: r.efficiency ?? "",
      roi: r.roi ?? "",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "analytics.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        actions={
          <button
            onClick={exportCsv}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            Export CSV
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Fuel Efficiency"
          value={
            sQ.data?.fuelEfficiency ? `${formatNumber(sQ.data.fuelEfficiency, 2)} km/L` : "N/A"
          }
          tone="primary"
        />
        <KpiCard
          label="Fleet Utilization"
          value={pct(sQ.data?.fleetUtilization ?? null)}
          tone="primary"
        />
        <KpiCard
          label="Operational Cost"
          value={formatCurrency(sQ.data?.officialOperationalCost)}
          tone="warning"
        />
        <KpiCard label="Revenue" value={formatCurrency(sQ.data?.totalRevenue)} tone="success" />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Operational cost by vehicle</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byVehicle.map((r) => ({
                name: r.vehicle.registrationNumber,
                fuel: r.fuelCost,
                maintenance: r.maintCost,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="fuel" stackId="a" fill="#f59e0b" />
              <Bar dataKey="maintenance" stackId="a" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard
          title="Top costliest vehicles"
          rows={topCost.map((r) => ({
            label: r.vehicle.registrationNumber,
            value: formatCurrency(r.opCost),
          }))}
        />
        <RankCard
          title="Best fuel efficiency"
          rows={topEff.map((r) => ({
            label: r.vehicle.registrationNumber,
            value: `${formatNumber(r.efficiency ?? 0, 2)} km/L`,
          }))}
        />
        <RankCard
          title="Vehicle ROI ranking"
          rows={topRoi.map((r) => ({ label: r.vehicle.registrationNumber, value: pct(r.roi) }))}
        />
      </div>
    </div>
  );
}

function RankCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data.</div>
      ) : (
        <ol className="divide-y">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span>
                {i + 1}. {r.label}
              </span>
              <span className="tabular">{r.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
