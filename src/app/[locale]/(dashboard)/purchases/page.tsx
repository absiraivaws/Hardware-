"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getCached, setCache, invalidateCache } from "@/lib/query-cache"

type PurchaseOrder = Record<string, unknown> & {
  id: string
  po_no: string
  supplier_id: string
  supplier_name: string
  created_at: string
  expected_date: string | null
  payment_due_date: string | null
  grand_total: number
  amount_paid: number
  balance_due: number
  status: "pending" | "partial" | "completed" | "cancelled"
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-black",
  partial: "bg-blue-100 text-black",
  completed: "bg-green-100 text-black",
  cancelled: "bg-gray-100 text-black",
}

const statusKeys: Record<string, string> = {
  pending: "status_pending",
  partial: "status_partial",
  completed: "status_completed",
  cancelled: "status_cancelled",
}

export default function PurchasesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const t = useTranslations()
  const router = useRouter()
  const [locale, setLocale] = useState("en")
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [supplierCodes, setSupplierCodes] = useState<Record<string, string>>({})

  useEffect(() => {
    params.then((p) => setLocale(p.locale))
  }, [params])

  useEffect(() => {
    const fetchOrders = async () => {
      const supabase = createClient()
      const cached = getCached<PurchaseOrder[]>("purchase_orders:list")
      if (cached) { setOrders(cached); setLoading(false); return }
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_no, supplier_id, supplier_name, created_at, expected_date, payment_due_date, grand_total, amount_paid, balance_due, status")
        .order("created_at", { ascending: false }) as unknown as {
        data: PurchaseOrder[] | null
      }
      if (data) { setOrders(data); setCache("purchase_orders:list", data) }
      const ids = [...new Set((data ?? []).map((o) => o.supplier_id).filter(Boolean))]
      if (ids.length > 0) {
        const { data: suppliers } = await supabase.from("suppliers").select("id, code").in("id", ids)
        const map: Record<string, string> = {}
        suppliers?.forEach((s) => { map[s.id] = s.code })
        setSupplierCodes(map)
      }
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const columns = [
    {
      key: "created_at",
      label: t("purchases.po_date"),
      render: (item: PurchaseOrder) =>
        formatDate(item.created_at),
    },
    {
      key: "expected_date",
      label: t("purchases.expected_date"),
      render: (item: PurchaseOrder) =>
        item.expected_date ? formatDate(item.expected_date) : "-",
    },
    {
      key: "po_no",
      label: t("sales.invoice_no"),
      render: (item: PurchaseOrder) => (
        <span className="font-medium">{item.po_no}</span>
      ),
    },
    {
      key: "supplier_code",
      label: t("purchases.supplier") + " ID",
      render: (item: PurchaseOrder) => (
        <span className="font-mono text-black">{supplierCodes[item.supplier_id] || "—"}</span>
      ),
    },
    {
      key: "supplier_name",
      label: t("purchases.supplier"),
      render: (item: PurchaseOrder) => (
        <span className="text-black">{item.supplier_name}</span>
      ),
    },
    {
      key: "grand_total",
      label: t("common.grand_total"),
      render: (item: PurchaseOrder) =>
        formatCurrency(Number(item.grand_total), locale),
    },
    {
      key: "balance_due",
      label: t("sales.balance_due"),
      render: (item: PurchaseOrder) => {
        const bd = Number(item.balance_due)
        if (bd <= 0) return <span className="text-black">Payment complete</span>
        return <span className="text-black font-medium">{formatCurrency(bd, locale)}</span>
      },
    },
    {
      key: "overdue",
      label: "Overdue",
      render: (item: PurchaseOrder) => {
        const bd = Number(item.balance_due)
        if (bd <= 0) return <span className="text-black">—</span>
        const dueDate = item.payment_due_date || item.expected_date
        if (!dueDate) return <span className="text-black">—</span>
        const now = new Date()
        const due = new Date(dueDate)
        if (due >= now) return <span className="text-black">—</span>
        const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-black">
            {daysOverdue}d overdue
          </span>
        )
      },
    },
    {
      key: "status",
      label: "Item delivery status",
      render: (item: PurchaseOrder) => (
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusStyles[item.status],
          )}
        >
          {t(`purchases.${statusKeys[item.status]}`)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (item: PurchaseOrder) => (
        <button
          onClick={() => router.push(`/${locale}/purchases/${item.id}`)}
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-black hover:bg-gray-50"
        >
          <Eye size={14} />
          {t("common.view")}
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">{t("purchases.title")}</h1>
        <button
          onClick={() => router.push(`/${locale}/purchases/new`)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          {t("purchases.new_po")}
        </button>
      </div>

      <DataTable<PurchaseOrder>
        columns={columns}
        data={orders}
        loading={loading}
        searchable
        searchKeys={["po_no", "supplier_name"]}
      />
    </div>
  )
}
