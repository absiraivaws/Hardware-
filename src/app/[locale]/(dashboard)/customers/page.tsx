"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Plus, Eye, Ban, CheckCircle, AlertTriangle, Pencil, X } from "lucide-react"
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
  nic: string | null
  whatsapp: string | null
  handphone: string | null
  date_of_birth: string | null
  credit_limit: number
  credit_balance: number
  loyalty_points: number
  status: "active" | "blocked"
  created_at: string
  updated_at: string
}

interface CustomerWithSales extends Customer {
  total_sale: number
  total_paid: number
  total_outstanding: number
}

interface StatusConfirm {
  customer: Customer
  newStatus: "active" | "blocked"
}

export default function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("customers")
  const [customers, setCustomers] = useState<CustomerWithSales[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", nic: "", whatsapp: "", handphone: "", date_of_birth: "", credit_limit: 0 })
  const [statusConfirm, setStatusConfirm] = useState<StatusConfirm | null>(null)
  const [editCustomer, setEditCustomer] = useState<CustomerWithSales | null>(null)
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", address: "", nic: "", whatsapp: "", handphone: "", date_of_birth: "", credit_limit: 0, status: "active" as "active" | "blocked" })

  const fetchCustomers = async () => {
    const supabase = createClient()
    const [custRes, salesRes] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("sales").select("customer_id, grand_total, amount_paid, balance_due"),
    ])

    if (custRes.data) {
      const salesByCustomer: Record<string, { total_sale: number; total_paid: number; total_outstanding: number }> = {}
      for (const s of (salesRes.data ?? []) as { customer_id: string; grand_total: number; amount_paid: number; balance_due: number }[]) {
        if (!salesByCustomer[s.customer_id]) {
          salesByCustomer[s.customer_id] = { total_sale: 0, total_paid: 0, total_outstanding: 0 }
        }
        salesByCustomer[s.customer_id].total_sale += s.grand_total
        salesByCustomer[s.customer_id].total_paid += s.amount_paid
        salesByCustomer[s.customer_id].total_outstanding += s.balance_due
      }

      const enriched: CustomerWithSales[] = (custRes.data as Customer[]).map((c) => {
        const s = salesByCustomer[c.id] || { total_sale: 0, total_paid: 0, total_outstanding: 0 }
        return { ...c, ...s }
      })

      setCustomers(enriched)
      setCache("customers:all", enriched)
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
    await supabase.from("customers").insert([{
      ...form,
      code,
      credit_limit: Number(form.credit_limit),
      whatsapp: form.whatsapp || form.handphone || null,
      handphone: form.handphone || form.phone || null,
      date_of_birth: form.date_of_birth || null,
    }])
    setShowForm(false)
    setForm({ name: "", phone: "", email: "", address: "", nic: "", whatsapp: "", handphone: "", date_of_birth: "", credit_limit: 0 })
    fetchCustomers()
  }

  const confirmStatusChange = (customer: Customer) => {
    const newStatus: "active" | "blocked" = customer.status === "active" ? "blocked" : "active"
    setStatusConfirm({ customer, newStatus })
  }

  const executeStatusChange = async () => {
    if (!statusConfirm) return
    const supabase = createClient()
    await supabase.from("customers").update({ status: statusConfirm.newStatus }).eq("id", statusConfirm.customer.id)
    const newStatus = statusConfirm.newStatus
    setStatusConfirm(null)
    setEditForm((prev) => ({ ...prev, status: newStatus }))
    fetchCustomers()
  }

  const openEdit = (c: CustomerWithSales) => {
    setEditCustomer(c)
    setEditForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      nic: c.nic || "",
      whatsapp: c.whatsapp || "",
      handphone: c.handphone || "",
      date_of_birth: c.date_of_birth || "",
      credit_limit: c.credit_limit,
      status: c.status,
    })
  }

  const handleEditSave = async () => {
    if (!editCustomer || !editForm.name) return
    const supabase = createClient()
    await supabase.from("customers").update({
      name: editForm.name.trim(),
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      address: editForm.address.trim() || null,
      nic: editForm.nic.trim() || null,
      whatsapp: editForm.whatsapp.trim() || editForm.handphone.trim() || null,
      handphone: editForm.handphone.trim() || editForm.phone.trim() || null,
      credit_limit: Number(editForm.credit_limit),
      status: editForm.status,
      date_of_birth: editForm.date_of_birth || null,
    }).eq("id", editCustomer.id)
    setEditCustomer(null)
    fetchCustomers()
  }

  const columns = [
    {
      key: "code",
      label: "Code",
      render: (c: CustomerWithSales) => <span className="font-mono text-xs text-gray-500">{c.code}</span>,
    },
    {
      key: "name",
      label: t("name"),
      render: (c: CustomerWithSales) => c.name,
    },
    {
      key: "phone",
      label: t("phone"),
      render: (c: CustomerWithSales) => c.phone ?? "—",
    },
    {
      key: "credit_limit",
      label: t("credit_limit"),
      render: (c: CustomerWithSales) => formatCurrency(Number(c.credit_limit), locale),
    },
    {
      key: "total_sale",
      label: "Total Sale",
      render: (c: CustomerWithSales) => formatCurrency(c.total_sale, locale),
    },
    {
      key: "total_paid",
      label: "Paid",
      render: (c: CustomerWithSales) => formatCurrency(c.total_paid, locale),
    },
    {
      key: "total_outstanding",
      label: "Total Outstanding",
      render: (c: CustomerWithSales) => (
        <span className={c.total_outstanding > 0 ? "text-red-600 font-medium" : ""}>
          {formatCurrency(c.total_outstanding, locale)}
        </span>
      ),
    },
    {
      key: "status",
      label: t("status"),
      render: (c: CustomerWithSales) => {
        const isInactive = c.total_outstanding > c.credit_limit
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              isInactive
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isInactive ? "Inactive" : "Active"}
          </span>
        )
      },
    },
    {
      key: "actions",
      label: t("actions"),
      render: (c: CustomerWithSales) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => confirmStatusChange(c)}
            className="rounded p-1 text-black hover:bg-gray-100"
            title={c.status === "active" ? t("block") : t("unblock")}
          >
            {c.status === "active" ? <Ban size={16} /> : <CheckCircle size={16} />}
          </button>
          <button
            onClick={() => openEdit(c)}
            className="rounded p-1 text-black hover:bg-gray-100"
            title="Edit"
          >
            <Pencil size={16} />
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
          <details className="group mt-3">
            <summary className="cursor-pointer text-sm font-medium text-emerald-600 hover:text-emerald-700">
              More Details
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-black">NIC Number</label>
                <input
                  type="text"
                  value={form.nic}
                  onChange={(e) => setForm({ ...form, nic: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Email</label>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Handphone</label>
                <input
                  type="text"
                  value={form.handphone}
                  onChange={(e) => {
                    setForm({ ...form, handphone: e.target.value })
                    if (!form.whatsapp) {
                      setForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">WhatsApp Number</label>
                <input
                  type="text"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </details>
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

      {/* ===== Status Change Confirmation Modal ===== */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black">Confirm Status Change</h3>
                <p className="text-sm text-black">
                  Are you sure you want to {statusConfirm.newStatus === "blocked" ? "block" : "unblock"}{" "}
                  <strong>{statusConfirm.customer.name}</strong>?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={executeStatusChange}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  statusConfirm.newStatus === "blocked" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {statusConfirm.newStatus === "blocked" ? "Block" : "Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Customer Modal ===== */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">Edit Customer — {editCustomer.name}</h3>
              <button
                onClick={() => setEditCustomer(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Credit Limit</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.credit_limit}
                  onChange={(e) => setEditForm({ ...editForm, credit_limit: Number(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">NIC Number</label>
                <input
                  type="text"
                  value={editForm.nic}
                  onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Date of Birth</label>
                <input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Handphone</label>
                <input
                  type="text"
                  value={editForm.handphone}
                  onChange={(e) => {
                    setEditForm({ ...editForm, handphone: e.target.value })
                    if (!editForm.whatsapp) {
                      setEditForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Email</label>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">WhatsApp Number</label>
                <input
                  type="text"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="col-span-2 flex items-center gap-4 border-t pt-4">
                <label className="text-sm font-medium text-black">Status</label>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    editForm.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {editForm.status === "active" ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => {
                    const newStatus = editForm.status === "active" ? "blocked" : "active"
                    setStatusConfirm({
                      customer: editCustomer,
                      newStatus,
                    })
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-black hover:bg-gray-50"
                >
                  Change Status
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditCustomer(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
