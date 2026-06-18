"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowUpDown, ArrowUp, ArrowDown, Landmark, Wallet, Users, Truck, TrendingDown, TrendingUp } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"]

type Tab = "cash" | "bank" | "debtors" | "creditors" | "expenses" | "income"

interface CustomerBalance {
  id: string
  name: string
  phone: string | null
  credit_balance: number
  entries: LedgerEntry[]
}

interface SupplierBalance {
  id: string
  name: string
  contact_person: string | null
  entries: LedgerEntry[]
}

export default function FinancialLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<Tab>("cash")
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [customers, setCustomers] = useState<CustomerBalance[]>([])
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [editingOpening, setEditingOpening] = useState(false)
  const [openingInput, setOpeningInput] = useState("")

  useEffect(() => {
    setLoading(true)
    setSortKey("created_at")
    setSortDir("asc")
    setSelectedEntity(null)
    setEditingOpening(false)
    const supabase = createClient()

    if (activeTab === "cash" || activeTab === "bank" || activeTab === "expenses" || activeTab === "income") {
      const ledgerType = activeTab === "expenses" ? "expense" : activeTab === "income" ? "income" : activeTab
      Promise.all([
        supabase.from("ledger_entries").select("*").eq("ledger_type", ledgerType).order("created_at", { ascending: false }).limit(500),
        (activeTab === "cash" || activeTab === "bank") ? supabase.from("company_settings").select(`cash_opening_balance,bank_opening_balance`).single() : Promise.resolve(null),
      ]).then(([ledgerRes, settingsRes]) => {
        if (ledgerRes.data) setEntries(ledgerRes.data as LedgerEntry[])
        if (settingsRes?.data) {
          const bal = activeTab === "cash" ? Number((settingsRes.data as Record<string, unknown>).cash_opening_balance) : Number((settingsRes.data as Record<string, unknown>).bank_opening_balance)
          setOpeningBalance(bal)
        }
        setLoading(false)
      })
    } else if (activeTab === "debtors") {
      Promise.all([
        supabase.from("customers").select("*").gt("credit_balance", 0).order("name"),
        supabase.from("ledger_entries").select("*").eq("ledger_type", "customer").order("created_at", { ascending: false }),
      ]).then(([custRes, ledgerRes]) => {
        const allEntries = (ledgerRes.data ?? []) as LedgerEntry[]
        const custList: CustomerBalance[] = ((custRes.data ?? []) as Database["public"]["Tables"]["customers"]["Row"][]).map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          credit_balance: c.credit_balance,
          entries: allEntries.filter((e) => e.reference_id === c.id),
        }))
        setCustomers(custList)
        setLoading(false)
      })
    } else if (activeTab === "creditors") {
      Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("ledger_entries").select("*").eq("ledger_type", "supplier").order("created_at", { ascending: false }),
      ]).then(([supRes, ledgerRes]) => {
        const allEntries = (ledgerRes.data ?? []) as LedgerEntry[]
        const supList: SupplierBalance[] = ((supRes.data ?? []) as Database["public"]["Tables"]["suppliers"]["Row"][]).map((s) => ({
          id: s.id,
          name: s.name,
          contact_person: s.contact_person,
          entries: allEntries.filter((e) => e.reference_id === s.id),
        }))
        setSuppliers(supList)
        setLoading(false)
      })
    }
  }, [activeTab])

  const entityEntries = useMemo(() => {
    if (!selectedEntity) return []
    if (activeTab === "debtors") {
      const c = customers.find((c) => c.id === selectedEntity)
      return c?.entries ?? []
    }
    if (activeTab === "creditors") {
      const s = suppliers.find((s) => s.id === selectedEntity)
      return s?.entries ?? []
    }
    return []
  }, [selectedEntity, customers, suppliers, activeTab])

  const entityBalance = useMemo(() => {
    if (activeTab === "debtors") {
      const c = customers.find((c) => c.id === selectedEntity)
      return c?.credit_balance ?? 0
    }
    if (activeTab === "creditors") {
      const s = suppliers.find((s) => s.id === selectedEntity)
      if (!s) return 0
      const debit = s.entries.filter((e) => e.entry_type === "debit").reduce((sum, e) => sum + Number(e.amount), 0)
      const credit = s.entries.filter((e) => e.entry_type === "credit").reduce((sum, e) => sum + Number(e.amount), 0)
      return debit - credit
    }
    return 0
  }, [selectedEntity, customers, suppliers, activeTab])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedEntries = useMemo(() => {
    const source = selectedEntity ? entityEntries : entries
    const sorted = [...source].sort((a, b) => {
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
  }, [entries, entityEntries, selectedEntity, sortKey, sortDir])

  const allRows = useMemo(() => {
    if (selectedEntity) return sortedEntries
    if (activeTab !== "cash" && activeTab !== "bank") return sortedEntries
    if (openingBalance === 0) return sortedEntries
    const openingRow = { id: "opening", created_at: "", description: "Opening Balance", entry_type: "debit", amount: openingBalance } as LedgerEntry
    return [openingRow, ...sortedEntries]
  }, [sortedEntries, openingBalance, activeTab, selectedEntity])

  const totalDebit = useMemo(
    () => allRows.reduce((s, e) => s + (e.entry_type === "debit" ? Number(e.amount) : 0), 0),
    [allRows],
  )
  const totalCredit = useMemo(
    () => allRows.reduce((s, e) => s + (e.entry_type === "credit" ? Number(e.amount) : 0), 0),
    [allRows],
  )

  const showTable = activeTab === "cash" || activeTab === "bank" || activeTab === "expenses" || activeTab === "income" || selectedEntity

  const handleSaveOpening = async () => {
    const val = parseFloat(openingInput)
    if (isNaN(val) || val < 0) return
    const supabase = createClient()
    const col = activeTab === "cash" ? "cash_opening_balance" : "bank_opening_balance"
    const { data: settings } = await supabase.from("company_settings").select("id").single()
    if (settings?.id) {
      const { error } = await supabase.from("company_settings").update({ [col]: val }).eq("id", settings.id)
      if (!error) {
        setOpeningBalance(val)
        setEditingOpening(false)
      }
    }
  }

  const SortIcon = (col: string) => {
    if (sortKey !== col) return ArrowUpDown
    return sortDir === "asc" ? ArrowUp : ArrowDown
  }

  const columns = [
    { key: "created_at", label: t("common.date"), align: "text-left" },
    { key: "description", label: t("common.description"), align: "text-left" },
    { key: "debit", label: "Inflow / Debit", align: "text-right" },
    { key: "credit", label: "Outflow / Credit", align: "text-right" },
  ]

  let runningBalance = 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">{t("ledgers.title")}</h1>
        <p className="text-sm text-black mt-1">{t("ledgers.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("cash")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "cash"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Wallet size={16} />
          Cash Book
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "bank"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Landmark size={16} />
          Bank Book
        </button>
        <button
          onClick={() => setActiveTab("debtors")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "debtors"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Users size={16} />
          Debtors
        </button>
        <button
          onClick={() => setActiveTab("creditors")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "creditors"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Truck size={16} />
          Creditors
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "expenses"
              ? "bg-red-100 text-red-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <TrendingDown size={16} />
          {t("ledgers.expenses")}
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "income"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <TrendingUp size={16} />
          {t("ledgers.income")}
        </button>
      </div>

      {/* Debtors / Creditors entity list */}
      {(activeTab === "debtors" || activeTab === "creditors") && !selectedEntity && (
        <div className="mb-6">
          {loading ? (
            <p className="text-sm text-black">{t("common.loading")}</p>
          ) : activeTab === "debtors" && customers.length === 0 ? (
            <p className="text-sm text-black">No outstanding debtors</p>
          ) : activeTab === "creditors" && suppliers.length === 0 ? (
            <p className="text-sm text-black">No creditors</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Outstanding</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(activeTab === "debtors" ? customers : suppliers).map((entity) => {
                    const balance = activeTab === "debtors"
                      ? (entity as CustomerBalance).credit_balance
                      : (() => {
                          const s = entity as SupplierBalance
                          const d = s.entries.filter((e) => e.entry_type === "debit").reduce((sum, e) => sum + Number(e.amount), 0)
                          const c = s.entries.filter((e) => e.entry_type === "credit").reduce((sum, e) => sum + Number(e.amount), 0)
                          return d - c
                        })()
                    return (
                      <tr key={entity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-black">{entity.name}</td>
                        <td className="px-4 py-3 text-sm text-black">
                          {activeTab === "debtors"
                            ? (entity as CustomerBalance).phone ?? "—"
                            : (entity as SupplierBalance).contact_person ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-black">
                          {formatCurrency(balance, locale)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedEntity(entity.id)}
                            className="rounded-lg border px-3 py-1 text-xs font-medium text-black hover:bg-gray-50"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Back button when viewing entity ledger */}
      {selectedEntity && (
        <button
          onClick={() => setSelectedEntity(null)}
          className="mb-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          &larr; Back to {activeTab === "debtors" ? "Debtors" : "Creditors"}
        </button>
      )}

      {/* Summary Cards */}
      {showTable && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-emerald-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-700">
              {activeTab === "debtors" || activeTab === "creditors" ? "Total Debit" : "Total Inflow"}
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(totalDebit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-red-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-red-700">
              {activeTab === "debtors" || activeTab === "creditors" ? "Total Credit" : "Total Outflow"}
            </div>
            <div className="mt-1 text-lg font-bold text-red-700">{formatCurrency(totalCredit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-blue-700">Balance</div>
            <div className="mt-1 text-lg font-bold text-blue-700">
              {selectedEntity
                ? formatCurrency(entityBalance, locale)
                : formatCurrency(totalDebit - totalCredit, locale)}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {showTable && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => {
                  const active = sortKey === col.key
                  const Icon = SortIcon(col.key)
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`cursor-pointer select-none px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider ${active ? "text-emerald-700" : "text-black"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <Icon size={12} className="shrink-0" />
                      </span>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">
                  Running Balance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-black">{t("common.no_results")}</td>
                </tr>
              ) : (
                allRows.map((e) => {
                  if (e.id === "opening") {
                    runningBalance = runningBalance + Number(e.amount)
                    return (
                      <tr key="opening" className="bg-amber-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-black">
                          {editingOpening ? (
                            <input
                              type="number"
                              value={openingInput}
                              onChange={(e) => setOpeningInput(e.target.value)}
                              className="w-32 rounded border px-2 py-1 text-sm"
                              autoFocus
                              onKeyDown={(ev) => { if (ev.key === "Enter") handleSaveOpening(); if (ev.key === "Escape") setEditingOpening(false) }}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Opening Balance
                              <button
                                onClick={() => { setOpeningInput(String(openingBalance)); setEditingOpening(true) }}
                                className="text-gray-400 hover:text-gray-700"
                                title="Edit opening balance"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                          {editingOpening ? "—" : formatCurrency(Number(e.amount), locale)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-black">
                          {formatCurrency(runningBalance, locale)}
                        </td>
                      </tr>
                    )
                  }
                  runningBalance =
                    e.entry_type === "debit"
                      ? runningBalance + Number(e.amount)
                      : runningBalance - Number(e.amount)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {e.description ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                        {e.entry_type === "debit" ? formatCurrency(Number(e.amount), locale) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                        {e.entry_type === "credit" ? formatCurrency(Number(e.amount), locale) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-black">
                        {formatCurrency(runningBalance, locale)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
