import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fuelApi, expenseApi, vehicleApi, tripApi, analyticsApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import type { Expense } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/fuel-expenses")({
  head: () => ({ meta: [{ title: "Fuel & Expenses — TransitOps" }] }),
  component: FuelExpensePage,
});

function FuelExpensePage() {
  const fQ = useQuery({ queryKey: ["fuel"], queryFn: fuelApi.list });
  const eQ = useQuery({ queryKey: ["expenses"], queryFn: expenseApi.list });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const tQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list });
  const sQ = useQuery({ queryKey: ["analytics-summary"], queryFn: analyticsApi.summary });
  const qc = useQueryClient();

  const [fuel, setFuel] = useState({
    vehicleId: "",
    tripId: "",
    date: new Date().toISOString().slice(0, 10),
    litres: 0,
    totalCost: 0,
    odometerKm: 0,
    fuelStation: "",
  });
  const [expense, setExpense] = useState({
    vehicleId: "",
    tripId: "",
    category: "toll" as Expense["category"],
    description: "",
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  const fuelMut = useMutation({
    mutationFn: () =>
      fuelApi.create({
        ...fuel,
        date: new Date(fuel.date).toISOString(),
        tripId: fuel.tripId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Fuel logged");
      setFuel({ ...fuel, litres: 0, totalCost: 0 });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const expMut = useMutation({
    mutationFn: () =>
      expenseApi.create({
        ...expense,
        expenseDate: new Date(expense.expenseDate).toISOString(),
        tripId: expense.tripId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Expense added");
      setExpense({ ...expense, description: "", amount: 0 });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const pricePerLitre = useMemo(
    () => (fuel.litres > 0 ? fuel.totalCost / fuel.litres : 0),
    [fuel.litres, fuel.totalCost],
  );
  const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";

  function exportCsv(kind: "fuel" | "expenses") {
    const rows =
      kind === "fuel"
        ? (fQ.data ?? []).map((r) => ({
            date: r.date,
            vehicle: vQ.data?.find((v) => v.id === r.vehicleId)?.registrationNumber,
            litres: r.litres,
            cost: r.totalCost,
            odometer: r.odometerKm,
          }))
        : (eQ.data ?? []).map((r) => ({
            date: r.expenseDate,
            number: r.expenseNumber,
            vehicle: vQ.data?.find((v) => v.id === r.vehicleId)?.registrationNumber,
            category: r.category,
            description: r.description,
            amount: r.amount,
          }));
    if (rows.length === 0) return toast.info("Nothing to export.");
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel & Expenses"
        description="Log fuel, track expenses and review the cost summary."
      />
      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
          <TabsTrigger value="exp">Other Expenses</TabsTrigger>
          <TabsTrigger value="sum">Cost Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel" className="mt-4 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fuelMut.mutate();
            }}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <h3 className="text-sm font-semibold">Log Fuel</h3>
            <select
              required
              value={fuel.vehicleId}
              onChange={(e) => setFuel({ ...fuel, vehicleId: e.target.value })}
              className={inp}
            >
              <option value="">Vehicle…</option>
              {(vQ.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
            <select
              value={fuel.tripId}
              onChange={(e) => setFuel({ ...fuel, tripId: e.target.value })}
              className={inp}
            >
              <option value="">Trip (optional)</option>
              {(tQ.data ?? [])
                .filter((t) => !fuel.vehicleId || t.vehicleId === fuel.vehicleId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripNumber}
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={fuel.date}
              onChange={(e) => setFuel({ ...fuel, date: e.target.value })}
              className={inp}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Litres"
                value={fuel.litres || ""}
                onChange={(e) => setFuel({ ...fuel, litres: Number(e.target.value) })}
                className={inp}
              />
              <input
                type="number"
                min={0}
                placeholder="Total cost"
                value={fuel.totalCost || ""}
                onChange={(e) => setFuel({ ...fuel, totalCost: Number(e.target.value) })}
                className={inp}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Price / litre: {formatCurrency(pricePerLitre)}
            </div>
            <input
              type="number"
              min={0}
              placeholder="Odometer"
              value={fuel.odometerKm || ""}
              onChange={(e) => setFuel({ ...fuel, odometerKm: Number(e.target.value) })}
              className={inp}
            />
            <input
              placeholder="Fuel station"
              value={fuel.fuelStation}
              onChange={(e) => setFuel({ ...fuel, fuelStation: e.target.value })}
              className={inp}
            />
            <button
              disabled={fuelMut.isPending}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Log fuel
            </button>
          </form>

          <div className="rounded-lg border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b p-3">
              <h3 className="text-sm font-semibold">Recent fuel logs</h3>
              <button
                onClick={() => exportCsv("fuel")}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                Export CSV
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Litres</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">₹/L</th>
                  <th className="px-3 py-2">Odo</th>
                </tr>
              </thead>
              <tbody>
                {(fQ.data ?? []).map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{formatDate(f.date)}</td>
                    <td className="px-3 py-2">
                      {vQ.data?.find((v) => v.id === f.vehicleId)?.registrationNumber}
                    </td>
                    <td className="px-3 py-2 tabular">{f.litres} L</td>
                    <td className="px-3 py-2 tabular">{formatCurrency(f.totalCost)}</td>
                    <td className="px-3 py-2 tabular">
                      {formatCurrency(f.litres > 0 ? f.totalCost / f.litres : 0)}
                    </td>
                    <td className="px-3 py-2 tabular">{formatNumber(f.odometerKm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="exp" className="mt-4 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              expMut.mutate();
            }}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <h3 className="text-sm font-semibold">Add Expense</h3>
            <select
              required
              value={expense.vehicleId}
              onChange={(e) => setExpense({ ...expense, vehicleId: e.target.value })}
              className={inp}
            >
              <option value="">Vehicle…</option>
              {(vQ.data ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
            <select
              value={expense.category}
              onChange={(e) =>
                setExpense({ ...expense, category: e.target.value as Expense["category"] })
              }
              className={inp}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Description"
              value={expense.description}
              onChange={(e) => setExpense({ ...expense, description: e.target.value })}
              className={inp}
            />
            <input
              required
              type="number"
              min={0}
              placeholder="Amount"
              value={expense.amount || ""}
              onChange={(e) => setExpense({ ...expense, amount: Number(e.target.value) })}
              className={inp}
            />
            <input
              type="date"
              value={expense.expenseDate}
              onChange={(e) => setExpense({ ...expense, expenseDate: e.target.value })}
              className={inp}
            />
            <button
              disabled={expMut.isPending}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Add expense
            </button>
          </form>
          <div className="rounded-lg border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b p-3">
              <h3 className="text-sm font-semibold">Expenses</h3>
              <button
                onClick={() => exportCsv("expenses")}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                Export CSV
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(eQ.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.expenseNumber}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(r.expenseDate)}</td>
                    <td className="px-3 py-2">
                      {vQ.data?.find((v) => v.id === r.vehicleId)?.registrationNumber}
                    </td>
                    <td className="px-3 py-2 capitalize">{EXPENSE_CATEGORY_LABELS[r.category]}</td>
                    <td className="px-3 py-2">{r.description}</td>
                    <td className="px-3 py-2 tabular">{formatCurrency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="sum" className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card label="Fuel Cost" value={formatCurrency(sQ.data?.totalFuelCost)} />
          <Card label="Maintenance Cost" value={formatCurrency(sQ.data?.totalMaintenanceCost)} />
          <Card label="Other Expenses" value={formatCurrency(sQ.data?.totalOtherExpenses)} />
          <Card
            label="Official Operational Cost"
            value={formatCurrency(sQ.data?.officialOperationalCost)}
            hint="Fuel + Maintenance"
          />
          <Card
            label="Extended Operational Cost"
            value={formatCurrency(sQ.data?.extendedOperationalCost)}
            hint="Fuel + Maintenance + Other"
          />
          <Card
            label="Revenue"
            value={formatCurrency(sQ.data?.totalRevenue)}
            hint="Completed trips"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
