import type {
  OperationalException,
  ExceptionSeverity,
  LiveTripProgress,
} from "@/types/domain-extended";
import type { Trip, Vehicle, Driver } from "@/types/domain";

export const SEVERITY_COLOR: Record<ExceptionSeverity, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

export const SEVERITY_LABEL: Record<ExceptionSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export interface EnrichedTrip {
  trip: Trip;
  vehicle?: Vehicle;
  driver?: Driver;
  progress: LiveTripProgress;
}

export function riskBadgeClass(risk: LiveTripProgress["riskLevel"]): string {
  return risk === "high"
    ? "bg-red-100 text-red-800"
    : risk === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-emerald-100 text-emerald-800";
}

export function riskLabel(risk: LiveTripProgress["riskLevel"]): string {
  return risk === "high" ? "High risk" : risk === "medium" ? "At risk" : "On track";
}

export function formatRelativeMinutes(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function isExceptionForVehicle(e: OperationalException, vehicleId: string): boolean {
  return (
    e.focusVehicleId === vehicleId || (e.entity.type === "vehicle" && e.entity.id === vehicleId)
  );
}
