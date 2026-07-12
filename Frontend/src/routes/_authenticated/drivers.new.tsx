import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driverApi, licenceCategoryApi, regionApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import type { Driver } from "@/types/domain";
import { invalidateDriverDomain } from "@/lib/invalidation";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/drivers/new")({
  head: () => ({ meta: [{ title: "Add driver — TransitOps" }] }),
  component: NewDriverPage,
});

function NewDriverPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const regionsQ = useQuery({ queryKey: queryKeys.regions, queryFn: regionApi.list });
  const licenceQ = useQuery({
    queryKey: queryKeys.licenceCategories,
    queryFn: licenceCategoryApi.list,
  });
  const [values, setValues] = useState({
    fullName: "",
    licenceNumber: "",
    licenceCategory: "LMV" as Driver["licenceCategory"],
    licenceExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    contactNumber: "",
    email: "",
    region: "west",
    status: "available" as Driver["status"],
    emergencyContact: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mut = useMutation({
    mutationFn: (input: Omit<Driver, "id" | "createdAt" | "tripCompletionRate" | "safetyScore">) =>
      driverApi.create(input),
    onSuccess: (d) => {
      invalidateDriverDomain(qc);
      toast.success(`Driver ${d.fullName} added`);
      navigate({ to: "/drivers/$driverId", params: { driverId: d.id } });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.fullName.trim()) next.fullName = "Name is required.";
    if (!values.licenceNumber.trim()) next.licenceNumber = "Licence number is required.";
    if (!values.contactNumber.trim()) next.contactNumber = "Contact number is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await mut.mutateAsync({
        ...values,
        licenceExpiry: new Date(values.licenceExpiry).toISOString(),
        email: values.email || undefined,
        emergencyContact: values.emergencyContact || undefined,
        notes: values.notes || undefined,
      });
    } catch (e) {
      if (e instanceof ApiRuleError) {
        const fe: Record<string, string> = {};
        Object.entries(e.fields ?? {}).forEach(([k, v]) => (fe[k] = v.join(" ")));
        setErrors(fe);
        toast.error(e.message);
      }
    }
  }

  const inp =
    "h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30";
  return (
    <div className="space-y-6">
      <PageHeader title="Add Driver" />
      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border bg-card p-6 md:grid-cols-2">
        <F label="Full Name" required error={errors.fullName}>
          <input
            value={values.fullName}
            onChange={(e) => setValues({ ...values, fullName: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Licence Number" required error={errors.licenceNumber}>
          <input
            value={values.licenceNumber}
            onChange={(e) => setValues({ ...values, licenceNumber: e.target.value.toUpperCase() })}
            className={inp}
          />
        </F>
        <F label="Licence Category">
          <select
            value={values.licenceCategory}
            onChange={(e) =>
              setValues({ ...values, licenceCategory: e.target.value as Driver["licenceCategory"] })
            }
            className={inp}
          >
            {(licenceQ.data ?? []).map((c) => (
              <option key={c.id} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </F>
        <F label="Licence Expiry" required>
          <input
            type="date"
            value={values.licenceExpiry}
            onChange={(e) => setValues({ ...values, licenceExpiry: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Contact Number" required error={errors.contactNumber}>
          <input
            value={values.contactNumber}
            onChange={(e) => setValues({ ...values, contactNumber: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Email">
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Region">
          <select
            value={values.region}
            onChange={(e) => setValues({ ...values, region: e.target.value })}
            className={inp}
          >
            {(regionsQ.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </F>
        <F label="Status">
          <select
            value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value as Driver["status"] })}
            className={inp}
          >
            <option value="available">Available</option>
            <option value="off_duty">Off Duty</option>
            <option value="suspended">Suspended</option>
          </select>
        </F>
        <F label="Emergency Contact">
          <input
            value={values.emergencyContact}
            onChange={(e) => setValues({ ...values, emergencyContact: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Notes" full>
          <textarea
            value={values.notes}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
            rows={3}
            className={inp}
          />
        </F>
        <div className="md:col-span-2 flex justify-end border-t pt-4">
          <button
            disabled={mut.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mut.isPending ? "Saving…" : "Add driver"}
          </button>
        </div>
      </form>
    </div>
  );
}

function F({
  label,
  required,
  error,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
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
