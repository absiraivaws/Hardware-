"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowUpDown, ArrowUp, ArrowDown, Landmark, Wallet, Users, Truck, TrendingDown, TrendingUp, Pencil, X, Check, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { invalidateCache } from "@/lib/query-cache"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type LedgerEntry = Database["public"]["Tables"]["ledger_entries"]["Row"]

interface CustomerSale {
  id: string
  invoice_no: string
  created_at: string
  grand_total: number
  amount_paid: number
  balance_due: number
  status: string
}

interface SupplierPurchase {
  id: string
  po_no: string
  created_at: string
  grand_total: number
  amount_paid: number
  balance_due: number
  status: string
}

type Tab = "cash" | "bank" | "debtors" | "creditors" | "expenses" | "income"

interface CustomerBalance {
  id: string
  code: string
  name: string
  phone: string | null
  credit_balance: number
  entries: LedgerEntry[]
}

interface SupplierBalance {
  id: string
  code: string
  name: string
  contact_person: string | null
  entries: LedgerEntry[]
}

export default function FinancialLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const router = useRouter()
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<Tab>("cash")
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [customers, setCustomers] = useState<CustomerBalance[]>([])
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([])
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [customerSales, setCustomerSales] = useState<CustomerSale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [supplierPurchases, setSupplierPurchases] = useState<SupplierPurchase[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [editingOpening, setEditingOpening] = useState(false)
  const [openingInput, setOpeningInput] = useState("")
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editDate, setEditDate] = useState("")
  const [entityCodes, setEntityCodes] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setLoading(true)
    setSortKey("created_at")
    setSortDir("asc")
    setSelectedEntity(null)
    setEditingOpening(false)
    const supabase = createClient()

    if (activeTab === "cash" || activeTab === "bank" || activeTab === "expenses" || activeTab === "income") {
      const ledgerType = activeTab === "expenses" ? "expense" : activeTab === "income" ? "income" : activeTab
      Promise.all([
        supabase.from("ledger_entries").select("*").eq("ledger_type", ledgerType).order("created_at", { ascending: false }).limit(500),
        (activeTab === "cash" || activeTab === "bank") ? supabase.from("company_settings").select(`cash_opening_balance,bank_opening_balance`).single() : Promise.resolve(null),
      ]).then(([ledgerRes, settingsRes]) => {
        if (ledgerRes.data) setEntries(ledgerRes.data as LedgerEntry[])
        if (settingsRes?.data) {
          const bal = activeTab === "cash" ? Number((settingsRes.data as Record<string, unknown>).cash_opening_balance) : Number((settingsRes.data as Record<string, unknown>).bank_opening_balance)
          setOpeningBalance(bal)
        }
        setLoading(false)
      })
    } else if (activeTab === "debtors") {
      Promise.all([
        supabase.from("customers").select("*").gt("credit_balance", 0).order("name"),
        supabase.from("ledger_entries").select("*").eq("ledger_type", "customer").order("created_at", { ascending: false }),
      ]).then(([custRes, ledgerRes]) => {
        const allEntries = (ledgerRes.data ?? []) as LedgerEntry[]
        const custList: CustomerBalance[] = ((custRes.data ?? []) as Database["public"]["Tables"]["customers"]["Row"][]).map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          phone: c.phone,
          credit_balance: c.credit_balance,
          entries: allEntries.filter((e) => e.reference_id === c.id),
        }))
        setCustomers(custList)
        setLoading(false)
      })
    } else if (activeTab === "creditors") {
      Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("ledger_entries").select("*").eq("ledger_type", "supplier").order("created_at", { ascending: false }),
      ]).then(([supRes, ledgerRes]) => {
        const allEntries = (ledgerRes.data ?? []) as LedgerEntry[]
        const supList: SupplierBalance[] = ((supRes.data ?? []) as Database["public"]["Tables"]["suppliers"]["Row"][]).map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          contact_person: s.contact_person,
          entries: allEntries.filter((e) => e.reference_id === s.id),
        }))
        setSuppliers(supList)
        setLoading(false)
      })
    }
  }, [activeTab])

  // Fetch entity codes (customer/supplier) for cash/bank/expenses/income entries
  useEffect(() => {
    if (entries.length === 0) return
    const supabase = createClient()
    const custIds = new Set<string>()
    const supIds = new Set<string>()
    const saleIds = new Set<string>()
    for (const e of entries) {
      if (e.ledger_type === "customer" && e.reference_id) custIds.add(e.reference_id)
      if (e.ledger_type === "supplier" && e.reference_id) supIds.add(e.reference_id)
      if ((e.reference_type === "sale" || e.reference_type === "payment") && e.reference_id) saleIds.add(e.reference_id)
    }
    const fetchCodes = async () => {
      const map: Record<string, string> = {}
      if (custIds.size > 0) {
        const { data } = await supabase.from("customers").select("id, code").in("id", [...custIds])
        data?.forEach((c) => { map[c.id] = c.code })
      }
      if (supIds.size > 0) {
        const { data } = await supabase.from("suppliers").select("id, code").in("id", [...supIds])
        data?.forEach((s) => { map[s.id] = s.code })
      }
      if (saleIds.size > 0) {
        const { data } = await supabase.from("sales").select("id, customer_id").in("id", [...saleIds])
        const custFromSales = [...new Set(data?.map((s) => s.customer_id).filter(Boolean))]
        if (custFromSales.length > 0) {
          const { data: custs } = await supabase.from("customers").select("id, code").in("id", custFromSales)
          custs?.forEach((c) => {
            data?.filter((s) => s.customer_id === c.id).forEach((s) => { map[s.id] = c.code })
          })
        }
      }
      setEntityCodes(map)
    }
    fetchCodes()
  }, [entries])

  useEffect(() => {
    const supabase = createClient()
    if (!selectedEntity || activeTab !== "debtors") { setCustomerSales([]); return }
    setSalesLoading(true)
    supabase
      .from("sales")
      .select("id, invoice_no, created_at, grand_total, amount_paid, balance_due, status")
      .eq("customer_id", selectedEntity)
      .gt("balance_due", 0)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setCustomerSales(data as CustomerSale[])
        setSalesLoading(false)
      })
  }, [selectedEntity, activeTab])

  useEffect(() => {
    const supabase = createClient()
    if (!selectedEntity || activeTab !== "creditors") { setSupplierPurchases([]); return }
    setPurchasesLoading(true)
    supabase
      .from("purchase_orders")
      .select("id, po_no, created_at, grand_total, amount_paid, balance_due, status")
      .eq("supplier_id", selectedEntity)
      .gt("balance_due", 0)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setSupplierPurchases(data as SupplierPurchase[])
        setPurchasesLoading(false)
      })
  }, [selectedEntity, activeTab])

  const entityEntries = useMemo(() => {
    if (!selectedEntity) return []
    if (activeTab === "debtors") {
      const c = customers.find((c) => c.id === selectedEntity)
      return c?.entries ?? []
    }
    if (activeTab === "creditors") {
      const s = suppliers.find((s) => s.id === selectedEntity)
      return s?.entries ?? []
    }
    return []
  }, [selectedEntity, customers, suppliers, activeTab])

  const entityBalance = useMemo(() => {
    if (activeTab === "debtors") {
      const c = customers.find((c) => c.id === selectedEntity)
      return c?.credit_balance ?? 0
    }
    if (activeTab === "creditors") {
      const s = suppliers.find((s) => s.id === selectedEntity)
      if (!s) return 0
      const debit = s.entries.filter((e) => e.entry_type === "debit").reduce((sum, e) => sum + Number(e.amount), 0)
      const credit = s.entries.filter((e) => e.entry_type === "credit").reduce((sum, e) => sum + Number(e.amount), 0)
      return debit - credit
    }
    return 0
  }, [selectedEntity, customers, suppliers, activeTab])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedEntries = useMemo(() => {
    const source = selectedEntity ? entityEntries : entries
    const sorted = [...source].sort((a, b) => {
      let cmp = 0
      if (sortKey === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortKey === "description") {
        cmp = (a.description || "").localeCompare(b.description || "")
      } else if (sortKey === "debit") {
        const aVal = a.entry_type === "debit" ? Number(a.amount) : 0
        const bVal = b.entry_type === "debit" ? Number(b.amount) : 0
        cmp = aVal - bVal
      } else if (sortKey === "credit") {
        const aVal = a.entry_type === "credit" ? Number(a.amount) : 0
        const bVal = b.entry_type === "credit" ? Number(b.amount) : 0
        cmp = aVal - bVal
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [entries, entityEntries, selectedEntity, sortKey, sortDir])

  const allRows = useMemo(() => {
    if (selectedEntity) return sortedEntries
    if (activeTab !== "cash" && activeTab !== "bank") return sortedEntries
    if (openingBalance === 0) return sortedEntries
    const openingRow = { id: "opening", created_at: "", description: "Opening Balance", entry_type: "debit", amount: openingBalance } as LedgerEntry
    return [openingRow, ...sortedEntries]
  }, [sortedEntries, openingBalance, activeTab, selectedEntity])

  const catLabel = (rt: string | null) => {
    if (rt === "sale") return "Sale"
    if (rt === "payment") return "Payment"
    if (rt === "expense") return "Expense"
    if (rt === "income") return "Income"
    if (rt === "expense_pair") return "Transfer"
    if (rt === "customer") return "Customer"
    if (rt === "supplier") return "Supplier"
    return rt ?? "—"
  }

  const refNo = (e: LedgerEntry) => {
    const m = e.description?.match(/(INV-\S+|PO-\S+|GRN-\S+|RET-\S+)/)
    return m ? m[1] : "—"
  }

  const cleanDesc = (e: LedgerEntry) => {
    if (!e.description) return "—"
    return e.description
      .replace(/^(Sale |Payment received |Payment for |Purchase )/, "")
      .replace(/\s+(INV-\S+|PO-\S+|GRN-\S+|RET-\S+).*$/, "")
      .trim() || "—"
  }

  const filteredRows = useMemo(() => {
    if (!searchQuery) return allRows
    const q = searchQuery.toLowerCase()
    return allRows.filter((e) => {
      const text = [
        e.created_at,
        e.description,
        refNo(e),
        catLabel(e.reference_type),
        e.ledger_type,
        e.reference_id ?? "",
        entityCodes[e.reference_id ?? ""] ?? "",
        formatCurrency(Number(e.amount), "en"),
      ].join(" ").toLowerCase()
      return text.includes(q)
    })
  }, [allRows, searchQuery, entityCodes])

  const totalDebit = useMemo(
    () => allRows.reduce((s, e) => s + (e.entry_type === "debit" ? Number(e.amount) : 0), 0),
    [allRows],
  )
  const totalCredit = useMemo(
    () => allRows.reduce((s, e) => s + (e.entry_type === "credit" ? Number(e.amount) : 0), 0),
    [allRows],
  )

  const showTable = activeTab === "cash" || activeTab === "bank" || activeTab === "expenses" || activeTab === "income" || (selectedEntity && activeTab !== "debtors" && activeTab !== "creditors")

  const handleSaveOpening = async () => {
    const val = parseFloat(openingInput)
    if (isNaN(val) || val < 0) return
    const supabase = createClient()
    const col = activeTab === "cash" ? "cash_opening_balance" : "bank_opening_balance"
    const { data: settings } = await supabase.from("company_settings").select("id").single()
    if (settings?.id) {
      const { error } = await supabase.from("company_settings").update({ [col]: val }).eq("id", settings.id)
      if (!error) {
        setOpeningBalance(val)
        setEditingOpening(false)
      }
    }
  }

  function handleEditClick(e: LedgerEntry) {
    setEditingEntryId(e.id)
    setEditAmount(String(e.amount))
    setEditDescription(e.description ?? "")
    setEditDate(e.created_at.slice(0, 10))
  }

  function handleEditCancel() {
    setEditingEntryId(null)
    setEditAmount("")
    setEditDescription("")
    setEditDate("")
  }

  async function handleEditSave(e: LedgerEntry) {
    const val = parseFloat(editAmount)
    if (isNaN(val) || val < 0) return
    const supabase = createClient()
    const now = new Date()
    const pad2 = (n: number) => String(n).padStart(2, "0")
    const offset = -now.getTimezoneOffset()
    const tz = `${offset >= 0 ? "+" : "-"}${pad2(Math.floor(Math.abs(offset) / 60))}:${pad2(Math.abs(offset) % 60)}`
    const ts = `${editDate}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}${tz}`
    const updates: Record<string, unknown> = { amount: val, description: editDescription, created_at: ts }

    if (e.reference_id && e.reference_type === "expense_pair") {
      await supabase.from("ledger_entries").update(updates).eq("reference_id", e.reference_id)
    }
    await supabase.from("ledger_entries").update(updates).eq("id", e.id)

    if (!e.reference_id) {
      setEditingEntryId(null)
      setEditAmount(""); setEditDescription(""); setEditDate("")
      const ledgerType = activeTab === "expenses" ? "expense" : activeTab === "income" ? "income" : activeTab
      const { data: fresh } = await supabase.from("ledger_entries").select("*").eq("ledger_type", ledgerType).order("created_at", { ascending: false }).limit(500)
      if (fresh) setEntries(fresh as LedgerEntry[])
      return
    }

    // Cascade to sale: recalculate amount_paid from ALL linked ledger entries
    if ((e.reference_type === "sale" || e.reference_type === "payment") && (e.ledger_type === "cash" || e.ledger_type === "bank")) {
      const saleId = e.reference_id
      const { data: sale } = await supabase.from("sales").select("id, grand_total, customer_id").eq("id", saleId).maybeSingle()
      if (sale) {
        const { data: allEntries } = await supabase
          .from("ledger_entries")
          .select("amount, entry_type, ledger_type")
          .in("ledger_type", ["cash", "bank"])
          .eq("reference_id", saleId)
          .in("reference_type", ["sale", "payment"])
        const totalPaid = (allEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string; ledger_type: string }) => {
          return entry.entry_type === "debit" ? sum + Number(entry.amount) : sum - Number(entry.amount)
        }, 0)
        const newDue = Math.max(0, Number(sale.grand_total) - totalPaid)
        await supabase.from("sales").update({ amount_paid: totalPaid, balance_due: newDue, status: newDue > 0 ? "pending" : "completed" } as never).eq("id", sale.id)

        // Also recalculate customer credit_balance if sale has a customer
        if (sale.customer_id) {
          const { data: allCustEntries } = await supabase
            .from("ledger_entries")
            .select("amount, entry_type")
            .eq("ledger_type", "customer")
            .eq("reference_id", sale.customer_id)
          const netCredit = (allCustEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string }) => {
            return entry.entry_type === "credit" ? sum + Number(entry.amount) : sum - Number(entry.amount)
          }, 0)
          const { data: allCustomerSales } = await supabase.from("sales").select("grand_total").eq("customer_id", sale.customer_id)
          const totalSales = (allCustomerSales ?? []).reduce((sum: number, s: { grand_total: number }) => sum + Number(s.grand_total), 0)
          const newCreditBalance = Math.max(0, totalSales - netCredit)
          await supabase.from("customers").update({ credit_balance: newCreditBalance } as never).eq("id", sale.customer_id)
        }
      } else {
        // Try purchase (payment entries from purchases use po.id as reference_id)
        const { data: purchase } = await supabase.from("purchases").select("id, grand_total").eq("id", saleId).maybeSingle()
        if (purchase) {
          const { data: allEntries } = await supabase
            .from("ledger_entries")
            .select("amount, entry_type, ledger_type")
            .in("ledger_type", ["cash", "bank"])
            .eq("reference_type", "payment")
            .eq("reference_id", purchase.id)
          const totalPaid = (allEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string }) => {
            return entry.entry_type === "credit" ? sum + Number(entry.amount) : sum
          }, 0)
          const newDue = Math.max(0, Number(purchase.grand_total) - totalPaid)
          await supabase.from("purchases").update({ amount_paid: totalPaid, balance_due: newDue } as never).eq("id", purchase.id)
        }
      }
    }

    // Cascade to customer: recalculate credit_balance from ALL linked ledger entries
    if (e.reference_type === "payment" && e.ledger_type === "customer") {
      const custId = e.reference_id
      const { data: allCustEntries } = await supabase
        .from("ledger_entries")
        .select("amount, entry_type")
        .eq("ledger_type", "customer")
        .eq("reference_id", custId)
      const netCredit = (allCustEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string }) => {
        return entry.entry_type === "credit" ? sum + Number(entry.amount) : sum - Number(entry.amount)
      }, 0)
      const { data: sales } = await supabase.from("sales").select("grand_total").eq("customer_id", custId)
      const totalSales = (sales ?? []).reduce((sum: number, s: { grand_total: number }) => sum + Number(s.grand_total), 0)
      const newCreditBalance = Math.max(0, totalSales - netCredit)
      await supabase.from("customers").update({ credit_balance: newCreditBalance } as never).eq("id", custId)

      // Recalculate all linked sales for this customer
      const { data: customerSales } = await supabase.from("sales").select("id, grand_total").eq("customer_id", custId)
      for (const sale of (customerSales ?? [])) {
        const { data: allEntries } = await supabase
          .from("ledger_entries")
          .select("amount, entry_type, ledger_type")
          .in("ledger_type", ["cash", "bank"])
          .eq("reference_id", (sale as { id: string }).id)
          .in("reference_type", ["sale", "payment"])
        const totalPaid = (allEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string }) => {
          return entry.entry_type === "debit" ? sum + Number(entry.amount) : sum - Number(entry.amount)
        }, 0)
        const newDue = Math.max(0, Number((sale as { grand_total: number }).grand_total) - totalPaid)
        await supabase.from("sales").update({ amount_paid: totalPaid, balance_due: newDue, status: newDue > 0 ? "pending" : "completed" } as never).eq("id", (sale as { id: string }).id)
      }
    }

    // Cascade to purchases: recalculate from supplier entries
    if (e.ledger_type === "supplier") {
      const { data: supplierEntries } = await supabase
        .from("ledger_entries")
        .select("amount, entry_type")
        .eq("ledger_type", "supplier")
        .eq("reference_id", e.reference_id)
      const netDebit = (supplierEntries ?? []).reduce((sum: number, entry: { amount: number; entry_type: string }) => {
        return entry.entry_type === "debit" ? sum + Number(entry.amount) : sum - Number(entry.amount)
      }, 0)
      const { data: purchases } = await supabase.from("purchases").select("id, grand_total").eq("supplier_id", e.reference_id)
      for (const purchase of (purchases ?? [])) {
        const amountPaid = netDebit // total credited to supplier = what we've paid
        const newDue = Math.max(0, Number((purchase as { grand_total: number }).grand_total) - amountPaid)
        await supabase.from("purchases").update({ amount_paid: amountPaid, balance_due: newDue } as never).eq("id", (purchase as { id: string }).id)
      }
    }

    setEditingEntryId(null)
    setEditAmount("")
    setEditDescription("")
    setEditDate("")

    invalidateCache("sales")
    invalidateCache("purchase_orders")

    const ledgerType = activeTab === "expenses" ? "expense" : activeTab === "income" ? "income" : activeTab
    const { data: fresh } = await supabase.from("ledger_entries").select("*").eq("ledger_type", ledgerType).order("created_at", { ascending: false }).limit(500)
    if (fresh) setEntries(fresh as LedgerEntry[])
  }

  const SortIcon = (col: string) => {
    if (sortKey !== col) return ArrowUpDown
    return sortDir === "asc" ? ArrowUp : ArrowDown
  }

  const columns = [
    { key: "created_at", label: t("common.date"), align: "text-left" },
    { key: "description", label: t("common.description"), align: "text-left" },
    { key: "debit", label: "Inflow / Debit", align: "text-right" },
    { key: "credit", label: "Outflow / Credit", align: "text-right" },
  ]

  const canEdit = (e: LedgerEntry) => !selectedEntity && (activeTab === "cash" || activeTab === "bank" || activeTab === "expenses" || activeTab === "income")

  let runningBalance = 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">{t("ledgers.title")}</h1>
        <p className="text-sm text-black mt-1">{t("ledgers.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("cash")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "cash"
              ? "bg-emerald-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Wallet size={16} />
          Cash Book
        </button>
        <button
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "bank"
              ? "bg-emerald-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Landmark size={16} />
          Bank Book
        </button>
        <button
          onClick={() => setActiveTab("debtors")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "debtors"
              ? "bg-emerald-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Users size={16} />
          Debtors
        </button>
        <button
          onClick={() => setActiveTab("creditors")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "creditors"
              ? "bg-emerald-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <Truck size={16} />
          Creditors
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "expenses"
              ? "bg-red-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <TrendingDown size={16} />
          {t("ledgers.expenses")}
        </button>
        <button
          onClick={() => setActiveTab("income")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === "income"
              ? "bg-emerald-100 text-black"
              : "bg-gray-100 text-black hover:bg-gray-200"
          }`}
        >
          <TrendingUp size={16} />
          {t("ledgers.income")}
        </button>
      </div>

      {/* Debtors / Creditors entity list */}
      {(activeTab === "debtors" || activeTab === "creditors") && !selectedEntity && (
        <div className="mb-6">
          {loading ? (
            <p className="text-sm text-black">{t("common.loading")}</p>
          ) : activeTab === "debtors" && customers.length === 0 ? (
            <p className="text-sm text-black">No outstanding debtors</p>
          ) : activeTab === "creditors" && suppliers.length === 0 ? (
            <p className="text-sm text-black">No creditors</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Outstanding</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(activeTab === "debtors" ? customers : suppliers).map((entity) => {
                    const balance = activeTab === "debtors"
                      ? (entity as CustomerBalance).credit_balance
                      : (() => {
                          const s = entity as SupplierBalance
                          const d = s.entries.filter((e) => e.entry_type === "debit").reduce((sum, e) => sum + Number(e.amount), 0)
                          const c = s.entries.filter((e) => e.entry_type === "credit").reduce((sum, e) => sum + Number(e.amount), 0)
                          return d - c
                        })()
                    return (
                      <tr key={entity.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-black font-mono">{entity.code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-black">{entity.name}</td>
                        <td className="px-4 py-3 text-sm text-black">
                          {activeTab === "debtors"
                            ? (entity as CustomerBalance).phone ?? "—"
                            : (entity as SupplierBalance).contact_person ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-black">
                          {formatCurrency(balance, locale)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedEntity(entity.id)}
                            className="rounded-lg border px-3 py-1 text-xs font-medium text-black hover:bg-gray-50"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Back button when viewing entity ledger */}
      {selectedEntity && (
        <button
          onClick={() => setSelectedEntity(null)}
          className="mb-4 text-sm font-medium text-black hover:text-black"
        >
          &larr; Back to {activeTab === "debtors" ? "Debtors" : "Creditors"}
        </button>
      )}

      {/* Customer Sales Summary (debtors only) */}
      {selectedEntity && activeTab === "debtors" && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-black">Sale History</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Pending</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-black">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {salesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td></tr>
                  ))
                ) : customerSales.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-black">No sales found</td></tr>
                ) : (
                  customerSales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-black">{s.invoice_no}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">{formatDate(s.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.grand_total, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.amount_paid, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(s.balance_due, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "completed" ? "bg-emerald-100 text-black" : "bg-amber-100 text-black"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/${locale}/sales/history?sale_id=${s.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-black hover:bg-gray-50"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {customerSales.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-blue-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Sales</p>
                <p className="text-lg font-bold text-black">{formatCurrency(customerSales.reduce((s, x) => s + Number(x.grand_total), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Paid</p>
                <p className="text-lg font-bold text-black">{formatCurrency(customerSales.reduce((s, x) => s + Number(x.amount_paid), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Pending</p>
                <p className="text-lg font-bold text-black">{formatCurrency(customerSales.reduce((s, x) => s + Number(x.balance_due), 0), locale)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEntity && activeTab === "creditors" && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-black">Purchase History</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">PO No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Pending</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-black">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {purchasesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td></tr>
                  ))
                ) : supplierPurchases.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-black">No purchases found</td></tr>
                ) : (
                  supplierPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-black">{p.po_no}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">{formatDate(p.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(p.grand_total, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(p.amount_paid, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">{formatCurrency(p.balance_due, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "completed" ? "bg-emerald-100 text-black" : "bg-amber-100 text-black"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => router.push(`/${locale}/purchases/${p.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-black hover:bg-gray-50"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {supplierPurchases.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-blue-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Purchases</p>
                <p className="text-lg font-bold text-black">{formatCurrency(supplierPurchases.reduce((s, x) => s + Number(x.grand_total), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Paid</p>
                <p className="text-lg font-bold text-black">{formatCurrency(supplierPurchases.reduce((s, x) => s + Number(x.amount_paid), 0), locale)}</p>
              </div>
              <div className="rounded-lg border bg-amber-50 p-3 text-center">
                <p className="text-xs font-medium text-black">Total Pending</p>
                <p className="text-lg font-bold text-black">{formatCurrency(supplierPurchases.reduce((s, x) => s + Number(x.balance_due), 0), locale)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {showTable && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-emerald-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-black">
              "Total Inflow"
            </div>
            <div className="mt-1 text-lg font-bold text-black">{formatCurrency(totalDebit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-red-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-black">
              "Total Outflow"
            </div>
            <div className="mt-1 text-lg font-bold text-black">{formatCurrency(totalCredit, locale)}</div>
          </div>
          <div className="rounded-lg border bg-blue-50 p-4 text-center">
            <div className="text-xs font-medium uppercase tracking-wider text-black">Balance</div>
            <div className="mt-1 text-lg font-bold text-black">
              {selectedEntity
                ? formatCurrency(entityBalance, locale)
                : formatCurrency(totalDebit - totalCredit, locale)}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {showTable && (
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all columns..."
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}

      {/* Transactions Table */}
      {showTable && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => {
                  const active = sortKey === col.key
                  const Icon = SortIcon(col.key)
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`cursor-pointer select-none px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider ${active ? "text-black" : "text-black"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <Icon size={12} className="shrink-0" />
                      </span>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Ref #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Customer / Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Category</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-black">
                  Running Balance
                </th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) :                 filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-black">{searchQuery ? "No matching entries" : t("common.no_results")}</td>
                </tr>
              ) : (
                filteredRows.map((e) => {
                  if (e.id === "opening") {
                    runningBalance = runningBalance + Number(e.amount)
                    return (
                      <tr key="opening" className="bg-amber-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-black">
                          {editingOpening ? (
                            <input
                              type="number"
                              value={openingInput}
                              onChange={(e) => setOpeningInput(e.target.value)}
                              className="w-32 rounded border px-2 py-1 text-sm"
                              autoFocus
                              onKeyDown={(ev) => { if (ev.key === "Enter") handleSaveOpening(); if (ev.key === "Escape") setEditingOpening(false) }}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              Opening Balance
                              <button
                                onClick={() => { setOpeningInput(String(openingBalance)); setEditingOpening(true) }}
                                className="text-black hover:text-black"
                                title="Edit opening balance"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                          {editingOpening ? "—" : formatCurrency(Number(e.amount), locale)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">—</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-black">
                          {formatCurrency(runningBalance, locale)}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    )
                  }
                  runningBalance =
                    e.entry_type === "debit"
                      ? runningBalance + Number(e.amount)
                      : runningBalance - Number(e.amount)
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 group">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {editingEntryId === e.id ? (
                          <input type="date" value={editDate} onChange={ev => setEditDate(ev.target.value)} className="w-32 rounded border px-2 py-1 text-sm" />
                        ) : (
                          formatDate(e.created_at)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-black">{refNo(e)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-black">
                        {e.ledger_type === "customer" || e.ledger_type === "supplier"
                          ? entityCodes[e.reference_id ?? ""] ?? "—"
                          : (e.reference_type === "sale" || e.reference_type === "payment") && e.reference_id
                            ? entityCodes[e.reference_id] ?? "—"
                            : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                        {editingEntryId === e.id ? (
                          <input value={editDescription} onChange={ev => setEditDescription(ev.target.value)} className="w-40 rounded border px-2 py-1 text-sm" placeholder="Description" />
                        ) : (
                          cleanDesc(e)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-black">{catLabel(e.reference_type)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                        {editingEntryId === e.id ? (
                          e.entry_type === "debit" ? <input type="number" value={editAmount} onChange={ev => setEditAmount(ev.target.value)} className="w-28 rounded border px-2 py-1 text-sm" min="0" step="0.01" /> : "—"
                        ) : (
                          e.entry_type === "debit" ? formatCurrency(Number(e.amount), locale) : "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-black">
                        {editingEntryId === e.id ? (
                          e.entry_type === "credit" ? <input type="number" value={editAmount} onChange={ev => setEditAmount(ev.target.value)} className="w-28 rounded border px-2 py-1 text-sm" min="0" step="0.01" /> : "—"
                        ) : (
                          e.entry_type === "credit" ? formatCurrency(Number(e.amount), locale) : "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-black">
                        {formatCurrency(runningBalance, locale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {editingEntryId === e.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => handleEditSave(e)} className="rounded-lg p-1.5 hover:bg-emerald-50 text-black"><Check size={16} /></button>
                            <button onClick={handleEditCancel} className="rounded-lg p-1.5 hover:bg-red-50 text-black"><X size={16} /></button>
                          </div>
                        ) : canEdit(e) ? (
                          <button onClick={() => handleEditClick(e)} className="rounded-lg p-1.5 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity" title="Edit"><Pencil size={14} className="text-black" /></button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
