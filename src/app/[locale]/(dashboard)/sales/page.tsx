"use client"

import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { usePOSStore } from "@/stores/pos-store"
import { formatCurrency } from "@/lib/format"
import { Search, Trash2, ShoppingCart, User, Smartphone, ArrowUpDown, ArrowUp, ArrowDown, Plus, X, QrCode, Loader2, ShieldAlert } from "lucide-react"
import { use, useEffect, useMemo, useState, useRef, useCallback } from "react"
import type { Database } from "@/types/database"
import { CompanyFooter } from "@/components/shared/company-info"
import type { CompanySettings } from "@/components/shared/company-info"
import { getCached, setCache, invalidateCache } from "@/lib/query-cache"
import { generateNextCode } from "@/lib/code-gen"
import { useData } from "@/providers/data-provider"
import { useAuth } from "@/providers/auth-provider"
import { logAudit } from "@/lib/audit"

type Product = Database["public"]["Tables"]["products"]["Row"]
type PaymentType = Database["public"]["Tables"]["sales"]["Row"]["payment_type"]
type TaxType = Database["public"]["Tables"]["sales"]["Row"]["tax_type"]

interface CustomerOption {
  id: string
  code: string
  name: string
  phone: string | null
  credit_limit: number
  credit_balance: number
  total_outstanding: number
}

interface ProfileRow {
  branch_id: string | null
}

interface SaleRow {
  id: string
  invoice_no: string
}

interface CustomerCreditRow {
  credit_balance: number
}

const PAYMENT_TYPES: PaymentType[] = ["cash", "credit", "bank_transfer", "cheque", "lanka_qr", "card", "mixed"]

