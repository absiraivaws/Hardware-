"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Eye } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type Quotation = Database["public"]["Tables"]["quotations"]["Row"]

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  converted: "bg-purple-100 text-purple-700",
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  expired: "Expired",
  converted: "Converted",
}

export default function QuotationsPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("quotations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setQuotations(data)
        setLoading(false)
      })
  }, [])

  const columns = [
    {
      key: "created_at",
      label: t("common.date"),
      render: (item: Quotation) => (
        <span>{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: "valid_until",
      label: t("quotations.valid_until"),
      render: (item: Quotation) => (
        <span>{item.valid_until ? formatDate(item.valid_until) : "—"}</span>
      ),
    },
    {
      key: "q_no",
      label: t("common.reference"),
      render: (item: Quotation) => (
        <span className="font-medium text-gray-900">{item.q_no}</span>
      ),
    },
    {
      key: "customer_name",
      label: t("sales.customer"),
      render: (item: Quotation) => (
        <span>{item.customer_name || "—"}</span>
      ),
    },
    {
      key: "grand_total",
      label: t("common.grand_total"),
      render: (item: Quotation) => (
        <span className="font-medium">{formatCurrency(Number(item.grand_total), locale)}</span>
      ),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (item: Quotation) => (
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status] || "bg-gray-100 text-gray-700"}`}
        >
          {statusLabels[item.status] || item.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (item: Quotation) => (
        <button
          onClick={() => router.push(`/${locale}/quotations/${item.id}`)}
          className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 hover:text-gray-700"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader titleKey="quotations.title">
        <button
          onClick={() => router.push(`/${locale}/quotations/new`)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          {t("quotations.new_quotation")}
        </button>
      </PageHeader>

      <DataTable<Quotation>
        columns={columns}
        data={quotations}
        loading={loading}
        searchable
        searchKeys={["q_no", "customer_name"]}
      />
    </div>
  )
}
