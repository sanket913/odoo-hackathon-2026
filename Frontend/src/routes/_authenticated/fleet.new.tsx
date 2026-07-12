import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleApi } from "@/lib/api/services";
import { VehicleForm, type VehicleFormValues } from "@/features/vehicles/vehicle-form";
import { PageHeader } from "@/components/common/states";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import type { Vehicle } from "@/types/domain";
import { invalidateVehicleDomain } from "@/lib/invalidation";

export const Route = createFileRoute("/_authenticated/fleet/new")({
  head: () => ({ meta: [{ title: "New vehicle — TransitOps" }] }),
  component: NewVehiclePage,
});

function NewVehiclePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (input: Omit<Vehicle, "id" | "createdAt">) => vehicleApi.create(input),
    onSuccess: (v) => {
      invalidateVehicleDomain(qc);
      toast.success(`Vehicle ${v.registrationNumber} added`);
      navigate({ to: "/fleet/$vehicleId", params: { vehicleId: v.id } });
    },
  });

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
      } else {
        toast.error("Failed to create vehicle");
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Vehicle" description="Register a new vehicle in the fleet." />
      <VehicleForm onSubmit={onSubmit} submitting={mut.isPending} />
    </div>
  );
}
