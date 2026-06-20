"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/format"
import { Plus, X, TrendingDown, TrendingUp, Wallet } from "lucide-react"

interface Entry {
  id: string
  ledger_type: "expense" | "income"
  entry_type: "debit" | "credit"
  amount: number
  description: string | null
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

interface Category {
  id: string
  name: string
  type: "expense" | "income"
}

const PAYMENT_METHODS = ["cash", "bank_transfer", "lanka_qr", "card", "cheque", "credit"] as const
type PaymentMethod = typeof PAYMENT_METHODS[number]

const PAYMENT_LEDGER_MAP: Record<PaymentMethod, string | null> = {
  cash: "cash",
  bank_transfer: "bank",
  lanka_qr: "bank",
  card: "bank",
  cheque: "bank",
  credit: null,
}

const BUILTIN_EXPENSE = ["rent", "electricity", "water", "wages", "transport", "telephone", "stationery", "maintenance", "advertising", "insurance", "tax", "miscellaneous"]
const BUILTIN_INCOME = ["interest_income", "other_income"]

function storedPaymentMethod(): PaymentMethod {
  if (typeof window === "undefined") return "cash"
  try { return (localStorage.getItem("expense_payment_method") as PaymentMethod) || "cash" } catch { return "cash" }
}

export default function ExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<"expense" | "income" | null>(null)
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [todayEntries, setTodayEntries] = useState<Entry[]>([])
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  async function fetchEntries() {
    const today = new Date().toISOString().slice(0, 10)
    const [allRes, todayRes, catRes] = await Promise.all([
      supabase.from("ledger_entries").select("*").in("ledger_type", ["expense", "income"]).order("created_at", { ascending: false }).limit(200),
      supabase.from("ledger_entries").select("*").in("ledger_type", ["expense", "income"]).gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).order("created_at", { ascending: false }),
      supabase.from("expense_categories").select("*").order("name"),
    ])
    if (allRes.data) setEntries(allRes.data as Entry[])
    if (todayRes.data) setTodayEntries(todayRes.data as Entry[])
    if (catRes.data) setCustomCategories(catRes.data as Category[])
    setLoading(false)
  }

  useEffect(() => { setPaymentMethod(storedPaymentMethod()); fetchEntries() }, [])

  function resetForm() { setCategory(""); setDescription(""); setAmount(""); setEntryDate(new Date().toISOString().slice(0, 10)); setShowNewCatInput(false); setNewCatName("") }

  async function handleSave(type: "expense" | "income") {
    if (!amount || Number(amount) <= 0) return
    const catLabel = category.startsWith("custom_")
      ? category.replace("custom_", "")
      : category
        ? t(`expenses.categories.${category}`)
        : ""
    const desc = `${catLabel}${description ? ` - ${description}` : ""}` || type
    const now = new Date()
    const pad2 = (n: number) => String(n).padStart(2, "0")
    const offset = -now.getTimezoneOffset()
    const tz = `${offset >= 0 ? "+" : "-"}${pad2(Math.floor(Math.abs(offset) / 60))}:${pad2(Math.abs(offset) % 60)}`
    const ts = `${entryDate}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}${tz}`
    const val = Number(amount)
    const entryType = type === "expense" ? "credit" : "debit"
    const mirrorLedger: string | null = PAYMENT_LEDGER_MAP[paymentMethod]

    try { localStorage.setItem("expense_payment_method", paymentMethod) } catch { /* ignore */ }

    const pairKey = crypto.randomUUID()
    const ledgerTypes = mirrorLedger ? [type, mirrorLedger] : [type]
    const { data: lastEntries } = await supabase.from("ledger_entries").select("ledger_type, balance_after").in("ledger_type", ledgerTypes).order("created_at", { ascending: false }).limit(ledgerTypes.length)
    const lastBal: Record<string, number> = {}
    if (lastEntries) {
      for (const e of lastEntries as { ledger_type: string; balance_after: number }[]) {
        if (!(e.ledger_type in lastBal)) lastBal[e.ledger_type] = Number(e.balance_after)
      }
    }
    const inserts: Record<string, unknown>[] = [
      { ledger_type: type, entry_type: entryType, amount: val, description: desc, balance_after: (lastBal[type] ?? 0) + (entryType === "debit" ? val : -val), reference_type: "expense_pair", reference_id: pairKey, created_at: ts },
    ]
    if (mirrorLedger) {
      inserts.push({ ledger_type: mirrorLedger, entry_type: entryType, amount: val, description: desc, balance_after: (lastBal[mirrorLedger] ?? 0) + (entryType === "debit" ? val : -val), reference_type: "expense_pair", reference_id: pairKey, created_at: ts })
    }
    await supabase.from("ledger_entries").insert(inserts)

    resetForm()
    setShowForm(null)
    fetchEntries()
  }

  async function handleAddCategory() {
    if (!newCatName.trim() || !showForm) return
    const { data } = await supabase.from("expense_categories").insert({ name: newCatName.trim(), type: showForm }).select().single()
    if (data) {
      setCustomCategories(prev => [...prev, data as Category])
      setCategory("custom_" + newCatName.trim())
    }
    setNewCatName("")
    setShowNewCatInput(false)
  }

  const categories = (showForm === "expense" ? BUILTIN_EXPENSE : BUILTIN_INCOME).map(k => ({ value: k, label: t(`expenses.categories.${k}`) }))
  const userCats = customCategories.filter(c => c.type === showForm).map(c => ({ value: "custom_" + c.name, label: c.name }))
  const allCategories = [...categories, ...userCats]

  const todayTotalExpense = todayEntries.filter(e => e.ledger_type === "expense").reduce((s, e) => s + e.amount, 0)
  const todayTotalIncome = todayEntries.filter(e => e.ledger_type === "income").reduce((s, e) => s + e.amount, 0)
  const allTotalExpense = entries.filter(e => e.ledger_type === "expense").reduce((s, e) => s + e.amount, 0)
  const allTotalIncome = entries.filter(e => e.ledger_type === "income").reduce((s, e) => s + e.amount, 0)

  function renderRow(e: Entry, showDate = false) {
    return (
      <tr key={e.id} className="border-b last:border-0">
        {showDate && <td className="px-4 py-3 text-black whitespace-nowrap">{formatDate(e.created_at)}</td>}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${e.ledger_type === "expense" ? "bg-red-100 text-black" : "bg-emerald-100 text-black"}`}>
            {e.ledger_type === "expense" ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {e.ledger_type === "expense" ? t("expenses.expense") : t("expenses.income")}
          </span>
        </td>
        <td className="px-4 py-3 text-black">{e.description || "-"}</td>
        <td className={`px-4 py-3 text-right font-medium ${e.ledger_type === "expense" ? "text-black" : "text-black"}`}>
          {e.ledger_type === "expense" ? "-" : "+"}{formatCurrency(e.amount, locale)}
        </td>
      </tr>
    )
  }

  return (
    <div>
      <PageHeader titleKey="expenses.title" />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100"><TrendingDown size={20} className="text-black" /></div>
            <div>
              <p className="text-xs font-medium text-black">{t("expenses.total_expenses")}</p>
              <p className="text-lg font-bold text-black">{formatCurrency(todayTotalExpense, locale)}</p>
              <p className="text-[10px] text-black">Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100"><TrendingUp size={20} className="text-black" /></div>
            <div>
              <p className="text-xs font-medium text-black">{t("expenses.total_income")}</p>
              <p className="text-lg font-bold text-black">{formatCurrency(todayTotalIncome, locale)}</p>
              <p className="text-[10px] text-black">Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100"><Wallet size={20} className="text-black" /></div>
            <div>
              <p className="text-xs font-medium text-black">{t("expenses.net")}</p>
              <p className={`text-lg font-bold ${todayTotalIncome - todayTotalExpense >= 0 ? "text-black" : "text-black"}`}>
                {formatCurrency(todayTotalIncome - todayTotalExpense, locale)}
              </p>
              <p className="text-[10px] text-black">Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <button onClick={() => { resetForm(); setShowForm("expense") }} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
          <Plus size={16} /> {t("expenses.add_expense")}
        </button>
        <button onClick={() => { resetForm(); setShowForm("income") }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus size={16} /> {t("expenses.add_income")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">{showForm === "expense" ? t("expenses.add_expense") : t("expenses.add_income")}</h2>
              <button onClick={() => setShowForm(null)}><X size={20} className="text-black" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("expenses.date")}</label>
                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("expenses.category")}</label>
                {showNewCatInput ? (
                  <div className="flex gap-2">
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Category name" autoFocus />
                    <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">Add</button>
                    <button onClick={() => setShowNewCatInput(false)} className="rounded-lg border px-3 py-2 text-sm text-black hover:bg-gray-50">Cancel</button>
                  </div>
                ) : (
                  <select value={category} onChange={e => e.target.value === "__new__" ? setShowNewCatInput(true) : setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">-- Select --</option>
                    {allCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    <option value="__new__">+ New Category</option>
                  </select>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        paymentMethod === pm
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-black border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pm === "cash" ? "Cash" : pm === "bank_transfer" ? "Bank" : pm === "lanka_qr" ? "QR" : pm === "card" ? "Card" : pm === "cheque" ? "Cheque" : "Credit"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("expenses.description")}</label>
                <input value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Optional details" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">{t("expenses.amount")}</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(null)} className="rounded-lg border px-4 py-2 text-sm text-black hover:bg-gray-50">{t("common.cancel")}</button>
                <button onClick={() => handleSave(showForm)} disabled={!amount || Number(amount) <= 0} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50">{t("common.save")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-black">{t("expenses.today_summary")}</h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-black">
                <th className="px-4 py-3">{t("expenses.type")}</th>
                <th className="px-4 py-3">{t("expenses.description")}</th>
                <th className="px-4 py-3 text-right">{t("expenses.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {todayEntries.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-black">{t("expenses.no_entries")}</td></tr>
              ) : (
                todayEntries.map(e => renderRow(e))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-black">{t("expenses.all_entries")}</h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-medium uppercase text-black">
                <th className="px-4 py-3">{t("expenses.date")}</th>
                <th className="px-4 py-3">{t("expenses.type")}</th>
                <th className="px-4 py-3">{t("expenses.description")}</th>
                <th className="px-4 py-3 text-right">{t("expenses.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td></tr>)
              ) : entries.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-black">{t("expenses.no_entries")}</td></tr>
              ) : (
                entries.map(e => renderRow(e, true))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-black">{t("expenses.total_expenses")}</span>
            <span className="text-lg font-bold text-black">{formatCurrency(allTotalExpense, locale)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
            <span className="text-sm font-medium text-black">{t("expenses.total_income")}</span>
            <span className="text-lg font-bold text-black">{formatCurrency(allTotalIncome, locale)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
