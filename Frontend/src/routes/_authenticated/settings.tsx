import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  settingsApi,
  userApi,
  type IntegrationSettingsStatus,
  type OrganizationSettings,
} from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LICENCE_CATEGORIES,
  REGIONS,
  ROLE_LABELS,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABELS,
} from "@/lib/constants";
import { MODULES, MODULE_LABELS, getPermissionMatrix } from "@/lib/permissions";
import type { User, UserRole } from "@/types/domain";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import {
  Bell,
  Bot,
  CheckCircle2,
  Database,
  Mail,
  Map,
  ServerCog,
  UploadCloud,
  XCircle,
} from "lucide-react";

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

const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none";
const selectClass = `${inputClass} appearance-auto`;
const tabClass =
  "h-9 rounded-md px-3 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";
const DEFAULT_NOTIFICATION_PREFS = {
  licenceReminders: true,
  maintenanceReminders: true,
  tripAlerts: true,
  costAlerts: true,
};

function SettingsPage() {
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ["users"], queryFn: userApi.list });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  const integrationsQ = useQuery({
    queryKey: ["settings", "integrations"],
    queryFn: settingsApi.integrations,
  });
  const matrix = getPermissionMatrix();
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "dispatcher" as UserRole,
    status: "active" as User["status"],
    password: "TransitOps@123",
  });
  const [notificationPrefs, setNotificationPrefs] = useLocalNotificationPrefs();

  useEffect(() => {
    if (settingsQ.data) setSettings(settingsQ.data);
  }, [settingsQ.data]);

  const activeUsers = useMemo(
    () => (usersQ.data ?? []).filter((u) => u.status === "active").length,
    [usersQ.data],
  );

  const settingsMut = useMutation({
    mutationFn: () => settingsApi.update(settings ?? {}),
    onSuccess: (saved) => {
      setSettings(saved);
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Organization settings saved");
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
      <PageHeader
        title="Settings"
        description="Manage organization defaults, users, access, notifications and integrations."
      />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryStat label="Organization" value={settings?.organizationName ?? "TransitOps"} />
        <SummaryStat label="Active users" value={activeUsers} />
        <SummaryStat label="Currency" value={settings?.currency ?? "INR"} />
        <SummaryStat label="Environment" value={integrationsQ.data?.environment ?? "loading"} />
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
          <TabsTrigger className={tabClass} value="general">
            General
          </TabsTrigger>
          <TabsTrigger className={tabClass} value="users">
            Users
          </TabsTrigger>
          <TabsTrigger className={tabClass} value="roles">
            Roles
          </TabsTrigger>
          <TabsTrigger className={tabClass} value="masters">
            Master Data
          </TabsTrigger>
          <TabsTrigger className={tabClass} value="notifications">
            Notifications
          </TabsTrigger>
          <TabsTrigger className={tabClass} value="integrations">
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {settingsQ.error ? (
            <ErrorState
              description={(settingsQ.error as Error).message}
              onRetry={() => settingsQ.refetch()}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                settingsMut.mutate();
              }}
              className="rounded-lg border bg-card"
            >
              <SectionHeader
                title="Organization Defaults"
                icon={<ServerCog className="size-4" />}
              />
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Field label="Organization name">
                  <input
                    required
                    value={settings?.organizationName ?? ""}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, organizationName: e.target.value } : s))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Currency">
                  <select
                    value={settings?.currency ?? "INR"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, currency: e.target.value } : s))
                    }
                    className={selectClass}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </Field>
                <Field label="Distance unit">
                  <select
                    value={settings?.distanceUnit ?? "kilometres"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, distanceUnit: e.target.value } : s))
                    }
                    className={selectClass}
                  >
                    <option value="kilometres">Kilometres</option>
                    <option value="miles">Miles</option>
                  </select>
                </Field>
                <Field label="Weight unit">
                  <select
                    value={settings?.weightUnit ?? "kilograms"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, weightUnit: e.target.value } : s))
                    }
                    className={selectClass}
                  >
                    <option value="kilograms">Kilograms</option>
                    <option value="pounds">Pounds</option>
                  </select>
                </Field>
                <Field label="Time zone">
                  <select
                    value={settings?.timezone ?? "Asia/Kolkata"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, timezone: e.target.value } : s))
                    }
                    className={selectClass}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </Field>
                <Field label="Date format">
                  <select
                    value={settings?.dateFormat ?? "dd MMM yyyy"}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, dateFormat: e.target.value } : s))
                    }
                    className={selectClass}
                  >
                    <option value="dd MMM yyyy">12 Jul 2026</option>
                    <option value="dd/MM/yyyy">12/07/2026</option>
                    <option value="yyyy-MM-dd">2026-07-12</option>
                  </select>
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2 border-t p-4">
                <button
                  type="button"
                  onClick={() => settingsQ.data && setSettings(settingsQ.data)}
                  disabled={!settingsQ.data || settingsMut.isPending}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  disabled={settingsMut.isPending || !settings}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {settingsMut.isPending ? "Saving..." : "Save settings"}
                </button>
              </div>
            </form>
          )}
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate();
              }}
              className="rounded-lg border bg-card"
            >
              <SectionHeader title="Add User" icon={<Database className="size-4" />} />
              <div className="grid gap-3 p-4 md:grid-cols-5">
                <Field label="Name">
                  <input
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Role">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className={selectClass}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Password">
                  <input
                    required
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    disabled={createUser.isPending}
                    className="h-10 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {createUser.isPending ? "Adding..." : "Add user"}
                  </button>
                </div>
              </div>
            </form>

            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Last Login</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersQ.data ?? []).map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2.5 font-medium">{u.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateUser.mutate({
                              id: u.id,
                              input: { role: e.target.value as UserRole },
                            })
                          }
                          className="h-9 rounded-md border bg-background px-2"
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={u.status}
                          onChange={(e) =>
                            updateUser.mutate({
                              id: u.id,
                              input: { status: e.target.value as User["status"] },
                            })
                          }
                          className="h-9 rounded-md border bg-background px-2 capitalize"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{formatDate(u.lastLoginAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate ${u.name}?`)) deactivateUser.mutate(u.id);
                          }}
                          disabled={u.status === "inactive" || deactivateUser.isPending}
                          className="rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!usersQ.isLoading && (usersQ.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="rounded-lg border bg-card">
            <SectionHeader title="Roles & Permissions" icon={<Database className="size-4" />} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2.5">Module</th>
                    {roles.map((r) => (
                      <th key={r} className="px-3 py-2.5">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod) => (
                    <tr key={mod} className="border-t">
                      <td className="px-3 py-2.5 font-medium">{MODULE_LABELS[mod]}</td>
                      {roles.map((r) => (
                        <td key={r} className="px-3 py-2.5">
                          <span className="rounded-md border bg-background px-2 py-1 text-xs capitalize">
                            {matrix[r][mod]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="masters">
          <div className="grid gap-4 lg:grid-cols-3">
            <MasterPanel
              title="Regions"
              description="Used by vehicles, drivers, trips and analytics."
              items={REGIONS.map((r) => `${r.code} - ${r.name}`)}
            />
            <MasterPanel
              title="Vehicle Types"
              description="Used in fleet registration and reporting."
              items={VEHICLE_TYPES.map((t) => VEHICLE_TYPE_LABELS[t])}
            />
            <MasterPanel
              title="Licence Categories"
              description="Used for driver eligibility and safety scoring."
              items={[...LICENCE_CATEGORIES]}
            />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-lg border bg-card">
            <SectionHeader title="Notification Preferences" icon={<Bell className="size-4" />} />
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <ToggleRow
                label="Licence expiry reminders"
                description="Surface reminders for expired and expiring licences."
                checked={notificationPrefs.licenceReminders}
                onChange={(licenceReminders) =>
                  setNotificationPrefs({ ...notificationPrefs, licenceReminders })
                }
              />
              <ToggleRow
                label="Maintenance reminders"
                description="Track due and overdue service windows."
                checked={notificationPrefs.maintenanceReminders}
                onChange={(maintenanceReminders) =>
                  setNotificationPrefs({ ...notificationPrefs, maintenanceReminders })
                }
              />
              <ToggleRow
                label="Trip operation alerts"
                description="Show dispatch, completion and cancellation events."
                checked={notificationPrefs.tripAlerts}
                onChange={(tripAlerts) =>
                  setNotificationPrefs({ ...notificationPrefs, tripAlerts })
                }
              />
              <ToggleRow
                label="Cost alerts"
                description="Highlight unusual fuel and expense entries."
                checked={notificationPrefs.costAlerts}
                onChange={(costAlerts) =>
                  setNotificationPrefs({ ...notificationPrefs, costAlerts })
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          {integrationsQ.error ? (
            <ErrorState
              description={(integrationsQ.error as Error).message}
              onRetry={() => integrationsQ.refetch()}
            />
          ) : (
            <IntegrationsPanel status={integrationsQ.data} loading={integrationsQ.isLoading} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-3">
      <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function MasterPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        {items.map((item) => (
          <span key={item} className="rounded-md border bg-background px-2.5 py-1 text-sm">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border bg-background p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4"
      />
    </label>
  );
}

function IntegrationsPanel({
  status,
  loading,
}: {
  status?: IntegrationSettingsStatus;
  loading: boolean;
}) {
  if (loading || !status) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg border bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <IntegrationCard
        title="AI Copilot"
        icon={<Bot className="size-4" />}
        configured={status.ai.configured}
        rows={[
          ["Provider", status.ai.provider],
          ["Model", status.ai.model],
          ["Required env", status.ai.requiredKeys.join(", ")],
        ]}
      />
      <IntegrationCard
        title="Email Delivery"
        icon={<Mail className="size-4" />}
        configured={status.email.configured}
        rows={[
          ["SMTP host", status.email.host || "Not configured"],
          ["SMTP port", status.email.port || "Not configured"],
          ["From address", status.email.from || "Not configured"],
          ["Required env", status.email.requiredKeys.join(", ")],
        ]}
      />
      <IntegrationCard
        title="File Uploads"
        icon={<UploadCloud className="size-4" />}
        configured={status.uploads.configured}
        rows={[
          ["Upload directory", status.uploads.uploadDir],
          ["Max upload size", `${status.uploads.maxUploadSizeMb} MB`],
          ["Required env", status.uploads.requiredKeys.join(", ")],
        ]}
      />
      <IntegrationCard
        title="Maps"
        icon={<Map className="size-4" />}
        configured={status.maps.configured}
        rows={[
          ["Tile URL", status.maps.tileUrl],
          ["Attribution", status.maps.attribution],
          ["Required env", status.maps.requiredKeys.join(", ")],
        ]}
      />
      <IntegrationCard
        title="API Runtime"
        icon={<ServerCog className="size-4" />}
        configured
        rows={[
          ["Client URL", status.api.clientUrl],
          ["CORS origins", status.api.corsOrigins.join(", ")],
          ["Secure cookies", status.api.cookieSecure ? "Enabled" : "Disabled"],
        ]}
      />
    </div>
  );
}

function IntegrationCard({
  title,
  icon,
  configured,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  configured: boolean;
  rows: [string, string][];
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
            configured
              ? "border-status-available-foreground/30 bg-status-available/40 text-status-available-foreground"
              : "border-status-critical-foreground/30 bg-status-critical/30 text-status-critical-foreground"
          }`}
        >
          {configured ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {configured ? "Configured" : "Needs setup"}
        </span>
      </div>
      <dl className="divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function useLocalNotificationPrefs() {
  const key = "transitops.notificationPrefs";
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw) setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) });
  }, []);

  const update = (next: typeof DEFAULT_NOTIFICATION_PREFS) => {
    setPrefs(next);
    window.localStorage.setItem(key, JSON.stringify(next));
    toast.success("Notification preference saved");
  };

  return [prefs, update] as const;
}
