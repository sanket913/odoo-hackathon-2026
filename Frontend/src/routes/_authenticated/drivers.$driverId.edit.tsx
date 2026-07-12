import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driverApi } from "@/lib/api/services";
import { ApiRuleError } from "@/lib/api/client";
import { EmptyState, PageHeader } from "@/components/common/states";
import { LICENCE_CATEGORIES, REGIONS } from "@/lib/constants";
import type { Driver } from "@/types/domain";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/drivers/$driverId/edit")({
  head: () => ({ meta: [{ title: "Edit driver - TransitOps" }] }),
  component: EditDriverPage,
});

const inp =
  "h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30";

function EditDriverPage() {
  const { driverId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["driver", driverId], queryFn: () => driverApi.get(driverId) });
  const [values, setValues] = useState<Driver | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (q.data) setValues({ ...q.data, licenceExpiry: q.data.licenceExpiry.slice(0, 10) });
  }, [q.data]);

  const mut = useMutation({
    mutationFn: (input: Partial<Driver>) => driverApi.update(driverId, input),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      qc.invalidateQueries({ queryKey: ["driver", driverId] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(`${d.fullName} updated`);
      navigate({ to: "/drivers/$driverId", params: { driverId } });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    const next: Record<string, string> = {};
    if (!values.fullName.trim()) next.fullName = "Name is required.";
    if (!values.licenceNumber.trim()) next.licenceNumber = "Licence number is required.";
    if (!values.contactNumber.trim()) next.contactNumber = "Contact number is required.";
    if (values.safetyScore < 0 || values.safetyScore > 100)
      next.safetyScore = "Score must be 0-100.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await mut.mutateAsync({
        fullName: values.fullName,
        licenceNumber: values.licenceNumber,
        licenceCategory: values.licenceCategory,
        licenceExpiry: new Date(values.licenceExpiry).toISOString(),
        contactNumber: values.contactNumber,
        email: values.email || undefined,
        safetyScore: values.safetyScore,
        status: values.status,
        region: values.region,
        emergencyContact: values.emergencyContact || undefined,
        notes: values.notes || undefined,
      });
    } catch (e) {
      if (e instanceof ApiRuleError) {
        const fe: Record<string, string> = {};
        Object.entries(e.fields ?? {}).forEach(([k, v]) => (fe[k] = v.join(" ")));
        setErrors(fe);
        toast.error(e.message);
        return;
      }
      toast.error((e as Error).message);
    }
  }

  if (q.isLoading || !values) return <EmptyState title="Loading driver..." />;
  if (q.isError)
    return <EmptyState title="Driver not found" description={(q.error as Error).message} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Driver" description={values.fullName} />
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
            {LICENCE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
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
            value={values.email ?? ""}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Safety Score" error={errors.safetyScore}>
          <input
            type="number"
            min={0}
            max={100}
            value={values.safetyScore}
            onChange={(e) => setValues({ ...values, safetyScore: Number(e.target.value) })}
            className={inp}
          />
        </F>
        <F label="Region">
          <select
            value={values.region}
            onChange={(e) => setValues({ ...values, region: e.target.value })}
            className={inp}
          >
            {REGIONS.map((r) => (
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
            <option value="on_trip">On Trip</option>
          </select>
        </F>
        <F label="Emergency Contact">
          <input
            value={values.emergencyContact ?? ""}
            onChange={(e) => setValues({ ...values, emergencyContact: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Notes" full>
          <textarea
            value={values.notes ?? ""}
            onChange={(e) => setValues({ ...values, notes: e.target.value })}
            rows={3}
            className={inp}
          />
        </F>
        <div className="flex justify-end gap-2 border-t pt-4 md:col-span-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/drivers/$driverId", params: { driverId } })}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={mut.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mut.isPending ? "Saving..." : "Save driver"}
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
