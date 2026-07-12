import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, userApi, type OrganizationSettings } from "@/lib/api/services";
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
import type { User, UserRole } from "@/types/domain";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings - TransitOps" }] }),
  component: SettingsPage,
});

const roles: UserRole[] = [
  "admin",
  "fleet_manager",
  "dispatcher",
  "safety_officer",
  "financial_analyst",
];
const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function SettingsPage() {
  const qc = useQueryClient();
  const uQ = useQuery({ queryKey: ["users"], queryFn: userApi.list });
  const sQ = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const matrix = getPermissionMatrix();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "dispatcher" as UserRole,
    status: "active" as User["status"],
    password: "TransitOps@123",
  });

  useEffect(() => {
    if (sQ.data) setSettings(sQ.data);
  }, [sQ.data]);

  const settingsMut = useMutation({
    mutationFn: () => settingsApi.update(settings ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const createUser = useMutation({
    mutationFn: () => userApi.create(newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setNewUser({
        name: "",
        email: "",
        role: "dispatcher",
        status: "active",
        password: "TransitOps@123",
      });
      toast.success("User added");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<User> }) => userApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const deactivateUser = useMutation({
    mutationFn: userApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

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

        <TabsContent value="general" className="mt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              settingsMut.mutate();
            }}
            className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2"
          >
            <SettingInput
              label="Organization Name"
              value={settings?.organizationName ?? ""}
              onChange={(organizationName) =>
                setSettings((s) => (s ? { ...s, organizationName } : s))
              }
            />
            <SettingInput
              label="Currency"
              value={settings?.currency ?? ""}
              onChange={(currency) => setSettings((s) => (s ? { ...s, currency } : s))}
            />
            <SettingInput
              label="Distance Unit"
              value={settings?.distanceUnit ?? ""}
              onChange={(distanceUnit) => setSettings((s) => (s ? { ...s, distanceUnit } : s))}
            />
            <SettingInput
              label="Weight Unit"
              value={settings?.weightUnit ?? ""}
              onChange={(weightUnit) => setSettings((s) => (s ? { ...s, weightUnit } : s))}
            />
            <SettingInput
              label="Time Zone"
              value={settings?.timezone ?? ""}
              onChange={(timezone) => setSettings((s) => (s ? { ...s, timezone } : s))}
            />
            <SettingInput
              label="Date Format"
              value={settings?.dateFormat ?? ""}
              onChange={(dateFormat) => setSettings((s) => (s ? { ...s, dateFormat } : s))}
            />
            <div className="flex justify-end border-t pt-4 md:col-span-2">
              <button
                disabled={settingsMut.isPending || !settings}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {settingsMut.isPending ? "Saving..." : "Save settings"}
              </button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUser.mutate();
            }}
            className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5"
          >
            <input
              required
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className={inp}
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className={inp}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              className={inp}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <input
              required
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className={inp}
            />
            <button
              disabled={createUser.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Add user
            </button>
          </form>

          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last Login</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(uQ.data ?? []).map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateUser.mutate({
                            id: u.id,
                            input: { role: e.target.value as UserRole },
                          })
                        }
                        className="h-8 rounded-md border bg-background px-2"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={u.status}
                        onChange={(e) =>
                          updateUser.mutate({
                            id: u.id,
                            input: { status: e.target.value as User["status"] },
                          })
                        }
                        className="h-8 rounded-md border bg-background px-2 capitalize"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">{formatDate(u.lastLoginAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => deactivateUser.mutate(u.id)}
                        disabled={u.status === "inactive" || deactivateUser.isPending}
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function SettingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`${inp} mt-1`} />
    </label>
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
  const [checked, setChecked] = useState(true);
  return (
    <label className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="size-4"
      />
    </label>
  );
}
