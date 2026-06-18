"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, Eye, Ban, CheckCircle } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { createClient } from "@/lib/supabase/client"
import { getCached, setCache } from "@/lib/query-cache"
interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  credit_period: number
  overdue_penalty_rate: number
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export default function SuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("suppliers")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", credit_period: 0, overdue_penalty_rate: 0 })

  const fetchSuppliers = async () => {
    const cached = getCached<Supplier[]>("suppliers:all")
    if (cached) {
      setSuppliers(cached)
      setLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase.from("suppliers").select("*").order("name")
    if (data) {
      setSuppliers(data as Supplier[])
      setCache("suppliers:all", data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const handleAdd = async () => {
    if (!form.name) return
    const supabase = createClient()
    await supabase.from("suppliers").insert([{ ...form, credit_period: Number(form.credit_period), overdue_penalty_rate: Number(form.overdue_penalty_rate) }])
    setShowForm(false)
    setForm({ name: "", contact_person: "", phone: "", email: "", address: "", credit_period: 0, overdue_penalty_rate: 0 })
    fetchSuppliers()
  }

  const toggleStatus = async (supplier: Supplier) => {
    const supabase = createClient()
    const newStatus = supplier.status === "active" ? "inactive" : "active"
    await supabase.from("suppliers").update({ status: newStatus }).eq("id", supplier.id)
    fetchSuppliers()
  }

  const columns = [
    {
      key: "name",
      label: t("name"),
      render: (s: Supplier) => s.name,
    },
    {
      key: "contact_person",
      label: t("contact_person"),
      render: (s: Supplier) => s.contact_person ?? "—",
    },
    {
      key: "phone",
      label: t("phone"),
      render: (s: Supplier) => s.phone ?? "—",
    },
    {
      key: "credit_period",
      label: t("credit_period"),
      render: (s: Supplier) => `${s.credit_period} days`,
    },
    {
      key: "overdue_penalty_rate",
      label: "Penalty Rate",
      render: (s: Supplier) => `${s.overdue_penalty_rate}%`,
    },
    {
      key: "status",
      label: t("status"),
      render: (s: Supplier) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            s.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {s.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("actions"),
      render: (s: Supplier) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStatus(s)}
            className="rounded p-1 text-black hover:bg-gray-100"
            title={s.status === "active" ? t("deactivate") : t("activate")}
          >
            {s.status === "active" ? <Ban size={16} /> : <CheckCircle size={16} />}
          </button>
          <a
            href={`/${locale}/suppliers/ledger?supplier_id=${s.id}`}
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
          {t("add_supplier")}
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
              <label className="mb-1 block text-xs font-medium text-black">{t("contact_person")}</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={t("contact_person")}
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
              <label className="mb-1 block text-xs font-medium text-black">Credit Period (days)</label>
              <input
                type="number"
                min={0}
                value={form.credit_period}
                onChange={(e) => setForm({ ...form, credit_period: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">Overdue Penalty Rate (%)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.overdue_penalty_rate}
                onChange={(e) => setForm({ ...form, overdue_penalty_rate: Number(e.target.value) || 0 })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">{t("email")}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={t("email")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">{t("address")}</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder={t("address")}
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
        data={suppliers}
        loading={loading}
        searchable
        searchKeys={["name"]}
      />
    </div>
  )
}
