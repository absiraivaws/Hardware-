"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"
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
}

interface Driver { id: string; name: string; phone: string }
interface Vehicle { id: string; registration_no: string; model: string }
interface Sale { id: string; invoice_no: string; customer_name: string | null; grand_total: number }

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
}

export default function DeliveryDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: d } = await supabase.from("deliveries").select("*").eq("id", id).single()
      if (!d) { setLoading(false); return }
      setDelivery(d as Delivery)

      if (d.driver_id) {
        const { data: dr } = await supabase.from("drivers").select("*").eq("id", d.driver_id).single()
        if (dr) setDriver(dr as Driver)
      }
      if (d.vehicle_id) {
        const { data: v } = await supabase.from("vehicles").select("*").eq("id", d.vehicle_id).single()
        if (v) setVehicle(v as Vehicle)
      }
      if (d.sale_id) {
        const { data: s } = await supabase.from("sales").select("id, invoice_no, customer_name, grand_total").eq("id", d.sale_id).single()
        if (s) setSale(s as Sale)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  async function updateStatus(status: string) {
    await supabase.from("deliveries").update({ status }).eq("id", id)
    const { data } = await supabase.from("deliveries").select("*").eq("id", id).single()
    if (data) setDelivery(data as Delivery)
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}</div>
  if (!delivery) return <p className="py-8 text-center text-black">Delivery not found</p>

  return (
    <div>
      <div className="mb-4">
        <Link href={`/${locale}/deliveries`} className="inline-flex items-center gap-1 text-sm text-black hover:text-emerald-700">
          <ArrowLeft size={16} /> {t("deliveries.title")}
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-black">{delivery.delivery_no}</h1>
            <p className="mt-1 text-sm text-black">{formatDate(delivery.delivery_date)}</p>
          </div>
          <select value={delivery.status} onChange={e => updateStatus(e.target.value)} className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[delivery.status]} border-0 cursor-pointer`}>
            <option value="pending">{t("deliveries.pending")}</option>
            <option value="in_transit">{t("deliveries.in_transit")}</option>
            <option value="delivered">{t("deliveries.delivered")}</option>
            <option value="cancelled">{t("deliveries.cancelled")}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-sm font-medium text-black">{t("deliveries.driver")}</h3>
            {driver ? (
              <div className="text-sm text-black"><p className="font-medium">{driver.name}</p><p>{driver.phone}</p></div>
            ) : <p className="text-sm text-gray-500">-</p>}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-black">{t("deliveries.vehicle")}</h3>
            {vehicle ? (
              <div className="text-sm text-black"><p className="font-medium">{vehicle.registration_no}</p><p>{vehicle.model}</p></div>
            ) : <p className="text-sm text-gray-500">-</p>}
          </div>
          <div className="col-span-2">
            <h3 className="mb-2 text-sm font-medium text-black">{t("deliveries.sale_ref")}</h3>
            {sale ? (
              <div className="text-sm text-black"><p className="font-medium">{sale.invoice_no} - {sale.customer_name || "Walk-in"}</p><p>{formatCurrency(sale.grand_total, locale)}</p></div>
            ) : <p className="text-sm text-gray-500">-</p>}
          </div>
          <div className="col-span-2">
            <h3 className="mb-2 text-sm font-medium text-black">{t("deliveries.address")}</h3>
            <p className="text-sm text-black">{delivery.address || "-"}</p>
          </div>
          <div className="col-span-2">
            <h3 className="mb-2 text-sm font-medium text-black">{t("deliveries.notes")}</h3>
            <p className="text-sm text-black">{delivery.notes || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
