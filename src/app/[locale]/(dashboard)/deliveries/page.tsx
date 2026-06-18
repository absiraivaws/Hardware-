"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Eye, Truck } from "lucide-react"
import { formatDate } from "@/lib/format"
import Link from "next/link"

interface Delivery {
  id: string
  sale_id: string | null
  delivery_no: string
  driver_id: string | null
  vehicle_id: string | null
  delivery_date: string
  status: "pending" | "in_transit" | "delivered" | "cancelled"
  address: string
  notes: string
  created_at: string
}

interface Driver { id: string; name: string }
interface Vehicle { id: string; registration_no: string }
interface Sale { id: string; invoice_no: string; customer_name: string | null }

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
}

export default function DeliveriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  // Form state
  const [saleId, setSaleId] = useState("")
  const [driverId, setDriverId] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  async function fetchDeliveries() {
    const [del, dr, ve] = await Promise.all([
      supabase.from("deliveries").select("*").order("created_at", { ascending: false }),
      supabase.from("drivers").select("id, name"),
      supabase.from("vehicles").select("id, registration_no"),
    ])
    if (del.data) setDeliveries(del.data as Delivery[])
    if (dr.data) setDrivers(dr.data as Driver[])
    if (ve.data) setVehicles(ve.data as Vehicle[])
    setLoading(false)
  }

  async function fetchFormData() {
    const [dr, ve, sa] = await Promise.all([
      supabase.from("drivers").select("id, name").eq("status", "active"),
      supabase.from("vehicles").select("id, registration_no").eq("status", "active"),
      supabase.from("sales").select("id, invoice_no, customer_name").eq("status", "completed").order("created_at", { ascending: false }).limit(50),
    ])
    if (dr.data) setDrivers(dr.data as Driver[])
    if (ve.data) setVehicles(ve.data as Vehicle[])
    if (sa.data) setSales(sa.data as Sale[])
  }

  useEffect(() => { fetchDeliveries() }, [])

  function resetForm() { setSaleId(""); setDriverId(""); setVehicleId(""); setDeliveryDate(new Date().toISOString().slice(0, 10)); setAddress(""); setNotes("") }

  async function openCreateForm() {
    resetForm()
    await fetchFormData()
    setShowForm(true)
  }

  async function handleCreate() {
    const deliveryNo = `DEL-${Date.now().toString(36).toUpperCase()}`
    const { error } = await supabase.from("deliveries").insert({
      delivery_no: deliveryNo,
      sale_id: saleId || null,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      delivery_date: deliveryDate,
      address,
      notes,
    })
    if (!error) { setShowForm(false); fetchDeliveries() }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("deliveries").update({ status }).eq("id", id)
    fetchDeliveries()
  }

  const selectedSale = sales.find(s => s.id === saleId)

  return (
    <div>
      <PageHeader titleKey="deliveries.title" />
      <div className="mb-4 flex justify-end">
        <button onClick={openCreateForm} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("deliveries.new_delivery")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{t("deliveries.new_delivery")}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.select_sale")}</label>
                <select value={saleId} onChange={e => { const s = sales.find(sl => sl.id === e.target.value); setSaleId(e.target.value); if (s) setAddress(s.customer_name ? `Deliver to: ${s.customer_name}` : "") }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- {t("deliveries.select_sale")} --</option>
                  {sales.map(s => <option key={s.id} value={s.id}>{s.invoice_no} - {s.customer_name || "Walk-in"}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.driver")}</label>
                <select value={driverId} onChange={e => setDriverId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- Select --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.vehicle")}</label>
                <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">-- Select --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_no}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.delivery_date")}</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.address")}</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.notes")}</label>
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

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div>
      ) : deliveries.length === 0 ? (
        <p className="py-8 text-center text-sm text-black">{t("deliveries.no_deliveries")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-black">
                <th className="px-4 py-3">{t("deliveries.delivery_no")}</th>
                <th className="px-4 py-3">{t("deliveries.driver")}</th>
                <th className="px-4 py-3">{t("deliveries.vehicle")}</th>
                <th className="px-4 py-3">{t("deliveries.delivery_date")}</th>
                <th className="px-4 py-3">{t("deliveries.status")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => {
                const driver = drivers.find(dr => dr.id === d.driver_id)
                const vehicle = vehicles.find(v => v.id === d.vehicle_id)
                return (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium text-black">{d.delivery_no}</td>
                    <td className="px-4 py-3 text-black">{driver?.name || "-"}</td>
                    <td className="px-4 py-3 text-black">{vehicle?.registration_no || "-"}</td>
                    <td className="px-4 py-3 text-black">{formatDate(d.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[d.status]} border-0 cursor-pointer`}>
                        <option value="pending">{t("deliveries.pending")}</option>
                        <option value="in_transit">{t("deliveries.in_transit")}</option>
                        <option value="delivered">{t("deliveries.delivered")}</option>
                        <option value="cancelled">{t("deliveries.cancelled")}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/${locale}/deliveries/${d.id}`} className="rounded-lg p-1.5 hover:bg-gray-100 inline-block">
                        <Eye size={16} className="text-black" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
