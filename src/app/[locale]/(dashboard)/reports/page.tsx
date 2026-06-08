"use client"

import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, formatDate } from "@/lib/format"
import { use, useEffect, useState } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
} from "lucide-react"

type ReportTab = "daily_sales" | "stock_report" | "profit_report" | "outstanding" | "svat_report"

const TABS: { key: ReportTab; labelKey: string }[] = [
  { key: "daily_sales", labelKey: "reports.daily_sales" },
  { key: "stock_report", labelKey: "reports.stock_report" },
  { key: "profit_report", labelKey: "reports.profit_report" },
  { key: "outstanding", labelKey: "reports.outstanding" },
  { key: "svat_report", labelKey: "reports.svat_report" },
]

interface DailySale {
  id: string
  invoice_no: string
  customer_name: string | null
  created_at: string
  grand_total: number
  payment_type: string
  status: string
}

interface StockItem {
  id: string
  code: string
  name: string
  category_name: string | null
  current_stock: number
  min_stock: number
  stock_status: "in_stock" | "low" | "out"
}

interface ProfitItem {
  product_id: string
  product_name: string
  qty_sold: number
  avg_cost: number
  avg_price: number
  profit_per_item: number
  total_profit: number
}

interface OutstandingCustomer {
  id: string
  name: string
  phone: string | null
  credit_limit: number
  credit_balance: number
  overdue_amount: number
  days_overdue: number
}

