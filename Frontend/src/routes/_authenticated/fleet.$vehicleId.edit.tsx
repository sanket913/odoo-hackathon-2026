import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleApi } from "@/lib/api/services";
import { VehicleForm, type VehicleFormValues } from "@/features/vehicles/vehicle-form";
import { PageHeader, ErrorState } from "@/components/common/states";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fleet/$vehicleId/edit")({
  head: () => ({ meta: [{ title: "Edit vehicle — TransitOps" }] }),
  component: EditVehiclePage,
});

function EditVehiclePage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const vQ = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => vehicleApi.get(vehicleId),
  });
  const mut = useMutation({
    mutationFn: (input: VehicleFormValues) => vehicleApi.update(vehicleId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      toast.success("Vehicle updated");
      navigate({ to: "/fleet/$vehicleId", params: { vehicleId } });
    },
  });

  if (vQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (vQ.error || !vQ.data)
    return <ErrorState description="Vehicle not found" onRetry={() => vQ.refetch()} />;

  async function onSubmit(
    values: VehicleFormValues,
    setFieldError: (name: keyof VehicleFormValues, msg: string) => void,
  ) {
    try {
      await mut.mutateAsync(values);
    } catch (e) {
      if (e instanceof ApiRuleError) {
        Object.entries(e.fields ?? {}).forEach(([k, v]) =>
          setFieldError(k as keyof VehicleFormValues, v.join(" ")),
        );
        toast.error(e.message);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${vQ.data.registrationNumber}`} />
      <VehicleForm initial={vQ.data} onSubmit={onSubmit} submitting={mut.isPending} />
    </div>
  );
}
