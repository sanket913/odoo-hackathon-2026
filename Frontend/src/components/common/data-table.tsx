import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState, TableSkeleton, ErrorState } from "./states";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  accessor?: (row: T) => string | number | undefined;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  error,
  onRetry,
  rowKey,
  onRowClick,
  searchable,
  searchPlaceholder = "Search…",
  searchAccessor,
  emptyTitle,
  emptyDescription,
  toolbar,
  pageSize = 10,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  if (loading) return <TableSkeleton rows={6} cols={columns.length} />;
  if (error)
    return (
      <ErrorState
        description={(error as Error)?.message ?? "Failed to load data."}
        onRetry={onRetry}
      />
    );

  let rows = data ?? [];
  if (query && searchAccessor) {
    const q = query.toLowerCase();
    rows = rows.filter((r) => searchAccessor(r).toLowerCase().includes(q));
  }
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col?.accessor) {
      rows = [...rows].sort((a, b) => {
        const av = col.accessor!(a) ?? "";
        const bv = col.accessor!(b) ?? "";
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-3">
      {(searchable || toolbar) && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {searchable && (
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="pl-8 pr-8"
                aria-label={searchPlaceholder}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-muted"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-left font-medium text-muted-foreground",
                    c.sortable && "cursor-pointer select-none hover:text-foreground",
                    c.className,
                  )}
                  onClick={() => {
                    if (!c.sortable) return;
                    setSort((s) => {
                      if (!s || s.key !== c.key) return { key: c.key, dir: "asc" };
                      if (s.dir === "asc") return { key: c.key, dir: "desc" };
                      return null;
                    });
                  }}
                >
                  {c.header}
                  {sort?.key === c.key && (
                    <span className="ml-1 text-xs">{sort.dir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle ?? (query ? "No matching records" : "No records yet")}
                    description={
                      emptyDescription ?? (query ? "Try adjusting your search." : undefined)
                    }
                  />
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "border-t transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Page {currentPage} of {totalPages} · {total} record{total === 1 ? "" : "s"}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
