"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

type UserRole = "super_admin" | "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"

interface StaffDetail {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  branch_id: string | null
  phone: string | null
  staff_code: string
  status: "active" | "inactive" | "suspended" | "pending"
  date_of_birth: string | null
  last_login: string | null
  created_at: string
  branch_name?: string | null
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  branch_manager: "Branch Manager",
  cashier: "Cashier",
  store_keeper: "Store Keeper",
  accountant: "Accountant",
  sales_executive: "Sales Executive",
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
}

const ALL_SIDEBAR_MODULES = [
  "dashboard", "sales", "sales/history", "staff", "purchases", "inventory",
  "customers", "suppliers", "deliveries", "drivers", "vehicles", "quotations",
  "rentals", "expenses", "reports", "ledgers",
]

export default function StaffDetailPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string

  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarModules, setSidebarModules] = useState<string[]>([])
  const [salesMetrics, setSalesMetrics] = useState({ total_sales: 0, total_amount: 0, avg_per_day: 0 })
  const [activityLog, setActivityLog] = useState<{ action: string; entity_type: string; created_at: string }[]>([])

  const supabase = createClient()

  useEffect(() => {
    ;(async () => {
      const { data: staffData } = await supabase
        .from("profiles")
        .select("*, branches!left(name)")
        .eq("id", id)
        .single()

      if (!staffData) {
        setLoading(false)
        return
      }

      const enriched: StaffDetail = {
        ...(staffData as unknown as StaffDetail),
        branch_name: ((staffData.branches as { name?: string })?.name) ?? null,
      }
      setStaff(enriched)

      const { data: items } = await supabase
        .from("role_sidebar_items")
        .select("module")
        .eq("role", enriched.role)
      setSidebarModules(items?.map((i: { module: string }) => i.module) ?? [])

      const { data: logs } = await supabase
        .from("audit_log")
        .select("action, entity_type, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(5)
      setActivityLog(logs ?? [])

      const { data: salesData } = await supabase
        .from("sales")
        .select("grand_total, created_at")
        .eq("user_id", id)
        .eq("status", "completed")

      if (salesData && salesData.length > 0) {
        const totalAmount = salesData.reduce((sum, r) => sum + (r.grand_total ?? 0), 0)
        const dates = new Set(salesData.map((r) => (r.created_at ?? "").slice(0, 10)))
        const daysActive = dates.size || 1
        setSalesMetrics({
          total_sales: salesData.length,
          total_amount: totalAmount,
          avg_per_day: totalAmount / daysActive,
        })
      }

      setLoading(false)
    })()
  }, [id])

  const toggleSidebarModule = async (module: string) => {
    if (!staff) return
    const isActive = sidebarModules.includes(module)
    if (isActive) {
      await supabase.from("role_sidebar_items").delete().eq("role", staff.role).eq("module", module)
      setSidebarModules((prev) => prev.filter((m) => m !== module))
    } else {
      await supabase.from("role_sidebar_items").insert({ role: staff.role, module })
      setSidebarModules((prev) => [...prev, module])
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-black">Staff member not found.</p>
        <button
          onClick={() => router.push(`/${locale}/staff`)}
          className="mt-4 text-sm text-emerald-600 hover:underline"
        >
          Back to Staff
        </button>
      </div>
    )
  }

  const st = staff.status ?? "active"

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3 border-b pb-4">
        <button
          onClick={() => router.push(`/${locale}/staff`)}
          className="rounded-lg border border-emerald-300 p-1.5 hover:bg-emerald-50"
        >
          <ArrowLeft size={20} className="text-emerald-600" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-black">{staff.full_name ?? "—"}</h1>
          <p className="text-sm text-black/60">{staff.staff_code} &middot; {ROLE_LABELS[staff.role]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="rounded-lg border bg-white">
          <h4 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">Personal Information</h4>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Staff Code</span>
              <span className="font-medium text-black">{staff.staff_code}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Email</span>
              <span className="font-medium text-black">{staff.email}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Phone</span>
              <span className="font-medium text-black">{staff.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Date of Birth</span>
              <span className="font-medium text-black">{staff.date_of_birth ? formatDate(staff.date_of_birth) : "—"}</span>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="rounded-lg border bg-white">
          <h4 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">Account Information</h4>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Role</span>
              <span className="font-medium text-black">{ROLE_LABELS[staff.role]}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Branch</span>
              <span className="font-medium text-black">{staff.branch_name ?? "—"}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Status</span>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[st]}`}>
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Last Login</span>
              <span className="font-medium text-black">{staff.last_login ? formatDate(staff.last_login) : "Never"}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Member Since</span>
              <span className="font-medium text-black">{formatDate(staff.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Menu Configuration */}
        <div className="lg:col-span-2 rounded-lg border bg-white">
          <h4 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">
            Sidebar Menu &mdash; {ROLE_LABELS[staff.role]}
          </h4>
          <div className="p-4">
            <p className="mb-3 text-xs text-black/60">
              Select which sidebar navigation items are visible for {ROLE_LABELS[staff.role]}.
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
              {ALL_SIDEBAR_MODULES.map((mod) => {
                const checked = sidebarModules.includes(mod)
                const label = mod.charAt(0).toUpperCase() + mod.slice(1)
                return (
                  <label key={mod} className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSidebarModule(mod)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-black">{label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sales Performance */}
        <div className="rounded-lg border bg-white">
          <h4 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">Sales Performance</h4>
          <div className="divide-y text-sm">
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Total Sales</span>
              <span className="font-medium text-black">{salesMetrics.total_sales}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Total Amount</span>
              <span className="font-medium text-black">{formatCurrency(salesMetrics.total_amount, locale)}</span>
            </div>
            <div className="flex justify-between px-4 py-2">
              <span className="text-black/60">Avg Per Day</span>
              <span className="font-medium text-black">{formatCurrency(salesMetrics.avg_per_day, locale)}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-white">
          <h4 className="border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-black">Recent Activity</h4>
          <div className="p-4">
            {activityLog.length === 0 ? (
              <p className="text-xs text-black/60">No activity recorded</p>
            ) : (
              <div className="space-y-2">
                {activityLog.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-black capitalize">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-black/60">{log.entity_type} &middot; {formatDate(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
