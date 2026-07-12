import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

import { PageHeader, EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { driverApi, vehicleApi } from "@/lib/api/services";
import type { Driver, Vehicle } from "@/types/domain";
import { REGIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/dispatch-intelligence")({
  head: () => ({
    meta: [
      { title: "Dispatch Intelligence — TransitOps" },
      {
        name: "description",
        content:
          "AI-powered vehicle and driver recommendations for optimal trip assignments across your fleet.",
      },
    ],
  }),
  component: DispatchIntelligencePage,
});

interface TripReq {
  source: string;
  destination: string;
  region: string;
  cargoWeightKg: number;
  cargoType: string;
  plannedDistanceKm: number;
  plannedDeparture: string;
  priority: "low" | "medium" | "high" | "critical";
  expectedRevenue: number;
}

interface Recommendation {
  vehicle: Vehicle;
  driver: Driver;
  score: number;
  eligible: boolean;
  blockedReasons: string[];
  strengths: string[];
  warnings: string[];
  breakdown: { label: string; value: number; weight: number }[];
  estFuelCost: number;
  estOperatingCost: number;
  capacityUtilization: number;
}

function scorePair(v: Vehicle, d: Driver, req: TripReq): Recommendation {
  const blockedReasons: string[] = [];
  if (v.status !== "available") blockedReasons.push(`Vehicle is ${v.status.replace("_", " ")}.`);
  if (d.status !== "available") blockedReasons.push(`Driver is ${d.status.replace("_", " ")}.`);
  if (req.cargoWeightKg > v.maxCapacityKg) {
    blockedReasons.push(
      `Cargo exceeds vehicle capacity by ${Math.round(req.cargoWeightKg - v.maxCapacityKg)} kg.`,
    );
  }
  if (differenceInDays(parseISO(d.licenceExpiry), new Date()) <= 0) {
    blockedReasons.push("Driver licence is expired.");
  }
  const eligible = blockedReasons.length === 0;

  // Fuel cost estimate: distance / 8 km/l * 100 currency
  const fuelPrice = v.fuelType === "electric" ? 20 : v.fuelType === "cng" ? 60 : 100;
  const efficiency = v.fuelType === "electric" ? 12 : v.type === "truck" ? 5 : 8;
  const estFuelCost = (req.plannedDistanceKm / efficiency) * fuelPrice;
  const estOperatingCost = estFuelCost + req.plannedDistanceKm * 3;

  const capacityUtilization = Math.min(100, (req.cargoWeightKg / v.maxCapacityKg) * 100);
  const capacityFit = capacityUtilization >= 100 ? 0 : capacityUtilization; // higher fit is better up to 100%
  const daysLeft = differenceInDays(parseISO(d.licenceExpiry), new Date());
  const licenceValid = daysLeft > 0 ? Math.min(100, (daysLeft / 365) * 100) : 0;
  const vehicleHealth = Math.max(0, 100 - Math.max(0, v.odometerKm - 100000) / 2000);
  const regionalProximity = v.region === req.region ? 100 : 40;
  const maintenanceReadiness = v.status === "in_shop" ? 0 : v.status === "retired" ? 0 : 90;
  const fuelEff = v.fuelType === "electric" ? 100 : v.type === "van" ? 80 : 60;

  const breakdown = [
    { label: "Driver Safety", value: d.safetyScore, weight: 25 },
    { label: "Capacity Fit", value: capacityFit, weight: 20 },
    { label: "Fuel Efficiency", value: fuelEff, weight: 20 },
    { label: "Maintenance Readiness", value: maintenanceReadiness, weight: 15 },
    { label: "Operating Cost", value: 100 - Math.min(100, estOperatingCost / 200), weight: 10 },
    { label: "Regional Proximity", value: regionalProximity, weight: 10 },
  ];

  const score = eligible
    ? Math.round(
        breakdown.reduce((s, b) => s + (b.value * b.weight) / 100, 0) * (licenceValid > 0 ? 1 : 0),
      )
    : 0;

  const strengths: string[] = [];
  if (d.safetyScore >= 85) strengths.push(`High safety score (${d.safetyScore})`);
  if (capacityUtilization >= 70 && capacityUtilization < 100)
    strengths.push(`${Math.round(capacityUtilization)}% capacity utilization`);
  if (regionalProximity === 100) strengths.push(`Regional match (${v.region})`);
  if (v.fuelType === "electric") strengths.push("Low-emission electric vehicle");

  const warnings: string[] = [];
  if (daysLeft > 0 && daysLeft <= 30) warnings.push(`Licence expires in ${daysLeft} days`);
  if (v.odometerKm > 150000) warnings.push(`High odometer (${v.odometerKm.toLocaleString()} km)`);

  return {
    vehicle: v,
    driver: d,
    score,
    eligible,
    blockedReasons,
    strengths,
    warnings,
    breakdown,
    estFuelCost,
    estOperatingCost,
    capacityUtilization,
  };
}

