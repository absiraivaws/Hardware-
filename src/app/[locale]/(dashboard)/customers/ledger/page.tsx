"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type Customer = Database["public"]["Tables"]["customers"]["Row"]

interface CustomerSale {
  id: string
  invoice_no: string
  created_at: string
  grand_total: number
  amount_paid: number
  balance_due: number
  status: string
}

export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("customers")
  const searchParams = useSearchParams()
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [sales, setSales] = useState<CustomerSale[]>([])
  const [saleSortKey, setSaleSortKey] = useState("created_at")
  const [saleSortDir, setSaleSortDir] = useState<"asc" | "desc">("desc")

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
      setSales([])
      return
    }
    const supabase = createClient()
    supabase
      .from("sales")
      .select("id, invoice_no, created_at, grand_total, amount_paid, balance_due, status")
      .eq("customer_id", selectedId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setSales(data as CustomerSale[])
      })
  }, [selectedId])

  const selectedCustomer = customers.find((c) => c.id === selectedId)

  const handleSaleSort = (key: string) => {
    if (saleSortKey === key) {
      setSaleSortDir(saleSortDir === "asc" ? "desc" : "asc")
    } else {
      setSaleSortKey(key)
      setSaleSortDir("asc")
    }
  }

  const sortedSales = useMemo(() => {
    const sorted = [...sales].sort((a, b) => {
      let cmp = 0
      if (saleSortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (saleSortKey === "invoice_no") {
        cmp = a.invoice_no.localeCompare(b.invoice_no)
      } else if (saleSortKey === "grand_total") {
        cmp = Number(a.grand_total) - Number(b.grand_total)
      } else if (saleSortKey === "amount_paid") {
        cmp = Number(a.amount_paid) - Number(b.amount_paid)
      } else if (saleSortKey === "balance_due") {
        cmp = Number(a.balance_due) - Number(b.balance_due)
      } else if (saleSortKey === "status") {
        cmp = a.status.localeCompare(b.status)
      }
      return saleSortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [sales, saleSortKey, saleSortDir])

  const SaleSortIcon = (col: string) => {
    if (saleSortKey !== col) return ArrowUpDown
    return saleSortDir === "asc" ? ArrowUp : ArrowDown
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">
          {t("customer_ledger")}{selectedCustomer ? ` — ${selectedCustomer.name}` : ""}
        </h1>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="mb-1 block text-xs font-medium text-black">{t("customer")}</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">{t("select_customer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.code ?? c.phone ?? ""}
            </option>
          ))}
        </select>
      </div>

      {/* Sale History */}
      {selectedId && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-black">Sale History</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: "created_at", label: "Date", align: "text-left" },
                    { key: "invoice_no", label: "Invoice", align: "text-left" },
                    { key: "grand_total", label: "Total", align: "text-right" },
                    { key: "amount_paid", label: "Paid", align: "text-right" },
                    { key: "balance_due", label: "Pending", align: "text-right" },
                    { key: "status", label: "Status", align: "text-center" },
                  ].map((col) => {
                    const active = saleSortKey === col.key
                    const Icon = SaleSortIcon(col.key)
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSaleSort(col.key)}
                        className={`cursor-pointer select-none px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider text-black`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <Icon size={12} className="shrink-0" />
                        </span>
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedSales.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-black">No sales found</td></tr>
                ) : (
                  sortedSales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">{formatDate(s.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-black">{s.invoice_no}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.grand_total, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.amount_paid, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.balance_due, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium text-black ${s.status === "completed" ? "bg-emerald-100" : "bg-amber-100"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/${locale}/sales/history?sale_id=${s.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-black hover:bg-gray-50"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {sortedSales.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-blue-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Sales</p>
                <p className="text-lg font-bold text-black">{formatCurrency(sortedSales.reduce((s, x) => s + Number(x.grand_total), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Paid</p>
                <p className="text-lg font-bold text-black">{formatCurrency(sortedSales.reduce((s, x) => s + Number(x.amount_paid), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Pending</p>
                <p className="text-lg font-bold text-black">{formatCurrency(sortedSales.reduce((s, x) => s + Number(x.balance_due), 0), locale)}</p>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  )
}
