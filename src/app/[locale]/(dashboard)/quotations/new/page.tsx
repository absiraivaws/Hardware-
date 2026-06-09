"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

interface Customer { id: string; name: string; phone: string | null; email: string | null }
interface Product { id: string; name: string; code: string; selling_price: number; current_stock: number }

interface LineItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export default function NewQuotationPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<string>("")
  const [customerName, setCustomerName] = useState("")
  const [items, setItems] = useState<LineItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [productSearch, setProductSearch] = useState("")
  const [productResults, setProductResults] = useState<Product[]>([])
  const [showProductSearch, setShowProductSearch] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.from("customers").select("*").order("name").then(({ data }) => {
      if (data) setCustomers(data as Customer[])
    })
  }, [])

  useEffect(() => {
    if (productSearch.length < 1) {
      setProductResults([])
      return
    }
    const timer = setTimeout(() => {
      supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${productSearch}%,code.ilike.%${productSearch}%`)
        .order("name")
        .limit(10)
        .then(({ data }) => {
          if (data) setProductResults(data as Product[])
        })
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  const subtotal = items.reduce((sum, i) => sum + i.total_price, 0)
  const grandTotal = subtotal - discount

  function handleCustomerChange(value: string) {
    setCustomerId(value)
    if (!value) {
      setCustomerName("")
      return
    }
    if (value === "walk-in") {
      setCustomerName("Walk-in Customer")
      return
    }
    const c = customers.find((c) => c.id === value)
    if (c) setCustomerName(c.name)
  }

  function addItem(product: Product) {
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price,
      },
    ])
    setShowProductSearch(false)
    setProductSearch("")
    setProductResults([])
  }

  function updateItem(index: number, field: keyof LineItem, value: number | string) {
    setItems((prev) => {
      const updated = [...prev]
      const item = { ...updated[index] }
      if (field === "quantity") {
        item.quantity = Number(value)
      } else if (field === "unit_price") {
        item.unit_price = Number(value)
      }
      item.total_price = item.quantity * item.unit_price
      updated[index] = item
      return updated
    })
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function generateQNo(): Promise<string> {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    const prefix = `Q-${y}${m}${d}-`

    const { data: lastRaw } = await supabase
      .from("quotations")
      .select("q_no")
      .like("q_no", `${prefix}%`)
      .order("q_no", { ascending: false })
      .limit(1)

    const last = lastRaw as Array<{ q_no: string }> | null
    const seq = last && last.length > 0
      ? Number(last[0].q_no.slice(-5)) + 1
      : 1

    return `${prefix}${String(seq).padStart(5, "0")}`
  }

  async function handleSave() {
    if (items.length === 0) return
    setSaving(true)
    setSaveError(null)

    const qNo = await generateQNo()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: user.id, email: user.email ?? "" })
      if (profileError) {
        setSaveError(profileError.message)
        setSaving(false)
        return
      }
    }

    const quotation = {
      q_no: qNo,
      customer_id: customerId && customerId !== "walk-in" ? customerId : null,
      customer_name: customerName || null,
      user_id: user.id,
      subtotal,
      discount,
      grand_total: grandTotal,
      valid_until: validUntil || null,
      notes: notes || null,
      status: "draft" as const,
    }

    const { data: insertedRaw, error } = await supabase
      .from("quotations")
      .insert(quotation as never)
      .select()
      .single()

    const inserted = insertedRaw as { id: string } | null
    if (error || !inserted) {
      setSaveError(error?.message || "Failed to create quotation")
      setSaving(false)
      return
    }

    const quotationItems = items.map((i) => ({
      quotation_id: inserted.id,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.total_price,
    }))

    const { error: itemsError } = await supabase
      .from("quotation_items")
      .insert(quotationItems as never)

    setSaving(false)

    if (itemsError) {
      setSaveError(itemsError.message)
      return
    }

    router.push(`/${locale}/quotations`)
  }

  return (
    <div>
      {saveError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{saveError}</div>
      )}

      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t("quotations.new_quotation")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || items.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Customer */}
        <div className="rounded-lg border bg-white p-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-900">
            {t("sales.customer")}
          </label>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">{t("sales.select_customer")}</option>
            <option value="walk-in">{t("sales.walk_in")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">{t("sales.item")}s</h2>
            <button
              onClick={() => setShowProductSearch(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <Plus size={16} />
              {t("sales.add_item")}
            </button>
          </div>

          {showProductSearch && (
            <div className="mb-4 rounded-lg border bg-gray-50 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900" size={16} />
                <input
                  type="text"
                  placeholder={`${t("common.search")}...`}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {productResults.length > 0 && (
                <ul className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border bg-white">
                  {productResults.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-gray-900">{formatCurrency(Number(p.selling_price), locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {productSearch.length > 0 && productResults.length === 0 && (
                <p className="mt-2 text-sm text-gray-900">{t("common.no_results")}</p>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-900">{t("common.no_results")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      {t("sales.item")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      {t("sales.qty")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      {t("sales.price")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      {t("sales.amount")}
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {formatCurrency(item.total_price, locale)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeItem(i)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-900">{t("common.subtotal")}</span>
              <span className="font-medium">{formatCurrency(subtotal, locale)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-900">{t("common.discount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>{t("common.grand_total")}</span>
              <span className="text-emerald-600">{formatCurrency(grandTotal, locale)}</span>
            </div>
          </div>
        </div>

        {/* Valid Until & Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-900">
              {t("quotations.valid_until")}
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-900">
              {t("common.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
