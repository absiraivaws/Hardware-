"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Loader2, DollarSign, X } from "lucide-react"
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
  amount_paid?: number
  balance_due?: number
  payment_type?: string | null
  payment_details?: Record<string, string> | null
  created_at: string
  updated_at: string
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-black",
}

const statusKeys: Record<string, string> = {
  pending: "status_pending",
  partial: "status_partial",
  completed: "status_completed",
  cancelled: "status_cancelled",
}

const paymentTypeLabels: Record<string, string> = {
  cash: "Cash",
  credit: "Credit",
  bank_transfer: "Bank Transfer",
  lanka_qr: "Lanka QR",
  card: "Card",
  mixed: "Mixed",
  cheque: "Cheque",
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
  const [error, setError] = useState<string | null>(null)
  const [editingQtys, setEditingQtys] = useState<Record<string, number>>({})
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({})
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentType, setPaymentType] = useState("cash")
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [chequeNumber, setChequeNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [fromAccount, setFromAccount] = useState("")
  const [toAccount, setToAccount] = useState("")

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
        .select("id, po_no, supplier_id, supplier_name, subtotal, discount, grand_total, status, expected_date, notes, amount_paid, balance_due, payment_type, payment_details, created_at, updated_at")
        .eq("id", id)
        .single()

      if (poData) setPo(poData as PurchaseOrder)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: itemsData } = await (supabase.from("purchase_items") as any)
        .select("id, product_id, product_name, quantity, received_qty, unit_price, total_price")
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
    setError(null)
    const supabase = createClient()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setError("Authentication required"); setReceiving(false); return }

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
    if (grnError) { setError("GRN creation failed: " + grnError.message); setReceiving(false); return }

    const grnId = (grnRecord as { id: string }).id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movementClient = supabase.from("stock_movements") as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemClient = supabase.from("purchase_items") as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poClient = supabase.from("purchase_orders") as any

    for (const item of activeItems) {
      const qty = receivingQtys[item.id] ?? 0
      if (qty <= 0) continue

      const { error: movErr } = await movementClient.insert({
        product_id: item.product_id,
        type: "in",
        quantity: qty,
        reference_type: "goods_received_note",
        reference_id: grnId,
        notes: `${po.po_no}`,
        user_id: userData.user.id,
      })
      if (movErr) { setError("Stock movement failed: " + movErr.message); setReceiving(false); return }

      const productClient = supabase.from("products") as any
      const { data: currentProduct } = await productClient.select("current_stock").eq("id", item.product_id).single()
      if (currentProduct) {
        const newStock = Number(currentProduct.current_stock) + qty
        const { error: updateErr } = await productClient.update({ current_stock: newStock }).eq("id", item.product_id)
        if (updateErr) { setError("Stock update failed: " + updateErr.message); setReceiving(false); return }
      } else {
        setError("Product not found for stock update"); setReceiving(false); return
      }

      const { error: updateErr } = await itemClient
        .update({ received_qty: item.received_qty + qty })
        .eq("id", item.id)
      if (updateErr) { setError("Purchase item update failed: " + updateErr.message); setReceiving(false); return }
    }

    const allReceived = items.every((item) => {
      const qty = receivingQtys[item.id] ?? 0
      return item.received_qty + qty >= item.quantity
    })

    // Update status
    const { error: statusErr } = await poClient.update({ status: allReceived ? "completed" : "partial" }).eq("id", po.id)
    if (statusErr) { setError("Status update failed: " + statusErr.message); setReceiving(false); return }

    // Create supplier ledger debit entry (liability)
    // Only create if this is the first receipt for this PO (balance_due is 0 or null)
    if (Number(po.balance_due ?? 0) === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ledgerClient = supabase.from("ledger_entries") as any
      const { data: lastEntry } = await ledgerClient
        .select("balance_after")
        .eq("ledger_type", "supplier")
        .eq("reference_id", po.supplier_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const prevBalance = (lastEntry as { balance_after: number } | null)?.balance_after ?? 0
      const poTotal = Number(po.grand_total)

      const { error: ledgerErr } = await ledgerClient.insert({
        ledger_type: "supplier",
        reference_id: po.supplier_id,
        reference_type: "purchase",
        entry_type: "debit",
        amount: poTotal,
        description: `PO ${po.po_no}`,
        balance_after: prevBalance + poTotal,
      })
      if (ledgerErr) { setError("Ledger entry failed: " + ledgerErr.message); setReceiving(false); return }

      // Also set balance_due on the PO
      await poClient.update({ balance_due: poTotal, amount_paid: 0 }).eq("id", po.id)
    }

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

  const handleRecordPayment = async () => {
    if (!po || paymentAmount <= 0 || paymentAmount > Number(po.balance_due ?? 0)) return
    setSubmittingPayment(true)
    setError(null)
    const supabase = createClient()

    const paymentDetails: Record<string, string> = {}
    if (paymentType === "cheque") {
      paymentDetails.cheque_number = chequeNumber
      paymentDetails.bank_code = bankCode
      paymentDetails.account_number = accountNumber
    } else if (paymentType === "bank_transfer") {
      paymentDetails.from_account = fromAccount
      paymentDetails.to_account = toAccount
    }

    const newAmountPaid = Number(po.amount_paid ?? 0) + paymentAmount
    const newBalanceDue = Math.max(0, Number(po.grand_total) - newAmountPaid)

    // Update purchase order
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const poClient = supabase.from("purchase_orders") as any
    const { error: updateErr } = await poClient.update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      payment_type: paymentType,
      payment_details: paymentDetails,
    }).eq("id", po.id)
    if (updateErr) { setError("PO update failed: " + updateErr.message); setSubmittingPayment(false); return }

    // Create supplier ledger credit entry (reduce liability)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ledgerClient = supabase.from("ledger_entries") as any
    const { data: lastSupplierEntry } = await ledgerClient
      .select("balance_after")
      .eq("ledger_type", "supplier")
      .eq("reference_id", po.supplier_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const prevSupplierBalance = (lastSupplierEntry as { balance_after: number } | null)?.balance_after ?? 0
    const { error: supplierLedgerErr } = await ledgerClient.insert({
      ledger_type: "supplier",
      reference_id: po.supplier_id,
      reference_type: "payment",
      entry_type: "credit",
      amount: paymentAmount,
      description: `Payment for ${po.po_no}`,
      balance_after: prevSupplierBalance - paymentAmount,
    })
    if (supplierLedgerErr) { setError("Supplier ledger failed: " + supplierLedgerErr.message); setSubmittingPayment(false); return }

    // Create cash/bank ledger credit entry (money going out)
    const financialType = paymentType === "cash" ? "cash" : "bank"
    const { data: lastFinEntry } = await ledgerClient
      .select("balance_after")
      .eq("ledger_type", financialType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const prevFinBalance = (lastFinEntry as { balance_after: number } | null)?.balance_after ?? 0
    const { error: finLedgerErr } = await ledgerClient.insert({
      ledger_type: financialType,
      reference_id: po.id,
      reference_type: "payment",
      entry_type: "credit",
      amount: paymentAmount,
      description: `Payment for ${po.po_no}`,
      balance_after: prevFinBalance - paymentAmount,
    })
    if (finLedgerErr) { setError("Financial ledger failed: " + finLedgerErr.message); setSubmittingPayment(false); return }

    // Refresh PO
    const { data: refreshed } = await poClient.select("*").eq("id", id).single()
    if (refreshed) setPo(refreshed as PurchaseOrder)

    // Reset form
    setShowPayment(false)
    setPaymentAmount(0)
    setPaymentType("cash")
    setChequeNumber("")
    setBankCode("")
    setAccountNumber("")
    setFromAccount("")
    setToAccount("")
    setSubmittingPayment(false)
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-7 w-48 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-50" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="py-20 text-center text-sm text-black">
        {t("common.no_results")}
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg border p-2 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black">{po.po_no}</h1>
            <p className="text-sm text-black">
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
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50"
            >
              {editMode ? "Save Changes" : "Edit"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">
            {t("purchases.supplier")}
          </p>
          <p className="mt-1 text-sm font-medium text-black">{po.supplier_name}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">
            {t("purchases.expected_date")}
          </p>
          <p className="mt-1 text-sm font-medium text-black">
            {po.expected_date
              ? formatDate(po.expected_date)
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">
            {t("common.grand_total")}
          </p>
          <p className="mt-1 text-sm font-medium text-black">
            {formatCurrency(po.grand_total, locale)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">
            {t("sales.amount_paid")}
          </p>
          <p className="mt-1 text-sm font-medium text-black">
            {formatCurrency(Number(po.amount_paid ?? 0), locale)}
          </p>
        </div>
      </div>

      {Number(po.balance_due ?? 0) > 0 && po.status !== "cancelled" && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-800">
              {t("sales.balance_due")}
            </p>
            <p className="mt-1 text-lg font-bold text-amber-900">
              {formatCurrency(po.balance_due ?? 0, locale)}
            </p>
          </div>
          {po.payment_type != null && (
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-black">
                Payment Type
              </p>
              <p className="mt-1 text-sm font-medium text-black">
                {paymentTypeLabels[po.payment_type] ?? po.payment_type}
              </p>
            </div>
          )}
          {po.payment_details && Object.keys(po.payment_details ?? {}).length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-black">
                Payment Details
              </p>
              <div className="mt-1 space-y-0.5">
                {Object.entries(po.payment_details).map(([key, val]) => (
                  <p key={key} className="text-sm text-black">
                    <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span> {val}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={() => { setPaymentAmount(Number(po.balance_due ?? 0)); setShowPayment(true) }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <DollarSign size={16} />
              Pay {formatCurrency(po.balance_due ?? 0, locale)}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                {t("inventory.product_name")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                Ordered
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                Received
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                {editMode ? "New Qty" : canReceive ? "Receiving" : ""}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                {t("inventory.cost_price")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
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
                  <td className="px-4 py-3 text-sm text-black">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-black">
                    {editMode ? (
                      <input
                        type="number"
                        min={1}
                        value={editingQtys[item.id] ?? item.quantity}
                        onChange={(e) => setEditingQtys((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-black"
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-black">
                    {item.received_qty}{isFullReceive ? " ✓" : ""}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editMode ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editingPrices[item.id] ?? item.unit_price}
                        onChange={(e) => setEditingPrices((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-black"
                      />
                    ) : canReceive && !isFullReceive ? (
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        value={receivingQtys[item.id] ?? 0}
                        onChange={(e) => setReceivingQtys((prev) => ({ ...prev, [item.id]: Math.min(Number(e.target.value), remaining) }))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-black"
                      />
                    ) : (
                      <span className="text-black">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-black">
                    {formatCurrency(editMode ? (editingPrices[item.id] ?? item.unit_price) : item.unit_price, locale)}
                  </td>
                  <td className="px-4 py-3 text-sm text-black">
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
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-black">
                      {t("common.subtotal")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-black">
                      {formatCurrency(computedSubtotal, locale)}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-black">
                      {t("common.grand_total")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-black">
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
          <p className="text-xs font-medium uppercase tracking-wider text-black">
            {t("common.notes")}
          </p>
          <p className="mt-1 text-sm text-black">{po.notes}</p>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{t("sales.record_payment")}</h2>
              <button onClick={() => setShowPayment(false)} className="rounded-lg p-1 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-black">{t("sales.balance_due")}: <span className="font-semibold">{formatCurrency(po.balance_due ?? 0, locale)}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  {t("sales.amount_paid")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={po.balance_due}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Math.min(Number(e.target.value), Number(po.balance_due ?? 0)))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  {t("sales.payment_type")}
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="cash">{t("sales.cash")}</option>
                  <option value="credit">{t("sales.credit")}</option>
                  <option value="bank_transfer">{t("sales.bank_transfer")}</option>
                  <option value="cheque">{t("sales.cheque")}</option>
                  <option value="lanka_qr">{t("sales.lanka_qr")}</option>
                  <option value="card">{t("sales.card")}</option>
                  <option value="mixed">{t("sales.mixed")}</option>
                </select>
              </div>

              {paymentType === "cheque" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Cheque Number</label>
                    <input
                      type="text"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Bank Code</label>
                    <input
                      type="text"
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              {paymentType === "bank_transfer" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">From Account</label>
                    <input
                      type="text"
                      value={fromAccount}
                      onChange={(e) => setFromAccount(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">To Account</label>
                    <input
                      type="text"
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleRecordPayment}
                disabled={submittingPayment || paymentAmount <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submittingPayment ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <DollarSign size={16} />
                )}
                {t("sales.confirm_payment")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
