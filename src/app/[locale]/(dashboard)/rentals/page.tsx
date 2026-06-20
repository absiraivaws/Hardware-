"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Search, Package, Wrench } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"

interface Rental {
  id: string
  rental_no: string
  customer_id: string | null
  customer_name: string
  rental_type: "tool" | "cement_bag"
  status: "active" | "returned" | "overdue" | "cancelled"
  start_date: string
  expected_return_date: string
  actual_return_date: string | null
  deposit_amount: number
  total_fee: number
  late_fee: number
  notes: string
}

interface RentalItem {
  id: string
  rental_id: string
  product_id: string | null
  product_name: string
  quantity: number
  rate: number
  deposit: number
  returned_quantity: number
  damage_notes: string
}

interface Customer { id: string; name: string }
interface Product { id: string; name: string; selling_price: number }

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-black",
  returned: "bg-emerald-100 text-black",
  overdue: "bg-red-100 text-black",
  cancelled: "bg-gray-100 text-black",
}

export default function RentalsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null)
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([])

  // Form state
  const [customerId, setCustomerId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [rentalType, setRentalType] = useState<"tool" | "cement_bag">("tool")
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [expectedReturn, setExpectedReturn] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: string; rate: string; deposit: string }[]>([])

  async function fetchRentals() {
    const { data } = await supabase.from("rentals").select("*").order("created_at", { ascending: false })
    if (data) setRentals(data as Rental[])
    setLoading(false)
  }

  async function fetchFormData() {
    const [cust, prod] = await Promise.all([
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("id, name, selling_price").order("name"),
    ])
    if (cust.data) setCustomers(cust.data as Customer[])
    if (prod.data) setProducts(prod.data as Product[])
  }

  useEffect(() => { fetchRentals() }, [])

  function resetForm() {
    setCustomerId(""); setCustomerName(""); setRentalType("tool")
    setStartDate(new Date().toISOString().slice(0, 10)); setExpectedReturn(""); setDepositAmount(""); setNotes("")
    setItems([])
  }

  async function openCreateForm() {
    resetForm()
    await fetchFormData()
    setShowForm(true)
  }

  function addItem() {
    setItems([...items, { product_id: "", product_name: "", quantity: "1", rate: "0", deposit: "0" }])
  }

  function updateItem(index: number, field: string, value: string) {
    const updated = [...items]
    if (field === "product_id") {
      const prod = products.find(p => p.id === value)
      updated[index].product_id = value
      updated[index].product_name = prod?.name || ""
      if (!updated[index].rate || updated[index].rate === "0") updated[index].rate = String(prod?.selling_price || 0)
    } else {
      (updated[index] as Record<string, string>)[field] = value
    }
    setItems(updated)
  }

  async function handleCreate() {
    const rentalNo = `RNT-${Date.now().toString(36).toUpperCase()}`
    const totalDeposit = items.reduce((s, i) => s + Number(i.deposit || 0), 0) + Number(depositAmount || 0)
    const totalFee = items.reduce((s, i) => s + Number(i.rate || 0) * Number(i.quantity || 0), 0)

    const { data: rental } = await supabase.from("rentals").insert({
      rental_no: rentalNo,
      customer_id: customerId || null,
      customer_name: customerName || customers.find(c => c.id === customerId)?.name || "",
      rental_type: rentalType,
      start_date: startDate,
      expected_return_date: expectedReturn,
      deposit_amount: totalDeposit,
      total_fee: totalFee,
      notes,
    }).select().single()

    if (rental && items.length > 0) {
      await supabase.from("rental_items").insert(
        items.map(i => ({
          rental_id: rental.id,
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          deposit: Number(i.deposit),
        }))
      )
    }

    setShowForm(false)
    fetchRentals()
  }

  async function showDetail(rental: Rental) {
    setSelectedRental(rental)
    const { data } = await supabase.from("rental_items").select("*").eq("rental_id", rental.id)
    if (data) setRentalItems(data as RentalItem[])
  }

  async function handleReturn() {
    if (!selectedRental) return
    const today = new Date().toISOString().slice(0, 10)
    const expected = new Date(selectedRental.expected_return_date)
    const actual = new Date(today)
    const daysLate = Math.max(0, Math.floor((actual.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)))
    const lateFee = daysLate > 0 ? daysLate * (selectedRental.total_fee * 0.1) : 0

    await supabase.from("rentals").update({
      status: "returned",
      actual_return_date: today,
      late_fee: Math.round(lateFee * 100) / 100,
    }).eq("id", selectedRental.id)

    setSelectedRental(null)
    fetchRentals()
  }

  return (
    <div>
      <PageHeader titleKey="rentals.title" />
      <div className="mb-4 flex justify-end">
        <button onClick={openCreateForm} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("rentals.new_rental")}
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8" onClick={() => setShowForm(false)}>
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{t("rentals.new_rental")}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">{t("rentals.rental_type")}</label>
                  <select value={rentalType} onChange={e => setRentalType(e.target.value as "tool" | "cement_bag")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="tool">{t("rentals.tool")}</option>
                    <option value="cement_bag">{t("rentals.cement_bag")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">{t("rentals.customer")}</label>
                  <div className="flex gap-2">
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      <option value="">-- Select --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Customer Name (manual)</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="If not in list" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">{t("rentals.start_date")}</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">{t("rentals.expected_return")}</label>
                  <input type="date" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-black">{t("rentals.deposit_amount")}</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-black">{t("rentals.items")}</h3>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-black hover:text-black">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="mb-2 grid grid-cols-5 gap-2">
                    <select value={item.product_id} onChange={e => updateItem(i, "product_id", e.target.value)} className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
                      <option value="">-- Product --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} placeholder="Qty" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="number" value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)} placeholder="Rate" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="number" value={item.deposit} onChange={e => updateItem(i, "deposit", e.target.value)} placeholder="Deposit" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-black">Add at least one item</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("common.notes")}</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedRental(null)}>
          <div className="mx-4 w-full max-w-xl rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{selectedRental.rental_no}</h2>
              <button onClick={() => setSelectedRental(null)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-medium text-black">{t("rentals.customer")}:</span> <span className="text-black">{selectedRental.customer_name}</span></div>
                <div><span className="font-medium text-black">{t("rentals.rental_type")}:</span> <span className="text-black">{selectedRental.rental_type === "tool" ? t("rentals.tool") : t("rentals.cement_bag")}</span></div>
                <div><span className="font-medium text-black">{t("rentals.start_date")}:</span> <span className="text-black">{formatDate(selectedRental.start_date)}</span></div>
                <div><span className="font-medium text-black">{t("rentals.expected_return")}:</span> <span className="text-black">{formatDate(selectedRental.expected_return_date)}</span></div>
                <div><span className="font-medium text-black">{t("rentals.deposit_amount")}:</span> <span className="text-black">{formatCurrency(selectedRental.deposit_amount, locale)}</span></div>
                <div><span className="font-medium text-black">{t("rentals.total_fee")}:</span> <span className="text-black">{formatCurrency(selectedRental.total_fee, locale)}</span></div>
                {selectedRental.late_fee > 0 && <div><span className="font-medium text-black">{t("rentals.late_fee")}:</span> <span className="text-black">{formatCurrency(selectedRental.late_fee, locale)}</span></div>}
                <div><span className="font-medium text-black">{t("rentals.status")}:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[selectedRental.status]}`}>{selectedRental.status}</span></div>
              </div>

              {rentalItems.length > 0 && (
                <div className="border-t pt-3">
                  <h3 className="mb-2 text-sm font-medium text-black">{t("rentals.items")}</h3>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-black"><th className="pb-1 pr-2 text-left font-medium">{t("rentals.product")}</th><th className="pb-1 pr-2 text-right font-medium">{t("rentals.quantity")}</th><th className="pb-1 pr-2 text-right font-medium">{t("rentals.rate")}</th><th className="pb-1 text-right font-medium">{t("rentals.deposit")}</th></tr></thead>
                    <tbody>
                      {rentalItems.map(item => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-1 pr-2 text-black">{item.product_name}</td>
                          <td className="py-1 pr-2 text-right text-black">{item.quantity}</td>
                          <td className="py-1 pr-2 text-right text-black">{formatCurrency(item.rate, locale)}</td>
                          <td className="py-1 text-right text-black">{formatCurrency(item.deposit, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedRental.status === "active" || selectedRental.status === "overdue" ? (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={() => setSelectedRental(null)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                  <button onClick={handleReturn} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">{t("rentals.mark_returned")}</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div>
      ) : rentals.length === 0 ? (
        <p className="py-8 text-center text-sm text-black">{t("rentals.no_rentals")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-black">
                <th className="px-4 py-3">{t("rentals.rental_no")}</th>
                <th className="px-4 py-3">{t("rentals.customer")}</th>
                <th className="px-4 py-3">{t("rentals.rental_type")}</th>
                <th className="px-4 py-3">{t("rentals.start_date")}</th>
                <th className="px-4 py-3">{t("rentals.expected_return")}</th>
                <th className="px-4 py-3">{t("rentals.deposit_amount")}</th>
                <th className="px-4 py-3">{t("rentals.status")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rentals.map(r => (
                <tr key={r.id} className="border-b last:border-0 cursor-pointer hover:bg-gray-50" onClick={() => showDetail(r)}>
                  <td className="px-4 py-3 font-medium text-black">{r.rental_no}</td>
                  <td className="px-4 py-3 text-black">{r.customer_name}</td>
                  <td className="px-4 py-3 text-black">{r.rental_type === "tool" ? t("rentals.tool") : t("rentals.cement_bag")}</td>
                  <td className="px-4 py-3 text-black">{formatDate(r.start_date)}</td>
                  <td className="px-4 py-3 text-black">{formatDate(r.expected_return_date)}</td>
                  <td className="px-4 py-3 text-black">{formatCurrency(r.deposit_amount, locale)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button className="rounded-lg p-1.5 hover:bg-gray-100"><Search size={16} className="text-black" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