export default function SalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart } = usePOSStore()
  const { hasPermission, profile } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [serialInput, setSerialInput] = useState("")
  const [sortKey, setSortKey] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerEmail, setNewCustomerEmail] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [newCustomerNIC, setNewCustomerNIC] = useState("")
  const [newCustomerWhatsapp, setNewCustomerWhatsapp] = useState("")
  const [newCustomerHandphone, setNewCustomerHandphone] = useState("")
  const [newCustomerDOB, setNewCustomerDOB] = useState("")
  const [newCustomerCreditLimit, setNewCustomerCreditLimit] = useState(0)
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const [discount, setDiscount] = useState("")
  const [labourCharge, setLabourCharge] = useState("")
  const [transportCharge, setTransportCharge] = useState("")
  const [taxType, setTaxType] = useState<TaxType>("non_vat")
  const [paymentType, setPaymentType] = useState<PaymentType>("cash")
  const [amountPaid, setAmountPaid] = useState("")
  const [showApprovalPrompt, setShowApprovalPrompt] = useState(false)
  const [approvalPin, setApprovalPin] = useState("")
  const [chequeNumber, setChequeNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [fromAccount, setFromAccount] = useState("")
  const [toAccount, setToAccount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const { companySettings } = useData()

  // Lanka QR checkout state
  const [showQrPanel, setShowQrPanel] = useState(false)
  const [qrCheckoutUrl, setQrCheckoutUrl] = useState("")
  const [qrReference, setQrReference] = useState("")
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<"loading" | "ready" | "paid">("loading")
  const pendingSaleIdRef = useRef<string | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const [completedSale, setCompletedSale] = useState<{
    invoice_no: string
    grand_total: number
    amount_paid: number
    balance_due: number
    items: { product_name: string; quantity: number; unit_price: number; total_price: number }[]
  } | null>(null)

  const [nextInvoiceNo, setNextInvoiceNo] = useState("")

  const barcodeRef = useRef<HTMLInputElement>(null)
  const serialRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)
  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const discountRef = useRef<HTMLInputElement>(null)
  const labourRef = useRef<HTMLInputElement>(null)
  const transportRef = useRef<HTMLInputElement>(null)
  const amountPaidRef = useRef<HTMLInputElement>(null)
  const completeBtnRef = useRef<HTMLButtonElement>(null)
  const paymentTypeRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const chequeNumberRef = useRef<HTMLInputElement>(null)
  const bankCodeRef = useRef<HTMLInputElement>(null)
  const accountNumberRef = useRef<HTMLInputElement>(null)
  const fromAccountRef = useRef<HTMLInputElement>(null)
  const toAccountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)

      const cachedProducts = getCached<Product[]>("products:all")
      const cachedCustomers = getCached<CustomerOption[]>("customers:all")

      if (cachedProducts && cachedCustomers && cachedCustomers.length > 0 && "total_outstanding" in cachedCustomers[0]) {
        setProducts(cachedProducts)
        setCustomers(cachedCustomers)
        setLoading(false)
        return
      }

      const [productRes, customerRes, salesRes] = await Promise.all([
        supabase.from("products").select("id, name, code, barcode, serial_no, selling_price, current_stock, min_stock").eq("status", "active").order("name"),
        supabase.from("customers").select("id, code, name, phone, credit_limit, credit_balance").eq("status", "active").order("name"),
        supabase.from("sales").select("customer_id, balance_due"),
      ])
      if (productRes.data) {
        setProducts(productRes.data as Product[])
        setCache("products:all", productRes.data)
      }
      if (customerRes.data) {
        const outstandingByCustomer: Record<string, number> = {}
        for (const s of (salesRes.data ?? []) as { customer_id: string; balance_due: number }[]) {
          outstandingByCustomer[s.customer_id] = (outstandingByCustomer[s.customer_id] || 0) + s.balance_due
        }
        const filtered = (customerRes.data as CustomerOption[])
          .map((c) => ({
            ...c,
            total_outstanding: outstandingByCustomer[c.id] || 0,
          }))
          .filter((c) => c.total_outstanding <= c.credit_limit)
        setCustomers(filtered)
        setCache("customers:all", filtered)
      }
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

  useEffect(() => {
    const computeNextInvoice = async () => {
      const supabase = createClient()
      const today = new Date()
      const dd = String(today.getDate()).padStart(2, "0")
      const mm = String(today.getMonth() + 1).padStart(2, "0")
      const yy = String(today.getFullYear()).slice(-2)
      const prefix = `INV-${yy}${mm}${dd}-`
      const { data: lastSale } = await supabase
        .from("sales")
        .select("invoice_no")
        .like("invoice_no", `${prefix}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      let seq = 1
      if (lastSale) {
        const parts = (lastSale as { invoice_no: string }).invoice_no.split("-")
        seq = parseInt(parts[parts.length - 1], 10) + 1
      }
      setNextInvoiceNo(`${prefix}${String(seq).padStart(5, "0")}`)
    }
    computeNextInvoice()
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
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.serial_no.toLowerCase().includes(q),
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

  const addProductAndFocusQuantity = useCallback((product: Product) => {
    addToCart({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.selling_price,
    })
    setTimeout(() => {
      quantityRefs.current[product.id]?.focus()
      quantityRefs.current[product.id]?.select()
    }, 50)
  }, [addToCart])

  const handleBarcodeSearch = () => {
    if (!barcodeInput.trim()) return
    const q = barcodeInput.trim().toLowerCase()
    const product =
      products.find((p) => p.barcode?.toLowerCase() === q) ||
      products.find((p) => p.code.toLowerCase() === q)
    if (product) {
      addProductAndFocusQuantity(product)
      setBarcodeInput("")
    }
  }

  const handleSerialSearch = () => {
    const fullSerial = "000" + serialInput
    if (fullSerial.length < 6) return
    const product = products.find((p) => p.serial_no === fullSerial)
    if (product) {
      addProductAndFocusQuantity(product)
      setSerialInput("")
      serialRef.current?.focus()
    }
  }

  const handleAddToCart = (product: Product) => {
    if (product.current_stock <= 0) return
    addProductAndFocusQuantity(product)
  }

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.total_price, 0), [cart])
  const d = Number(discount) || 0
  const lc = Number(labourCharge) || 0
  const tc = Number(transportCharge) || 0
  const ap = Number(amountPaid) || 0
  const taxableAmount = subtotal + lc + tc
  const taxAmount = taxType === "svat" ? taxableAmount * 0.15 : 0
  const grandTotal = taxableAmount + taxAmount
  const netAmount = grandTotal - d
  const changeDue = ap > netAmount ? ap - netAmount : 0
  const balanceDue = Math.max(0, netAmount - ap)

  const maxDiscountPercent = useMemo(() => {
    const roleMax = hasPermission("pos", "discount_up_to_25") ? 25
      : hasPermission("pos", "discount_up_to_10") ? 10
      : 0
    if (roleMax === 0) return 0
    const companyMax = companySettings?.max_discount_percent ?? 25
    return Math.min(roleMax, companyMax)
  }, [hasPermission, companySettings])

  const maxDiscount = (taxableAmount * maxDiscountPercent) / 100
  const hasCreditPermission = hasPermission("pos", "approve_credit")

  const allowedPaymentTypes = useMemo(
    () => PAYMENT_TYPES.filter((pt) => (pt === "credit" ? hasCreditPermission : true)),
    [hasCreditPermission],
  )

  const isCreditOverLimit = useMemo(() => {
    if (paymentType !== "credit" || !selectedCustomer) return false
    const cust = customers.find((c) => c.id === selectedCustomer.id)
    if (!cust) return false
    const creditLimit = (cust as unknown as Record<string, unknown>).credit_limit as number ?? 0
    const creditBalance = (cust as unknown as Record<string, unknown>).credit_balance as number ?? 0
    return creditBalance + netAmount > creditLimit
  }, [paymentType, selectedCustomer, customers, netAmount])

  const handleCompleteSale = async () => {
    if (cart.length === 0) return

    if (paymentType === "lanka_qr") {
      await handleLankaQrCheckout()
      return
    }

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

      const today = new Date()
      const dd = String(today.getDate()).padStart(2, "0")
      const mm = String(today.getMonth() + 1).padStart(2, "0")
      const yy = String(today.getFullYear()).slice(-2)
      const invPrefix = `INV-${yy}${mm}${dd}-`

      const { data: lastSale } = await supabase
        .from("sales")
        .select("invoice_no")
        .like("invoice_no", `${invPrefix}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      let seq = 1
      const lastSaleData = lastSale as SaleRow | null
      if (lastSaleData) {
        const parts = lastSaleData.invoice_no.split("-")
        seq = parseInt(parts[parts.length - 1], 10) + 1
      }
      const invoiceNo = `${invPrefix}${String(seq).padStart(5, "0")}`

      const customerId = selectedCustomer?.id || null
      const customerName = selectedCustomer?.name || "Walk-in Customer"

      // Credit limit approval check
      let creditApprovalStatus = "none"
      let approvedBy: string | null = null
      if (paymentType === "credit" && isCreditOverLimit) {
        if (!approvalPin) throw new Error("Manager PIN required for credit over limit")
        const { data: settings } = await supabase
          .from("company_settings")
          .select("manager_pin")
          .limit(1)
          .maybeSingle()
        if (!settings || settings.manager_pin !== approvalPin) {
          throw new Error("Invalid manager PIN")
        }
        creditApprovalStatus = "approved"
        approvedBy = user.id
      }

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_no: invoiceNo,
          customer_id: customerId,
          customer_name: customerName,
          branch_id: profileData?.branch_id || null,
          user_id: user.id,
          subtotal,
          discount: d,
          labour_charge: lc,
          transport_charge: tc,
          tax_type: taxType,
          tax_amount: taxAmount,
          grand_total: netAmount,
          payment_type: paymentType,
          amount_paid: ap,
          balance_due: balanceDue,
          status: balanceDue > 0 ? "pending" : "completed",
          credit_approval_status: creditApprovalStatus,
          approved_by: approvedBy,
          payment_details: {
            ...(paymentType === "cheque" && { cheque_number: chequeNumber, bank_code: bankCode, account_number: accountNumber }),
            ...(paymentType === "bank_transfer" && { from_account: fromAccount, to_account: toAccount }),
          },
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

      // Reset form state immediately after sale is saved
      const receiptItems = cart.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }))
      const completedSaleData = { invoice_no: invoiceNo, grand_total: netAmount, amount_paid: ap, balance_due: balanceDue, items: receiptItems }
      clearCart()
      setDiscount("")
      setLabourCharge("")
      setTransportCharge("")
      setTaxType("non_vat")
      setPaymentType("cash")
      setAmountPaid("")
      setApprovalPin("")
      setShowApprovalPrompt(false)
      setChequeNumber("")
      setBankCode("")
      setAccountNumber("")
      setFromAccount("")
      setToAccount("")
      setSelectedCustomer(null)
      setCustomerSearch("")

      // Batch stock operations
      const productIds = cart.map((i) => i.product_id)
      const { data: products } = await supabase
        .from("products")
        .select("id, current_stock")
        .in("id", productIds)
      if (products) {
        for (const p of products) {
          const qty = cart.find((i) => i.product_id === p.id)?.quantity || 0
          await supabase.from("products").update({ current_stock: Number(p.current_stock) - qty } as never).eq("id", p.id)
        }
      }

      // Batch branch stock updates
      if (profileData?.branch_id) {
        const { data: branchStocks } = await supabase
          .from("branch_stock")
          .select("product_id, current_stock")
          .in("product_id", productIds)
          .eq("branch_id", profileData.branch_id)
        if (branchStocks) {
          for (const bs of branchStocks) {
            const qty = cart.find((i) => i.product_id === bs.product_id)?.quantity || 0
            await supabase.from("branch_stock").update({ current_stock: Number(bs.current_stock) - qty }).eq("product_id", bs.product_id).eq("branch_id", profileData.branch_id)
          }
        }
      }

      // Batch insert stock movements
      const movements = cart.map((item) => ({
        product_id: item.product_id,
        type: "out" as const,
        quantity: item.quantity,
        reference_type: "sale" as const,
        reference_id: saleData.id,
        notes: `${customerName || "Walk-in Customer"} - ${invoiceNo}`,
        branch_id: profileData?.branch_id || null,
        user_id: user.id,
      }))
      await supabase.from("stock_movements").insert(movements as never)

      if (customerId && balanceDue > 0) {
        const { data: cust } = await supabase
          .from("customers")
          .select("credit_balance")
          .eq("id", customerId)
          .single()

        const custData = cust as CustomerCreditRow | null
        if (custData) {
          await supabase
            .from("customers")
            .update({ credit_balance: custData.credit_balance + balanceDue } as never)
            .eq("id", customerId)
        }
      }

      if (ap > 0) {
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
          reference_id: saleData.id,
          reference_type: "payment",
          entry_type: "debit",
          amount: ap,
          description: `Sale ${invoiceNo}`,
          balance_after: prevBalance + ap,
        } as never)
      }

      setCompletedSale(completedSaleData)

      logAudit({
        action: "create_sale",
        entity_type: "sale",
        entity_id: saleData.id,
        metadata: { invoice_no: invoiceNo, grand_total: netAmount, amount_paid: ap, balance_due: balanceDue },
      })

      invalidateCache("sales")
      invalidateCache("products")
      invalidateCache("customers")
    } catch (err) {
      console.error("Sale error:", err)
      alert("Failed to complete sale. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLankaQrCheckout = async () => {
    const supabase = createClient()
    setSubmitting(true)

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume()
    }
    console.log("[QR] AudioCtx state:", audioCtxRef.current?.state)

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

      const today = new Date()
      const dd = String(today.getDate()).padStart(2, "0")
      const mm = String(today.getMonth() + 1).padStart(2, "0")
      const yy = String(today.getFullYear()).slice(-2)
      const invPrefix = `INV-${yy}${mm}${dd}-`

      const { data: lastSale } = await supabase
        .from("sales")
        .select("invoice_no")
        .like("invoice_no", `${invPrefix}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      let seq = 1
      if (lastSale) {
        const parts = (lastSale as SaleRow).invoice_no.split("-")
        seq = parseInt(parts[parts.length - 1], 10) + 1
      }
      const invoiceNo = `${invPrefix}${String(seq).padStart(5, "0")}`

      const customerId = selectedCustomer?.id || null
      const customerName = selectedCustomer?.name || "Walk-in Customer"

      // Auto-set amount_paid to grand_total for QR payments
      const qrAmountPaid = ap > 0 ? ap : netAmount
      const qrBalanceDue = Math.max(0, netAmount - qrAmountPaid)

      const baseUrl = process.env.NEXT_PUBLIC_QR_CHECKOUT_URL || "http://localhost:8791"

      const res = await fetch("/api/qr-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: netAmount.toFixed(2),
          reference_number: invoiceNo,
          language: locale,
          merchant_id: companySettings?.lanka_qr_merchant_id || "",
          terminal_id: companySettings?.lanka_qr_terminal_id || "",
          mcc: companySettings?.lanka_qr_mcc || "",
          bank_code: companySettings?.lanka_qr_bank_code || "",
          merchant_name: companySettings?.lanka_qr_merchant_name || "",
          merchant_city: companySettings?.lanka_qr_merchant_city || "",
          currency_code: companySettings?.lanka_qr_currency_code || "144",
          country_code: companySettings?.lanka_qr_country_code || "LK",
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error((errBody as { error?: string }).error || "QR checkout failed")
      }

      const data = (await res.json()) as { checkout_url: string; reference_number: string }
      const checkoutFullUrl = `${baseUrl}${data.checkout_url}`

      // Insert sale as pending
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_no: invoiceNo,
          customer_id: customerId,
          customer_name: customerName,
          branch_id: profileData?.branch_id || null,
          user_id: user.id,
          subtotal,
          discount: d,
          labour_charge: lc,
          transport_charge: tc,
          tax_type: taxType,
          tax_amount: taxAmount,
          grand_total: netAmount,
          payment_type: "lanka_qr",
          amount_paid: qrAmountPaid,
          balance_due: qrBalanceDue,
          status: "pending",
          payment_details: { qr_reference: data.reference_number },
        } as never)
        .select()
        .single()

      if (saleError) throw saleError
      const saleData = sale as SaleRow

      // Insert sale items immediately
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

      // Show QR panel
      pendingSaleIdRef.current = saleData.id
      setPendingSaleId(saleData.id)
      setQrCheckoutUrl(checkoutFullUrl)
      setQrReference(data.reference_number)
      setQrStatus("ready")
      setShowQrPanel(true)
    } catch (err) {
      console.error("Lanka QR error:", err)
      alert("Failed to initiate QR checkout. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const finalizePendingSale = async (reference: string) => {
    const saleId = pendingSaleIdRef.current
    if (!saleId) {
      console.error("No pending sale to finalize")
      return
    }

    const supabase = createClient()

    try {
      // Fetch the pending sale data
      const { data: sale } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("id", saleId)
        .single()

      if (!sale) throw new Error("Sale not found")

      const saleData = sale as SaleRow & {
        invoice_no: string
        grand_total: number
        amount_paid: number
        balance_due: number
        customer_id: string | null
        customer_name: string
        branch_id: string | null
        user_id: string
        subtotal: number
        discount: number
        labour_charge: number
        transport_charge: number
        tax_type: string
        tax_amount: number
        payment_type: string
        sale_items: { product_id: string; quantity: number; product_name: string; unit_price: number; total_price: number }[]
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update sale status to completed
      await supabase
        .from("sales")
        .update({ status: "completed" } as never)
        .eq("id", saleId)

      // Deduct stock
      const productIds = saleData.sale_items.map((i: { product_id: string }) => i.product_id)
      const { data: products } = await supabase
        .from("products")
        .select("id, current_stock")
        .in("id", productIds)
      if (products) {
        for (const p of products) {
          const qty = saleData.sale_items.find((i: { product_id: string }) => i.product_id === p.id)?.quantity || 0
          await supabase.from("products").update({ current_stock: Number(p.current_stock) - qty } as never).eq("id", p.id)
        }
      }

      // Branch stock updates
      if (saleData.branch_id) {
        const { data: branchStocks } = await supabase
          .from("branch_stock")
          .select("product_id, current_stock")
          .in("product_id", productIds)
          .eq("branch_id", saleData.branch_id)
        if (branchStocks) {
          for (const bs of branchStocks) {
            const qty = saleData.sale_items.find((i: { product_id: string }) => i.product_id === bs.product_id)?.quantity || 0
            await supabase.from("branch_stock").update({ current_stock: Number(bs.current_stock) - qty }).eq("product_id", bs.product_id).eq("branch_id", saleData.branch_id)
          }
        }
      }

      // Stock movements
      const movements = saleData.sale_items.map((item: { product_id: string; quantity: number; product_name: string }) => ({
        product_id: item.product_id,
        type: "out" as const,
        quantity: item.quantity,
        reference_type: "sale" as const,
        reference_id: saleId,
        notes: `${saleData.customer_name || "Walk-in Customer"} - ${saleData.invoice_no}`,
        branch_id: saleData.branch_id || null,
        user_id: user.id,
      }))
      await supabase.from("stock_movements").insert(movements as never)

      // Customer credit update
      if (saleData.customer_id && saleData.balance_due > 0) {
        const { data: cust } = await supabase
          .from("customers")
          .select("credit_balance")
          .eq("id", saleData.customer_id)
          .single()
        if (cust) {
          await supabase
            .from("customers")
            .update({ credit_balance: (cust as CustomerCreditRow).credit_balance + saleData.balance_due } as never)
            .eq("id", saleData.customer_id)
        }
      }

      // Ledger entry
      if (saleData.amount_paid > 0) {
        const { data: lastEntry } = await supabase
          .from("ledger_entries")
          .select("balance_after")
          .eq("ledger_type", "bank")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        const prevBalance = (lastEntry as { balance_after: number } | null)?.balance_after ?? 0
        await supabase.from("ledger_entries").insert({
          ledger_type: "bank",
          reference_id: saleId,
          reference_type: "payment",
          entry_type: "debit",
          amount: saleData.amount_paid,
          description: `Sale ${saleData.invoice_no} (Lanka QR: ${reference})`,
          balance_after: prevBalance + saleData.amount_paid,
        } as never)
      }

      // Show receipt
      const receiptItems = saleData.sale_items.map((i: { product_name: string; quantity: number; unit_price: number; total_price: number }) => ({
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }))
      setCompletedSale({
        invoice_no: saleData.invoice_no,
        grand_total: saleData.grand_total,
        amount_paid: saleData.amount_paid,
        balance_due: saleData.balance_due,
        items: receiptItems,
      })

      clearCart()
      setDiscount("")
      setLabourCharge("")
      setTransportCharge("")
      setTaxType("non_vat")
      setPaymentType("cash")
      setAmountPaid("")
      setApprovalPin("")
      setShowApprovalPrompt(false)
      setSelectedCustomer(null)
      setCustomerSearch("")
      // Keep QR panel open for TTS audio to arrive; close after timeout or when TTS plays
      setTimeout(() => setShowQrPanel(false), 15000)

      invalidateCache("sales")
      invalidateCache("products")
      invalidateCache("customers")
    } catch (err) {
      console.error("Finalize sale error:", err)
      alert("Payment was received but failed to finalize the sale. Please check pending sales.")
    }
  }

  // Listen for Lanka QR payment completion from iframe
  useEffect(() => {
    function handleQrMessage(event: MessageEvent) {
      if (event.data?.event === "lankaqr_payment_complete") {
        console.log("[QR] payment_complete ref:", event.data.reference)
        setQrStatus("paid")
        setShowQrPanel(false)
        finalizePendingSale(event.data.reference)
        if (event.data?.session_id) {
          const sid = event.data.session_id as string
          const ctx = audioCtxRef.current
          fetch("https://qr-checkout.qr4pos.workers.dev/tts/" + sid)
            .then(function(r) { return r.json() })
            .then(function(data) {
              if (!data.audio || !ctx) return
              var binary = atob(data.audio as string)
              var bytes = new Uint8Array(binary.length)
              for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              ctx.decodeAudioData(bytes.buffer).then(function(buffer) {
                console.log("[QR] Audio decode OK, playing...")
                var source = ctx.createBufferSource()
                source.buffer = buffer
                source.playbackRate.value = 1.2
                source.connect(ctx.destination)
                source.onended = function() { setShowQrPanel(false) }
                source.start(0)
              }).catch(function(e: unknown) {
                console.error("[QR] decode/play failed:", (e as Error).message)
              })
            }).catch(function(e) {
              console.warn("[QR] TTS fetch failed:", e)
            })
        }
      }
    }
    window.addEventListener("message", handleQrMessage)
    return () => window.removeEventListener("message", handleQrMessage)
  }, [])

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName.trim()) return
    setCreatingCustomer(true)
    const supabase = createClient()
    const code = await generateNextCode("customers")
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: newCustomerName.trim(),
        code,
        phone: newCustomerPhone.trim() || null,
        email: newCustomerEmail.trim() || null,
        address: newCustomerAddress.trim() || null,
        nic: newCustomerNIC.trim() || null,
        whatsapp: newCustomerWhatsapp.trim() || newCustomerHandphone.trim() || null,
        handphone: newCustomerHandphone.trim() || newCustomerPhone.trim() || null,
        credit_limit: newCustomerCreditLimit,
        date_of_birth: newCustomerDOB.trim() || null,
        status: "active",
      } as never)
      .select("id, name, phone")
      .single()

    if (error) {
      console.error("Customer creation error:", error)
      alert("Failed to create customer")
      setCreatingCustomer(false)
      return
    }

    const newCust = data as CustomerOption
    setCustomers((prev) => [...prev, newCust])
    setSelectedCustomer(newCust)
    setCustomerSearch(newCust.name)
    setShowNewCustomerForm(false)
    setNewCustomerName("")
    setNewCustomerPhone("")
    setNewCustomerEmail("")
    setNewCustomerAddress("")
    setNewCustomerNIC("")
    setNewCustomerWhatsapp("")
    setNewCustomerHandphone("")
    setNewCustomerDOB("")
    setNewCustomerCreditLimit(0)
    setShowCustomerDropdown(false)
    invalidateCache("customers")
    setCreatingCustomer(false)
  }

  return (
    <div className="space-y-4">
      {/* ===== TOP ROW: Search + Barcode + Serial No (equal size) ===== */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const q = searchQuery.trim().toLowerCase()
                const match = products.find(
                  (p) =>
                    p.barcode?.toLowerCase() === q ||
                    p.code.toLowerCase() === q ||
                    p.name.toLowerCase() === q
                )
                if (match) {
                  addToCart({
                    product_id: match.id,
                    product_name: match.name,
                    quantity: 1,
                    unit_price: match.selling_price,
                  })
                  setSearchQuery("")
                }
              }
            }}
            placeholder={t("common.search") + "..."}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-black placeholder-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
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
          placeholder="Barcode / Code"
          className="flex-1 rounded-lg border border-gray-300 py-2.5 px-3 text-sm text-black placeholder-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <div className="flex flex-1 items-center rounded-lg border border-gray-300 px-3 py-2.5 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
          <span className="text-sm text-black font-mono mr-0.5">000</span>
          <input
            ref={serialRef}
            type="text"
            value={serialInput}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 3)
              setSerialInput(v)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSerialSearch()
              }
            }}
            placeholder="—"
            className="w-full border-0 p-0 text-sm text-black font-mono focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      {/* ===== MAIN CONTENT: Product Grid + Cart/Payment ===== */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ===== LEFT: Product Grid ===== */}
        <div className="flex-1 rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-black">
            {t("sales.item")}s
            {searchQuery && (
              <span className="ml-2 font-normal text-black">
                ({filteredProducts.length})
              </span>
            )}
          </h2>

          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-black">{t("common.no_results")}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b text-xs">
                    {(["serial_no", "name", "code", "selling_price", "current_stock"] as const).map((key) => {
                      const active = sortKey === key
                      const SortIcon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                      const labels: Record<string, string> = {
                        serial_no: "Serial",
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
                            active ? "text-black" : "text-black"
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
                    let stockColor = "text-black"
                    if (inCart) {
                      rowBg = "bg-emerald-50"
                    } else if (outOfStock) {
                      rowBg = "bg-red-50"
                      stockColor = "text-black"
                    } else if (lowStock) {
                      rowBg = "bg-amber-50"
                      stockColor = "text-black"
                    }

                    return (
                      <tr
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        className={`cursor-pointer border-b transition hover:brightness-95 ${rowBg} ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs text-black">{product.serial_no}</td>
                        <td className="px-3 py-2.5 font-medium text-black">{product.name}</td>
                        <td className="px-3 py-2.5 text-black">{product.code}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-black">
                          {formatCurrency(product.selling_price, locale)}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-medium ${stockColor}`}>
                          {product.current_stock}
                          {outOfStock && <span className="ml-1.5 rounded bg-red-200 px-1 py-0.5 text-[10px] font-medium text-black">Out</span>}
                          {lowStock && <span className="ml-1.5 rounded bg-amber-200 px-1 py-0.5 text-[10px] font-medium text-black">Low</span>}
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
        <div className="flex w-full flex-col lg:min-w-[420px] lg:max-w-[600px]">
          <div className="rounded-lg border bg-white">
            {/* Cart Header */}
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <ShoppingCart size={18} className="text-black" />
              <span className="font-semibold text-black">{t("sales.cart")}</span>
              {nextInvoiceNo && (
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-black">
                  {nextInvoiceNo}
                </span>
              )}
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-black">
                {cart.length}
              </span>
            </div>

            {/* Cart Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-black">
                    <th className="px-3 py-2 text-left font-bold">{t("sales.item")}</th>
                    <th className="px-3 py-2 text-center font-bold">{t("sales.qty")}</th>
                    <th className="px-3 py-2 text-right font-bold">{t("sales.price")}</th>
                    <th className="px-3 py-2 text-right font-bold">{t("sales.amount")}</th>
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-black">
                        {t("sales.add_item")}
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.product_id} className="border-b last:border-0">
                        <td className="break-words px-3 py-2 text-sm text-black">
                          {item.product_name}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            ref={(el) => { quantityRefs.current[item.product_id] = el }}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const v = parseInt(e.target.value) || 1
                              updateQuantity(item.product_id, v)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === "Tab") {
                                e.preventDefault()
                                const lastItem = cart[cart.length - 1]
                                if (item.product_id === lastItem?.product_id) {
                                  labourRef.current?.focus()
                                } else {
                                  const idx = cart.findIndex((ci) => ci.product_id === item.product_id)
                                  const next = cart[idx + 1]
                                  if (next) {
                                    setTimeout(() => quantityRefs.current[next.product_id]?.focus(), 0)
                                  }
                                }
                              }
                            }}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-black focus:border-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-black">
                          {formatCurrency(item.unit_price, locale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-black">
                          {formatCurrency(item.total_price, locale)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="flex h-7 w-7 items-center justify-center rounded text-black hover:bg-red-50 hover:text-black"
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
                <span className="text-black">{t("common.subtotal")}</span>
                <span className="text-black">{formatCurrency(subtotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-black">{t("sales.labour_charge")}</span>
                <input
                  ref={labourRef}
                  type="number"
                  min={0}
                  value={labourCharge}
                  onChange={(e) => setLabourCharge(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault()
                      transportRef.current?.focus()
                    }
                  }}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-black">{t("sales.transport_charge")}</span>
                <input
                  ref={transportRef}
                  type="number"
                  min={0}
                  value={transportCharge}
                  onChange={(e) => setTransportCharge(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault()
                      amountPaidRef.current?.focus()
                    }
                  }}
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-black">{t("common.tax")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black">
                    {taxType === "svat" ? formatCurrency(taxAmount, locale) : "—"}
                  </span>
                  <button
                    onClick={() => setTaxType(taxType === "svat" ? "non_vat" : "svat")}
                    className={`rounded-full px-3 py-0.5 text-xs font-medium transition ${
                      taxType === "svat"
                        ? "bg-emerald-100 text-black"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {taxType === "svat" ? t("sales.sri_lanka_vat") : t("sales.non_vat")}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span className="text-black">{t("common.grand_total")}</span>
                <span className="text-black">{formatCurrency(grandTotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-black">
                  {t("common.discount")}
                  {maxDiscountPercent > 0 && (
                    <span className="text-xs text-black/50">(max {maxDiscountPercent}%)</span>
                  )}
                  {maxDiscountPercent === 0 && (
                    <ShieldAlert size={12} className="text-amber-500" />
                  )}
                </span>
                <input
                  ref={discountRef}
                  type="number"
                  min={0}
                  max={maxDiscount}
                  value={discount}
                  onChange={(e) => {
                    const val = e.target.value
                    if (maxDiscountPercent === 0) { setDiscount("0"); return }
                    if (Number(val) > maxDiscount) { setDiscount(String(maxDiscount)); return }
                    setDiscount(val)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault()
                      amountPaidRef.current?.focus()
                    }
                  }}
                  className={`w-28 rounded border px-2 py-1 text-right text-sm text-black focus:outline-none ${
                    maxDiscountPercent === 0
                      ? "border-gray-200 bg-gray-100 text-black/50 cursor-not-allowed"
                      : "border-gray-300 focus:border-emerald-500"
                  }`}
                  autoComplete="off"
                  disabled={maxDiscountPercent === 0}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span className="text-black">Net Amount</span>
                <span className="text-black">{formatCurrency(netAmount, locale)}</span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="space-y-3 border-t px-4 py-3">
              {/* Customer */}
              <div className="relative" ref={customerRef}>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-black" />
                  <input
                    type="text"
                    value={customerSearch || (selectedCustomer?.name ?? "")}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value)
                      setSelectedCustomer(null)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault()
                        if (showCustomerDropdown && filteredCustomers.length > 0) {
                          const first = filteredCustomers[0]
                          setSelectedCustomer(first)
                          setCustomerSearch(first.name)
                          setShowCustomerDropdown(false)
                        }
                        setTimeout(() => paymentTypeRefs.current["cash"]?.focus(), 0)
                      }
                    }}
                    placeholder={t("sales.select_customer")}
                    className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                  {selectedCustomer && (
                    <button
                      onClick={() => {
                        setSelectedCustomer(null)
                        setCustomerSearch("")
                      }}
                      className="text-xs text-black hover:text-black"
                    >
                      &times;
                    </button>
                  )}
                </div>
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="sticky top-0 bg-white border-b px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Plus size={14} className="text-black" />
                        <button
                          onClick={() => {
                            setShowCustomerDropdown(false)
                            setShowNewCustomerForm(true)
                          }}
                          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          New Customer
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null)
                          setCustomerSearch("")
                          setShowCustomerDropdown(false)
                        }}
                        className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-black hover:bg-gray-50"
                      >
                        Walk-in Customer
                      </button>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b">
                          <th className="px-3 py-1.5 text-left font-medium text-black">ID</th>
                          <th className="px-3 py-1.5 text-left font-medium text-black">Name</th>
                          <th className="px-3 py-1.5 text-right font-medium text-black">Credit Limit</th>
                          <th className="px-3 py-1.5 text-right font-medium text-black">Total Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-black">No customers found</td>
                          </tr>
                        )}
                        {filteredCustomers.map((c) => (
                          <tr
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c)
                              setCustomerSearch(c.name)
                              setShowCustomerDropdown(false)
                            }}
                            className="cursor-pointer border-b hover:bg-gray-50"
                          >
                            <td className="px-3 py-1.5 font-mono text-black">{c.code}</td>
                            <td className="px-3 py-1.5 text-black">{c.name}</td>
                            <td className="px-3 py-1.5 text-right text-black">{formatCurrency(c.credit_limit, locale)}</td>
                            <td className="px-3 py-1.5 text-right text-black">{formatCurrency(c.total_outstanding, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedCustomer && paymentType === "credit" && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                  <div className="flex items-center justify-between text-xs text-black">
                    <span>Credit Limit: {formatCurrency((selectedCustomer as unknown as Record<string, unknown>).credit_limit as number ?? 0, locale)}</span>
                    <span>Used: {formatCurrency((selectedCustomer as unknown as Record<string, unknown>).credit_balance as number ?? 0, locale)}</span>
                    <span className={isCreditOverLimit ? "font-semibold text-black" : "text-black"}>
                      Available: {formatCurrency(Math.max(0, ((selectedCustomer as unknown as Record<string, unknown>).credit_limit as number ?? 0) - ((selectedCustomer as unknown as Record<string, unknown>).credit_balance as number ?? 0)), locale)}
                    </span>
                  </div>
                </div>
              )}

              {/* Credit Limit Warning */}
              {isCreditOverLimit && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-black">
                    Credit limit exceeded for {selectedCustomer?.name}
                  </p>
                  <p className="mt-0.5 text-xs text-black">
                    Manager PIN required to proceed
                  </p>
                  <input
                    type="password"
                    maxLength={4}
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Enter manager PIN"
                    className="mt-2 w-36 rounded border border-amber-300 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Payment Type - Buttons */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">
                  {t("sales.payment_type")}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_TYPES.map((pt) => (
                    <button
                      key={pt}
                      ref={(el) => { paymentTypeRefs.current[pt] = el }}
                      type="button"
                      onClick={() => setPaymentType(pt)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                        paymentType === pt
                          ? "border-emerald-500 bg-emerald-50 text-black"
                          : "border-gray-300 bg-white text-black hover:bg-gray-50"
                      }`}
                    >
                      {t(`sales.${pt}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Paid + Overpayment Alert */}
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  {t("common.total")} Paid
                </label>
                <div className={`rounded-lg border ${ap > netAmount ? "border-red-500 bg-red-50" : "border-gray-300"}`}>
                  <input
                    ref={amountPaidRef}
                    type="number"
                    min={0}
                    max={netAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault()
                        if (ap >= netAmount) {
                          completeBtnRef.current?.focus()
                        }
                      }
                    }}
                    className="w-full rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-black focus:outline-none focus:ring-0"
                  />
                </div>
                {ap > 0 && ap >= netAmount && changeDue > 0 && (
                  <p className="mt-1.5 rounded bg-yellow-100 px-2 py-1 text-sm font-semibold text-black">
                    Change Due: {formatCurrency(changeDue, locale)}
                  </p>
                )}
                {ap > 0 && ap < netAmount && (
                  <p className="mt-1 text-sm text-black">
                    Balance Due: {formatCurrency(balanceDue, locale)}
                  </p>
                )}
              </div>

              {/* Cheque Details */}
              {paymentType === "cheque" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-black">Cheque Number</label>
                      <input
                        ref={chequeNumberRef}
                        type="text"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault()
                            bankCodeRef.current?.focus()
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-black">Bank Code</label>
                      <input
                        ref={bankCodeRef}
                        type="text"
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault()
                            accountNumberRef.current?.focus()
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">Account Number</label>
                    <input
                      ref={accountNumberRef}
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault()
                          amountPaidRef.current?.focus()
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Bank Transfer Details */}
              {paymentType === "bank_transfer" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">From Account</label>
                    <input
                      ref={fromAccountRef}
                      type="text"
                      value={fromAccount}
                      onChange={(e) => setFromAccount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault()
                          toAccountRef.current?.focus()
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-black">To Account</label>
                    <input
                      ref={toAccountRef}
                      type="text"
                      value={toAccount}
                      onChange={(e) => setToAccount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault()
                          amountPaidRef.current?.focus()
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <div className="border-t px-4 py-3">
              <button
                ref={completeBtnRef}
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
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl receipt-print">
            <div className="flex items-start gap-4 mb-4 border-b pb-3">
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
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-black">{t("sales.complete_sale")}</h3>
              <p className="mt-1 text-sm text-black">{completedSale.invoice_no}</p>
            </div>
            <div className="pt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-black">
                    <th className="pb-1 pr-2 text-left font-medium">{t("sales.item")}</th>
                    <th className="pb-1 pr-2 text-center font-medium">{t("sales.qty")}</th>
                    <th className="pb-1 pr-2 text-right font-medium">{t("sales.price")}</th>
                    <th className="pb-1 text-right font-medium">{t("sales.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1 pr-2 text-black">{item.product_name}</td>
                      <td className="py-1 pr-2 text-center text-black">{item.quantity}</td>
                      <td className="py-1 pr-2 text-right text-black">{formatCurrency(item.unit_price, locale)}</td>
                      <td className="py-1 text-right font-medium text-black">{formatCurrency(item.total_price, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 pt-3 border-t text-sm">
              <div className="flex justify-between font-semibold">
                <span className="text-black">{t("common.grand_total")}</span>
                <span className="text-black">
                  {formatCurrency(completedSale.grand_total, locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">{t("common.total")} Paid</span>
                <span className="text-black">{formatCurrency(completedSale.amount_paid, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black">{t("sales.balance_due")}</span>
                <span className="font-medium text-black">
                  {formatCurrency(completedSale.balance_due, locale)}
                </span>
              </div>
            </div>
            <div className="no-print">
              <CompanyFooter settings={companySettings} />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setCompletedSale(null)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
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
        </div>
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: absolute; left: 0; top: 0; width: 100%; max-width: 210mm; margin: 0 auto; box-shadow: none; border-radius: 0; }
          .no-print, .no-print * { display: none !important; }
        }
      `}</style>

      {/* ===== Lanka QR Panel ===== */}
      {showQrPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-black">
                  {qrStatus === "paid" ? "Payment Received" : "Lanka QR Payment"}
                </h3>
              </div>
              {qrStatus !== "paid" && (
                <button
                  onClick={() => {
                    setShowQrPanel(false)
                    setPendingSaleId(null)
                    pendingSaleIdRef.current = null
                  }}
                  className="rounded p-1 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              )}
            </div>

            {qrStatus === "ready" && (
              <>
                <p className="mb-3 text-sm text-gray-600">
                  Ask the customer to scan the QR code with their banking app.
                </p>
                <div
                  style={{ width: "100%", height: 500, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}
                >
                   <iframe
                    src={qrCheckoutUrl}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                    allow="payment; autoplay"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400 text-center">
                  Ref: {qrReference}
                </p>
              </>
            )}

            {qrStatus === "paid" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600">Finalizing sale...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== New Customer Modal ===== */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">New Customer</h3>
              <button
                onClick={() => setShowNewCustomerForm(false)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Name *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Phone</label>
                <input
                  type="text"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Credit Limit</label>
                <input
                  type="number"
                  min={0}
                  value={newCustomerCreditLimit}
                  onChange={(e) => setNewCustomerCreditLimit(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  More Details
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">NIC Number</label>
                    <input
                      type="text"
                      value={newCustomerNIC}
                      onChange={(e) => setNewCustomerNIC(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Address</label>
                    <input
                      type="text"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Email</label>
                    <input
                      type="text"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Handphone</label>
                    <input
                      type="text"
                      value={newCustomerHandphone}
                      onChange={(e) => {
                        setNewCustomerHandphone(e.target.value)
                        if (!newCustomerWhatsapp) {
                          setNewCustomerWhatsapp(e.target.value)
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">WhatsApp Number</label>
                    <input
                      type="text"
                      value={newCustomerWhatsapp}
                      onChange={(e) => setNewCustomerWhatsapp(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={newCustomerHandphone || "Handphone number"}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-black">Date of Birth</label>
                    <input
                      type="date"
                      value={newCustomerDOB}
                      onChange={(e) => setNewCustomerDOB(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </details>
              <button
                onClick={handleCreateNewCustomer}
                disabled={creatingCustomer || !newCustomerName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creatingCustomer ? "Creating..." : "Save Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
