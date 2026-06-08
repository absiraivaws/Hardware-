"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Plus, Eye } from "lucide-react"
import { useEffect, useState } from "react"
import { DataTable } from "@/components/shared/data-table"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type PurchaseOrder = Record<string, unknown> & {
  id: string
  po_no: string
  supplier_name: string
  created_at: string
  expected_date: string | null
  grand_total: number
  status: "pending" | "partial" | "completed" | "cancelled"
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
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

  useEffect(() => {
    params.then((p) => setLocale(p.locale))
  }, [params])

  useEffect(() => {
    const fetchOrders = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_no, supplier_name, created_at, expected_date, grand_total, status")
        .order("created_at", { ascending: false }) as unknown as {
        data: PurchaseOrder[] | null
      }
      if (data) setOrders(data)
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
      key: "supplier_name",
      label: t("purchases.supplier"),
      render: (item: PurchaseOrder) => item.supplier_name,
    },
    {
      key: "grand_total",
      label: t("common.grand_total"),
      render: (item: PurchaseOrder) =>
        formatCurrency(Number(item.grand_total), locale),
    },
    {
      key: "status",
      label: t("common.status"),
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
          className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
        <h1 className="text-2xl font-bold text-gray-900">{t("purchases.title")}</h1>
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
