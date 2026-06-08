"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, FileText, Share2, Replace } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { jsPDF } from "jspdf"

interface Quotation {
  id: string
  q_no: string
  customer_id: string | null
  customer_name: string | null
  branch_id: string | null
  user_id: string
  subtotal: number
  discount: number
  grand_total: number
  valid_until: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface QuotationItem {
  id: string
  quotation_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  converted: "bg-purple-100 text-purple-700",
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  expired: "Expired",
  converted: "Converted",
}

export default function QuotationDetailPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    supabase
      .from("quotations")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setQuotation(data as Quotation)
      })

    supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", id)
      .order("product_name")
      .then(({ data }) => {
        if (data) setItems(data as QuotationItem[])
        setLoading(false)
      })
  }, [id])

  function downloadPdf() {
    if (!quotation) return
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(18)
    doc.text("Quotation", pageWidth / 2, 20, { align: "center" })

    doc.setFontSize(10)
    doc.text(`Q No: ${quotation.q_no}`, 14, 35)
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, 14, 42)
    doc.text(`Customer: ${quotation.customer_name || "N/A"}`, 14, 49)
    if (quotation.valid_until) {
      doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`, 14, 56)
    }

    const tableTop = quotation.valid_until ? 65 : 60
    const colX = [14, 60, 110, 140, 170]
    const headers = ["Item", "Qty", "Unit Price", "Total"]

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    headers.forEach((h, i) => doc.text(h, colX[i], tableTop))
    doc.setFont("helvetica", "normal")

    let y = tableTop + 8
    items.forEach((item) => {
      doc.text(item.product_name, colX[0], y)
      doc.text(String(item.quantity), colX[1], y)
      doc.text(Number(item.unit_price).toFixed(2), colX[2], y)
      doc.text(Number(item.total_price).toFixed(2), colX[3], y)
      y += 7
    })

    y += 4
    doc.setFont("helvetica", "bold")
    doc.text(`Subtotal: ${Number(quotation.subtotal).toFixed(2)}`, colX[0], y)
    y += 7
    doc.text(`Discount: ${Number(quotation.discount).toFixed(2)}`, colX[0], y)
    y += 7
    doc.setFontSize(12)
    doc.text(`Grand Total: ${Number(quotation.grand_total).toFixed(2)}`, colX[0], y)

    if (quotation.notes) {
      y += 10
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(`Notes: ${quotation.notes}`, colX[0], y)
    }

    doc.save(`${quotation.q_no}.pdf`)
  }

  function shareWhatsApp() {
    if (!quotation) return

    let text = `*Quotation ${quotation.q_no}*\n`
    text += `Customer: ${quotation.customer_name || "N/A"}\n`
    text += `Date: ${new Date(quotation.created_at).toLocaleDateString()}\n`
    if (quotation.valid_until) {
      text += `Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}\n`
    }
    text += "\n*Items:*\n"
    items.forEach((item) => {
      text += `${item.product_name} x${item.quantity} @ ${Number(item.unit_price).toFixed(2)} = ${Number(item.total_price).toFixed(2)}\n`
    })
    text += `\nSubtotal: ${Number(quotation.subtotal).toFixed(2)}`
    text += `\nDiscount: ${Number(quotation.discount).toFixed(2)}`
    text += `\n*Grand Total: ${Number(quotation.grand_total).toFixed(2)}*`

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  async function convertToInvoice() {
    if (!quotation || converting) return
    setConverting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConverting(false); return }

    const today = new Date()
    const invPrefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-`
    const { data: lastInv } = await supabase
      .from("sales")
      .select("invoice_no")
      .like("invoice_no", `${invPrefix}%`)
      .order("invoice_no", { ascending: false })
      .limit(1)
    const invData = lastInv as Array<{ invoice_no: string }> | null
    const invSeq = invData && invData.length > 0
      ? Number(invData[0].invoice_no.slice(-5)) + 1
      : 1
    const invoiceNo = `${invPrefix}${String(invSeq).padStart(5, "0")}`

    const sale = {
      invoice_no: invoiceNo,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      user_id: user.id,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      labour_charge: 0,
      transport_charge: 0,
      tax_type: "non_vat" as const,
      tax_amount: 0,
      grand_total: quotation.grand_total,
      payment_type: "credit" as const,
      amount_paid: 0,
      balance_due: quotation.grand_total,
      status: "pending" as const,
    }

    const { data: insertedSaleRaw, error: saleError } = await supabase
      .from("sales")
      .insert(sale as never)
      .select()
      .single()
    const insertedSale = insertedSaleRaw as { id: string } | null

    if (saleError || !insertedSale) {
      setConverting(false)
      return
    }

    const saleItems = items.map((i) => ({
      sale_id: insertedSale.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))

    await supabase.from("sale_items").insert(saleItems as never)

    await supabase
      .from("quotations")
      .update({ status: "converted" } as never)
      .eq("id", quotation.id)

    setConverting(false)
    router.push(`/${locale}/sales`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-gray-200 border-t-emerald-600" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-700">{t("common.no_results")}</p>
        <button
          onClick={() => router.push(`/${locale}/quotations`)}
          className="mt-4 text-sm text-emerald-600 hover:underline"
        >
          {t("common.cancel")}
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/quotations`)}
            className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{quotation.q_no}</h1>
            <p className="text-sm text-gray-700">
              {formatDate(quotation.created_at)}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[quotation.status] || "bg-gray-100 text-gray-700"}`}
        >
          {statusLabels[quotation.status] || quotation.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">{t("sales.customer")}</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {quotation.customer_name || "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">{t("common.date")}</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {formatDate(quotation.created_at)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">{t("quotations.valid_until")}</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {quotation.valid_until ? formatDate(quotation.valid_until) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  {t("sales.item")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  {t("sales.qty")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  {t("sales.price")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                  {t("sales.amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(Number(item.unit_price), locale)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(Number(item.total_price), locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t px-4 py-4">
          <div className="ml-auto w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">{t("common.subtotal")}</span>
              <span>{formatCurrency(Number(quotation.subtotal), locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">{t("common.discount")}</span>
              <span>{formatCurrency(Number(quotation.discount), locale)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>{t("common.grand_total")}</span>
              <span className="text-emerald-600">{formatCurrency(Number(quotation.grand_total), locale)}</span>
            </div>
          </div>
        </div>
      </div>

      {quotation.notes && (
        <div className="mt-4 rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-700">{t("common.notes")}</p>
          <p className="mt-1 text-sm text-gray-700">{quotation.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FileText size={16} />
          {t("quotations.download_pdf")}
        </button>
        <button
          onClick={shareWhatsApp}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Share2 size={16} />
          {t("quotations.share_whatsapp")}
        </button>
        {quotation.status !== "converted" && (
          <button
            onClick={convertToInvoice}
            disabled={converting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Replace size={16} />
            {converting ? t("common.loading") : t("quotations.convert_to_invoice")}
          </button>
        )}
      </div>
    </div>
  )
}
