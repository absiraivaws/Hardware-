"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency } from "@/lib/format"
import { calculateFIFOValue } from "@/lib/fifo"

interface ProductRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  barcode: string | null
  category_id: string | null
  brand_id: string | null
  unit_id: string | null
  cost_price: number
  selling_price: number
  wholesale_price: number | null
  min_stock: number
  current_stock: number
  has_expiry: boolean
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
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchFIFOValues(productIds: string[]) {
    if (productIds.length === 0) return
    const [inRes, outRes] = await Promise.all([
      supabase
        .from("stock_movements")
        .select("product_id, quantity, unit_price, created_at")
        .eq("type", "in")
        .not("unit_price", "is", null)
        .in("product_id", productIds),
      supabase
        .from("stock_movements")
        .select("product_id, quantity, created_at")
        .eq("type", "out")
        .in("product_id", productIds),
    ])

    const inMap: Record<string, { quantity: number; unit_price: number; created_at: string }[]> = {}
    for (const m of (inRes.data || []) as { product_id: string; quantity: number; unit_price: number; created_at: string }[]) {
      if (!inMap[m.product_id]) inMap[m.product_id] = []
      inMap[m.product_id].push(m)
    }

    const outMap: Record<string, { quantity: number; created_at: string }[]> = {}
    for (const m of (outRes.data || []) as { product_id: string; quantity: number; created_at: string }[]) {
      if (!outMap[m.product_id]) outMap[m.product_id] = []
      outMap[m.product_id].push(m)
    }

    const values: Record<string, { value: number; quantity: number }> = {}
    const balances: Record<string, number> = {}
    for (const id of productIds) {
      const ins = inMap[id] || []
      const outs = outMap[id] || []
      const netQty = ins.reduce((s, m) => s + m.quantity, 0) - outs.reduce((s, m) => s + m.quantity, 0)
      balances[id] = netQty
      if (ins.length === 0) {
        const product = products.find((p) => p.id === id)
        values[id] = { value: (product?.current_stock || 0) * (product?.cost_price || 0), quantity: product?.current_stock || 0 }
      } else {
        const result = calculateFIFOValue(ins, outs)
        values[id] = { value: result.value, quantity: result.quantity }
      }
    }
    setFifoValues(values)
    setStockBalances(balances)
  }

  async function fetchProducts() {
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
      setProducts(productData)
      fetchFIFOValues(productData.map((p: ProductRow) => p.id))
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm(t("common.confirm_delete"))) return
    const { error } = await supabase.from("products").delete().eq("id", id)
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const numberFormat = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const isLowStock = (item: ProductRow) => {
    const stock = stockBalances[item.id] ?? item.current_stock
    return stock <= item.min_stock
  }

  const columns = [
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
      render: (item: ProductRow) => {
        const stock = stockBalances[item.id] ?? item.current_stock
        return (
          <span className={stock <= item.min_stock ? "font-semibold text-red-600" : ""}>
            {stock} {item.units?.symbol || ""}
          </span>
        )
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
        <span className={isLowStock(item) ? "text-red-600" : ""}>
          {numberFormat.format(item.selling_price)}
        </span>
      ),
    },
    {
      key: "stock_value",
      label: "Stock Value",
      render: (item: ProductRow) => {
        const fifo = fifoValues[item.id]
        const stock = stockBalances[item.id] ?? item.current_stock
        const value = fifo ? fifo.value : stock * item.cost_price
        return <span className="font-medium">{formatCurrency(value, locale)}</span>
      },
    },
    {
      key: "status",
      label: t("common.status"),
      render: (item: ProductRow) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.status === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
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
            className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 hover:text-emerald-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            onClick={() => handleDelete(item.id)}
            className="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100 hover:text-red-600"
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
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
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
