"use client"

import { useTranslations } from "next-intl"
import { Search, ChevronLeft, ChevronRight, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useState, useMemo } from "react"

interface Column<T> {
  key: string
  label: string
  render: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  searchable?: boolean
  searchKeys?: (keyof T)[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T>({
  columns,
  data,
  loading,
  searchable,
  searchKeys,
}: DataTableProps<T>) {
  const t = useTranslations()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const perPage = 20

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let result = data
    if (search && searchKeys) {
      result = data.filter((item) =>
        searchKeys.some((key) =>
          String((item as Record<string, unknown>)[key as string]).toLowerCase().includes(search.toLowerCase()),
        ),
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String((a as Record<string, unknown>)[sortKey] ?? "")
        const bVal = String((b as Record<string, unknown>)[sortKey] ?? "")
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return sortDir === "asc" ? cmp : -cmp
      })
    }
    return result
  }, [data, search, searchKeys, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  if (loading) {
    return (
      <div>
        {searchable && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          </div>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-center">
          <Loader2 className="animate-spin text-black" size={16} />
          <span className="ml-2 text-xs text-black">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {searchable && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
          <input
            type="text"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => {
                const active = sortKey === col.key
                const SortIcon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      active ? "text-emerald-700" : "text-black"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      <SortIcon size={13} className="shrink-0" />
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-black">
                  {t("common.no_results")}
                </td>
              </tr>
            ) : (
              paged.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-black">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-black">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border p-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border p-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
