"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { getCached, setCache } from "@/lib/query-cache"
import { formatCurrency, formatCompactCurrency } from "@/lib/format"
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  AlertCircle,
  Package,
  CalendarClock,
  ShieldAlert,
  Ban,
  Cake,
  MessageSquare,
  Mail,
  X,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts"

interface ChartDataPoint {
  name: string
  sales: number
  credit_sales: number
  purchases: number
  expenses: number
}

interface DashboardData {
  dailySales: number
  monthlySales: number
  cashInHand: number
  creditSales: number
  outstanding: number
  lowStockCount: number
  expiringSoonCount: number
  pendingApprovalsCount: number
  bouncedChequesCount: number
  chartData: ChartDataPoint[]
  loading: boolean
}

function getTodayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getMonthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function getDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const cards = [
  { key: "daily_sales", accessor: "dailySales" as const, icon: DollarSign, color: "bg-emerald-500" },
  { key: "monthly_sales", accessor: "monthlySales" as const, icon: TrendingUp, color: "bg-blue-500" },
  { key: "cash_in_hand", accessor: "cashInHand" as const, icon: Wallet, color: "bg-green-500" },
  { key: "credit_sales", accessor: "creditSales" as const, icon: CreditCard, color: "bg-orange-500" },
  { key: "outstanding", accessor: "outstanding" as const, icon: AlertCircle, color: "bg-red-500" },
  { key: "low_stock_alerts", accessor: "lowStockCount" as const, icon: Package, color: "bg-yellow-500" },
  { key: "expiring_soon", accessor: "expiringSoonCount" as const, icon: CalendarClock, color: "bg-purple-500" },
  { key: "pending_approvals", accessor: "pendingApprovalsCount" as const, icon: ShieldAlert, color: "bg-orange-500" },
  { key: "bounced_cheques", accessor: "bouncedChequesCount" as const, icon: Ban, color: "bg-red-500" },
]

