"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, Eye, Ban, CheckCircle } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { getCached, setCache } from "@/lib/query-cache"
import { generateNextCode } from "@/lib/code-gen"
interface Customer {
  id: string
  code: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  credit_limit: number
  credit_balance: number
  loyalty_points: number
  status: "active" | "blocked"
  created_at: string
  updated_at: string
}

export default function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("customers")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", credit_limit: 0 })

  const fetchCustomers = async () => {
    const cached = getCached<Customer[]>("customers:all")
    if (cached) {
      setCustomers(cached)
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase.from("customers").select("*").order("name")
    if (data) {
      setCustomers(data as Customer[])
      setCache("customers:all", data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleAdd = async () => {
    if (!form.name) return
    const supabase = createClient()
    const code = await generateNextCode("customers")
    await supabase.from("customers").insert([{ ...form, code, credit_limit: Number(form.credit_limit) }])
    setShowForm(false)
    setForm({ name: "", phone: "", email: "", address: "", credit_limit: 0 })
    fetchCustomers()
  }

  const toggleStatus = async (customer: Customer) => {
    const supabase = createClient()
    const newStatus = customer.status === "active" ? "blocked" : "active"
    await supabase.from("customers").update({ status: newStatus }).eq("id", customer.id)
    fetchCustomers()
  }

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (c: Customer) => <span className="font-mono text-xs text-gray-500">{c.code}</span>,
    },
    {
      key: "name",
      label: t("name"),
      render: (c: Customer) => c.name,
    },
    {
      key: "phone",
      label: t("phone"),
      render: (c: Customer) => c.phone ?? "—",
    },
    {
      key: "credit_limit",
      label: t("credit_limit"),
      render: (c: Customer) => formatCurrency(Number(c.credit_limit), locale),
    },
    {
      key: "credit_balance",
      label: t("credit_balance"),
      render: (c: Customer) => formatCurrency(Number(c.credit_balance), locale),
    },
    {
      key: "status",
      label: t("status"),
      render: (c: Customer) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            c.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {c.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (c: Customer) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStatus(c)}
            className="rounded p-1 text-black hover:bg-gray-100"
            title={c.status === "active" ? t("block") : t("unblock")}
          >
            {c.status === "active" ? <Ban size={16} /> : <CheckCircle size={16} />}
          </button>
          <a
            href={`/${locale}/customers/ledger?customer_id=${c.id}`}
            className="rounded p-1 text-black hover:bg-gray-100"
            title={t("view_ledger")}
          >
            <Eye size={16} />
          </a>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">{t("title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          {t("add_customer")}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black">{t("name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={t("name")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">{t("phone")}</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={t("phone")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">{t("credit_limit")}</label>
              <input
                type="number"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("save")}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchable
        searchKeys={["name", "phone"]}
      />
    </div>
  )
}
