"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"]

export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("customers")
  const tc = useTranslations("common")
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  useEffect(() => {
    const supabase = createClient()
    supabase.from("customers").select("*").order("name").then(({ data }) => {
      if (data) setCustomers(data)
    })
  }, [])

  const customerIdParam = searchParams.get("customer_id")

  useEffect(() => {
    if (customerIdParam) {
      setSelectedId(customerIdParam)
    }
  }, [customerIdParam])

  useEffect(() => {
    if (!selectedId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("ledger_type", "customer")
      .eq("reference_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEntries(data)
        setLoading(false)
      })
  }, [selectedId])

  const selectedCustomer = customers.find((c) => c.id === selectedId)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      let cmp = 0
      if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortKey === "description") {
        cmp = (a.description || "").localeCompare(b.description || "")
      } else if (sortKey === "debit") {
        const aVal = a.entry_type === "debit" ? Number(a.amount) : 0
        const bVal = b.entry_type === "debit" ? Number(b.amount) : 0
        cmp = aVal - bVal
      } else if (sortKey === "credit") {
        const aVal = a.entry_type === "credit" ? Number(a.amount) : 0
        const bVal = b.entry_type === "credit" ? Number(b.amount) : 0
        cmp = aVal - bVal
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [entries, sortKey, sortDir])

  const totalDebit = useMemo(
    () => entries.reduce((s, e) => s + (e.entry_type === "debit" ? Number(e.amount) : 0), 0),
    [entries],
  )
  const totalCredit = useMemo(
    () => entries.reduce((s, e) => s + (e.entry_type === "credit" ? Number(e.amount) : 0), 0),
    [entries],
  )
  const netBalance = totalDebit - totalCredit

  const SortIcon = (col: string) => {
    if (sortKey !== col) return ArrowUpDown
    return sortDir === "asc" ? ArrowUp : ArrowDown
  }

  const sortedColumns = [
    { key: "created_at", label: t("date"), align: "text-left" },
    { key: "description", label: t("description"), align: "text-left" },
    { key: "debit", label: t("debit"), align: "text-right" },
    { key: "credit", label: t("credit"), align: "text-right" },
  ]

  let runningBalance = 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {t("customer_ledger")}{selectedCustomer ? ` — ${selectedCustomer.name}` : ""}
        </h1>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="mb-1 block text-xs font-medium text-gray-800">{t("customer")}</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">{t("select_customer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.phone ?? ""}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {sortedColumns.map((col) => {
                const active = sortKey === col.key
                const Icon = SortIcon(col.key)
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`cursor-pointer select-none px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider ${active ? "text-emerald-700" : "text-gray-900"}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <Icon size={12} className="shrink-0" />
                    </span>
                  </th>
                )
              })}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                {t("balance")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-900">{tc("loading")}</td>
              </tr>
            ) : sortedEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-900">{tc("no_results")}</td>
              </tr>
            ) : (
              sortedEntries.map((e) => {
                runningBalance =
                  e.entry_type === "debit"
                    ? runningBalance + Number(e.amount)
                    : runningBalance - Number(e.amount)
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {e.description ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                      {e.entry_type === "debit" ? formatCurrency(Number(e.amount), locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900">
                      {e.entry_type === "credit" ? formatCurrency(Number(e.amount), locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(runningBalance, locale)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedEntries.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-red-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-red-700">{t("total_debit")}</div>
            <div className="mt-1 text-lg font-bold text-red-700">{formatCurrency(totalDebit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-green-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-green-700">{t("total_credit")}</div>
            <div className="mt-1 text-lg font-bold text-green-700">{formatCurrency(totalCredit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-blue-700">{t("net_balance")}</div>
            <div className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(netBalance, locale)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
