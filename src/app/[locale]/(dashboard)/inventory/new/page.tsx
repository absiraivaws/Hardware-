"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"
import { PageHeader } from "@/components/shared/page-header"
import { Loader2, ArrowLeft, Save, Plus, X, Check, History, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { formatDate, formatCurrency } from "@/lib/format"
import { calculateFIFOValue } from "@/lib/fifo"

const productSchema = z.object({
  code: z.string().min(1, "Product code is required"),
  name: z.string().min(1, "Product name is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  unit_id: z.string().optional(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  wholesale_price: z.number().min(0).nullable().optional(),
  min_stock: z.number().min(0),
  starting_stock: z.number().min(0),
  has_expiry: z.boolean(),
  expiry_date: z.string().optional(),
  is_decimal_qty: z.boolean(),
})

type ProductForm = z.infer<typeof productSchema>

export default function NewProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const editId = searchParams.get("id")
  const isEdit = !!editId

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [units, setUnits] = useState<{ id: string; name: string; symbol: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [addingBrand, setAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [stockMovements, setStockMovements] = useState<{ id: string; type: string; quantity: number; reference_type: string | null; reference_id: string | null; notes: string | null; created_at: string }[]>([])
  const [fifoResult, setFifoResult] = useState<{ value: number; quantity: number; layers: { qty: number; price: number }[] } | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [productCurrentStock, setProductCurrentStock] = useState(0)
  const [historySortKey, setHistorySortKey] = useState("created_at")
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc")

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: "",
      name: "",
      barcode: "",
      description: "",
      category_id: "",
      brand_id: "",
      unit_id: "",
      cost_price: 0,
      selling_price: 0,
      wholesale_price: null,
      min_stock: 0,
      starting_stock: 100,
      has_expiry: false,
      expiry_date: "",
      is_decimal_qty: false,
    },
  })

  const watchHasExpiry = watch("has_expiry")

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const [catRes, brandRes, unitRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("brands").select("id, name").order("name"),
        supabase.from("units").select("id, name, symbol").order("name"),
      ])

      if (!catRes.error) setCategories(catRes.data)
      if (!brandRes.error) setBrands(brandRes.data)
      if (!unitRes.error) setUnits(unitRes.data)

      if (isEdit && editId) {
        type ProductRow = Database["public"]["Tables"]["products"]["Row"]
        const { data } = await supabase
          .from("products")
          .select<string, ProductRow>("*")
          .eq("id", editId)
          .single()

        if (data) {
          reset({
            code: data.code,
            name: data.name,
            barcode: data.barcode || "",
            description: data.description || "",
            category_id: data.category_id || "",
            brand_id: data.brand_id || "",
            unit_id: data.unit_id || "",
            cost_price: data.cost_price,
            selling_price: data.selling_price,
            wholesale_price: data.wholesale_price,
            min_stock: data.min_stock,
            has_expiry: data.has_expiry,
            expiry_date: data.expiry_date || "",
            is_decimal_qty: data.is_decimal_qty,
          })
        }
      }

      setLoading(false)
    }

    async function init() {
      await loadData()
      if (isEdit && editId) {
        fetchStockHistory(editId)
      }
    }
    init()
  }, [editId, isEdit])

  const fetchStockHistory = async (productId: string) => {
    setLoadingHistory(true)
    const { data: allMovements } = await supabase
      .from("stock_movements")
      .select("id, type, quantity, reference_type, reference_id, notes, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(50)

    const { data: fullBalance } = await supabase
      .from("stock_movements")
      .select("type, quantity")
      .eq("product_id", productId)

    if (fullBalance) {
      let balance = 0
      for (const m of fullBalance) {
        balance += m.type === "in" ? Math.abs(m.quantity) : -Math.abs(m.quantity)
      }
      setProductCurrentStock(balance)
    }

    if (allMovements) {
      setStockMovements(allMovements as typeof stockMovements)

      try {
        const { data: inMovements } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, unit_price, created_at")
          .eq("product_id", productId)
          .eq("type", "in")
          .not("unit_price", "is", null)
          .order("created_at", { ascending: true })

        const { data: outMovements } = await supabase
          .from("stock_movements")
          .select("product_id, quantity, created_at")
          .eq("product_id", productId)
          .eq("type", "out")
          .order("created_at", { ascending: true })

        if (inMovements && inMovements.length > 0) {
          const result = calculateFIFOValue(
            inMovements as { quantity: number; unit_price: number; created_at: string }[],
            (outMovements || []) as { quantity: number; created_at: string }[]
          )
          setFifoResult({ value: result.value, quantity: result.quantity, layers: result.layers })
        }
      } catch {
        // FIFO column (unit_price) may not exist yet; skip valuation
      }
    }
    setLoadingHistory(false)
  }

  const handleHistorySort = (key: string) => {
    if (historySortKey === key) {
      setHistorySortDir(historySortDir === "asc" ? "desc" : "asc")
    } else {
      setHistorySortKey(key)
      setHistorySortDir("asc")
    }
  }

  const sortedMovements = useMemo(() => {
    const sorted = [...stockMovements].sort((a, b) => {
      let cmp = 0
      if (historySortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (historySortKey === "type") cmp = a.reference_type?.localeCompare(b.reference_type || "") || 0
      else if (historySortKey === "quantity") cmp = a.quantity - b.quantity
      else if (historySortKey === "reference") cmp = (a.notes || "").localeCompare(b.notes || "")
      return historySortDir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [stockMovements, historySortKey, historySortDir])

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newCategoryName.trim() })
      .select("id, name")
      .single()
    if (!error && data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setValue("category_id", data.id)
      setAddingCategory(false)
      setNewCategoryName("")
    }
  }

  async function handleAddBrand() {
    if (!newBrandName.trim()) return
    const { data, error } = await supabase
      .from("brands")
      .insert({ name: newBrandName.trim() })
      .select("id, name")
      .single()
    if (!error && data) {
      setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setValue("brand_id", data.id)
      setAddingBrand(false)
      setNewBrandName("")
    }
  }

  async function onSubmit(data: ProductForm) {
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productClient = supabase.from("products") as any

    if (isEdit) {
      const { error } = await productClient.update({
        code: data.code,
        name: data.name,
        barcode: data.barcode || null,
        description: data.description || null,
        category_id: data.category_id || null,
        brand_id: data.brand_id || null,
        unit_id: data.unit_id || null,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        wholesale_price: data.wholesale_price ?? null,
        min_stock: data.min_stock,
        has_expiry: data.has_expiry,
        expiry_date: data.has_expiry ? (data.expiry_date || null) : null,
        is_decimal_qty: data.is_decimal_qty,
      }).eq("id", editId!)

      setSaving(false)
      if (!error) router.push(`/${locale}/inventory`)
      return
    }

    // Auto-generate next serial number
    const { data: maxSerial } = await (supabase.from("products") as any)
      .select("serial_no")
      .order("serial_no", { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextSerial = "000001"
    if (maxSerial?.serial_no) {
      const num = parseInt(maxSerial.serial_no, 10) + 1
      nextSerial = String(num).padStart(6, "0")
    }

    const { data: newProduct, error } = await productClient.insert({
      code: data.code,
      name: data.name,
      serial_no: nextSerial,
      barcode: data.barcode || null,
      description: data.description || null,
      category_id: data.category_id || null,
      brand_id: data.brand_id || null,
      unit_id: data.unit_id || null,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      wholesale_price: data.wholesale_price ?? null,
      min_stock: data.min_stock,
      current_stock: data.starting_stock,
      has_expiry: data.has_expiry,
      expiry_date: data.has_expiry ? (data.expiry_date || null) : null,
      is_decimal_qty: data.is_decimal_qty,
    }).select("id").single()

    if (!error && newProduct && data.starting_stock > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("stock_movements") as any).insert({
          product_id: newProduct.id,
          type: "in",
          quantity: data.starting_stock,
          unit_price: data.cost_price,
          reference_type: "starting_stock",
          notes: `Opening stock: ${data.starting_stock} units`,
        })
      } catch {
        // stock movement creation is non-critical
      }
    }

    setSaving(false)
    if (!error) router.push(`/${locale}/inventory`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-black" size={32} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader titleKey={isEdit ? "inventory.edit_product" : "inventory.add_product"}>
        <Link
          href={`/${locale}/inventory`}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <ArrowLeft size={18} className="text-emerald-600" />
          {t("common.cancel")}
        </Link>
      </PageHeader>

      <div className="rounded-lg border bg-white p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.product_code")} *
              </label>
              <input
                {...register("code")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.code && (
                <p className="mt-1 text-xs text-black">{errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.product_name")} *
              </label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-black">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.barcode")}
              </label>
              <input
                {...register("barcode")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-black">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.category")}
              </label>
              <div className="flex gap-2">
                <select
                  {...register("category_id")}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {addingCategory ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCategory() } }}
                      className="w-32 rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                      placeholder="New name"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddCategory} className="rounded-lg p-1.5 text-black hover:bg-emerald-50">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => { setAddingCategory(false); setNewCategoryName("") }} className="rounded-lg p-1.5 text-black hover:bg-gray-100">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingCategory(true)} className="rounded-lg border border-dashed border-gray-300 p-2 text-black hover:bg-gray-50" title="Add new category">
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.brand")}
              </label>
              <div className="flex gap-2">
                <select
                  {...register("brand_id")}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select brand --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {addingBrand ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBrand() } }}
                      className="w-32 rounded-lg border border-gray-300 px-2 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                      placeholder="New name"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddBrand} className="rounded-lg p-1.5 text-black hover:bg-emerald-50">
                      <Check size={16} />
                    </button>
                    <button type="button" onClick={() => { setAddingBrand(false); setNewBrandName("") }} className="rounded-lg p-1.5 text-black hover:bg-gray-100">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingBrand(true)} className="rounded-lg border border-dashed border-gray-300 p-2 text-black hover:bg-gray-50" title="Add new brand">
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.unit")}
              </label>
              <select
                {...register("unit_id")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Select unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.cost_price")}
              </label>
              <input
                type="number"
                step="0.01"
                {...register("cost_price", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.cost_price && (
                <p className="mt-1 text-xs text-black">{errors.cost_price.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.selling_price")}
              </label>
              <input
                type="number"
                step="0.01"
                {...register("selling_price", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.selling_price && (
                <p className="mt-1 text-xs text-black">{errors.selling_price.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Wholesale Price
              </label>
              <input
                type="number"
                step="0.01"
                {...register("wholesale_price", {
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.wholesale_price && (
                <p className="mt-1 text-xs text-black">{errors.wholesale_price.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("inventory.min_stock")}
              </label>
              <input
                type="number"
                {...register("min_stock", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {errors.min_stock && (
                <p className="mt-1 text-xs text-black">{errors.min_stock.message}</p>
              )}
            </div>
            {isEdit ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Current Stock
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black">
                  {productCurrentStock}
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Starting Stock
                </label>
                <input
                  type="number"
                  {...register("starting_stock", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {errors.starting_stock && (
                  <p className="mt-1 text-xs text-black">{errors.starting_stock.message}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-black">
              <input
                type="checkbox"
                {...register("has_expiry")}
                className="rounded border-gray-300 text-black focus:ring-emerald-500"
              />
              Has Expiry
            </label>
            {watchHasExpiry && (
              <div>
                <input
                  type="date"
                  {...register("expiry_date")}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-black">
              <input
                type="checkbox"
                {...register("is_decimal_qty")}
                className="rounded border-gray-300 text-black focus:ring-emerald-500"
              />
              Decimal Quantity
            </label>
          </div>

          <div className="flex items-center gap-3 border-t pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? t("common.loading") : t("common.save")}
            </button>
            <Link
              href={`/${locale}/inventory`}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-black hover:bg-gray-50"
            >
              {t("common.cancel")}
            </Link>
          </div>
        </form>
      </div>

      {isEdit && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <History size={18} className="text-black" />
            <h2 className="text-lg font-semibold text-black">Stock History</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: "created_at", label: "Date", align: "text-left" },
                    { key: "type", label: "Type", align: "text-left" },
                    { key: "quantity", label: "Qty", align: "text-right" },
                    { key: null, label: "Balance", align: "text-right" },
                    { key: "reference", label: "Reference", align: "text-left" },
                  ].map((col) => {
                    if (!col.key) {
                      return <th key="balance" className={`px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider text-black`}>{col.label}</th>
                    }
                    const active = historySortKey === col.key
                    const SortIcon = active ? (historySortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleHistorySort(col.key!)}
                        className={`cursor-pointer select-none px-4 py-3 ${col.align} text-xs font-medium uppercase tracking-wider ${active ? "text-black" : "text-black"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          <SortIcon size={12} className="shrink-0" />
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-black">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                ) : stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-black">No stock movements</td>
                  </tr>
                ) : (
                  (() => {
                    const chrono = [...stockMovements].sort(
                      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                    )
                    const balances: Record<string, number> = {}
                    let running = 0
                    for (const m of chrono) {
                      const adjQty = m.type === "in" ? Math.abs(m.quantity) : -Math.abs(m.quantity)
                      running += adjQty
                      balances[m.id] = running
                    }
                    return sortedMovements.map((m) => {
                      const qty = Math.abs(m.quantity)
                      const typeLabel = m.reference_type === "starting_stock" ? "Opening"
                        : m.reference_type === "purchase_return" ? "Return"
                        : m.type === "in" ? "Purchase" : "Sale"
                      const refNum = m.reference_type === "starting_stock" ? "—"
                        : m.reference_type === "purchase_return" ? m.notes || "—"
                        : m.notes || m.reference_id || "—"
                      return (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-black">
                            {formatDate(m.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.type === "in" ? "bg-green-100 text-black" : "bg-red-100 text-black"
                            }`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-black">
                            {m.type === "in" ? "+" : "-"}{qty}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-black">
                            {balances[m.id]}
                          </td>
                          <td className="px-4 py-3 text-sm text-black">
                            {refNum.length > 30 ? refNum.slice(0, 30) + "..." : refNum}
                          </td>
                        </tr>
                      )
                    })
                  })()
                )}
              </tbody>
            </table>
          </div>

          {fifoResult && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 text-sm font-medium text-black">
                FIFO Stock Valuation
              </div>
              <div className="space-y-1 text-sm text-black">
                <div className="flex justify-between">
                  <span>Current Stock (FIFO):</span>
                  <span className="font-semibold">{fifoResult.quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Value:</span>
                  <span className="font-semibold">{formatCurrency(fifoResult.value, locale)}</span>
                </div>
                {fifoResult.layers.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-black">Layers</div>
                    {fifoResult.layers.map((layer, i) => (
                      <div key={i} className="flex justify-between text-xs text-black">
                        <span>{layer.qty} units @ {formatCurrency(layer.price, locale)}</span>
                        <span>{formatCurrency(layer.qty * layer.price, locale)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
