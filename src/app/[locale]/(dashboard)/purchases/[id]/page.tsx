"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface PurchaseItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  received_qty: number
  unit_price: number
  total_price: number
}

interface PurchaseOrder {
  id: string
  po_no: string
  supplier_id: string
  supplier_name: string
  subtotal: number
  discount: number
  grand_total: number
  status: "pending" | "partial" | "completed" | "cancelled"
  expected_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
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

function generateGRNNo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
  return `GRN-${y}${m}${d}-${rand}`
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const t = useTranslations()
  const router = useRouter()
  const [locale, setLocale] = useState("en")
  const [id, setId] = useState("")
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [receiving, setReceiving] = useState(false)
  const [receivingQtys, setReceivingQtys] = useState<Record<string, number>>({})
  const [editMode, setEditMode] = useState(false)
  const [editingQtys, setEditingQtys] = useState<Record<string, number>>({})
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({})

  useEffect(() => {
    params.then((p) => {
      setLocale(p.locale)
      setId(p.id)
    })
  }, [params])

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: poData } = await (supabase.from("purchase_orders") as any)
        .select("*")
        .eq("id", id)
        .single()

      if (poData) setPo(poData as PurchaseOrder)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: itemsData } = await (supabase.from("purchase_items") as any)
        .select("*")
        .eq("po_id", id)
        .order("product_name")

      if (itemsData) {
        setItems(itemsData as PurchaseItem[])
        const initial: Record<string, number> = {}
        for (const item of itemsData) {
          initial[item.id] = item.quantity - item.received_qty
        }
        setReceivingQtys(initial)
      }

      setLoading(false)
    }
    fetchData()
  }, [id])

  const canReceive = po && (po.status === "pending" || po.status === "partial")

  const handleSaveReceipt = async () => {
    if (!po || !canReceive) return
    setReceiving(true)
    const supabase = createClient()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setReceiving(false); return }

    const activeItems = items.filter((item) => (receivingQtys[item.id] ?? 0) > 0)
    if (activeItems.length === 0) { setReceiving(false); return }

    const grnNo = generateGRNNo()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: grnRecord, error: grnError } = await (supabase.from("goods_received_notes") as any).insert({
      grn_no: grnNo,
      po_id: po.id,
      supplier_id: po.supplier_id,
      user_id: userData.user.id,
      notes: `Stock received for ${po.po_no}`,
    }).select("id").single()
    if (grnError) { setReceiving(false); return }
    const grnId = (grnRecord as { id: string }).id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movementClient = supabase.from("stock_movements") as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productClient = supabase.from("products") as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemClient = supabase.from("purchase_items") as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poClient = supabase.from("purchase_orders") as any

    for (const item of activeItems) {
      const qty = receivingQtys[item.id] ?? 0
      if (qty <= 0) continue

      await movementClient.insert({
        product_id: item.product_id,
        type: "in",
        quantity: qty,
        unit_price: item.unit_price,
        reference_type: "goods_received_note",
        reference_id: grnId,
        notes: `${po.po_no}`,
        user_id: userData.user.id,
      })

      await supabase.rpc("increment_product_stock", {
        p_product_id: item.product_id,
        p_qty: qty,
      })

      await itemClient
        .update({ received_qty: item.received_qty + qty })
        .eq("id", item.id)
    }

    const allReceived = items.every((item) => {
      const qty = receivingQtys[item.id] ?? 0
      return item.received_qty + qty >= item.quantity
    })

    await poClient.update({ status: allReceived ? "completed" : "partial" }).eq("id", po.id)

    const { data: refreshed } = await poClient.select("*").eq("id", id).single()
    if (refreshed) setPo(refreshed as PurchaseOrder)

    const { data: refreshedItems } = await itemClient.select("*").eq("po_id", id)
    if (refreshedItems) {
      setItems(refreshedItems as PurchaseItem[])
      const initial: Record<string, number> = {}
      for (const item of refreshedItems) {
        initial[item.id] = item.quantity - item.received_qty
      }
      setReceivingQtys(initial)
    }

    setReceiving(false)
  }

  const handleEditSave = async () => {
    if (!po || po.status !== "pending") return
    setReceiving(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemClient = supabase.from("purchase_items") as any

    for (const item of items) {
      const qty = editingQtys[item.id]
      const price = editingPrices[item.id]
      if (qty !== undefined || price !== undefined) {
        await itemClient
          .update({
            ...(qty !== undefined ? { quantity: qty, total_price: qty * (price ?? item.unit_price) } : {}),
            ...(price !== undefined ? { unit_price: price, total_price: price * (qty ?? item.quantity) } : {}),
          })
          .eq("id", item.id)
      }
    }

    const { data: refreshedItems } = await itemClient.select("*").eq("po_id", id).order("product_name")
    if (refreshedItems) {
      setItems(refreshedItems as PurchaseItem[])
      const newSubtotal = (refreshedItems as PurchaseItem[]).reduce((s, i) => s + i.total_price, 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("purchase_orders") as any)
        .update({ subtotal: newSubtotal, grand_total: newSubtotal })
        .eq("id", po.id)
      const { data: refreshedPo } = await (supabase.from("purchase_orders") as any)
        .select("*").eq("id", id).single()
      if (refreshedPo) setPo(refreshedPo as PurchaseOrder)
    }

    setEditMode(false)
    setEditingQtys({})
    setEditingPrices({})
    setReceiving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-700" size={32} />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="py-20 text-center text-sm text-gray-700">
        {t("common.no_results")}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border p-2 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{po.po_no}</h1>
            <p className="text-sm text-gray-700">
              {formatDate(po.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-block rounded-full px-3 py-1 text-xs font-medium",
              statusStyles[po.status],
            )}
          >
            {t(`purchases.${statusKeys[po.status]}`)}
          </span>
          {canReceive && (
            <button
              onClick={handleSaveReceipt}
              disabled={receiving || Object.values(receivingQtys).every((q) => q <= 0)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {receiving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Package size={16} />
              )}
              Save Receipt
            </button>
          )}
          {po.status === "pending" && (
            <button
              onClick={() => {
                if (editMode) {
                  handleEditSave()
                } else {
                  const qtyInit: Record<string, number> = {}
                  const priceInit: Record<string, number> = {}
                  for (const item of items) {
                    qtyInit[item.id] = item.quantity
                    priceInit[item.id] = item.unit_price
                  }
                  setEditingQtys(qtyInit)
                  setEditingPrices(priceInit)
                  setEditMode(true)
                }
              }}
              disabled={receiving}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {editMode ? "Save Changes" : "Edit"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">
            {t("purchases.supplier")}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">{po.supplier_name}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">
            {t("purchases.expected_date")}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {po.expected_date
              ? formatDate(po.expected_date)
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">
            {t("common.grand_total")}
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {formatCurrency(po.grand_total, locale)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                {t("inventory.product_name")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                Ordered
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                Received
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                {editMode ? "New Qty" : canReceive ? "Receiving" : ""}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                {t("inventory.cost_price")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                {t("sales.amount")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const remaining = item.quantity - item.received_qty
              const isFullReceive = item.received_qty >= item.quantity
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {editMode ? (
                      <input
                        type="number"
                        min={1}
                        value={editingQtys[item.id] ?? item.quantity}
                        onChange={(e) => setEditingQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.received_qty}{isFullReceive ? " ✓" : ""}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingPrices[item.id] ?? item.unit_price}
                        onChange={(e) => setEditingPrices((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                      />
                    ) : canReceive && !isFullReceive ? (
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        value={receivingQtys[item.id] ?? 0}
                        onChange={(e) => setReceivingQtys((prev) => ({ ...prev, [item.id]: Math.min(Number(e.target.value), remaining) }))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                      />
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatCurrency(editMode ? (editingPrices[item.id] ?? item.unit_price) : item.unit_price, locale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatCurrency(
                      editMode
                        ? (editingQtys[item.id] ?? item.quantity) * (editingPrices[item.id] ?? item.unit_price)
                        : item.total_price,
                      locale,
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            {(() => {
              const computedSubtotal = editMode
                ? items.reduce((sum, item) => sum + (editingQtys[item.id] ?? item.quantity) * (editingPrices[item.id] ?? item.unit_price), 0)
                : po.subtotal
              return (
                <>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      {t("common.subtotal")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(computedSubtotal, locale)}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      {t("common.grand_total")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(computedSubtotal, locale)}
                    </td>
                    <td />
                  </tr>
                </>
              )
            })()}
          </tfoot>
        </table>
      </div>

      {po.notes && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">
            {t("common.notes")}
          </p>
          <p className="mt-1 text-sm text-gray-700">{po.notes}</p>
        </div>
      )}
    </div>
  )
}