function DispatchIntelligencePage() {
  const navigate = useNavigate();
  const [req, setReq] = useState<TripReq>({
    source: "",
    destination: "",
    region: REGIONS[0]?.id ?? "west",
    cargoWeightKg: 500,
    cargoType: "General cargo",
    plannedDistanceKm: 250,
    plannedDeparture: new Date().toISOString().slice(0, 16),
    priority: "medium",
    expectedRevenue: 10000,
  });
  const [computed, setComputed] = useState<Recommendation[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const dQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });

  const canRun = useMemo(
    () =>
      Boolean(req.source && req.destination && req.cargoWeightKg > 0 && req.plannedDistanceKm > 0),
    [req],
  );

  function run() {
    if (!vQ.data || !dQ.data) return;
    if (!canRun) {
      toast.error("Complete the trip requirement first.");
      return;
    }
    const recs: Recommendation[] = [];
    for (const v of vQ.data) {
      for (const d of dQ.data) {
        recs.push(scorePair(v, d, req));
      }
    }
    recs.sort((a, b) => b.score - a.score);
    const trimmed = [
      ...recs.filter((r) => r.eligible).slice(0, 8),
      ...recs.filter((r) => !r.eligible).slice(0, 3),
    ];
    setComputed(trimmed);
    toast.success(`${trimmed.filter((r) => r.eligible).length} eligible assignments found.`);
  }

  function selectAssignment(rec: Recommendation) {
    navigate({
      to: "/trips/new",
      search: {
        vehicleId: rec.vehicle.id,
        driverId: rec.driver.id,
        source: req.source,
        destination: req.destination,
        cargoWeightKg: req.cargoWeightKg,
        plannedDistanceKm: req.plannedDistanceKm,
        expectedRevenue: req.expectedRevenue,
        region: req.region,
      } as never,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Dispatch Intelligence
          </span>
        }
        description="Get ranked vehicle & driver combinations for a planned trip. Eligibility is enforced; scoring balances safety, capacity, cost and regional fit."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* LEFT — trip requirement form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trip Requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="src">Source</Label>
                <Input
                  id="src"
                  value={req.source}
                  onChange={(e) => setReq({ ...req, source: e.target.value })}
                  placeholder="Warehouse A"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="dst">Destination</Label>
                <Input
                  id="dst"
                  value={req.destination}
                  onChange={(e) => setReq({ ...req, destination: e.target.value })}
                  placeholder="Distribution Center B"
                />
              </div>
              <div>
                <Label>Region</Label>
                <Select value={req.region} onValueChange={(v) => setReq({ ...req, region: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={req.priority}
                  onValueChange={(v) => setReq({ ...req, priority: v as TripReq["priority"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high", "critical"] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cargo Weight (kg)</Label>
                <Input
                  type="number"
                  value={req.cargoWeightKg}
                  onChange={(e) => setReq({ ...req, cargoWeightKg: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  value={req.plannedDistanceKm}
                  onChange={(e) => setReq({ ...req, plannedDistanceKm: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Cargo Type</Label>
                <Textarea
                  rows={2}
                  value={req.cargoType}
                  onChange={(e) => setReq({ ...req, cargoType: e.target.value })}
                />
              </div>
              <div>
                <Label>Departure</Label>
                <Input
                  type="datetime-local"
                  value={req.plannedDeparture}
                  onChange={(e) => setReq({ ...req, plannedDeparture: e.target.value })}
                />
              </div>
              <div>
                <Label>Expected Revenue</Label>
                <Input
                  type="number"
                  value={req.expectedRevenue}
                  onChange={(e) => setReq({ ...req, expectedRevenue: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={run} className="w-full" disabled={vQ.isLoading || dQ.isLoading}>
              <Sparkles className="mr-2 size-4" /> Find Best Assignment
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT — recommendations */}
        <div className="space-y-4">
          {!computed && (
            <EmptyState
              icon={<Sparkles className="size-6" />}
              title="No recommendations yet"
              description="Fill in the trip requirement and click Find Best Assignment to see ranked vehicle & driver combinations."
            />
          )}
          {computed && computed.length === 0 && (
            <EmptyState
              title="No combinations available"
              description="Add vehicles or drivers to run a recommendation."
            />
          )}
          {computed?.map((rec, idx) => {
            const key = `${rec.vehicle.id}-${rec.driver.id}`;
            const isOpen = expanded === key;
            return (
              <Card key={key} className={rec.eligible ? "" : "opacity-70 border-dashed"}>
                <CardContent className="p-5">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                    <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {rec.vehicle.registrationNumber} · {rec.vehicle.modelName}
                        </span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                        <span className="font-semibold">{rec.driver.fullName}</span>
                        {rec.eligible ? (
                          <Badge className="bg-status-available text-status-available-foreground">
                            Eligible
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Blocked</Badge>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                        <div>Capacity: {Math.round(rec.capacityUtilization)}%</div>
                        <div>Safety: {rec.driver.safetyScore}</div>
                        <div>Fuel Est: {formatCurrency(rec.estFuelCost)}</div>
                        <div>Op Cost: {formatCurrency(rec.estOperatingCost)}</div>
                      </div>
                      {rec.strengths.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {rec.strengths.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-full bg-status-available/15 px-2 py-0.5 text-xs text-status-available-foreground/90"
                            >
                              <CheckCircle2 className="size-3" /> {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {rec.warnings.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {rec.warnings.map((w) => (
                            <span
                              key={w}
                              className="inline-flex items-center gap-1 rounded-full bg-status-warning/20 px-2 py-0.5 text-xs"
                            >
                              <AlertTriangle className="size-3" /> {w}
                            </span>
                          ))}
                        </div>
                      )}
                      {!rec.eligible && (
                        <div className="mt-2 space-y-1">
                          {rec.blockedReasons.map((r) => (
                            <div
                              key={r}
                              className="flex items-start gap-1.5 text-xs text-destructive"
                            >
                              <XCircle className="mt-0.5 size-3 shrink-0" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isOpen && (
                        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
                          <div className="text-xs font-medium">Score Breakdown</div>
                          {rec.breakdown.map((b) => (
                            <div key={b.label}>
                              <div className="flex justify-between text-xs">
                                <span>
                                  {b.label}{" "}
                                  <span className="text-muted-foreground">({b.weight}%)</span>
                                </span>
                                <span className="tabular">{Math.round(b.value)}</span>
                              </div>
                              <Progress value={b.value} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold tabular">{rec.score}</div>
                      <div className="text-xs text-muted-foreground">/ 100</div>
                      <div className="mt-3 flex flex-col gap-1">
                        <Button
                          size="sm"
                          onClick={() => selectAssignment(rec)}
                          disabled={!rec.eligible}
                        >
                          Select
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpanded(isOpen ? null : key)}
                        >
                          {isOpen ? "Hide" : "Explain"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
