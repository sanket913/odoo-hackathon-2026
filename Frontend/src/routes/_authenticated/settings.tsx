import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ROLE_LABELS,
  REGIONS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
  LICENCE_CATEGORIES,
} from "@/lib/constants";
import { MODULES, MODULE_LABELS, getPermissionMatrix } from "@/lib/permissions";
import type { UserRole } from "@/types/domain";
import { formatDate } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — TransitOps" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const uQ = useQuery({ queryKey: ["users"], queryFn: userApi.list });
  const matrix = getPermissionMatrix();
  const roles: UserRole[] = [
    "admin",
    "fleet_manager",
    "dispatcher",
    "safety_officer",
    "financial_analyst",
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="types">Vehicle Types</TabsTrigger>
          <TabsTrigger value="licences">Licence Categories</TabsTrigger>
          <TabsTrigger value="notifs">Notification Preferences</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 grid gap-4 md:grid-cols-2">
          <Setting label="Organization Name" value="TransitOps Demo Co." />
          <Setting label="Currency" value="INR (₹)" />
          <Setting label="Distance Unit" value="Kilometres" />
          <Setting label="Weight Unit" value="Kilograms" />
          <Setting label="Time Zone" value="Asia/Kolkata" />
          <Setting label="Date Format" value="dd MMM yyyy" />
        </TabsContent>

        <TabsContent value="users" className="mt-4 rounded-lg border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {(uQ.data ?? []).map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2">{ROLE_LABELS[u.role]}</td>
                  <td className="px-3 py-2 capitalize">{u.status}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="roles" className="mt-4 space-y-3">
          <div className="rounded-md border border-status-warning-foreground/30 bg-status-warning/30 p-3 text-xs">
            Permission changes affect future sessions and protected routes.
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Module</th>
                  {roles.map((r) => (
                    <th key={r} className="px-3 py-2">
                      {ROLE_LABELS[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod} className="border-t">
                    <td className="px-3 py-2 font-medium">{MODULE_LABELS[mod]}</td>
                    {roles.map((r) => (
                      <td key={r} className="px-3 py-2 capitalize">
                        {matrix[r][mod]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="regions" className="mt-4">
          <Chips items={REGIONS.map((r) => r.name)} />
        </TabsContent>
        <TabsContent value="types" className="mt-4">
          <Chips items={VEHICLE_TYPES.map((t) => VEHICLE_TYPE_LABELS[t])} />
        </TabsContent>
        <TabsContent value="licences" className="mt-4">
          <Chips items={[...LICENCE_CATEGORIES]} />
        </TabsContent>

        <TabsContent value="notifs" className="mt-4 space-y-3">
          <Toggle label="Enable licence expiry reminders" />
          <Toggle label="Enable maintenance reminders" />
          <div className="text-xs text-muted-foreground">
            Email delivery is handled by the backend service.
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 text-sm text-muted-foreground">
          Integration secrets (map tile keys, email providers, Groq AI) are configured server-side.
          They are never stored in client code.
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i} className="rounded-full border bg-card px-3 py-1 text-sm">
          {i}
        </span>
      ))}
    </div>
  );
}
function Toggle({ label }: { label: string }) {
  return (
    <label className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" defaultChecked className="size-4" />
    </label>
  );
}
