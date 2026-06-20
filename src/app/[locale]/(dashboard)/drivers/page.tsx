"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, X, Check } from "lucide-react"

interface Driver {
  id: string
  name: string
  phone: string
  license_no: string
  status: "active" | "inactive"
}

export default function DriversPage({ params }: { params: Promise<{ locale: string }> }) {
  use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [licenseNo, setLicenseNo] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")

  async function fetchDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("name")
    if (data) setDrivers(data as Driver[])
    setLoading(false)
  }

  useEffect(() => { fetchDrivers() }, [])

  function resetForm() {
    setName(""); setPhone(""); setLicenseNo(""); setStatus("active"); setEditing(null)
  }

  async function handleSave() {
    if (editing) {
      await supabase.from("drivers").update({ name, phone, license_no: licenseNo, status }).eq("id", editing.id)
    } else {
      await supabase.from("drivers").insert({ name, phone, license_no: licenseNo, status })
    }
    resetForm(); setShowForm(false); fetchDrivers()
  }

  function handleEdit(d: Driver) {
    setEditing(d); setName(d.name); setPhone(d.phone); setLicenseNo(d.license_no); setStatus(d.status); setShowForm(true)
  }

  return (
    <div>
      <PageHeader titleKey="drivers.title" />
      <div className="mb-4 flex justify-end">
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("drivers.new_driver")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{editing ? "Edit" : "New"} Driver</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("drivers.name")}</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("drivers.phone")}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("drivers.license_no")}</label>
                <input value={licenseNo} onChange={e => setLicenseNo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("drivers.status")}</label>
                <select value={status} onChange={e => setStatus(e.target.value as "active" | "inactive")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                  <option value="active">{t("drivers.active")}</option>
                  <option value="inactive">{t("drivers.inactive")}</option>
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
      ) : drivers.length === 0 ? (
        <p className="py-8 text-center text-sm text-black">{t("drivers.no_drivers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-xs font-medium uppercase text-black"><th className="px-4 py-3">{t("drivers.name")}</th><th className="px-4 py-3">{t("drivers.phone")}</th><th className="px-4 py-3">{t("drivers.license_no")}</th><th className="px-4 py-3">{t("drivers.status")}</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-black">{d.name}</td>
                  <td className="px-4 py-3 text-black">{d.phone}</td>
                  <td className="px-4 py-3 text-black">{d.license_no}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.status === "active" ? "bg-emerald-100 text-black" : "bg-gray-100 text-black"}`}>{d.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => handleEdit(d)} className="rounded-lg p-1.5 hover:bg-gray-100"><Pencil size={16} className="text-black" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