export default function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations()

  const [data, setData] = useState<DashboardData>({
    dailySales: 0,
    monthlySales: 0,
    cashInHand: 0,
    creditSales: 0,
    outstanding: 0,
    lowStockCount: 0,
    expiringSoonCount: 0,
    pendingApprovalsCount: 0,
    bouncedChequesCount: 0,
    chartData: [],
    loading: true,
  })
  const [showBirthdays, setShowBirthdays] = useState(false)
  const [birthdayCustomers, setBirthdayCustomers] = useState<{ id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }[]>([])
  const [birthdayCount, setBirthdayCount] = useState(0)
  const [birthdayMessage, setBirthdayMessage] = useState("Happy Birthday! Wishing you a wonderful day filled with joy and success. 🎂")
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      const cacheKey = `dashboard:${fromDate}:${toDate}`
      const cached = getCached<DashboardData>(cacheKey)
      if (cached) {
        setData({ ...cached, loading: false })
        return
      }

      try {
        const periodStart = `${fromDate}T00:00:00`
        const periodEnd = `${toDate}T23:59:59`

        const [
          { data: dailyRaw },
          { data: monthToDateRaw },
          { data: creditRaw },
          { data: outstandingRaw },
          { data: productsRaw },
          { data: recentRaw },
          { data: chartRaw },
          { data: ledgerData },
          { data: pendingApprovalsRaw },
          { data: bouncedChequesRaw },
          { data: purchasesRaw },
          { data: expenseRaw },
        ] = await Promise.all([
          supabase.from("sales").select("grand_total").gte("created_at", periodStart).lte("created_at", periodEnd).eq("status", "completed"),
          supabase.from("sales").select("grand_total").gte("created_at", getMonthStart()).eq("status", "completed"),
          supabase.from("sales").select("grand_total, created_at").gte("created_at", periodStart).lte("created_at", periodEnd).eq("payment_type", "credit").eq("status", "completed"),
          supabase.from("sales").select("balance_due").eq("status", "completed").gt("balance_due", 0),
          supabase.from("products").select("current_stock, min_stock, has_expiry, expiry_date"),
          supabase.from("sales").select("customer_name, grand_total, payment_type, created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(5),
          supabase.from("sales").select("grand_total, created_at").gte("created_at", periodStart).lte("created_at", periodEnd).eq("status", "completed"),
          supabase.from("ledger_entries").select("entry_type, amount, ledger_type").in("ledger_type", ["cash", "bank"]),
          supabase.from("sales").select("id", { count: "exact", head: true }).eq("credit_approval_status", "pending"),
          supabase.from("sales").select("id", { count: "exact", head: true }).eq("cheque_status", "bounced"),
          supabase.from("purchase_orders").select("grand_total, created_at").gte("created_at", periodStart).lte("created_at", periodEnd),
          supabase.from("ledger_entries").select("amount, created_at").eq("ledger_type", "expense").gte("created_at", periodStart).lte("created_at", periodEnd),
        ])

        const dailySales = (dailyRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const monthlySales = (monthToDateRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const creditSales = (creditRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const outstanding = (outstandingRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.balance_due as number ?? 0), 0)
        const lowStockCount = (productsRaw ?? []).filter((p: Record<string, unknown>) => (p.current_stock as number) <= (p.min_stock as number)).length
        const now = new Date()
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        const expiringSoonCount = (productsRaw ?? []).filter((p: Record<string, unknown>) => {
          if (!(p as Record<string, unknown>).has_expiry || !(p as Record<string, unknown>).expiry_date) return false
          const expiry = new Date((p as Record<string, unknown>).expiry_date as string)
          return expiry <= thirtyDaysFromNow
        }).length
        const pendingApprovalsCount = (pendingApprovalsRaw as unknown as { count: number } | null)?.count ?? 0
        const bouncedChequesCount = (bouncedChequesRaw as unknown as { count: number } | null)?.count ?? 0

        const cashLedger = (ledgerData ?? []).filter((r: Record<string, unknown>) => r.ledger_type === "cash")
        const cashInHand = cashLedger.reduce((s: number, r: Record<string, unknown>) => {
          const amt = r.amount as number ?? 0
          return r.entry_type === "debit" ? s + amt : s - amt
        }, 0)

        const dayLabels: string[] = []
        const daySales: Record<string, number> = {}
        const dayCredit: Record<string, number> = {}
        const dayPurchases: Record<string, number> = {}
        const dayExpenses: Record<string, number> = {}
        const from = new Date(fromDate)
        const to = new Date(toDate)
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10)
          dayLabels.push(key)
          daySales[key] = 0
          dayCredit[key] = 0
          dayPurchases[key] = 0
          dayExpenses[key] = 0
        }

        for (const sale of (chartRaw ?? []) as Array<Record<string, unknown>>) {
          const key = (sale.created_at as string).slice(0, 10)
          if (key in daySales) daySales[key] += sale.grand_total as number
        }

        for (const sale of (creditRaw ?? []) as Array<Record<string, unknown>>) {
          const key = (sale.created_at as string).slice(0, 10)
          if (key in dayCredit) dayCredit[key] += sale.grand_total as number
        }

        for (const po of (purchasesRaw ?? []) as Array<Record<string, unknown>>) {
          const key = (po.created_at as string).slice(0, 10)
          if (key in dayPurchases) dayPurchases[key] += po.grand_total as number
        }

        for (const exp of (expenseRaw ?? []) as Array<Record<string, unknown>>) {
          const key = (exp.created_at as string).slice(0, 10)
          if (key in dayExpenses) dayExpenses[key] += exp.amount as number
        }

        const chartData: ChartDataPoint[] = dayLabels.map((key) => {
          const d = new Date(key + "T00:00:00")
          const name = String(d.getDate())
          return { name, sales: daySales[key], credit_sales: dayCredit[key], purchases: dayPurchases[key], expenses: dayExpenses[key] }
        })

        const result = { dailySales, monthlySales, cashInHand, creditSales, outstanding, lowStockCount, expiringSoonCount, pendingApprovalsCount, bouncedChequesCount, chartData, loading: false }
        setCache(cacheKey, result)
        setData(result)
      } catch (error) {
        console.error("Failed to fetch dashboard data", error)
        setData((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchData()
  }, [locale, fromDate, toDate])

  const fetchBirthdayCustomers = async () => {
    const supabase = createClient()
    const today = new Date()
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone, email, whatsapp, date_of_birth")
      .eq("status", "active")
      .not("date_of_birth", "is", null)
    if (customers) {
      const celebrating = (customers as { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null; date_of_birth: string }[]).filter((c) => {
        const dob = new Date(c.date_of_birth)
        return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()
      })
      setBirthdayCustomers(celebrating)
      setBirthdayCount(celebrating.length)
    }
  }

  useEffect(() => {
    fetchBirthdayCustomers()
  }, [])

  const openBirthdayModal = async () => {
    await fetchBirthdayCustomers()
    setShowBirthdays(true)
  }

  if (data.loading) {
    return (
      <div>
      <PageHeader titleKey="dashboard.title" />
        <div className="grid grid-cols-5 gap-4">
          {cards.map(({ key, icon: Icon, color }) => (
            <div key={key} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                  <div className="mt-1.5 h-5 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500">
                <Cake className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="mt-1.5 h-5 w-16 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="min-w-[400px] rounded-lg border bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-gray-100" />
            <div className="h-[300px] animate-pulse rounded bg-gray-50" />
          </div>
          <div className="min-w-[300px] rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 h-5 w-24 animate-pulse rounded bg-gray-100" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-gray-50" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titleKey="dashboard.title" />

      <div className="grid grid-cols-5 gap-4">
        {cards.map(({ key, accessor, icon: Icon, color }) => {
          const value = data[accessor]
          const isCurrency = accessor !== "lowStockCount" && accessor !== "expiringSoonCount" && accessor !== "pendingApprovalsCount" && accessor !== "bouncedChequesCount"

          return (
            <div key={key} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium leading-tight text-black">{t(`dashboard.${key}`)}</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-black">
                    {isCurrency ? formatCompactCurrency(value, locale) : value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div
          onClick={openBirthdayModal}
          className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500">
              <Cake className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium leading-tight text-black">Birthdays</p>
              <p className="mt-0.5 truncate text-base font-semibold text-black">
                {birthdayCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 overflow-x-auto">
        <div className="min-w-[600px] rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-black">Overview</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-black">From:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-black">To:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v, locale)} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#059669" strokeWidth={2} name={t("dashboard.daily_sales")} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="credit_sales" stroke="#f59e0b" strokeWidth={2} name="Credit Sales" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={2} name="Purchases" dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== Birthday Wishes Modal ===== */}
      {showBirthdays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black flex items-center gap-2">
                <Cake size={20} className="text-pink-500" />
                Today's Birthdays
              </h3>
              <button
                onClick={() => setShowBirthdays(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            {birthdayCustomers.length === 0 ? (
              <p className="py-8 text-center text-sm text-black">No birthdays today</p>
            ) : (
              <div className="space-y-4">
                <div className="max-h-48 overflow-y-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left font-medium text-black">Name</th>
                        <th className="px-3 py-2 text-left font-medium text-black">WhatsApp</th>
                        <th className="px-3 py-2 text-left font-medium text-black">Email</th>
                        <th className="px-3 py-2 text-right font-medium text-black">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {birthdayCustomers.map((c) => (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="px-3 py-2 text-black font-medium">{c.name}</td>
                          <td className="px-3 py-2 text-black">{c.whatsapp || c.phone || "—"}</td>
                          <td className="px-3 py-2 text-black">{c.email || "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(c.whatsapp || c.phone) && (
                                <a
                                  href={`https://wa.me/${(c.whatsapp || c.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(birthdayMessage)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  <MessageSquare size={14} />
                                  WhatsApp
                                </a>
                              )}
                              {c.email && (
                                <a
                                  href={`mailto:${c.email}?subject=${encodeURIComponent("Happy Birthday!")}&body=${encodeURIComponent(birthdayMessage)}`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                >
                                  <Mail size={14} />
                                  Email
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">Message</label>
                  <textarea
                    value={birthdayMessage}
                    onChange={(e) => setBirthdayMessage(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
