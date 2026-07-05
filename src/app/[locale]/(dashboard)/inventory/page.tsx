"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Plus, Pencil, Trash2, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, formatDate } from "@/lib/format"
import { calculateFIFOValue } from "@/lib/fifo"
import { getCached, setCache } from "@/lib/query-cache"

interface ProductRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  barcode: string | null
  serial_no: string
  category_id: string | null
  brand_id: string | null
  unit_id: string | null
  cost_price: number
  selling_price: number
  wholesale_price: number | null
  min_stock: number
  current_stock: number
  has_expiry: boolean
  expiry_date: string | null
  is_decimal_qty: boolean
  status: "active" | "inactive"
  categories: { name: string } | null
  brands: { name: string } | null
  units: { name: string; symbol: string } | null
}

export default function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const supabase = createClient()
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fifoValues, setFifoValues] = useState<Record<string, { value: number; quantity: number }>>({})

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchBalances(productIds: string[], productsData: ProductRow[]): Promise<ProductRow[]> {
    if (productIds.length === 0) return productsData
    const [inRes, outRes] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("product_id, quantity, created_at")
        .eq("type", "in")
        .in("product_id", productIds),
      supabase
        .from("stock_movements")
        .select("product_id, quantity, created_at")
        .eq("type", "out")
        .in("product_id", productIds),
    ])

    const inMap: Record<string, { quantity: number; created_at: string }[]> = {}
    for (const m of (inRes.data || []) as { product_id: string; quantity: number; created_at: string }[]) {
      if (!inMap[m.product_id]) inMap[m.product_id] = []
      inMap[m.product_id].push({ ...m, quantity: Math.abs(m.quantity) })
    }

    const outMap: Record<string, { quantity: number; created_at: string }[]> = {}
    for (const m of (outRes.data || []) as { product_id: string; quantity: number; created_at: string }[]) {
      if (!outMap[m.product_id]) outMap[m.product_id] = []
      outMap[m.product_id].push({ ...m, quantity: Math.abs(m.quantity) })
    }

    const updatedProducts = productsData.map((p) => {
      const allIns = inMap[p.id] || []
      const outs = outMap[p.id] || []
      const inQty = allIns.reduce((s, m) => s + m.quantity, 0)
      const outQty = outs.reduce((s, m) => s + m.quantity, 0)
      const netQty = inQty - outQty
      return { ...p, current_stock: netQty }
    })

    return updatedProducts
  }

  async function calcFIFOValues(updatedProducts: ProductRow[]) {
    const productIds = updatedProducts.map((p) => p.id)
    if (productIds.length === 0) return
    const [inRes, outRes] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("product_id, quantity, unit_price, created_at")
        .eq("type", "in")
        .in("product_id", productIds),
      supabase
        .from("stock_movements")
        .select("product_id, quantity, created_at")
        .eq("type", "out")
        .in("product_id", productIds),
    ])

    const inMap: Record<string, { quantity: number; unit_price: number | null; created_at: string }[]> = {}
    for (const m of (inRes.data || []) as { product_id: string; quantity: number; unit_price: number | null; created_at: string }[]) {
      if (!inMap[m.product_id]) inMap[m.product_id] = []
      inMap[m.product_id].push({ ...m, quantity: Math.abs(m.quantity) })
    }

    const outMap: Record<string, { quantity: number; created_at: string }[]> = {}
    for (const m of (outRes.data || []) as { product_id: string; quantity: number; created_at: string }[]) {
      if (!outMap[m.product_id]) outMap[m.product_id] = []
      outMap[m.product_id].push({ ...m, quantity: Math.abs(m.quantity) })
    }

    const values: Record<string, { value: number; quantity: number }> = {}
    for (const p of updatedProducts) {
      const allIns = inMap[p.id] || []
      const outs = outMap[p.id] || []
      const netQty = p.current_stock
      const insWithPrice = allIns.filter((m) => m.unit_price != null)
      if (insWithPrice.length === 0) {
        values[p.id] = { value: netQty * p.cost_price, quantity: netQty }
      } else {
        const result = calculateFIFOValue(insWithPrice as { quantity: number; unit_price: number; created_at: string }[], outs)
        values[p.id] = { value: result.value, quantity: result.quantity }
      }
    }
    setFifoValues(values)
  }

  async function fetchProducts() {
    const cached = getCached<ProductRow[]>("products:inventory")
    if (cached) {
      setProducts(cached)
      calcFIFOValues(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name), brands(name), units(name, symbol)")
      .order("created_at", { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      const productData = data || []
      const updated = await fetchBalances(productData.map((p: ProductRow) => p.id), productData)
      setProducts(updated)
      setCache("products:inventory", updated)
      calcFIFOValues(updated)
    }
    setLoading(false)
  }

  async function getNextTaskRef(): Promise<string> {
    const supabase = createClient()
    const { data } = await supabase.from("tasks").select("ref_number").order("ref_number", { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const num = parseInt(data[0].ref_number.replace("TSK-", ""), 10)
      if (!isNaN(num)) return "TSK-" + String(num + 1).padStart(4, "0")
    }
    return "TSK-0001"
  }

  async function createTask(action: string, entity: ProductRow) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const ref = await getNextTaskRef()
    const { error } = await supabase.from("tasks").insert({
      ref_number: ref,
      assign_date: new Date().toISOString(),
      created_by: user?.id,
      created_by_name: user?.email || "Unknown",
      related_module: "Inventory",
      user_action: action,
      entity_id: entity.id,
      entity_description: `${entity.code} - ${entity.name}`,
      before_values: entity as Record<string, unknown>,
      status: "pending",
    })
    if (!error) {
      alert(`Task #${ref} created. Please wait for approval to complete this ${action}.`)
    }
  }

  async function handleDelete(id: string) {
    const item = products.find((p) => p.id === id)
    if (!item) return
    if (!confirm("Are you sure you want to request deletion of this product?")) return
    await createTask("delete", item)
  }

  const numberFormat = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const isLowStock = (item: ProductRow) => item.current_stock <= item.min_stock

  const columns = [
    {
      key: "serial_no",
      label: "Serial",
      render: (item: ProductRow) => <span className="font-mono text-xs">{item.serial_no}</span>,
    },
    {
      key: "code",
      label: t("inventory.product_code"),
      render: (item: ProductRow) => <span className="font-medium">{item.code}</span>,
    },
    {
      key: "name",
      label: t("inventory.product_name"),
      render: (item: ProductRow) => item.name,
    },
    {
      key: "category",
      label: t("inventory.category"),
      render: (item: ProductRow) => item.categories?.name || "-",
    },
    {
      key: "brand",
      label: t("inventory.brand"),
      render: (item: ProductRow) => item.brands?.name || "-",
    },
    {
      key: "current_stock",
      label: t("inventory.current_stock"),
      render: (item: ProductRow) => (
        <span className={item.current_stock <= item.min_stock ? "font-semibold text-black" : ""}>
          {item.current_stock} {item.units?.symbol || ""}
        </span>
      ),
    },
    {
      key: "expiry_date",
      label: "Expiry Date",
      render: (item: ProductRow) => {
        if (!item.has_expiry || !item.expiry_date) return <span className="text-black">—</span>
        const now = new Date()
        const expiry = new Date(item.expiry_date)
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        let cls = "text-black"
        if (daysLeft < 0) cls = "font-semibold text-black"
        else if (daysLeft <= 30) cls = "font-semibold text-black"
        else if (daysLeft <= 90) cls = "text-black"
        return <span className={cls}>{formatDate(item.expiry_date, locale)}{daysLeft <= 30 && ` (${daysLeft < 0 ? "Expired" : `${daysLeft}d`})`}</span>
      },
    },
    {
      key: "min_stock",
      label: t("inventory.min_stock"),
      render: (item: ProductRow) => <span>{item.min_stock}</span>,
    },
    {
      key: "selling_price",
      label: t("inventory.selling_price"),
      render: (item: ProductRow) => (
        <span className={isLowStock(item) ? "text-black" : ""}>
          {numberFormat.format(item.selling_price)}
        </span>
      ),
    },
    {
      key: "cost_price",
      label: "Purchase Price",
      render: (item: ProductRow) => (
        <span>{numberFormat.format(item.cost_price)}</span>
      ),
    },
    {
      key: "rent_price",
      label: "Rent Price",
      render: (item: ProductRow) => (
        <span>{item.code.startsWith("REN") ? numberFormat.format(item.selling_price) : "-"}</span>
      ),
    },
    {
      key: "total_stock_qty",
      label: "Total Stock Qty",
      render: (item: ProductRow) => (
        <span>{item.code.startsWith("REN") ? item.current_stock : "-"}</span>
      ),
    },
    {
      key: "total_stock",
      label: "Total Stock Value",
      render: (item: ProductRow) => (
        <span className="font-medium">{formatCurrency(item.current_stock * item.cost_price, locale)}</span>
      ),
    },
    {
      key: "status",
      label: t("common.status"),
      render: (item: ProductRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.status === "active"
              ? "bg-green-100 text-black"
              : "bg-gray-100 text-black"
          }`}
        >
          {item.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      render: (item: ProductRow) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/inventory/new?id=${item.id}`}
            className="rounded-lg p-1.5 text-black hover:bg-gray-100"
            title="View"
          >
            <Eye size={16} />
          </Link>
          <Link
            href={`/${locale}/inventory/new?id=${item.id}`}
            className="rounded-lg p-1.5 text-black hover:bg-gray-100"
            title="Edit"
          >
            <Pencil size={16} />
          </Link>
          <button
            onClick={() => handleDelete(item.id)}
            className="rounded-lg p-1.5 text-black hover:bg-gray-100"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader titleKey="inventory.products">
        <Link
          href={`/${locale}/inventory/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={18} />
          {t("inventory.add_product")}
        </Link>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-black">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchable
        searchKeys={["code", "name", "barcode"]}
      />
    </div>
  )
}
