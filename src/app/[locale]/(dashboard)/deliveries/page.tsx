"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Plus, X, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
  sales: {
    invoice_no: string
    customer_name: string | null
    grand_total: number
    customer_id: string | null
    customers: { code: string } | null
  } | null
}

interface Driver { id: string; name: string }
interface Vehicle { id: string; registration_no: string }
interface Sale { id: string; invoice_no: string; customer_name: string | null; created_at: string; grand_total: number; customer_id: string | null; transport_charge: number; customers: { code: string } | null }

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-black",
  in_transit: "bg-blue-100 text-black",
  delivered: "bg-emerald-100 text-black",
  cancelled: "bg-red-100 text-black",
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

  // Delivery list sort & search
  const [delSearch, setDelSearch] = useState("")
  const [delSortKey, setDelSortKey] = useState("delivery_date")
  const [delSortDir, setDelSortDir] = useState<"asc" | "desc">("desc")

  const handleDelSort = (key: string) => {
    if (delSortKey === key) {
      setDelSortDir(delSortDir === "asc" ? "desc" : "asc")
    } else {
      setDelSortKey(key)
      setDelSortDir("asc")
    }
  }

  const filteredDeliveries = useMemo(() => {
    const q = delSearch.trim().toLowerCase()
    let result = deliveries
    if (q) {
      result = deliveries.filter(d => {
        const s = d.sales
        return (
          d.delivery_no.toLowerCase().includes(q) ||
          formatDate(d.delivery_date).toLowerCase().includes(q) ||
          (s?.customers?.code || "").toLowerCase().includes(q) ||
          (s?.customer_name || "").toLowerCase().includes(q) ||
          (s?.invoice_no || "").toLowerCase().includes(q) ||
          String(s?.grand_total || "").includes(q) ||
          d.status.toLowerCase().includes(q)
        )
      })
    }
    return [...result].sort((a, b) => {
      const va = (key: string): string => {
        if (key === "delivery_date" || key === "created_at") return new Date(a[key]).getTime().toString()
        if (key === "delivery_no") return a.delivery_no
        if (key === "customer_code") return a.sales?.customers?.code || ""
        if (key === "customer_name") return a.sales?.customer_name || ""
        if (key === "invoice_no") return a.sales?.invoice_no || ""
        if (key === "grand_total") return String(a.sales?.grand_total || 0).padStart(15, "0")
        if (key === "driver") return drivers.find(d => d.id === a.driver_id)?.name || ""
        if (key === "vehicle") return vehicles.find(v => v.id === a.vehicle_id)?.registration_no || ""
        if (key === "status") return a.status
        return ""
      }
      const vb = (key: string): string => {
        if (key === "delivery_date" || key === "created_at") return new Date(b[key]).getTime().toString()
        if (key === "delivery_no") return b.delivery_no
        if (key === "customer_code") return b.sales?.customers?.code || ""
        if (key === "customer_name") return b.sales?.customer_name || ""
        if (key === "invoice_no") return b.sales?.invoice_no || ""
        if (key === "grand_total") return String(b.sales?.grand_total || 0).padStart(15, "0")
        if (key === "driver") return drivers.find(d => d.id === b.driver_id)?.name || ""
        if (key === "vehicle") return vehicles.find(v => v.id === b.vehicle_id)?.registration_no || ""
        if (key === "status") return b.status
        return ""
      }
      const cmp = va(delSortKey).localeCompare(vb(delSortKey), undefined, { numeric: true })
      return delSortDir === "asc" ? cmp : -cmp
    })
  }, [deliveries, delSearch, delSortKey, delSortDir, drivers, vehicles])

  // Form state
  const [saleId, setSaleId] = useState("")
  const [driverId, setDriverId] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10))
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  // Sale search state
  const [searchQuery, setSearchQuery] = useState("")
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [saleSortKey, setSaleSortKey] = useState("created_at")
  const [saleSortDir, setSaleSortDir] = useState<"asc" | "desc">("desc")

  const handleSaleSort = (key: string) => {
    if (saleSortKey === key) {
      setSaleSortDir(saleSortDir === "asc" ? "desc" : "asc")
    } else {
      setSaleSortKey(key)
      setSaleSortDir("asc")
    }
  }

  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = allSales
    if (q) {
      result = allSales.filter(s => {
        const code = s.customers?.code?.toLowerCase() || ""
        return (
          formatDate(s.created_at).toLowerCase().includes(q) ||
          s.invoice_no.toLowerCase().includes(q) ||
          (s.customer_name || "").toLowerCase().includes(q) ||
          code.includes(q) ||
          String(s.grand_total).includes(q)
        )
      })
    }
    return [...result].sort((a, b) => {
      let cmp = 0
      if (saleSortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (saleSortKey === "customer_code") {
        cmp = (a.customers?.code || "").localeCompare(b.customers?.code || "")
      } else if (saleSortKey === "customer_name") {
        cmp = (a.customer_name || "").localeCompare(b.customer_name || "")
      } else if (saleSortKey === "invoice_no") {
        cmp = a.invoice_no.localeCompare(b.invoice_no)
      } else if (saleSortKey === "grand_total") {
        cmp = Number(a.grand_total) - Number(b.grand_total)
      }
      return saleSortDir === "asc" ? cmp : -cmp
    })
  }, [allSales, searchQuery, saleSortKey, saleSortDir])

  async function fetchDeliveries() {
    const [del, dr, ve] = await Promise.all([
      supabase
        .from("deliveries")
        .select("*, sales(invoice_no, customer_name, grand_total, customer_id, customers(code))")
        .order("created_at", { ascending: false }),
      supabase.from("drivers").select("id, name"),
      supabase.from("vehicles").select("id, registration_no"),
    ])
    if (del.data) setDeliveries(del.data as Delivery[])
    if (dr.data) setDrivers(dr.data as Driver[])
    if (ve.data) setVehicles(ve.data as Vehicle[])
    setLoading(false)
  }

  async function fetchFormData() {
    setLoadingSales(true)
    const [dr, ve, sa, existingDeliveries] = await Promise.all([
      supabase.from("drivers").select("id, name").eq("status", "active"),
      supabase.from("vehicles").select("id, registration_no").eq("status", "active"),
      supabase
        .from("sales")
        .select("id, invoice_no, customer_name, created_at, grand_total, customer_id, transport_charge, customers(code)")
        .gt("transport_charge", 0)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("deliveries").select("sale_id").not("sale_id", "is", null),
    ])
    if (dr.data) setDrivers(dr.data as Driver[])
    if (ve.data) setVehicles(ve.data as Vehicle[])
    if (sa.data) {
      const existingIds = new Set((existingDeliveries.data || []).map(d => d.sale_id))
      setAllSales((sa.data as unknown as Sale[]).filter(s => !existingIds.has(s.id)))
    }
    setLoadingSales(false)
  }

  useEffect(() => { fetchDeliveries() }, [])

  function resetForm() {
    setSaleId(""); setDriverId(""); setVehicleId("")
    setDeliveryDate(new Date().toISOString().slice(0, 10)); setAddress(""); setNotes("")
    setSearchQuery(""); setAllSales([])
  }

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
          <div className="mx-4 w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{t("deliveries.new_delivery")}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              {/* Sale Search */}
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.select_sale")}</label>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by date, customer ID, name, invoice no, or amount" className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                {loadingSales ? (
                  <div className="py-3 text-center text-sm text-black">Loading...</div>
                ) : filteredSales.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {[
                            { key: "created_at", label: "Date", align: "text-left" },
                            { key: "customer_code", label: "Customer ID", align: "text-left" },
                            { key: "customer_name", label: "Customer Name", align: "text-left" },
                            { key: "invoice_no", label: "Invoice No", align: "text-left" },
                            { key: "grand_total", label: "Amount", align: "text-right" },
                          ].map(col => {
                            const active = saleSortKey === col.key
                            const Icon = active ? (saleSortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                            return (
                              <th
                                key={col.key}
                                onClick={() => handleSaleSort(col.key)}
                                className={`cursor-pointer select-none px-2 py-1.5 ${col.align} font-medium text-black`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {col.label}
                                  <Icon size={11} className="shrink-0" />
                                </span>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.map(s => (
                          <tr
                            key={s.id}
                            onClick={() => { setSaleId(s.id); setAddress(s.customer_name ? `Deliver to: ${s.customer_name}` : "") }}
                            className={`cursor-pointer border-b last:border-0 hover:bg-emerald-50 ${s.id === saleId ? "bg-emerald-100 font-medium" : ""}`}
                          >
                            <td className="px-2 py-1.5 text-black whitespace-nowrap">{formatDate(s.created_at)}</td>
                            <td className="px-2 py-1.5 text-black font-mono">{s.customers?.code || "—"}</td>
                            <td className="px-2 py-1.5 text-black">{s.customer_name || "Walk-in"}</td>
                            <td className="px-2 py-1.5 text-black font-medium">{s.invoice_no}</td>
                            <td className="px-2 py-1.5 text-right text-black">{new Intl.NumberFormat("en", { style: "currency", currency: "LKR" }).format(s.grand_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-3 text-center text-sm text-black">No sales with transport charge found</p>
                )}
                {saleId && (
                  <p className="mt-1 text-xs text-black">Selected: {allSales.find(s => s.id === saleId)?.invoice_no || ""}</p>
                )}
              </div>

              {/* Other details in multi-column grid */}
              <div className="grid grid-cols-2 gap-4">
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
                  <input value={address} onChange={e => setAddress(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-black">{t("deliveries.notes")}</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleCreate} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global search */}
      <div className="mb-4 max-w-sm">
        <input
          value={delSearch}
          onChange={e => setDelSearch(e.target.value)}
          placeholder="Search deliveries..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}</div>
      ) : filteredDeliveries.length === 0 ? (
        <p className="py-8 text-center text-sm text-black">{t("deliveries.no_deliveries")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-black">
                {[
                  { key: "delivery_date", label: "Delivery Date", align: "text-left" },
                  { key: "delivery_no", label: "Ref No", align: "text-left" },
                  { key: "customer_code", label: "Customer ID", align: "text-left" },
                  { key: "customer_name", label: "Customer Name", align: "text-left" },
                  { key: "invoice_no", label: "Invoice No", align: "text-left" },
                  { key: "grand_total", label: "Amount", align: "text-right" },
                  { key: "driver", label: "Driver", align: "text-left" },
                  { key: "vehicle", label: "Vehicle", align: "text-left" },
                  { key: "status", label: "Status", align: "text-center" },
                ].map(col => {
                  const active = delSortKey === col.key
                  const Icon = active ? (delSortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleDelSort(col.key)}
                      className={`cursor-pointer select-none px-4 py-3 ${col.align} font-medium text-black`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <Icon size={11} className="shrink-0" />
                      </span>
                    </th>
                  )
                })}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map(d => {
                const driver = drivers.find(dr => dr.id === d.driver_id)
                const vehicle = vehicles.find(v => v.id === d.vehicle_id)
                const sale = d.sales
                return (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-black whitespace-nowrap">{formatDate(d.delivery_date)}</td>
                    <td className="px-4 py-3 font-medium text-black">{d.delivery_no}</td>
                    <td className="px-4 py-3 font-mono text-black">{sale?.customers?.code || "—"}</td>
                    <td className="px-4 py-3 text-black">{sale?.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-black">{sale?.invoice_no || "—"}</td>
                    <td className="px-4 py-3 text-right text-black">{new Intl.NumberFormat("en", { style: "currency", currency: "LKR" }).format(sale?.grand_total || 0)}</td>
                    <td className="px-4 py-3 text-black">{driver?.name || "-"}</td>
                    <td className="px-4 py-3 text-black">{vehicle?.registration_no || "-"}</td>
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
