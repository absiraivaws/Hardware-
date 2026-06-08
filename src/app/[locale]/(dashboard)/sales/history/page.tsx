"use client"

import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, formatDate } from "@/lib/format"
import { use, useEffect, useState } from "react"
import { Eye } from "lucide-react"

interface SaleRow {
  id: string
  invoice_no: string
  customer_name: string | null
  created_at: string
  grand_total: number
  status: string
  payment_type: string
  [key: string]: unknown
}

export default function SaleHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSales()
  }, [])

  async function loadSales() {
    const supabase = createClient()
    setLoading(true)
    const { data } = await supabase
      .from("sales")
      .select("id, invoice_no, customer_name, created_at, grand_total, status, payment_type")
      .order("created_at", { ascending: false })
      .limit(200)

    if (data) setSales(data as SaleRow[])
    setLoading(false)
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
    }
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const columns = [
    {
      key: "created_at",
      label: t("common.date"),
      render: (row: SaleRow) => formatDate(row.created_at),
    },
    {
      key: "invoice_no",
      label: t("sales.invoice_no"),
      render: (row: SaleRow) => (
        <span className="font-medium text-gray-900">{row.invoice_no}</span>
      ),
    },
    {
      key: "customer_name",
      label: t("sales.customer"),
      render: (row: SaleRow) => row.customer_name || "Walk-in Customer",
    },
    {
      key: "grand_total",
      label: t("common.total"),
      render: (row: SaleRow) => formatCurrency(row.grand_total, locale),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (row: SaleRow) => statusBadge(row.status),
    },
    {
      key: "payment_type",
      label: t("sales.payment_type"),
      render: (row: SaleRow) => {
        const labels: Record<string, string> = {
          cash: t("sales.cash"),
          credit: t("sales.credit"),
          bank_transfer: t("sales.bank_transfer"),
          lanka_qr: t("sales.lanka_qr"),
          card: t("sales.card"),
          mixed: t("sales.mixed"),
          cheque: t("sales.cheque"),
        }
        return labels[row.payment_type] || row.payment_type
      },
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (row: SaleRow) => (
        <button
          onClick={() => (window.location.href = `?view=${row.id}`)}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-800 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <Eye size={14} />
          {t("common.view")}
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader titleKey="sales.sale_history" />
      <DataTable
        columns={columns as any}
        data={sales}
        loading={loading}
        searchable
        searchKeys={["invoice_no", "customer_name"]}
      />
    </div>
  )
}
