"use client"

import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, formatDate } from "@/lib/format"
import { use, useEffect, useState } from "react"
import { Banknote, DollarSign, Eye, X } from "lucide-react"
import { CompanyFooter } from "@/components/shared/company-info"
import type { CompanySettings } from "@/components/shared/company-info"
import { getCached, setCache, invalidateCache } from "@/lib/query-cache"
import { useData } from "@/providers/data-provider"

const paymentDetailLabels: Record<string, string> = {
  cheque_number: "Cheque Number",
  bank_code: "Bank Code",
  account_number: "Account Number",
  from_account: "From Account",
  to_account: "To Account",
}

interface SaleRow {
  id: string
  invoice_no: string
  customer_name: string | null
  created_at: string
  grand_total: number
  amount_paid: number
  status: string
  payment_type: string
  [key: string]: unknown
}

interface SaleDetail {
  id: string
  invoice_no: string
  customer_id: string | null
  customer_name: string | null
  subtotal: number
  discount: number
  labour_charge: number
  transport_charge: number
  tax_type: string
  tax_amount: number
  grand_total: number
  payment_type: string
  amount_paid: number
  balance_due: number
  status: string
  cheque_status: string | null
  notes: string | null
  created_at: string
  payment_details: Record<string, string> | null
}

interface SaleItem {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface PaymentRecord {
  id: string
  amount: number
  description: string | null
  created_at: string
}

export default function SaleHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const [sales, setSales] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [viewId, setViewId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [detailItems, setDetailItems] = useState<SaleItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentType, setPaymentType] = useState("cash")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [chequeNumber, setChequeNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [fromAccount, setFromAccount] = useState("")
  const [toAccount, setToAccount] = useState("")
  const { companySettings } = useData()

  async function loadSales(supabaseClient?: ReturnType<typeof createClient>) {
    const supabase = supabaseClient ?? createClient()
    const cacheKey = "sales:list"
    const cached = getCached<SaleRow[]>(cacheKey)
    if (cached) {
      setSales(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("sales")
      .select("id, invoice_no, customer_name, created_at, grand_total, amount_paid, status, payment_type")
      .order("created_at", { ascending: false })
      .limit(200)

    if (data) {
      setSales(data as SaleRow[])
      setCache(cacheKey, data as SaleRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSales(supabase)
  }, [])

  async function openDetail(id: string) {
    setViewId(id)
    setDetail(null)
    setDetailItems([])
    setPaymentHistory([])
    setDetailLoading(true)

    const supabase = createClient()
    const [saleRes, itemsRes, ledgerRes] = await Promise.all([
      supabase.from("sales").select("*").eq("id", id).single(),
      supabase.from("sale_items").select("*").eq("sale_id", id).order("product_name"),
      supabase
        .from("ledger_entries")
        .select("id, amount, description, created_at")
        .eq("reference_type", "payment")
        .ilike("description", `%Payment received%`)
        .order("created_at", { ascending: true }),
    ])

    const saleData = saleRes.data
    if (saleData) setDetail(saleData as SaleDetail)

    if (itemsRes.data) setDetailItems(itemsRes.data as SaleItem[])

    if (ledgerRes.data) {
      const filtered = ledgerRes.data.filter(
        (e) => e.description && e.description.includes((saleData as SaleDetail | null)?.invoice_no ?? ""),
      )
      setPaymentHistory(filtered as PaymentRecord[])
    }

    setDetailLoading(false)
  }

  async function handleRecordPayment() {
    if (!detail || paymentAmount <= 0) return
    const supabase = createClient()
    setPaymentSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const newAmountPaid = Number(detail.amount_paid) + paymentAmount
      const newBalanceDue = Math.max(0, Number(detail.grand_total) - newAmountPaid)
      const newStatus = newBalanceDue > 0 ? "pending" : "completed"

      const updateFields: Record<string, unknown> = {
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
      }

      if (paymentType === "cheque") {
        updateFields.payment_details = {
          cheque_number: chequeNumber,
          bank_code: bankCode,
          account_number: accountNumber,
        }
      } else if (paymentType === "bank_transfer") {
        updateFields.payment_details = {
          from_account: fromAccount,
          to_account: toAccount,
        }
      } else if (paymentType === "cash") {
        updateFields.payment_details = null
      }

      const { error: updateError } = await supabase
        .from("sales")
        .update(updateFields as never)
        .eq("id", detail.id)

      if (updateError) throw updateError

      if (detail.customer_id) {
        const { data: cust } = await supabase
          .from("customers")
          .select("credit_balance")
          .eq("id", detail.customer_id)
          .single()

        if (cust) {
          const currentBalance = Number(cust.credit_balance)
          const newBalance = Math.max(0, currentBalance - paymentAmount)
          await supabase
            .from("customers")
            .update({ credit_balance: newBalance } as never)
            .eq("id", detail.customer_id)
        }
      }

      await supabase.from("ledger_entries").insert({
        ledger_type: "customer",
        reference_id: detail.customer_id,
        reference_type: "payment",
        entry_type: "credit",
        amount: paymentAmount,
        description: `Payment received ${detail.invoice_no}`,
        balance_after: 0,
      } as never)

      // Financial ledger entry
      const financialType = paymentType === "cash" ? "cash" : "bank"
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
        reference_id: detail.id,
        reference_type: "payment",
        entry_type: "debit",
        amount: paymentAmount,
        description: `Payment received ${detail.invoice_no}`,
        balance_after: prevBalance + paymentAmount,
      } as never)

      setDetail({
        ...detail,
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
      })
      setShowPaymentForm(false)
      setPaymentAmount(0)
      setPaymentType("cash")
      setChequeNumber("")
      setBankCode("")
      setAccountNumber("")
      setFromAccount("")
      setToAccount("")
      invalidateCache("sales")
      loadSales()
    } catch (err) {
      console.error("Payment error:", err)
      alert("Failed to record payment. Please try again.")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-100 text-emerald-700",
      pending: "bg-amber-100 text-amber-700",
      cancelled: "bg-red-100 text-red-700",
    }
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-black"}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const paymentLabels: Record<string, string> = {
    cash: t("sales.cash"),
    credit: t("sales.credit"),
    bank_transfer: t("sales.bank_transfer"),
    lanka_qr: t("sales.lanka_qr"),
    card: t("sales.card"),
    mixed: t("sales.mixed"),
    cheque: t("sales.cheque"),
  }

  const columns = [
    {
      key: "created_at",
      label: t("common.date"),
      render: (row: SaleRow) => formatDate(row.created_at),
    },
    {
      key: "invoice_no",
      label: t("sales.invoice_no"),
      render: (row: SaleRow) => (
        <span className="font-medium text-black">{row.invoice_no}</span>
      ),
    },
    {
      key: "customer_name",
      label: t("sales.customer"),
      render: (row: SaleRow) => row.customer_name || "Walk-in Customer",
    },
    {
      key: "grand_total",
      label: t("common.total"),
      render: (row: SaleRow) => formatCurrency(row.grand_total, locale),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (row: SaleRow) => statusBadge(row.status),
    },
    {
      key: "payment_type",
      label: t("sales.payment_type"),
      render: (row: SaleRow) => paymentLabels[row.payment_type] || row.payment_type,
    },
    {
      key: "payment_status",
      label: "Payment Status",
      render: (row: SaleRow) => {
        const fullyPaid = Number(row.amount_paid ?? 0) >= Number(row.grand_total ?? 0)
        const label = fullyPaid ? "Complete" : "Partial"
        const color = fullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        return (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
            {label}
          </span>
        )
      },
    },
    {
      key: "balance_due",
      label: "Balance Due",
      render: (row: SaleRow) => {
        const due = Math.max(0, Number(row.grand_total ?? 0) - Number(row.amount_paid ?? 0))
        return (
          <span className={`font-medium ${due > 0 ? "text-amber-700" : "text-black"}`}>
            {formatCurrency(due, locale)}
          </span>
        )
      },
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (row: SaleRow) => (
        <button
          onClick={() => openDetail(row.id)}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-black transition hover:bg-gray-50 hover:text-black"
        >
          <Eye size={14} />
          {t("common.view")}
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader titleKey="sales.sale_history" />
      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        searchable
        searchKeys={["invoice_no", "customer_name"]}
      />

      {/* Detail Modal */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10">
          <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <button
              onClick={() => setViewId(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 shadow"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4 px-6 pt-6 pb-3 border-b">
              {companySettings?.logo_url && (
                <img
                  src={companySettings.logo_url}
                  alt={companySettings.company_name}
                  className="h-16 w-auto object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                {companySettings?.company_name && (
                  <h1 className="text-lg font-bold text-black">{companySettings.company_name}</h1>
                )}
                {companySettings?.address && (
                  <p className="text-xs text-black">{companySettings.address}</p>
                )}
                {companySettings?.contact_number && (
                  <p className="text-xs text-black">Tel: {companySettings.contact_number}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50">
              <div>
                <h2 className="text-base font-semibold text-black">
                  {detail?.invoice_no || ""}
                </h2>
                <p className="text-sm text-black">{detail?.customer_name || "Walk-in Customer"}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-black">
                <span>{t("common.date")}: {detail && formatDate(detail.created_at)}</span>
                <span>{t("common.status")}: {detail && statusBadge(detail.status)}</span>
              </div>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin h-8 w-8 rounded-full border-4 border-gray-200 border-t-emerald-600" />
              </div>
            ) : detail ? (
              <div className="px-6 py-4 space-y-6">
                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-black">{t("common.date")}</p>
                    <p className="mt-1 text-sm font-medium text-black">{formatDate(detail.created_at)}</p>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-black">{t("common.status")}</p>
                    <div className="mt-1">{statusBadge(detail.status)}</div>
                  </div>
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-black">{t("sales.payment_type")}</p>
                    <span className={`mt-1 inline-block rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      detail.payment_type === "cash" ? "border-emerald-500 bg-emerald-50 text-emerald-700" :
                      detail.payment_type === "credit" ? "border-blue-500 bg-blue-50 text-blue-700" :
                      detail.payment_type === "bank_transfer" ? "border-purple-500 bg-purple-50 text-purple-700" :
                      detail.payment_type === "cheque" ? "border-amber-500 bg-amber-50 text-amber-700" :
                      "border-gray-300 bg-white text-black"
                    }`}>
                      {paymentLabels[detail.payment_type] || detail.payment_type}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-black">{t("sales.item")}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-black">{t("sales.qty")}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-black">{t("sales.price")}</th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-black">{t("sales.amount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 text-sm text-black">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-sm text-black">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-sm text-black">{formatCurrency(Number(item.unit_price), locale)}</td>
                          <td className="px-4 py-2.5 text-sm text-black">{formatCurrency(Number(item.total_price), locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="ml-auto w-72 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black">{t("common.subtotal")}</span>
                    <span className="text-black">{formatCurrency(detail.subtotal, locale)}</span>
                  </div>
                  {detail.labour_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-black">{t("sales.labour_charge")}</span>
                      <span className="text-black">{formatCurrency(detail.labour_charge, locale)}</span>
                    </div>
                  )}
                  {detail.transport_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-black">{t("sales.transport_charge")}</span>
                      <span className="text-black">{formatCurrency(detail.transport_charge, locale)}</span>
                    </div>
                  )}
                  {detail.tax_type === "svat" && (
                    <div className="flex justify-between">
                      <span className="text-black">{t("common.tax")}</span>
                      <span className="text-black">{formatCurrency(detail.tax_amount, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                    <span className="text-black">{t("common.grand_total")}</span>
                    <span className="text-emerald-600">{formatCurrency(detail.grand_total, locale)}</span>
                  </div>
                  {detail.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-red-600">{t("common.discount")}</span>
                      <span className="text-red-600">-{formatCurrency(detail.discount, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-black">{t("sales.amount_paid")}</span>
                    <span className="text-black">{formatCurrency(detail.amount_paid, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-dashed pt-1.5">
                    <span className="font-semibold text-black">{t("sales.balance_due")}</span>
                    <span className={`font-semibold ${Number(detail.balance_due) > 0 ? "text-black" : "text-black"}`}>
                      {formatCurrency(detail.balance_due, locale)}
                    </span>
                  </div>
                </div>

                {/* Payment History */}
                {paymentHistory.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black mb-2">
                      <Banknote size={14} className="inline mr-1" />
                      Payment History
                    </p>
                    <div className="space-y-1">
                      {paymentHistory.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-black">{formatDate(p.created_at)}</span>
                          <span className="font-medium text-emerald-600">+{formatCurrency(p.amount, locale)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                {detail.payment_details && Object.keys(detail.payment_details).length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black mb-3">Payment Details</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(detail.payment_details).map(([key, val]) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-black mb-0.5">{paymentDetailLabels[key] || key}</label>
                          <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black">
                            {String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cheque Status */}
                {detail.payment_type === "cheque" && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-black mb-2">Cheque Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        detail.cheque_status === "cleared" ? "bg-green-100 text-green-700" :
                        detail.cheque_status === "bounced" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {(detail.cheque_status || "pending").toUpperCase()}
                      </span>
                      {(detail.cheque_status === "pending" || !detail.cheque_status) && (
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={async () => {
                              const supabase = createClient()
                              await supabase.from("sales").update({ cheque_status: "cleared" }).eq("id", detail.id)
                              loadSales()
                            }}
                            className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-200"
                          >
                            Clear
                          </button>
                          <button
                            onClick={async () => {
                              const supabase = createClient()
                              await supabase.from("sales").update({ cheque_status: "bounced" }).eq("id", detail.id)
                              loadSales()
                            }}
                            className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Bounce
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detail.notes && (
                  <div className="rounded-lg border bg-gray-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-black">{t("common.notes")}</p>
                    <p className="mt-1 text-sm text-black">{detail.notes}</p>
                  </div>
                )}

                {/* Record Payment */}
                <CompanyFooter settings={companySettings} />
                {Number(detail.balance_due) > 0 && !showPaymentForm && (
                  <button
                    onClick={() => {
                      setPaymentAmount(Number(detail.balance_due))
                      setShowPaymentForm(true)
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <DollarSign size={16} />
                    {t("sales.record_payment")}
                  </button>
                )}

                {showPaymentForm && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-black">{t("sales.record_payment")}</h4>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-black">{t("common.total")}</label>
                      <input
                        type="number"
                        min={0}
                        max={detail.balance_due}
                        value={paymentAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0
                          setPaymentAmount(Math.min(val, Number(detail.balance_due)))
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="mt-0.5 text-xs text-black">Max: {formatCurrency(detail.balance_due, locale)}</p>
                    </div>

                    {/* Payment Type - Buttons */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-black">{t("sales.payment_type")}</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["cash", "credit", "bank_transfer", "lanka_qr", "card", "mixed", "cheque"] as const).map(
                          (pt) => (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => setPaymentType(pt)}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                                paymentType === pt
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                  : "border-gray-300 bg-white text-black hover:bg-gray-50"
                              }`}
                            >
                              {paymentLabels[pt] || pt}
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Cheque Details */}
                    {paymentType === "cheque" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-black">Cheque Number</label>
                          <input type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-black">Bank Code</label>
                          <input type="text" value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-black">Account Number</label>
                          <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none" />
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Details */}
                    {paymentType === "bank_transfer" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-black">From Account</label>
                          <input type="text" value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-black">To Account</label>
                          <input type="text" value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowPaymentForm(false)
                          setPaymentAmount(0)
                        }}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={handleRecordPayment}
                        disabled={paymentAmount <= 0 || paymentSubmitting || paymentAmount > Number(detail.balance_due)}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {paymentSubmitting ? t("common.loading") : t("sales.confirm_payment")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
