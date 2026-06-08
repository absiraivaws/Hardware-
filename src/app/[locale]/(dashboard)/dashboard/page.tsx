"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatCompactCurrency, formatDate } from "@/lib/format"
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  AlertCircle,
  Package,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface RecentSale {
  customer_name: string | null
  grand_total: number
  payment_type: string
  created_at: string
}

interface ChartDataPoint {
  name: string
  total: number
}

interface DashboardData {
  dailySales: number
  monthlySales: number
  cashInHand: number
  creditSales: number
  outstanding: number
  lowStockCount: number
  recentSales: RecentSale[]
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
    recentSales: [],
    chartData: [],
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      const todayStart = getTodayStart()
      const monthStart = getMonthStart()
      const sevenDaysAgo = getDaysAgo(6)

      try {
        const [
          { data: dailyRaw },
          { data: monthlyRaw },
          { data: cashRaw },
          { data: creditRaw },
          { data: outstandingRaw },
          { data: productsRaw },
          { data: recentRaw },
          { data: chartRaw },
        ] = await Promise.all([
          supabase.from("sales").select("grand_total").gte("created_at", todayStart).eq("status", "completed"),
          supabase.from("sales").select("grand_total").gte("created_at", monthStart).eq("status", "completed"),
          supabase.from("sales").select("grand_total").eq("payment_type", "cash").eq("status", "completed"),
          supabase.from("sales").select("grand_total").eq("payment_type", "credit").eq("status", "completed"),
          supabase.from("sales").select("balance_due").eq("status", "completed").gt("balance_due", 0),
          supabase.from("products").select("current_stock, min_stock"),
          supabase.from("sales").select("customer_name, grand_total, payment_type, created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(5),
          supabase.from("sales").select("grand_total, created_at").gte("created_at", sevenDaysAgo).eq("status", "completed"),
        ])

        const dailySales = (dailyRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const monthlySales = (monthlyRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const cashInHand = (cashRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const creditSales = (creditRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.grand_total as number ?? 0), 0)
        const outstanding = (outstandingRaw ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.balance_due as number ?? 0), 0)
        const lowStockCount = (productsRaw ?? []).filter((p: Record<string, unknown>) => (p.current_stock as number) <= (p.min_stock as number)).length
        const recentSales: RecentSale[] = (recentRaw ?? []).map((r: Record<string, unknown>) => ({
          customer_name: r.customer_name as string | null,
          grand_total: r.grand_total as number,
          payment_type: r.payment_type as string,
          created_at: r.created_at as string,
        }))

        const dayLabels: string[] = []
        const dayTotals: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = d.toISOString().slice(0, 10)
          dayLabels.push(key)
          dayTotals[key] = 0
        }

        for (const sale of (chartRaw ?? []) as Array<Record<string, unknown>>) {
          const key = (sale.created_at as string).slice(0, 10)
          if (key in dayTotals) {
            dayTotals[key] += sale.grand_total as number
          }
        }

        const chartData: ChartDataPoint[] = dayLabels.map((key) => {
          const d = new Date(key + "T00:00:00")
          const name = d.toLocaleDateString(locale, { weekday: "short" })
          return { name, total: dayTotals[key] }
        })

        setData({ dailySales, monthlySales, cashInHand, creditSales, outstanding, lowStockCount, recentSales, chartData, loading: false })
      } catch (error) {
        console.error("Failed to fetch dashboard data", error)
        setData((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchData()
  }, [locale])

  if (data.loading) {
    return (
      <div>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader titleKey="dashboard.title" />

      <div className="flex gap-4 overflow-x-auto pb-2">
        {cards.map(({ key, accessor, icon: Icon, color }) => {
          const value = data[accessor]
          const isCurrency = accessor !== "lowStockCount"

          return (
            <div key={key} className="min-w-[180px] shrink-0 rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium leading-tight text-gray-700">{t(`dashboard.${key}`)}</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-gray-900">
                    {isCurrency ? formatCompactCurrency(value, locale) : value}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 overflow-x-auto lg:grid-cols-3">
        <div className="min-w-[400px] rounded-lg border bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("dashboard.todays_overview")}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 60 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v, locale)} />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value), locale), t("common.grand_total")]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-[300px] rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("sales.sale_history")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs font-medium uppercase text-gray-700">
                  <th className="w-[20%] pb-2 pr-3">{t("common.date")}</th>
                  <th className="w-[40%] pb-2 pr-3">{t("customers.customer_name")}</th>
                  <th className="w-[20%] pb-2 pr-3">{t("common.grand_total")}</th>
                  <th className="w-[20%] pb-2">{t("sales.payment_type")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-gray-700">{formatDate(sale.created_at)}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{sale.customer_name ?? t("sales.walk_in")}</td>
                    <td className="py-2 pr-3 text-gray-700">{formatCurrency(sale.grand_total, locale)}</td>
                    <td className="py-2 text-gray-700">{t(`sales.${sale.payment_type}`)}</td>
                  </tr>
                ))}
                {data.recentSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-700">
                      {t("common.no_results")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
