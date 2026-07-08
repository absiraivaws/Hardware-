"use client"

import { use, useEffect, useState, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { X, Search, User, ArrowUpDown, ArrowUp, ArrowDown, Eye, Plus, Pencil, Trash2 } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"
import { useData } from "@/providers/data-provider"

interface Rental {
  id: string
  rental_no: string
  customer_id: string | null
  customer_name: string
  rental_type: "tool" | "cement_bag"
  status: "active" | "returned" | "overdue" | "cancelled"
  start_date: string
  start_datetime: string | null
  expected_return_date: string
  actual_return_date: string | null
  deposit_amount: number
  total_fee: number
  late_fee: number
  payment_type: string
  paid_amount: number
  remaining_balance: number
  notes: string
  rent_calculation: string
  return_labour_charge: number
  return_other_charges: number
  return_damage_cost: number
  return_tax_type: string
  created_at: string
  customers?: { code: string; name: string } | null
  product_codes?: string
  product_names?: string
}

interface RentalItem {
  id: string
  rental_id: string
  product_id: string | null
  product_name: string
  product_code?: string
  quantity: number
  rate: number
  deposit: number
  returned_quantity: number
  damage_notes: string
}

interface RentalPayment {
  id: string
  rental_id: string
  amount: number
  payment_type: string
  payment_date: string
  notes: string
  created_at: string
}

interface Product {
  id: string
  code: string
  name: string
  serial_no: string
  current_stock: number
  selling_price: number
  cost_price: number
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-black",
  returned: "bg-emerald-100 text-black",
  overdue: "bg-red-100 text-black",
  cancelled: "bg-gray-100 text-black",
}

const PAYMENT_TYPES = ["cash", "lanka_qr", "credit", "bank_transfer", "cheque", "card", "mixed"] as const

function formatDuration(start: string, end: string | null, _calc: string): string {
  const now = new Date().toISOString()
  const hasTime = start.includes("T")
  const endDate = end
    ? end
    : (hasTime ? now : now.slice(0, 10))
  const ms = new Date(endDate).getTime() - new Date(start).getTime()
  const totalMinutes = Math.max(1, Math.floor(ms / (1000 * 60)))
  const d = Math.floor(totalMinutes / (24 * 60))
  const h = Math.floor((totalMinutes % (24 * 60)) / 60)
  const m = totalMinutes % 60
  return `${d}:${h}:${m}`
}

function formatDurationValue(start: string, end: string | null, calc: string): number {
  const now = new Date().toISOString()
  const hasTime = start.includes("T")
  const endDate = end
    ? end
    : (hasTime ? now : now.slice(0, 10))
  return new Date(endDate).getTime() - new Date(start).getTime()
}

type SortKey = "date" | "rental_no" | "product_id" | "product_name" | "customer_name" | "customer_id" | "duration" | "total_fee" | "paid_amount" | "status"

export default function RentalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const { companySettings } = useData()

  const [rentals, setRentals] = useState<Rental[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null)
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([])
  const [rentalPayments, setRentalPayments] = useState<RentalPayment[]>([])
  const [loadingRentals, setLoadingRentals] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("duration")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnItems, setReturnItems] = useState<RentalItem[]>([])
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnLabourCharge, setReturnLabourCharge] = useState("")
  const [returnOtherCharges, setReturnOtherCharges] = useState("")
  const [returnTaxType, setReturnTaxType] = useState<"non_vat" | "svat">("non_vat")

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentPayType, setPaymentPayType] = useState<string>("cash")
  const [paymentNote, setPaymentNote] = useState("")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  const rentCalc = companySettings?.rent_calculation || "days"

  useEffect(() => {
    fetchRentals()
  }, [])

  async function fetchRentals() {
    setLoadingRentals(true)
    const [rentalsRes, itemsRes, prodRes] = await Promise.all([
      supabase.from("rentals").select("*, customers(code, name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("rental_items").select("rental_id, product_id, product_name"),
      supabase.from("products").select("id, code, name, serial_no, current_stock, selling_price, cost_price").like("code", "REN%").eq("status", "active").order("name"),
    ])
    if (prodRes.data) setProducts(prodRes.data as Product[])
    if (rentalsRes.data) {
      const renRentals = (rentalsRes.data as Rental[]).filter((r) => r.rental_no?.startsWith("REN-"))
      const itemsByRental: Record<string, { name: string; code: string }[]> = {}
      if (itemsRes.data && prodRes.data) {
        const prodMap = new Map((prodRes.data as Product[]).map((p) => [p.id, p.code]))
        for (const item of itemsRes.data as { rental_id: string; product_name: string; product_id: string }[]) {
          if (!itemsByRental[item.rental_id]) itemsByRental[item.rental_id] = []
          itemsByRental[item.rental_id].push({ name: item.product_name, code: prodMap.get(item.product_id) || "" })
        }
      }
      const rentalsWithCodes = renRentals.map((r) => {
        const items = itemsByRental[r.id] || []
        const codes = items.map((i) => i.code).filter(Boolean).slice(0, 2).join(", ")
        const names = items.map((i) => i.name).slice(0, 2).join(", ")
        return {
          ...r,
          product_codes: codes + (items.length > 2 ? "..." : ""),
          product_names: names + (items.length > 2 ? "..." : ""),
        }
      })
      setRentals(rentalsWithCodes)
    }
    setLoadingRentals(false)
  }

  const processedRentals = useMemo(() => {
    const nowMs = Date.now()
    const withDuration = rentals.map((r) => {
      const now = new Date(nowMs).toISOString()
      const startSource = r.start_datetime || r.created_at
      const hasTime = startSource.includes("T")
      const end = r.actual_return_date || (hasTime ? now : now.slice(0, 10))
      const dt = new Date(startSource)
      const datePart = formatDate(startSource)
      const timePart = dt.toLocaleString(locale === "si" ? "en-US" : locale, { hour: "2-digit", minute: "2-digit" })
      const calc = r.rent_calculation || rentCalc
      const liveTotal = r.status === "active" && calc === "hours"
        ? r.total_fee * Math.max(1, Math.ceil((nowMs - new Date(startSource).getTime()) / (1000 * 60 * 60)))
        : r.total_fee
      return {
        ...r,
        _durationVal: formatDurationValue(startSource, end, calc),
        _durationLabel: formatDuration(startSource, end, calc),
        _sortDate: startSource,
        _dateLabel: datePart,
        _timeLabel: timePart,
        _liveTotal: liveTotal,
      }
    })
    let filtered = withDuration
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = withDuration.filter((r) => {
        const searchable = [
          r.rental_no, r.customer_name, r.customers?.code || "", r.customers?.name || "",
          r.product_codes || "", r.product_names || "", r.status,
          r._durationLabel, r._dateLabel, r._timeLabel,
          String(r._liveTotal), String(r.paid_amount),
          formatCurrency(r._liveTotal, locale), formatCurrency(r.paid_amount, locale),
        ].join(" ").toLowerCase()
        return searchable.includes(q)
      })
    }
    const sorted = [...filtered].sort((a, b) => {
      const statusOrder: Record<string, number> = { active: 0, overdue: 1, returned: 2, cancelled: 3 }
      const sa = statusOrder[a.status] ?? 99
      const sb = statusOrder[b.status] ?? 99
      if (sa !== sb) return sa - sb
      let cmp = 0
      switch (sortKey) {
        case "date":
          cmp = a._sortDate.localeCompare(b._sortDate)
          break
        case "rental_no":
          cmp = a.rental_no.localeCompare(b.rental_no)
          break
        case "product_id":
          cmp = (a.product_codes || "").localeCompare(b.product_codes || "")
          break
        case "product_name":
          cmp = (a.product_names || "").localeCompare(b.product_names || "")
          break
        case "customer_name":
          cmp = a.customer_name.localeCompare(b.customer_name)
          break
        case "customer_id":
          cmp = (a.customers?.code || "").localeCompare(b.customers?.code || "")
          break
        case "duration":
          cmp = a._durationVal - b._durationVal
          break
        case "total_fee":
          cmp = a._liveTotal - b._liveTotal
          break
        case "paid_amount":
          cmp = a.paid_amount - b.paid_amount
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [rentals, sortKey, sortDir, rentCalc, searchQuery, locale])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    const active = sortKey === k
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
    return <Icon size={12} className="ml-1 shrink-0 text-black" />
  }

  function Th({ k, label }: { k: SortKey; label: string }) {
    return (
      <th className="px-3 py-3 cursor-pointer select-none" onClick={() => handleSort(k)}>
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <SortIcon k={k} />
        </div>
      </th>
    )
  }

  async function showDetail(rental: Rental) {
    setSelectedRental(rental)
    const [itemsRes, paymentsRes] = await Promise.all([
      supabase.from("rental_items").select("*, products!inner(code)").eq("rental_id", rental.id),
      supabase.from("rental_payments").select("*").eq("rental_id", rental.id).order("created_at", { ascending: false }),
    ])
    if (itemsRes.data) {
      const items = (itemsRes.data as (RentalItem & { products?: { code: string } })[]).map((i) => ({
        ...i,
        product_code: i.products?.code || "",
      }))
      setRentalItems(items)
    }
    if (paymentsRes.data) setRentalPayments(paymentsRes.data as RentalPayment[])
  }

  async function handleAddPayment() {
    if (!selectedRental || !paymentAmount) return
    setPaymentSubmitting(true)
    const amount = Number(paymentAmount) || 0
    if (amount <= 0) { setPaymentSubmitting(false); return }

    const { data: payment } = await supabase.from("rental_payments").insert({
      rental_id: selectedRental.id,
      amount,
      payment_type: paymentPayType,
      payment_date: new Date().toISOString().slice(0, 10),
      notes: paymentNote,
    } as never).select().single()

    if (payment) {
      const newPaid = selectedRental.paid_amount + amount
      const newBalance = Math.max(0, selectedRental.remaining_balance - amount)
      await supabase.from("rentals").update({
        paid_amount: newPaid,
        remaining_balance: newBalance,
      } as never).eq("id", selectedRental.id)

      const financialType = paymentPayType === "cash" ? "cash" : "bank"
      const { data: lastEntry } = await supabase
        .from("ledger_entries")
        .select("balance_after")
        .eq("ledger_type", financialType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      const prevBalance = (lastEntry as { balance_after: number } | null)?.balance_after ?? 0
      await supabase.from("ledger_entries").insert({
        ledger_type: financialType,
        reference_id: selectedRental.id,
        reference_type: "rental_payment",
        entry_type: "debit",
        amount,
        description: `Rental payment ${selectedRental.rental_no}`,
        balance_after: prevBalance + amount,
      } as never)

      setSelectedRental({ ...selectedRental, paid_amount: newPaid, remaining_balance: newBalance })
      setRentalPayments([payment as RentalPayment, ...rentalPayments])
      setPaymentAmount("")
      setPaymentNote("")
      setShowPaymentModal(false)
      fetchRentals()
    }
    setPaymentSubmitting(false)
  }

  function openReturnModal() {
    if (!selectedRental) return
    setReturnItems(rentalItems.map((i) => ({ ...i })))
    setReturnLabourCharge(String(selectedRental.return_labour_charge || ""))
    setReturnOtherCharges(String(selectedRental.return_other_charges || ""))
    setReturnTaxType((selectedRental.return_tax_type as "non_vat" | "svat") || "non_vat")
    setReturnNow(Date.now())
    setShowReturnModal(true)
  }

  function updateReturnItem(id: string, field: "returned_quantity" | "damage_notes", value: string | number) {
    setReturnItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    )
  }

  const returnDamageCost = useMemo(() => {
    let cost = 0
    for (const item of returnItems) {
      const unreturned = item.quantity - (Number(item.returned_quantity) || 0)
      if (unreturned > 0 && item.damage_notes?.trim()) {
        const product = products.find((p) => p.id === item.product_id)
        cost += unreturned * (product?.selling_price || item.rate)
      }
    }
    return cost
  }, [returnItems, products])

  const [returnNow, setReturnNow] = useState(() => Date.now())

  const returnSubtotal = useMemo(() => {
    if (!selectedRental || rentalItems.length === 0) return selectedRental?.total_fee || 0
    const calc = selectedRental.rent_calculation || rentCalc
    if (calc !== "hours") return selectedRental.total_fee || 0
    const start = new Date(selectedRental.start_datetime || selectedRental.created_at).getTime()
    const hours = Math.max(1, Math.ceil((returnNow - start) / (1000 * 60 * 60)))
    let total = 0
    for (const item of rentalItems) {
      total += item.rate * item.quantity * hours
    }
    return total
  }, [selectedRental, rentalItems, rentCalc])

  const lc = Number(returnLabourCharge) || 0
  const oc = Number(returnOtherCharges) || 0
  const taxableAmount = returnSubtotal + lc + returnDamageCost + oc
  const taxAmount = returnTaxType === "svat" ? taxableAmount * 0.15 : 0
  const returnGrandTotal = taxableAmount + taxAmount

  async function handleReturn() {
    if (!selectedRental) return
    setReturnSubmitting(true)
    const now = new Date().toISOString()

    const updatePromises = returnItems.map((item) => {
      return supabase.from("rental_items").update({
        returned_quantity: Number(item.returned_quantity) || 0,
        damage_notes: item.damage_notes || "",
      } as never).eq("id", item.id)
    })
    await Promise.all(updatePromises)

    const newBalance = Math.max(0, returnGrandTotal - selectedRental.paid_amount)

    await supabase.from("rentals").update({
      status: "returned",
      actual_return_date: now,
      total_fee: returnSubtotal,
      return_labour_charge: lc,
      return_other_charges: oc,
      return_damage_cost: returnDamageCost,
      return_tax_type: returnTaxType,
      remaining_balance: newBalance,
    } as never).eq("id", selectedRental.id)

    setShowReturnModal(false)
    setSelectedRental(null)
    setReturnSubmitting(false)
    fetchRentals()
  }

  const columns: { k: SortKey; label: string }[] = [
    { k: "date", label: "Date and time" },
    { k: "rental_no", label: "Rental No" },
    { k: "product_id", label: "Product ID" },
    { k: "product_name", label: "Product" },
    { k: "customer_name", label: "Customer Name" },
    { k: "customer_id", label: "Customer ID" },
    { k: "duration", label: "Duration" },
    { k: "total_fee", label: "Rent Amount" },
    { k: "paid_amount", label: "Paid Amount" },
    { k: "status", label: "Status" },
  ]

  return (
    <div className="space-y-4">
      <PageHeader titleKey="rentals.title" />

      {loadingRentals ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rental no, customer, product, status..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {processedRentals.length === 0 ? (
            <p className="py-8 text-center text-sm text-black">{t("rentals.no_rentals")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs font-medium uppercase text-black whitespace-nowrap">
                    {columns.map((col) => <Th key={col.k} k={col.k} label={col.label} />)}
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRentals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 cursor-pointer hover:bg-gray-50" onClick={() => showDetail(r)}>
                      <td className="px-3 py-3 whitespace-nowrap text-black text-xs">
                        <div>{r._dateLabel}</div>
                        <div className="text-black">{r._timeLabel}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs font-medium text-black">{r.rental_no}</td>
                      <td className="px-3 py-3 font-mono text-xs text-black max-w-[100px] truncate">{r.product_codes || "-"}</td>
                      <td className="px-3 py-3 text-xs text-black max-w-[140px] truncate">{r.product_names || "-"}</td>
                      <td className="px-3 py-3 font-medium text-black">{r.customer_name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-black">{r.customers?.code || "-"}</td>
                      <td className="px-3 py-3 text-black whitespace-nowrap">{r._durationLabel}</td>
                      <td className="px-3 py-3 text-black">{formatCurrency(r._liveTotal, locale)}</td>
                      <td className="px-3 py-3 text-black">{formatCurrency(r.paid_amount, locale)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); showDetail(r) }} className="rounded-lg p-1.5 hover:bg-gray-100" title="View"><Eye size={16} className="text-black" /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm("Are you sure you want to edit this rental?")) showDetail(r) }} className="rounded-lg p-1.5 hover:bg-gray-100" title="Edit"><Pencil size={16} className="text-black" /></button>
                          <button onClick={async (e) => { e.stopPropagation(); if (!confirm("Are you sure you want to delete this rental? This action cannot be undone.")) return; const c = createClient(); await c.from("rentals").delete().eq("id", r.id); setRentals((prev) => prev.filter((rent) => rent.id !== r.id)) }} className="rounded-lg p-1.5 hover:bg-gray-100" title="Delete"><Trash2 size={16} className="text-black" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail Modal */}
          {selectedRental && !showReturnModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8" onClick={() => { setSelectedRental(null); setShowPaymentModal(false) }}>
              <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">{selectedRental.rental_no}</h2>
                  <button onClick={() => { setSelectedRental(null); setShowPaymentModal(false) }}><X size={20} className="text-black" /></button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><span className="font-medium text-black">{t("rentals.customer")}:</span> <span className="text-black">{selectedRental.customer_name}</span></div>
                    <div><span className="font-medium text-black">{t("rentals.rental_type")}:</span> <span className="text-black">{selectedRental.rental_type === "tool" ? t("rentals.tool") : t("rentals.cement_bag")}</span></div>
                    <div>
                      <span className="font-medium text-black">{t("rentals.start_date")}:</span>
                      <span className="text-black ml-1">
                        {new Date(selectedRental.start_datetime || selectedRental.created_at).toLocaleString(locale === "si" ? "en-US" : locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div><span className="font-medium text-black">{t("rentals.expected_return")}:</span> <span className="text-black">{formatDate(selectedRental.expected_return_date)}</span></div>
                    <div><span className="font-medium text-black">Rental Amount:</span> <span className="text-black">{formatCurrency(selectedRental.status === "active" && (selectedRental.rent_calculation || rentCalc) === "hours" ? selectedRental.total_fee * Math.max(1, Math.ceil((Date.now() - new Date(selectedRental.start_datetime || selectedRental.created_at).getTime()) / (1000 * 60 * 60))) : selectedRental.total_fee, locale)}</span></div>
                    <div><span className="font-medium text-black">Paid:</span> <span className="text-black">{formatCurrency(selectedRental.paid_amount, locale)}</span></div>
                    <div><span className="font-medium text-black">Balance:</span> <span className="font-semibold text-black">{formatCurrency(selectedRental.remaining_balance, locale)}</span></div>
                    {selectedRental.late_fee > 0 && <div><span className="font-medium text-black">{t("rentals.late_fee")}:</span> <span className="text-black">{formatCurrency(selectedRental.late_fee, locale)}</span></div>}
                    <div><span className="font-medium text-black">{t("rentals.status")}:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[selectedRental.status]}`}>{selectedRental.status}</span></div>
                  </div>

                  {rentalItems.length > 0 && (
                    <div className="border-t pt-3">
                      <h3 className="mb-2 text-sm font-medium text-black">{t("rentals.items")}</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-black">
                            <th className="pb-1 pr-2 text-left font-medium">Code</th>
                            <th className="pb-1 pr-2 text-left font-medium">Product</th>
                            <th className="pb-1 pr-2 text-right font-medium">Qty</th>
                            <th className="pb-1 pr-2 text-right font-medium">Rate</th>
                            <th className="pb-1 pr-2 text-right font-medium">Returned</th>
                            <th className="pb-1 text-right font-medium">Damage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentalItems.map((item) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="py-1 pr-2 font-mono text-black">{item.product_code || "-"}</td>
                              <td className="py-1 pr-2 text-black">{item.product_name}</td>
                              <td className="py-1 pr-2 text-right text-black">{item.quantity}</td>
                              <td className="py-1 pr-2 text-right text-black">{formatCurrency(item.rate, locale)}</td>
                              <td className="py-1 pr-2 text-right text-black">{item.returned_quantity || 0}</td>
                              <td className="py-1 text-right text-black">{item.damage_notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-black">Payment History</h3>
                      <button onClick={() => setShowPaymentModal(true)} className="inline-flex items-center gap-1 text-xs font-medium text-black hover:text-emerald-700"><Plus size={12} /> Add Payment</button>
                    </div>
                    {rentalPayments.length === 0 ? (
                      <p className="text-xs text-black">No payments recorded</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-black">
                            <th className="pb-1 pr-2 text-left font-medium">Date</th>
                            <th className="pb-1 pr-2 text-right font-medium">Amount</th>
                            <th className="pb-1 pr-2 text-left font-medium">Type</th>
                            <th className="pb-1 text-left font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentalPayments.map((pmt) => (
                            <tr key={pmt.id} className="border-b last:border-0">
                              <td className="py-1 pr-2 text-black">{formatDate(pmt.payment_date)}</td>
                              <td className="py-1 pr-2 text-right font-semibold text-black">{formatCurrency(pmt.amount, locale)}</td>
                              <td className="py-1 pr-2 text-black">{pmt.payment_type}</td>
                              <td className="py-1 text-black">{pmt.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {(selectedRental.status === "active" || selectedRental.status === "overdue") && (
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button onClick={() => setSelectedRental(null)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                      <button onClick={openReturnModal} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">{t("rentals.mark_returned")}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Payment Modal */}
          {showPaymentModal && selectedRental && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowPaymentModal(false)}>
              <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-black">Add Payment</h3>
                  <button onClick={() => setShowPaymentModal(false)}><X size={20} className="text-black" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Amount</label>
                    <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Payment Type</label>
                    <select value={paymentPayType} onChange={(e) => setPaymentPayType(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
                      {PAYMENT_TYPES.map((pt) => (
                        <option key={pt} value={pt}>{pt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Notes</label>
                    <input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowPaymentModal(false)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">Cancel</button>
                    <button onClick={handleAddPayment} disabled={!paymentAmount || paymentSubmitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">
                      {paymentSubmitting ? "Saving..." : "Add Payment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Return Modal */}
          {showReturnModal && selectedRental && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8" onClick={() => setShowReturnModal(false)}>
              <div className="mx-4 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">Return Items - {selectedRental.rental_no}</h2>
                  <button onClick={() => setShowReturnModal(false)}><X size={20} className="text-black" /></button>
                </div>
                <div className="space-y-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-black">
                        <th className="px-2 py-1.5 text-left font-medium">Code</th>
                        <th className="px-2 py-1.5 text-left font-medium">Item</th>
                        <th className="px-2 py-1.5 text-center font-medium">Rented</th>
                        <th className="px-2 py-1.5 text-center font-medium">Return Qty</th>
                        <th className="px-2 py-1.5 text-left font-medium">Damage/Loss Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item) => {
                        const unreturned = item.quantity - (Number(item.returned_quantity) || 0)
                        const isDamaged = item.damage_notes?.trim().length > 0 && unreturned > 0
                        return (
                          <tr key={item.id} className="border-b">
                            <td className="px-2 py-2 font-mono text-xs text-black">{item.product_code || "-"}</td>
                            <td className="px-2 py-2 text-black">{item.product_name}</td>
                            <td className="px-2 py-2 text-center text-black">{item.quantity}</td>
                            <td className="px-2 py-2 text-center">
                              <input type="number" min={0} max={item.quantity} value={item.returned_quantity || ""} onChange={(e) => { const v = e.target.value === "" ? 0 : parseInt(e.target.value); if (!isNaN(v)) updateReturnItem(item.id, "returned_quantity", v) }} className="w-16 rounded border border-gray-300 px-1 py-1 text-center text-sm" />
                            </td>
                            <td className="px-2 py-2">
                              <input type="text" value={item.damage_notes || ""} onChange={(e) => updateReturnItem(item.id, "damage_notes", e.target.value)} placeholder="e.g. damaged, lost" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
                              {isDamaged && (
                                <div className="text-[10px] text-black mt-0.5">
                                  Loss: {formatCurrency(unreturned * (products.find((p) => p.id === item.product_id)?.selling_price || item.rate), locale)}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* POS-style financial breakdown */}
                  <div className="border-t pt-3 space-y-2">
                    <h3 className="text-sm font-medium text-black">Financial Summary</h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Subtotal</span>
                      <span className="text-black">{formatCurrency(returnSubtotal, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Labour Charge</span>
                      <input type="number" min={0} value={returnLabourCharge} onChange={(e) => setReturnLabourCharge(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Damage Charge</span>
                      <span className="text-black">{formatCurrency(returnDamageCost, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Other Charges</span>
                      <input type="number" min={0} value={returnOtherCharges} onChange={(e) => setReturnOtherCharges(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
                    </div>
                    <div className="flex items-center justify-between text-sm border-t pt-1">
                      <span className="text-black">Taxable Amount</span>
                      <span className="text-black">{formatCurrency(taxableAmount, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Tax Type</span>
                      <select value={returnTaxType} onChange={(e) => setReturnTaxType(e.target.value as "non_vat" | "svat")} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm">
                        <option value="non_vat">Non-VAT</option>
                        <option value="svat">SVAT (15%)</option>
                      </select>
                    </div>
                    {returnTaxType === "svat" && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-black">Tax (15%)</span>
                        <span className="text-black">{formatCurrency(taxAmount, locale)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-semibold border-t pt-1">
                      <span className="text-black">Grand Total</span>
                      <span className="text-black">{formatCurrency(returnGrandTotal, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black">Already Paid</span>
                      <span className="text-black">{formatCurrency(selectedRental.paid_amount, locale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-black">Balance Due</span>
                      <span className="text-black">{formatCurrency(Math.max(0, returnGrandTotal - selectedRental.paid_amount), locale)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setShowReturnModal(false)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">Cancel</button>
                    <button onClick={handleReturn} disabled={returnSubmitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
                      {returnSubmitting ? "Saving..." : "Confirm Return"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
