import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@/types/domain";
import { FUEL_TYPES } from "@/lib/constants";
import { regionApi, vehicleTypeApi } from "@/lib/api/services";
import { queryKeys } from "@/lib/query-keys";

export type VehicleFormValues = Omit<Vehicle, "id" | "createdAt">;

interface Props {
  initial?: Vehicle;
  onSubmit: (
    v: VehicleFormValues,
    setFieldError: (name: keyof VehicleFormValues, msg: string) => void,
  ) => void | Promise<void>;
  submitting?: boolean;
}

export function VehicleForm({ initial, onSubmit, submitting }: Props) {
  const regionsQ = useQuery({ queryKey: queryKeys.regions, queryFn: regionApi.list });
  const vehicleTypesQ = useQuery({
    queryKey: queryKeys.vehicleTypes,
    queryFn: vehicleTypeApi.list,
  });
  const [values, setValues] = useState<VehicleFormValues>({
    registrationNumber: initial?.registrationNumber ?? "",
    modelName: initial?.modelName ?? "",
    type: initial?.type ?? "van",
    region: initial?.region ?? "west",
    maxCapacityKg: initial?.maxCapacityKg ?? 500,
    odometerKm: initial?.odometerKm ?? 0,
    acquisitionCost: initial?.acquisitionCost ?? 0,
    fuelType: initial?.fuelType ?? "diesel",
    manufacturingYear: initial?.manufacturingYear ?? new Date().getFullYear(),
    status: initial?.status ?? "available",
    lastServiceDate: initial?.lastServiceDate,
    notes: initial?.notes,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormValues, string>>>({});

  function set<K extends keyof VehicleFormValues>(k: K, v: VehicleFormValues[K]) {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof VehicleFormValues, string>> = {};
    if (!values.registrationNumber.trim())
      next.registrationNumber = "Registration number is required.";
    if (!values.modelName.trim()) next.modelName = "Model is required.";
    if (values.maxCapacityKg <= 0) next.maxCapacityKg = "Capacity must be greater than zero.";
    if (values.odometerKm < 0) next.odometerKm = "Odometer cannot be negative.";
    if (values.acquisitionCost < 0) next.acquisitionCost = "Cost cannot be negative.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values, (name, msg) => setErrors((prev) => ({ ...prev, [name]: msg })));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border bg-card p-6 md:grid-cols-2"
      noValidate
    >
      <Field label="Registration Number" required error={errors.registrationNumber}>
        <input
          value={values.registrationNumber}
          onChange={(e) => set("registrationNumber", e.target.value.toUpperCase())}
          className={inputCls}
        />
      </Field>
      <Field label="Vehicle Name / Model" required error={errors.modelName}>
        <input
          value={values.modelName}
          onChange={(e) => set("modelName", e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Type">
        <select
          value={values.type}
          onChange={(e) => set("type", e.target.value as VehicleFormValues["type"])}
          className={inputCls}
        >
          {(vehicleTypesQ.data ?? []).map((t) => (
            <option key={t.id} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Region">
        <select
          value={values.region}
          onChange={(e) => set("region", e.target.value)}
          className={inputCls}
        >
          {(regionsQ.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Max Capacity (kg)" required error={errors.maxCapacityKg}>
        <input
          type="number"
          min={1}
          value={values.maxCapacityKg}
          onChange={(e) => set("maxCapacityKg", Number(e.target.value))}
          className={inputCls}
        />
      </Field>
      <Field label="Odometer (km)" error={errors.odometerKm}>
        <input
          type="number"
          min={0}
          value={values.odometerKm}
          onChange={(e) => set("odometerKm", Number(e.target.value))}
          className={inputCls}
        />
      </Field>
      <Field label="Acquisition Cost" error={errors.acquisitionCost}>
        <input
          type="number"
          min={0}
          value={values.acquisitionCost}
          onChange={(e) => set("acquisitionCost", Number(e.target.value))}
          className={inputCls}
        />
      </Field>
      <Field label="Fuel Type">
        <select
          value={values.fuelType}
          onChange={(e) => set("fuelType", e.target.value as VehicleFormValues["fuelType"])}
          className={inputCls}
        >
          {FUEL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Manufacturing Year">
        <input
          type="number"
          min={1990}
          max={new Date().getFullYear() + 1}
          value={values.manufacturingYear}
          onChange={(e) => set("manufacturingYear", Number(e.target.value))}
          className={inputCls}
        />
      </Field>
      <Field label="Status">
        <select
          value={values.status}
          onChange={(e) => set("status", e.target.value as VehicleFormValues["status"])}
          className={inputCls}
        >
          <option value="available">Available</option>
          <option value="in_shop">In Shop</option>
          <option value="retired">Retired</option>
        </select>
      </Field>
      <Field label="Notes" className="md:col-span-2">
        <textarea
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={inputCls}
        />
      </Field>

      <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Saving…" : initial ? "Save changes" : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30";

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && (
        <div role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
