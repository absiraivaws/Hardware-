"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, X } from "lucide-react"

interface Vehicle {
  id: string
  registration_no: string
  model: string
  capacity: string
  status: "active" | "maintenance" | "inactive"
}

export default function VehiclesPage({ params }: { params: Promise<{ locale: string }> }) {
  use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [regNo, setRegNo] = useState("")
  const [model, setModel] = useState("")
  const [capacity, setCapacity] = useState("")
  const [status, setStatus] = useState<"active" | "maintenance" | "inactive">("active")

  async function fetchVehicles() {
    const { data } = await supabase.from("vehicles").select("*").order("registration_no")
    if (data) setVehicles(data as Vehicle[])
    setLoading(false)
  }

  useEffect(() => { fetchVehicles() }, [])

  function resetForm() { setRegNo(""); setModel(""); setCapacity(""); setStatus("active"); setEditing(null) }

  async function handleSave() {
    if (editing) {
      await supabase.from("vehicles").update({ registration_no: regNo, model, capacity, status }).eq("id", editing.id)
    } else {
      await supabase.from("vehicles").insert({ registration_no: regNo, model, capacity, status })
    }
    resetForm(); setShowForm(false); fetchVehicles()
  }

  function handleEdit(v: Vehicle) {
    setEditing(v); setRegNo(v.registration_no); setModel(v.model); setCapacity(v.capacity); setStatus(v.status); setShowForm(true)
  }

  const statusColors: Record<string, string> = { active: "bg-emerald-100 text-black", maintenance: "bg-yellow-100 text-black", inactive: "bg-gray-100 text-black" }

  return (
    <div>
      <PageHeader titleKey="vehicles.title" />
      <div className="mb-4 flex justify-end">
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("vehicles.new_vehicle")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{editing ? "Edit" : "New"} Vehicle</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("vehicles.registration_no")}</label>
                <input value={regNo} onChange={e => setRegNo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("vehicles.model")}</label>
                <input value={model} onChange={e => setModel(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("vehicles.capacity")}</label>
                <input value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("vehicles.status")}</label>
                <select value={status} onChange={e => setStatus(e.target.value as "active" | "maintenance" | "inactive")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="active">{t("vehicles.active")}</option>
                  <option value="maintenance">{t("vehicles.maintenance")}</option>
                  <option value="inactive">{t("vehicles.inactive")}</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={handleSave} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}</div>
      ) : vehicles.length === 0 ? (
        <p className="py-8 text-center text-sm text-black">{t("vehicles.no_vehicles")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs font-medium uppercase text-black"><th className="px-4 py-3">{t("vehicles.registration_no")}</th><th className="px-4 py-3">{t("vehicles.model")}</th><th className="px-4 py-3">{t("vehicles.capacity")}</th><th className="px-4 py-3">{t("vehicles.status")}</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-black">{v.registration_no}</td>
                  <td className="px-4 py-3 text-black">{v.model}</td>
                  <td className="px-4 py-3 text-black">{v.capacity}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[v.status]}`}>{v.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => handleEdit(v)} className="rounded-lg p-1.5 hover:bg-gray-100"><Pencil size={16} className="text-black" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