interface SvatSale {
  id: string
  invoice_no: string
  customer_name: string | null
  subtotal: number
  tax_amount: number
  grand_total: number
  created_at: string
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default function ReportsPage({ params }: PageProps) {
  const { locale } = use(params)
  const t = useTranslations()

  const [activeTab, setActiveTab] = useState<ReportTab>("daily_sales")
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [profitItems, setProfitItems] = useState<ProfitItem[]>([])
  const [outstandingCustomers, setOutstandingCustomers] = useState<OutstandingCustomer[]>([])
  const [svatSales, setSvatSales] = useState<SvatSale[]>([])
  const [stockSearch, setStockSearch] = useState("")

  const perPage = 20

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      try {
        switch (activeTab) {
          case "daily_sales": {
            const { data } = await supabase
              .from("sales")
              .select("id, invoice_no, customer_name, created_at, grand_total, payment_type, status")
              .gte("created_at", `${fromDate}T00:00:00`)
              .lte("created_at", `${toDate}T23:59:59`)
              .order("created_at", { ascending: false })
            if (data) setDailySales(data as DailySale[])
            break
          }
          case "stock_report": {
            const { data } = await supabase
              .from("products")
              .select("id, code, name, current_stock, min_stock, categories(name)")
              .order("name", { ascending: true })
            if (data) {
              const items: StockItem[] = data.map((p) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                category_name: (p.categories as unknown as { name: string } | null)?.name ?? null,
                current_stock: p.current_stock,
                min_stock: p.min_stock,
                stock_status:
                  p.current_stock <= 0
                    ? "out"
                    : p.current_stock < p.min_stock
                      ? "low"
                      : "in_stock",
              }))
              setStockItems(items)
            }
            break
          }
          case "profit_report": {
            const { data } = await supabase
              .from("sale_items")
              .select("product_id, product_name, quantity, unit_price, products(cost_price)")
            if (data) {
              const map = new Map<string, ProfitItem>()
              for (const item of data) {
                const costPrice = (item.products as unknown as { cost_price: number } | null)?.cost_price ?? 0
                const profit = (item.unit_price - costPrice) * item.quantity
                const existing = map.get(item.product_id)
                if (existing) {
                  existing.qty_sold += item.quantity
                  existing.total_profit += profit
                  existing.avg_cost = (existing.avg_cost + costPrice) / 2
                  existing.avg_price = (existing.avg_price + item.unit_price) / 2
                } else {
                  map.set(item.product_id, {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    qty_sold: item.quantity,
                    avg_cost: costPrice,
                    avg_price: item.unit_price,
                    profit_per_item: item.unit_price - costPrice,
                    total_profit: profit,
                  })
                }
              }
              setProfitItems(Array.from(map.values()).sort((a, b) => a.product_name.localeCompare(b.product_name)))
            }
            break
          }
          case "outstanding": {
            const { data } = await supabase
              .from("customers")
              .select("id, name, phone, credit_limit, credit_balance")
              .gt("credit_balance", 0)
              .order("name", { ascending: true })
            if (data) {
              const items: OutstandingCustomer[] = data.map((c) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                credit_limit: c.credit_limit,
                credit_balance: c.credit_balance,
                overdue_amount: c.credit_balance,
                days_overdue: 0,
              }))
              setOutstandingCustomers(items)
            }
            break
          }
          case "svat_report": {
            const { data } = await supabase
              .from("sales")
              .select("id, invoice_no, customer_name, subtotal, tax_amount, grand_total, created_at")
              .eq("tax_type", "svat")
              .gte("created_at", `${fromDate}T00:00:00`)
              .lte("created_at", `${toDate}T23:59:59`)
              .order("created_at", { ascending: false })
            if (data) setSvatSales(data as SvatSale[])
            break
          }
        }
      } catch {
        // noop
      }

      setLoading(false)
    }

    fetchData()
    setPage(1)
  }, [activeTab, fromDate, toDate])

  const paginate = <T,>(items: T[]) => {
    const totalPages = Math.ceil(items.length / perPage)
    const paged = items.slice((page - 1) * perPage, page * perPage)
    return { paged, totalPages }
  }

  const renderPagination = (totalPages: number) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between border-t px-4 py-3">
        <span className="text-sm text-gray-900">
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
    )
  }

  const renderTable = (headers: string[], rows: React.ReactNode[][], empty = t("common.no_results")) => {
    return (
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-12 text-center text-sm text-gray-900">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const renderDailySales = () => {
    const { paged, totalPages } = paginate(dailySales)
    const totalAmount = dailySales.reduce((sum, s) => sum + s.grand_total, 0)
    const headers = [
      t("common.date"),
      t("sales.invoice_no"),
      t("sales.customer"),
      t("common.grand_total"),
      t("sales.payment_type"),
      t("common.status"),
    ]
    const rows = paged.map((s) => [
      formatDate(s.created_at),
      <span className="font-medium text-gray-900">{s.invoice_no}</span>,
      s.customer_name ?? "-",
      <span className="text-right font-medium">{formatCurrency(s.grand_total, locale)}</span>,
      t(`sales.${s.payment_type}`),
      s.status,
    ])
    return (
      <div>
        {renderTable(headers, rows)}
        {renderPagination(totalPages)}
        <div className="mt-4 flex items-center justify-end gap-2 rounded-lg bg-emerald-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-900">{t("common.total")}:</span>
          <span className="text-lg font-bold text-emerald-700">
            {formatCurrency(totalAmount, locale)}
          </span>
        </div>
      </div>
    )
  }

  const renderStockReport = () => {
    const filtered = stockSearch
      ? stockItems.filter(
          (s) =>
            s.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
            s.name.toLowerCase().includes(stockSearch.toLowerCase()),
        )
      : stockItems
    const { paged, totalPages } = paginate(filtered)
    const headers = [
      t("inventory.product_code"),
      t("inventory.product_name"),
      t("inventory.category"),
      t("inventory.current_stock"),
      t("inventory.min_stock"),
      t("common.status"),
    ]
    const rows = paged.map((s) => {
      const isLow = s.stock_status === "low" || s.stock_status === "out"
      const statusLabel =
        s.stock_status === "out"
          ? "Out of Stock"
          : s.stock_status === "low"
            ? "Low Stock"
            : "In Stock"
      return [
        <span className={isLow ? "text-red-600 font-medium" : ""}>{s.code}</span>,
        <span className={isLow ? "text-red-600" : ""}>{s.name}</span>,
        s.category_name ?? "-",
        <span className={isLow ? "text-red-600 font-medium" : ""}>{s.current_stock}</span>,
        s.min_stock,
        <span className={isLow ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
          {statusLabel}
        </span>,
      ]
    })
    return (
      <div>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" size={18} />
          <input
            type="text"
            placeholder={t("common.search")}
            value={stockSearch}
            onChange={(e) => { setStockSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {renderTable(headers, rows)}
        {renderPagination(totalPages)}
      </div>
    )
  }

  const renderProfitReport = () => {
    const { paged, totalPages } = paginate(profitItems)
    const grandProfit = profitItems.reduce((sum, p) => sum + p.total_profit, 0)
    const headers = [
      t("inventory.product_name"),
      t("sales.qty"),
      t("inventory.cost_price"),
      t("inventory.selling_price"),
      "Profit/Item",
      t("common.total"),
    ]
    const rows = paged.map((p) => [
      p.product_name,
      p.qty_sold,
      formatCurrency(p.avg_cost, locale),
      formatCurrency(p.avg_price, locale),
      <span className={p.profit_per_item >= 0 ? "text-emerald-600" : "text-red-600"}>
        {formatCurrency(p.profit_per_item, locale)}
      </span>,
      <span className="font-medium">{formatCurrency(p.total_profit, locale)}</span>,
    ])
    return (
      <div>
        {renderTable(headers, rows)}
        {renderPagination(totalPages)}
        <div className="mt-4 flex items-center justify-end gap-2 rounded-lg bg-emerald-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-900">Total Profit:</span>
          <span className="text-lg font-bold text-emerald-700">
            {formatCurrency(grandProfit, locale)}
          </span>
        </div>
      </div>
    )
  }

  const renderOutstanding = () => {
    const { paged, totalPages } = paginate(outstandingCustomers)
    const totalBalance = outstandingCustomers.reduce((sum, c) => sum + c.credit_balance, 0)
    const headers = [
      t("customers.customer_name"),
      t("customers.phone"),
      t("customers.credit_limit"),
      t("customers.credit_balance"),
      "Overdue Amount",
      "Days Overdue",
    ]
    const rows = paged.map((c) => [
      c.name,
      c.phone ?? "-",
      formatCurrency(c.credit_limit, locale),
      <span className="font-medium text-amber-600">{formatCurrency(c.credit_balance, locale)}</span>,
      formatCurrency(c.overdue_amount, locale),
      c.days_overdue,
    ])
    return (
      <div>
        {renderTable(headers, rows)}
        {renderPagination(totalPages)}
        <div className="mt-4 flex items-center justify-end gap-2 rounded-lg bg-amber-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-900">Total Outstanding:</span>
          <span className="text-lg font-bold text-amber-700">
            {formatCurrency(totalBalance, locale)}
          </span>
        </div>
      </div>
    )
  }

  const renderSvatReport = () => {
    const { paged, totalPages } = paginate(svatSales)
    const totalSvat = svatSales.reduce((sum, s) => sum + s.tax_amount, 0)
    const headers = [
      t("sales.invoice_no"),
      t("sales.customer"),
      t("common.subtotal"),
      t("common.tax"),
      t("common.grand_total"),
    ]
    const rows = paged.map((s) => [
      <span className="font-medium text-gray-900">{s.invoice_no}</span>,
      s.customer_name ?? "-",
      formatCurrency(s.subtotal, locale),
      <span className="font-medium">{formatCurrency(s.tax_amount, locale)}</span>,
      formatCurrency(s.grand_total, locale),
    ])
    return (
      <div>
        {renderTable(headers, rows)}
        {renderPagination(totalPages)}
        <div className="mt-4 flex items-center justify-end gap-2 rounded-lg bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-gray-900">Total SVAT:</span>
          <span className="text-lg font-bold text-blue-700">
            {formatCurrency(totalSvat, locale)}
          </span>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-900" size={32} />
        </div>
      )
    }
    switch (activeTab) {
      case "daily_sales":
        return renderDailySales()
      case "stock_report":
        return renderStockReport()
      case "profit_report":
        return renderProfitReport()
      case "outstanding":
        return renderOutstanding()
      case "svat_report":
        return renderSvatReport()
    }
  }

  const showDateRange = activeTab === "daily_sales" || activeTab === "svat_report"

  return (
    <div>
      <PageHeader titleKey="reports.title" />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        {showDateRange && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-gray-900" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <span className="text-gray-900">&ndash;</span>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-gray-900" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  )
}
