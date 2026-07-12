import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/common/states";

export const Route = createFileRoute("/_authenticated/drivers/$driverId/edit")({
  head: () => ({ meta: [{ title: "Edit driver - TransitOps" }] }),
  component: EditDriverPage,
});

function EditDriverPage() {
  const { driverId } = Route.useParams();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Driver"
        description={`Editing ${driverId} - form fields mirror the Add Driver page.`}
      />
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        Driver edit form uses the same fields as the create form. Wire to{" "}
        <code>PATCH /api/v1/drivers/:id</code>.
      </div>
    </div>
  );
}
