"use client"

import { useTranslations } from "next-intl"
import { use, useEffect, useState } from "react"
import { Plus, ArrowRightLeft, Loader2, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { formatDate } from "@/lib/format"
import { getCached, setCache, invalidateCache } from "@/lib/query-cache"

interface Transfer {
  id: string
  transfer_no: string
  from_branch_id: string
  to_branch_id: string
  status: "pending" | "completed" | "cancelled"
  notes: string | null
  created_by: string
  completed_at: string | null
  created_at: string
  from_branch: { name: string } | null
  to_branch: { name: string } | null
}

interface Product {
  id: string
  name: string
  code: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-black",
  completed: "bg-green-100 text-black",
  cancelled: "bg-gray-100 text-black",
}

export default function StockTransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ from_branch_id: "", to_branch_id: "", notes: "" })
  const [transferItems, setTransferItems] = useState<{ product_id: string; product_name: string; quantity: number }[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const cached = getCached<{ transfers: Transfer[]; branches: { id: string; name: string }[]; products: Product[] }>("stock_transfers:all")
    if (cached) {
      setTransfers(cached.transfers)
      setBranches(cached.branches)
      setProducts(cached.products)
      setLoading(false)
      return
    }
    Promise.all([
      supabase.from("stock_transfers").select("*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name)").order("created_at", { ascending: false }),
      supabase.from("branches").select("id, name").eq("status", "active").order("name"),
      supabase.from("products").select("id, name, code").eq("status", "active").order("name"),
    ]).then(([transfersRes, branchesRes, productsRes]) => {
      if (transfersRes.data) setTransfers(transfersRes.data as unknown as Transfer[])
      if (branchesRes.data) setBranches(branchesRes.data)
      if (productsRes.data) setProducts(productsRes.data as Product[])
      setCache("stock_transfers:all", { transfers: transfersRes.data as unknown as Transfer[], branches: branchesRes.data, products: productsRes.data as Product[] })
      setLoading(false)
    })
  }, [])

  const columns = [
    {
      key: "transfer_no",
      label: "Transfer No",
      render: (item: Transfer) => <span className="font-medium">{item.transfer_no}</span>,
    },
    {
      key: "from_branch",
      label: "From Branch",
      render: (item: Transfer) => item.from_branch?.name || "—",
    },
    {
      key: "to_branch",
      label: "To Branch",
      render: (item: Transfer) => item.to_branch?.name || "—",
    },
    {
      key: "status",
      label: t("common.status"),
      render: (item: Transfer) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
          {item.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: "created_at",
      label: t("common.date"),
      render: (item: Transfer) => formatDate(item.created_at, locale),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (item: Transfer) =>
        item.status === "pending" ? (
          <div className="flex gap-1">
            <button
              onClick={async () => {
                const supabase = createClient()
                const { data: userData } = await supabase.auth.getUser()
                if (!userData.user) return
                const { data: items } = await supabase.from("stock_transfer_items").select("product_id, quantity").eq("transfer_id", item.id)
                if (!items) return
                const productIds = items.map((si) => si.product_id)
                // Batch fetch source branch stocks
                const { data: srcStocks } = await supabase.from("branch_stock").select("product_id, current_stock").in("product_id", productIds).eq("branch_id", item.from_branch_id)
                // Batch fetch destination branch stocks
                const { data: dstStocks } = await supabase.from("branch_stock").select("product_id, current_stock").in("product_id", productIds).eq("branch_id", item.to_branch_id)
                const queryPromises: Promise<unknown>[] = []
                for (const si of items) {
                  const srcBs = srcStocks?.find((s) => s.product_id === si.product_id)
                  if (srcBs) {
                    queryPromises.push(supabase.from("branch_stock").update({ current_stock: Number(srcBs.current_stock) - si.quantity }).eq("product_id", si.product_id).eq("branch_id", item.from_branch_id) as unknown as Promise<unknown>)
                  }
                  const dstBs = dstStocks?.find((s) => s.product_id === si.product_id)
                  queryPromises.push(supabase.from("branch_stock").upsert({
                    product_id: si.product_id,
                    branch_id: item.to_branch_id,
                    current_stock: (dstBs ? Number(dstBs.current_stock) : 0) + si.quantity,
                  }, { onConflict: "product_id,branch_id" }) as unknown as Promise<unknown>)
                }
                queryPromises.push(supabase.from("stock_transfers").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", item.id) as unknown as Promise<unknown>)
                await Promise.all(queryPromises)
                invalidateCache("stock_transfers")
                const { data: refreshed } = await supabase.from("stock_transfers").select("*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name)").order("created_at", { ascending: false })
                if (refreshed) setTransfers(refreshed as unknown as Transfer[])
              }}
              className="rounded bg-emerald-100 p-1.5 text-black hover:bg-emerald-200"
              title="Complete"
            >
              <Check size={16} />
            </button>
            <button
              onClick={async () => {
                const supabase = createClient()
                await supabase.from("stock_transfers").update({ status: "cancelled" }).eq("id", item.id)
                invalidateCache("stock_transfers")
                const { data: refreshed } = await supabase.from("stock_transfers").select("*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name)").order("created_at", { ascending: false })
                if (refreshed) setTransfers(refreshed as unknown as Transfer[])
              }}
              className="rounded bg-red-100 p-1.5 text-black hover:bg-red-200"
              title="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        ) : null,
    },
  ]

  const addItem = () => {
    setTransferItems([...transferItems, { product_id: "", product_name: "", quantity: 1 }])
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...transferItems]
    if (field === "product_id") {
      const prod = products.find((p) => p.id === value)
      updated[index] = { ...updated[index], product_id: value as string, product_name: prod?.name || "" }
    } else if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: Number(value) || 1 }
    }
    setTransferItems(updated)
  }

  const removeItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!form.from_branch_id || !form.to_branch_id || transferItems.length === 0) return
    if (form.from_branch_id === form.to_branch_id) return
    setSubmitting(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setSubmitting(false); return }
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
    const transferNo = `TRF-${y}${m}${d}-${rand}`
    const { data: transfer, error } = await supabase.from("stock_transfers").insert({
      transfer_no: transferNo,
      from_branch_id: form.from_branch_id,
      to_branch_id: form.to_branch_id,
      notes: form.notes || null,
      created_by: userData.user.id,
    }).select("id").single()
    if (error || !transfer) { setSubmitting(false); return }
    await supabase.from("stock_transfer_items").insert(
      transferItems.map((item) => ({
        transfer_id: transfer.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
      }))
    )
    setShowForm(false)
    setForm({ from_branch_id: "", to_branch_id: "", notes: "" })
    setTransferItems([])
    setSubmitting(false)
    invalidateCache("stock_transfers")
    const { data: refreshed } = await supabase.from("stock_transfers").select("*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name)").order("created_at", { ascending: false })
    if (refreshed) setTransfers(refreshed as unknown as Transfer[])
  }

  return (
    <div>
      <PageHeader titleKey="Stock Transfers">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          New Transfer
        </button>
      </PageHeader>

      {showForm && (
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-black">From Branch</label>
              <select
                value={form.from_branch_id}
                onChange={(e) => setForm({ ...form, from_branch_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select branch</option>
                {branches.filter((b) => b.id !== form.to_branch_id).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black">To Branch</label>
              <select
                value={form.to_branch_id}
                onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select branch</option>
                {branches.filter((b) => b.id !== form.from_branch_id).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-black">Items</label>
            {transferItems.map((item, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <select
                  value={item.product_id}
                  onChange={(e) => updateItem(i, "product_id", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", e.target.value)}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:border-emerald-500 focus:outline-none"
                />
                <button onClick={() => removeItem(i)} className="rounded p-1.5 text-black hover:bg-red-50">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button onClick={addItem} className="text-sm text-black hover:text-black">+ Add Item</button>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-black">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="animate-spin" size={16} />}
              Create Transfer
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={transfers}
        loading={loading}
        searchable
        searchKeys={["transfer_no"]}
      />
    </div>
  )
}
