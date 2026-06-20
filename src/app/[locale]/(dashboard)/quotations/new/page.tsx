"use client"

import { useTranslations } from "next-intl"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

interface Customer { id: string; name: string; phone: string | null; email: string | null }
interface Product {
  id: string
  name: string
  code: string
  serial_no: string
  selling_price: number
  current_stock: number
  brand_id: string | null
  brands: { name: string } | null
}

interface LineItem {
  product_id: string
  product_name: string
  product_code: string
  product_serial: string
  brand_name: string
  current_stock: number
  unit_price: number
  quantity: number
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
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [showProductTable, setShowProductTable] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.from("customers").select("*").order("name").then(({ data }) => {
      if (data) setCustomers(data as Customer[])
    })
    supabase.from("products").select("*, brands(name)").order("name").then(({ data }) => {
      if (data) setAllProducts(data as unknown as Product[])
    })
    supabase.from("company_settings").select("quotation_valid_days").limit(1).single().then(({ data }) => {
      const days = data?.quotation_valid_days ?? 7
      const d = new Date()
      d.setDate(d.getDate() + days)
      setValidUntil(d.toISOString().split("T")[0])
    })
  }, [])

  const filteredProducts = allProducts.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.brands?.name ?? "").toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.serial_no ?? "").toLowerCase().includes(productSearch.toLowerCase()),
  )

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
        product_code: product.code,
        product_serial: product.serial_no,
        brand_name: product.brands?.name ?? "",
        current_stock: product.current_stock,
        quantity: 1,
        unit_price: product.selling_price,
        total_price: product.selling_price,
      },
    ])
    setShowProductTable(false)
    setProductSearch("")
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
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-black">{saveError}</div>
      )}

      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">{t("quotations.new_quotation")}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
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
          <label className="mb-1.5 block text-sm font-medium text-black">
            {t("sales.customer")}
          </label>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
            <h2 className="text-sm font-medium text-black">{t("sales.item")}s</h2>
            <button
              onClick={() => setShowProductTable((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-black hover:text-gray-700"
            >
              <Plus size={16} />
              {t("sales.add_item")}
            </button>
          </div>

          {showProductTable && (
            <div className="mb-4 rounded-lg border bg-white p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
                <input
                  type="text"
                  placeholder={`${t("common.search")}...`}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-black">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-black">Serial No</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-black">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-black">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-black">Brand</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-black">Selling Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-black">Stock</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-sm text-black">{t("common.no_results")}</td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => (
                        <tr
                          key={p.id}
                          tabIndex={0}
                          role="button"
                          onClick={() => addItem(p)}
                          onKeyDown={(e) => { if (e.key === "Enter") addItem(p) }}
                          className="cursor-pointer hover:bg-gray-50 focus:bg-gray-100 focus:outline-none"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-black">{idx + 1}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-mono text-black">{p.serial_no}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs font-mono text-black">{p.code}</td>
                          <td className="px-3 py-2 text-sm text-black">{p.name}</td>
                          <td className="px-3 py-2 text-sm text-black">{p.brands?.name ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-black">{formatCurrency(Number(p.selling_price), locale)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-black">{p.current_stock}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => addItem(p)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-black hover:bg-gray-100"
                            >
                              <Plus size={14} />
                              Add
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-black">{t("common.no_results")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.item")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">Brand</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-black">
                      {t("inventory.current_stock")}
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.price")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.qty")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.price")}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.amount")}
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm text-black">{i + 1}</td>
                      <td className="px-4 py-2 text-sm text-black">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-black">{item.product_code}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-black">{item.brand_name || "—"}</td>
                      <td className="px-4 py-2 text-right text-sm text-black">{item.current_stock}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-black">{formatCurrency(item.unit_price, locale)}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-black focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(i, "unit_price", e.target.value)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-black focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-black">
                        {formatCurrency(item.total_price, locale)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeItem(i)}
                          className="rounded-lg p-1 text-black hover:bg-gray-50"
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
              <span className="text-black">{t("common.subtotal")}</span>
              <span className="font-medium text-black">{formatCurrency(subtotal, locale)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-black">{t("common.discount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-black focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold text-black">
              <span>{t("common.grand_total")}</span>
              <span className="text-black">{formatCurrency(grandTotal, locale)}</span>
            </div>
          </div>
        </div>

        {/* Quotation Date, Valid Until & Notes */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-black">Quotation Date</label>
            <input
              type="date"
              value={new Date().toISOString().split("T")[0]}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black"
            />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-black">
              {t("quotations.valid_until")}
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="rounded-lg border bg-white p-4">
            <label className="mb-1.5 block text-sm font-medium text-black">
              {t("common.notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
