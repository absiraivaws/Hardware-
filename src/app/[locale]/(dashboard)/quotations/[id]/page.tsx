"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, FileText, Share2, Replace, X } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { jsPDF } from "jspdf"
import { CompanyHeader, CompanyFooter } from "@/components/shared/company-info"
import type { CompanySettings } from "@/components/shared/company-info"
import { useData } from "@/providers/data-provider"

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
  code?: string
  serial_no?: string
  brand?: string
}

interface EditableItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-black",
  sent: "bg-blue-100 text-black",
  accepted: "bg-green-100 text-black",
  expired: "bg-red-100 text-black",
  converted: "bg-purple-100 text-black",
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
  const { companySettings } = useData()
  const [converting, setConverting] = useState(false)
  const [showConvert, setShowConvert] = useState(false)

  const [convertItems, setConvertItems] = useState<EditableItem[]>([])
  const [convertDiscount, setConvertDiscount] = useState(0)
  const [convertLabour, setConvertLabour] = useState(0)
  const [convertTransport, setConvertTransport] = useState(0)
  const [convertTaxType, setConvertTaxType] = useState<"svat" | "non_vat">("non_vat")
  const [convertNotes, setConvertNotes] = useState("")

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
      .select("*, products!inner(code, serial_no, brands(name))")
      .eq("quotation_id", id)
      .order("product_name")
      .then(({ data }) => {
        if (data) {
          const fetched = data.map((item: any) => ({
            ...item,
            code: item.products?.code,
            serial_no: item.products?.serial_no,
            brand: item.products?.brands?.name,
          })) as QuotationItem[]
          setItems(fetched)
        }
        setLoading(false)
      })
  }, [id])

  function openConvertModal() {
    setConvertItems(
      items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }))
    )
    setConvertDiscount(quotation?.discount ?? 0)
    setConvertLabour(0)
    setConvertTransport(0)
    setConvertTaxType("non_vat")
    setConvertNotes(quotation?.notes ?? "")
    setShowConvert(true)
  }

  const convertSubtotal = convertItems.reduce((s, i) => s + i.total_price, 0)
  const taxAmount = convertTaxType === "svat" ? convertSubtotal * 0.15 : 0
  const convertGrandTotal = convertSubtotal - convertDiscount + convertLabour + convertTransport + taxAmount

  function updateConvertItem(index: number, field: keyof EditableItem, value: number | string) {
    setConvertItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }
      if (field === "product_name") {
        item.product_name = String(value)
      } else if (field === "quantity") {
        item.quantity = Number(value)
      } else if (field === "unit_price") {
        item.unit_price = Number(value)
      }
      item.total_price = item.quantity * item.unit_price
      updated[index] = item
      return updated
    })
  }

  function removeConvertItem(index: number) {
    setConvertItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function downloadPdf() {
    if (!quotation) return
    const doc = new jsPDF({ format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    const contentWidth = pageWidth - margin * 2

    let y = 20

    // Company header: logo left, info right
    if (companySettings) {
      if (companySettings.logo_url) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.src = companySettings.logo_url
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })
          const maxH = 30
          const ratio = img.width / img.height
          const w = Math.min(50, maxH * ratio)
          const h = w / ratio
          doc.addImage(img, "JPEG", margin, y, w, h)
        } catch {
          // fallback: no logo
        }
      }
      const infoX = margin + 55
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(companySettings.company_name || "", infoX, y + 6)

      const infoLines: string[] = []
      if (companySettings.address) infoLines.push(companySettings.address)
      const contactParts = []
      if (companySettings.contact_number) contactParts.push(`Tel: ${companySettings.contact_number}`)
      if (companySettings.vat_number) contactParts.push(`VAT: ${companySettings.vat_number}`)
      if (contactParts.length > 0) infoLines.push(contactParts.join(" | "))

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      infoLines.forEach((line, i) => {
        doc.text(line, infoX, y + 14 + i * 4)
      })

      y += Math.max(36, infoLines.length * 4 + 18)

      doc.setDrawColor(200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8
    }

    // Title
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Quotation", pageWidth / 2, y, { align: "center" })
    y += 8

    // Details
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Q No: ${quotation.q_no}`, margin, y)
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, margin, y + 7)
    doc.text(`Customer: ${quotation.customer_name || "N/A"}`, margin, y + 14)
    if (quotation.valid_until) {
      doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`, margin, y + 21)
    }

    const tableTop = quotation.valid_until ? y + 30 : y + 23

    // Table
    const itemColEnd = pageWidth - margin - 85
    const colQty = pageWidth - margin - 60
    const colPrice = pageWidth - margin - 35
    const colTotal = pageWidth - margin

    doc.setDrawColor(200)
    doc.line(margin, tableTop - 2, pageWidth - margin, tableTop - 2)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Item", margin, tableTop)
    doc.text("Qty", colQty, tableTop, { align: "right" })
    doc.text("Price", colPrice, tableTop, { align: "right" })
    doc.text("Total", colTotal, tableTop, { align: "right" })
    doc.line(margin, tableTop + 2, pageWidth - margin, tableTop + 2)
    doc.setFont("helvetica", "normal")

    y = tableTop + 8
    const lineH = 5
    items.forEach((item) => {
      const nameLines = doc.splitTextToSize(item.product_name, itemColEnd - margin)
      nameLines.forEach((l: string) => {
        doc.text(l, margin, y)
        y += lineH
      })
      const info = [item.code, item.serial_no, item.brand].filter(Boolean).join(" | ")
      if (info) {
        doc.text(info, margin + 4, y)
        y += lineH
      }
      doc.text(String(item.quantity), colQty, y - lineH, { align: "right" })
      doc.text(Number(item.unit_price).toFixed(2), colPrice, y - lineH, { align: "right" })
      doc.text(Number(item.total_price).toFixed(2), colTotal, y - lineH, { align: "right" })
    })

    doc.line(margin, y, pageWidth - margin, y)
    y += 4

    // Totals
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    const totalX = pageWidth - margin - 60
    doc.text(`Subtotal: ${Number(quotation.subtotal).toFixed(2)}`, totalX, y, { align: "right" })
    y += 7
    doc.text(`Discount: ${Number(quotation.discount).toFixed(2)}`, totalX, y, { align: "right" })
    y += 7
    doc.setFontSize(12)
    doc.text(`Grand Total: ${Number(quotation.grand_total).toFixed(2)}`, totalX, y, { align: "right" })

    if (quotation.notes) {
      y += 10
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(`Notes: ${quotation.notes}`, margin, y)
    }

    // Social links footer (no WhatsApp text)
    if (companySettings) {
      const socialLinks = [
        companySettings.facebook_link && "Facebook",
        companySettings.tiktok_link && "TikTok",
        companySettings.youtube_link && "YouTube",
      ].filter(Boolean)

      if (socialLinks.length > 0) {
        y += 12
        doc.setDrawColor(200)
        doc.line(margin, y, pageWidth - margin, y)
        y += 5
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text(socialLinks.join("  |  "), pageWidth / 2, y, { align: "center" })
      }
    }

    doc.save(`${quotation.q_no}.pdf`)
  }

  function shareWhatsApp() {
    if (!quotation) return

    let text = ""
    if (companySettings?.company_name) {
      text += `*${companySettings.company_name}*\n`
    }
    text += `*Quotation ${quotation.q_no}*\n`
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

  async function handleConfirmConvert() {
    if (!quotation || converting || convertItems.length === 0) return
    setConverting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConverting(false); return }

    const today = new Date()
    const dd = String(today.getDate()).padStart(2, "0")
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const yy = String(today.getFullYear()).slice(-2)
    const invPrefix = `INV-${dd}${mm}${yy}-`
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
      subtotal: convertSubtotal,
      discount: convertDiscount,
      labour_charge: convertLabour,
      transport_charge: convertTransport,
      tax_type: convertTaxType,
      tax_amount: taxAmount,
      grand_total: convertGrandTotal,
      payment_type: "credit" as const,
      amount_paid: 0,
      balance_due: convertGrandTotal,
      status: "pending" as const,
      notes: convertNotes || null,
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

    const saleItems = convertItems.map((i) => ({
      sale_id: insertedSale.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems as never)
    if (itemsError) { setConverting(false); return }

    const productIds = convertItems.map((i) => i.product_id)
    const { data: products } = await supabase.from("products").select("id, current_stock").in("id", productIds)
    if (products) {
      for (const p of products) {
        const qty = convertItems.find((i) => i.product_id === p.id)?.quantity || 0
        await supabase.from("products").update({ current_stock: Number(p.current_stock) - qty }).eq("id", p.id)
      }
    }
    const movements = convertItems.map((item) => ({
      product_id: item.product_id,
      type: "out" as const,
      quantity: item.quantity,
      reference_type: "sale" as const,
      reference_id: insertedSale.id,
      notes: invoiceNo,
      user_id: user.id,
    }))
    await supabase.from("stock_movements").insert(movements as never)

    if (quotation.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("credit_balance")
        .eq("id", quotation.customer_id)
        .single()
      if (cust) {
        await supabase
          .from("customers")
          .update({ credit_balance: Number(cust.credit_balance) + convertGrandTotal })
          .eq("id", quotation.customer_id)
      }
    }

    await supabase
      .from("quotations")
      .update({ status: "converted" } as never)
      .eq("id", quotation.id)

    setConverting(false)
    setShowConvert(false)
    router.push(`/${locale}/sales/history`)
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
        <p className="text-black">{t("common.no_results")}</p>
        <button
          onClick={() => router.push(`/${locale}/quotations`)}
          className="mt-4 text-sm text-black hover:underline"
        >
          {t("common.cancel")}
        </button>
      </div>
    )
  }

  return (
    <div>
      <CompanyHeader settings={companySettings} />

      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/quotations`)}
            className="rounded-lg p-1.5 text-black hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-black">{quotation.q_no}</h1>
            <p className="text-sm text-black">
              {formatDate(quotation.created_at)}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[quotation.status] || "bg-gray-100 text-black"}`}
        >
          {statusLabels[quotation.status] || quotation.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">{t("sales.customer")}</p>
          <p className="mt-1 text-sm font-medium text-black">
            {quotation.customer_name || "—"}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">{t("common.date")}</p>
          <p className="mt-1 text-sm font-medium text-black">
            {formatDate(quotation.created_at)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">{t("quotations.valid_until")}</p>
          <p className="mt-1 text-sm font-medium text-black">
            {quotation.valid_until ? formatDate(quotation.valid_until) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Serial No</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  {t("sales.item")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  {t("sales.qty")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  {t("sales.price")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                  {t("sales.amount")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-black">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-black">{item.serial_no ?? "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-black">{item.code ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-black">{item.product_name}</td>
                  <td className="px-4 py-3 text-sm text-black">{item.brand ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-black">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-black">{formatCurrency(Number(item.unit_price), locale)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-black">
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
              <span className="text-black">{t("common.subtotal")}</span>
              <span className="text-black">{formatCurrency(Number(quotation.subtotal), locale)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">{t("common.discount")}</span>
              <span className="text-black">{formatCurrency(Number(quotation.discount), locale)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span className="text-black">{t("common.grand_total")}</span>
              <span className="text-black">{formatCurrency(Number(quotation.grand_total), locale)}</span>
            </div>
          </div>
        </div>
      </div>

      {quotation.notes && (
        <div className="mt-4 rounded-lg border bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-black">{t("common.notes")}</p>
          <p className="mt-1 text-sm text-black">{quotation.notes}</p>
        </div>
      )}

      <CompanyFooter settings={companySettings} />

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
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
            onClick={openConvertModal}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Replace size={16} />
            {t("quotations.convert_to_invoice")}
          </button>
        )}
      </div>

      {/* Convert Modal */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10 pb-10">
          <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-black">{t("quotations.convert_to_invoice")}</h2>
                <p className="text-sm text-black">
                  {quotation.q_no} — {quotation.customer_name || "—"}
                </p>
              </div>
              <button
                onClick={() => setShowConvert(false)}
                className="rounded-lg p-1.5 text-black hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-6">
              {/* Editable Items Table */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">{t("sales.item")}</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">{t("sales.qty")}</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">{t("sales.price")}</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">{t("sales.amount")}</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {convertItems.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => updateConvertItem(i, "product_name", e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateConvertItem(i, "quantity", e.target.value)}
                            className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateConvertItem(i, "unit_price", e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-black">
                          {formatCurrency(item.total_price, locale)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeConvertItem(i)}
                            className="rounded p-1 text-black hover:bg-gray-50"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Left: Extra charges */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">{t("common.discount")}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={convertDiscount}
                      onChange={(e) => setConvertDiscount(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">{t("sales.labour_charge")}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={convertLabour}
                      onChange={(e) => setConvertLabour(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">{t("sales.transport_charge")}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={convertTransport}
                      onChange={(e) => setConvertTransport(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">{t("common.tax")} Type</label>
                    <select
                      value={convertTaxType}
                      onChange={(e) => setConvertTaxType(e.target.value as "svat" | "non_vat")}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="non_vat">Non-VAT</option>
                      <option value="svat">SVAT (15%)</option>
                    </select>
                  </div>
                  {convertTaxType === "svat" && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-black">{t("common.tax")} Amount (15%)</label>
                      <p className="text-sm font-medium text-black">{formatCurrency(taxAmount, locale)}</p>
                    </div>
                  )}
                </div>

                {/* Right: Totals */}
                <div className="space-y-1.5 rounded-lg border bg-gray-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-black">{t("common.subtotal")}</span>
                    <span className="text-black">{formatCurrency(convertSubtotal, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">{t("common.discount")}</span>
                    <span className="text-black">-{formatCurrency(convertDiscount, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">{t("sales.labour_charge")}</span>
                    <span className="text-black">{formatCurrency(convertLabour, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black">{t("sales.transport_charge")}</span>
                    <span className="text-black">{formatCurrency(convertTransport, locale)}</span>
                  </div>
                  {convertTaxType === "svat" && (
                    <div className="flex justify-between">
                      <span className="text-black">{t("common.tax")} (15%)</span>
                      <span className="text-black">{formatCurrency(taxAmount, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                    <span className="text-black">{t("common.grand_total")}</span>
                    <span className="text-black">{formatCurrency(convertGrandTotal, locale)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-black">{t("common.notes")}</label>
                <textarea
                  value={convertNotes}
                  onChange={(e) => setConvertNotes(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={() => setShowConvert(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmConvert}
                disabled={converting || convertItems.length === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Replace size={16} />
                {converting ? t("common.loading") : t("quotations.convert_to_invoice")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
