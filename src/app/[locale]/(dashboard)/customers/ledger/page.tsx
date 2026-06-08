"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"]

export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations("customers")
  const tc = useTranslations("common")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from("customers").select("*").order("name").then(({ data }) => {
      if (data) setCustomers(data)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("ledger_type", "customer")
      .eq("reference_id", selectedId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setEntries(data)
        setLoading(false)
      })
  }, [selectedId])

  let runningBalance = 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t("customer_ledger")}</h1>
      </div>

      <div className="mb-6 max-w-sm">
        <label className="mb-1 block text-xs font-medium text-gray-800">{t("customer")}</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">{t("select_customer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.phone ?? ""}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">{t("date")}</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">{t("description")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">{t("debit")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">{t("credit")}</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700">{t("balance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-700">{tc("loading")}</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-700">{tc("no_results")}</td>
              </tr>
            ) : (
              entries.map((e) => {
                runningBalance =
                  e.entry_type === "debit"
                    ? runningBalance + Number(e.amount)
                    : runningBalance - Number(e.amount)
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {formatDate(e.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {e.description ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {e.entry_type === "debit" ? formatCurrency(Number(e.amount), locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {e.entry_type === "credit" ? formatCurrency(Number(e.amount), locale) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-700">
                      {formatCurrency(runningBalance, locale)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
