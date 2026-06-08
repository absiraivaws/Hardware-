"use client"

import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { usePOSStore } from "@/stores/pos-store"
import { formatCurrency } from "@/lib/format"
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Printer, Smartphone, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { use, useEffect, useMemo, useState, useRef } from "react"
import type { Database } from "@/types/database"

type Product = Database["public"]["Tables"]["products"]["Row"]
type PaymentType = Database["public"]["Tables"]["sales"]["Row"]["payment_type"]
type TaxType = Database["public"]["Tables"]["sales"]["Row"]["tax_type"]

interface CustomerOption {
  id: string
  name: string
  phone: string | null
}

interface ProfileRow {
  branch_id: string | null
}

interface BranchRow {
  code: string
}

interface SaleRow {
  id: string
  invoice_no: string
}

interface CustomerCreditRow {
  credit_balance: number
}

export default function SalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = usePOSStore()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [sortKey, setSortKey] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [discount, setDiscount] = useState(0)
  const [labourCharge, setLabourCharge] = useState(0)
  const [transportCharge, setTransportCharge] = useState(0)
  const [taxType, setTaxType] = useState<TaxType>("non_vat")
  const [paymentType, setPaymentType] = useState<PaymentType>("cash")
  const [amountPaid, setAmountPaid] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [completedSale, setCompletedSale] = useState<{
    invoice_no: string
    grand_total: number
    amount_paid: number
    balance_due: number
    items: { product_name: string; quantity: number; unit_price: number; total_price: number }[]
  } | null>(null)

  const barcodeRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      setLoading(true)
      const [productRes, customerRes] = await Promise.all([
        supabase.from("products").select("*").eq("status", "active").order("name"),
        supabase.from("customers").select("id, name, phone").eq("status", "active").order("name"),
      ])
      if (productRes.data) setProducts(productRes.data as Product[])
      if (customerRes.data) setCustomers(customerRes.data as CustomerOption[])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filteredProducts = useMemo(() => {
    let result = products
    const q = searchQuery.toLowerCase()
    if (searchQuery) {
      result = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      )
    }
    result = [...result].sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : sortKey === "code" ? a.code : sortKey === "selling_price" ? a.selling_price : a.current_stock
      const bVal = sortKey === "name" ? b.name : sortKey === "code" ? b.code : sortKey === "selling_price" ? b.selling_price : b.current_stock
      if (typeof aVal === "number") {
        return sortDir === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === "asc" ? cmp : -cmp
    })
    return result
  }, [products, searchQuery, sortKey, sortDir])

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
  }, [customers, customerSearch])

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return
    const q = barcodeInput.trim().toLowerCase()
    const product =
      products.find((p) => p.barcode?.toLowerCase() === q) ||
      products.find((p) => p.code.toLowerCase() === q)
    if (product) {
      addToCart({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price,
      })
      setBarcodeInput("")
      barcodeRef.current?.focus()
    }
  }

  const handleAddToCart = (product: Product) => {
    if (product.current_stock <= 0) return
    addToCart({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.selling_price,
    })
  }

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.total_price, 0), [cart])
  const taxableAmount = subtotal - discount + labourCharge + transportCharge
  const taxAmount = taxType === "svat" ? taxableAmount * 0.15 : 0
  const grandTotal = taxableAmount + taxAmount
  const changeDue = paymentType !== "credit" && amountPaid > grandTotal ? amountPaid - grandTotal : 0
  const balanceDue = paymentType === "credit" ? grandTotal : Math.max(0, grandTotal - amountPaid)

  const handleCompleteSale = async () => {
    if (cart.length === 0) return
    const supabase = createClient()
    setSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", user.id)
        .single()

      const profileData = profile as ProfileRow | null

      let branchCode = "XX"
      if (profileData?.branch_id) {
        const { data: branch } = await supabase
          .from("branches")
          .select("code")
          .eq("id", profileData.branch_id)
          .single()

        const branchData = branch as BranchRow | null
        if (branchData) branchCode = branchData.code
      }

      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, "0")
      const d = String(today.getDate()).padStart(2, "0")
      const dateStr = `${y}${m}${d}`

      const { data: lastSale } = await supabase
        .from("sales")
        .select("invoice_no")
        .like("invoice_no", `INV-${branchCode}-${dateStr}-%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      let seq = 1
      const lastSaleData = lastSale as SaleRow | null
      if (lastSaleData) {
        const parts = lastSaleData.invoice_no.split("-")
        seq = parseInt(parts[parts.length - 1], 10) + 1
      }
      const invoiceNo = `INV-${branchCode}-${dateStr}-${String(seq).padStart(4, "0")}`

      const customerId = selectedCustomer?.id || null
      const customerName = selectedCustomer?.name || "Walk-in Customer"

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_no: invoiceNo,
          customer_id: customerId,
          customer_name: customerName,
          branch_id: profileData?.branch_id || null,
          user_id: user.id,
          subtotal,
          discount,
          labour_charge: labourCharge,
          transport_charge: transportCharge,
          tax_type: taxType,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_type: paymentType,
          amount_paid: paymentType === "credit" ? 0 : amountPaid,
          balance_due: balanceDue,
          status: paymentType === "credit" ? "pending" : "completed",
        } as never)
        .select()
        .single()

      if (saleError) throw saleError
      const saleData = sale as SaleRow

      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItems as never)
      if (itemsError) throw itemsError

      for (const item of cart) {
        await supabase.rpc("decrement_product_stock", {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        })

        await supabase.from("stock_movements").insert({
          product_id: item.product_id,
          type: "out",
          quantity: item.quantity,
          reference_type: "sale",
          reference_id: saleData.id,
          notes: invoiceNo,
          branch_id: profileData?.branch_id || null,
          user_id: user.id,
        } as never)
      }

      if (paymentType === "credit" && customerId) {
        const { data: cust } = await supabase
          .from("customers")
          .select("credit_balance")
          .eq("id", customerId)
          .single()

        const custData = cust as CustomerCreditRow | null
        if (custData) {
          await supabase
            .from("customers")
            .update({ credit_balance: custData.credit_balance + grandTotal } as never)
            .eq("id", customerId)
        }
      }

      const receiptItems = cart.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }))

      setCompletedSale({
        invoice_no: invoiceNo,
        grand_total: grandTotal,
        amount_paid: paymentType === "credit" ? 0 : amountPaid,
        balance_due: balanceDue,
        items: receiptItems,
      })

      clearCart()
      setDiscount(0)
      setLabourCharge(0)
      setTransportCharge(0)
      setTaxType("non_vat")
      setPaymentType("cash")
      setAmountPaid(0)
      setSelectedCustomer(null)
      setCustomerSearch("")
    } catch (err) {
      console.error("Sale error:", err)
      alert("Failed to complete sale. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-900">{t("common.loading")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ===== TOP ROW: Search + Barcode ===== */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("common.search") + "..."}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="relative">
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleBarcodeSearch()
              }
            }}
            placeholder={t("sales.scan_barcode")}
            className="w-52 rounded-lg border border-gray-300 py-2.5 pl-3 pr-4 text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ===== MAIN CONTENT: Product Grid + Cart/Payment ===== */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ===== LEFT: Product Grid ===== */}
        <div className="flex-1 rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            {t("sales.item")}s
            {searchQuery && (
              <span className="ml-2 font-normal text-gray-700">
                ({filteredProducts.length})
              </span>
            )}
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-700">{t("common.no_results")}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-xs">
                    {(["name", "code", "selling_price", "current_stock"] as const).map((key) => {
                      const active = sortKey === key
                      const SortIcon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                      const labels: Record<string, string> = {
                        name: t("inventory.product_name"),
                        code: t("inventory.product_code"),
                        selling_price: t("inventory.selling_price"),
                        current_stock: t("inventory.current_stock"),
                      }
                      const align = key === "selling_price" || key === "current_stock" ? "text-right" : "text-left"
                      return (
                        <th
                          key={key}
                          onClick={() => handleSort(key)}
                          className={`cursor-pointer select-none px-3 py-2 ${align} font-medium ${
                            active ? "text-emerald-700" : "text-gray-700"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {labels[key]}
                            <SortIcon size={12} className="shrink-0" />
                          </span>
                        </th>
                      )
                    })}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const inCart = cart.some((i) => i.product_id === product.id)
                    const outOfStock = product.current_stock <= 0
                    const lowStock = !outOfStock && product.current_stock <= product.min_stock

                    let rowBg = ""
                    let stockColor = "text-gray-700"
                    if (inCart) {
                      rowBg = "bg-emerald-50"
                    } else if (outOfStock) {
                      rowBg = "bg-red-50"
                      stockColor = "text-red-700"
                    } else if (lowStock) {
                      rowBg = "bg-amber-50"
                      stockColor = "text-amber-700"
                    }

                    return (
                      <tr
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className={`cursor-pointer border-b transition hover:brightness-95 ${rowBg} ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-900">{product.name}</td>
                        <td className="px-3 py-2.5 text-gray-700">{product.code}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                          {formatCurrency(product.selling_price, locale)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-medium ${stockColor}`}>
                          {product.current_stock}
                          {outOfStock && <span className="ml-1.5 rounded bg-red-200 px-1 py-0.5 text-[10px] font-medium text-red-800">Out</span>}
                          {lowStock && <span className="ml-1.5 rounded bg-amber-200 px-1 py-0.5 text-[10px] font-medium text-amber-800">Low</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${
                            inCart ? "bg-emerald-500" : outOfStock ? "bg-gray-300" : "bg-emerald-500"
                          }`}>
                            {inCart ? "✓" : "+"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== RIGHT: Cart + Payment ===== */}
        <div className="flex w-full flex-col lg:w-[420px]">
          <div className="rounded-lg border bg-white">
            {/* Cart Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <ShoppingCart size={18} className="text-gray-700" />
              <span className="font-semibold text-gray-900">{t("sales.cart")}</span>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {cart.length}
              </span>
            </div>

            {/* Cart Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-700">
                    <th className="px-3 py-2 text-left font-medium">{t("sales.item")}</th>
                    <th className="px-3 py-2 text-center font-medium">{t("sales.qty")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sales.price")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("sales.amount")}</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-gray-700">
                        {t("sales.add_item")}
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.product_id} className="border-b last:border-0">
                        <td className="max-w-[140px] truncate px-3 py-2 text-sm font-medium text-gray-900">
                          {item.product_name}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeFromCart(item.product_id)
                                } else {
                                  updateQuantity(item.product_id, item.quantity - 1)
                                }
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded border text-gray-700 hover:bg-gray-100"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1
                                updateQuantity(item.product_id, v)
                              }}
                              className="w-10 rounded border px-1 py-0.5 text-center text-sm text-gray-900"
                            />
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded border text-gray-700 hover:bg-gray-100"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-900">
                          {formatCurrency(item.unit_price, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total_price, locale)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{t("common.subtotal")}</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{t("common.discount")}</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{t("sales.labour_charge")}</span>
                <input
                  type="number"
                  min={0}
                  value={labourCharge}
                  onChange={(e) => setLabourCharge(Number(e.target.value) || 0)}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{t("sales.transport_charge")}</span>
                <input
                  type="number"
                  min={0}
                  value={transportCharge}
                  onChange={(e) => setTransportCharge(Number(e.target.value) || 0)}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{t("common.tax")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">
                    {taxType === "svat" ? formatCurrency(taxAmount, locale) : "—"}
                  </span>
                  <button
                    onClick={() => setTaxType(taxType === "svat" ? "non_vat" : "svat")}
                    className={`rounded-full px-3 py-0.5 text-xs font-medium transition ${
                      taxType === "svat"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {taxType === "svat" ? t("sales.sri_lanka_vat") : t("sales.non_vat")}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span className="text-gray-900">{t("common.grand_total")}</span>
                <span className="text-emerald-600">{formatCurrency(grandTotal, locale)}</span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-3 border-t px-4 py-3">
              {/* Customer */}
              <div className="relative" ref={customerRef}>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-700" />
                  <input
                    type="text"
                    value={customerSearch || (selectedCustomer?.name ?? "")}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setSelectedCustomer(null)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={t("sales.select_customer")}
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none"
                  />
                  {selectedCustomer && (
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch("")
                      }}
                      className="text-xs text-gray-700 hover:text-gray-900"
                    >
                      &times;
                    </button>
                  )}
                </div>
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch("")
                        setShowCustomerDropdown(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                    >
                      {t("sales.walk_in")}
                    </button>
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c)
                          setCustomerSearch(c.name)
                          setShowCustomerDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="text-gray-900">{c.name}</span>
                        {c.phone && <span className="ml-2 text-xs text-gray-700">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Type */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-900">
                  {t("sales.payment_type")}
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => {
                    setPaymentType(e.target.value as PaymentType)
                    if (e.target.value === "credit") setAmountPaid(0)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {(["cash", "credit", "bank_transfer", "lanka_qr", "card", "mixed", "cheque"] as const).map(
                    (pt) => (
                      <option key={pt} value={pt}>
                        {t(`sales.${pt}`)}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Amount Paid + Change Due */}
              {paymentType !== "credit" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    {t("common.total")} Paid
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {changeDue > 0 && (
                    <p className="mt-1 text-sm font-medium text-emerald-600">
                      Change Due: {formatCurrency(changeDue, locale)}
                    </p>
                  )}
                  {amountPaid > 0 && amountPaid < grandTotal && (
                    <p className="mt-1 text-sm text-amber-600">
                      Balance Due: {formatCurrency(balanceDue, locale)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <div className="border-t px-4 py-3">
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>{t("common.loading")}</>
                ) : (
                  <>
                    <Smartphone size={18} />
                    {t("sales.complete_sale")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Completed Sale Modal ===== */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Printer size={24} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t("sales.complete_sale")}</h3>
              <p className="mt-1 text-sm text-gray-900">{completedSale.invoice_no}</p>
            </div>
            <div className="border-t pt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-gray-700">
                    <th className="pb-1 pr-2 text-left font-medium">{t("sales.item")}</th>
                    <th className="pb-1 pr-2 text-center font-medium">{t("sales.qty")}</th>
                    <th className="pb-1 pr-2 text-right font-medium">{t("sales.price")}</th>
                    <th className="pb-1 text-right font-medium">{t("sales.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 pr-2 text-gray-900">{item.product_name}</td>
                      <td className="py-1 pr-2 text-center text-gray-900">{item.quantity}</td>
                      <td className="py-1 pr-2 text-right text-gray-900">{formatCurrency(item.unit_price, locale)}</td>
                      <td className="py-1 text-right font-medium text-gray-900">{formatCurrency(item.total_price, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 pt-3 border-t text-sm">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">{t("common.grand_total")}</span>
                <span className="text-gray-900">
                  {formatCurrency(completedSale.grand_total, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">{t("common.total")} Paid</span>
                <span className="text-gray-900">{formatCurrency(completedSale.amount_paid, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">{t("sales.balance_due")}</span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(completedSale.balance_due, locale)}
                </span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCompletedSale(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                {t("common.no")}
              </button>
              <button
                onClick={() => {
                  window.print()
                  setCompletedSale(null)
                }}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t("common.print")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
