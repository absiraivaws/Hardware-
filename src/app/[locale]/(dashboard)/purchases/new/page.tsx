"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Search, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  code: string
  cost_price: number
}

const itemSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().positive(),
})

const formSchema = z.object({
  supplier_id: z.string().min(1, "Required"),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item required"),
})

type FormValues = z.infer<typeof formSchema>

function generatePONo(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
  return `PO-${y}${m}${d}-${rand}`
}

export default function NewPurchaseOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const t = useTranslations()
  const router = useRouter()
  const [locale, setLocale] = useState("en")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setLocale(p.locale))
  }, [params])

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      supplier_id: "",
      expected_date: "",
      notes: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const items = watch("items")

  const subtotal = (items ?? []).reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0,
  )

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        if (data) setSuppliers(data as Supplier[])
      })
  }, [])

  const loadAllProducts = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("products")
      .select("id, name, code, cost_price")
      .eq("status", "active")
      .order("name")
      .limit(50) as unknown as { data: Product[] | null }
    if (data) {
      setAllProducts(data)
      setProducts(data)
    }
  }

  useEffect(() => {
    if (showProductPicker) {
      loadAllProducts()
    }
  }, [showProductPicker])

  const searchProducts = (q: string) => {
    if (!q) {
      setProducts(allProducts)
      return
    }
    const query = q.toLowerCase()
    setProducts(
      allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query),
      ),
    )
  }

  const closePicker = () => {
    setShowProductPicker(false)
    setProductSearch("")
    setProducts([])
    setAllProducts([])
  }

  const addItem = (product: Product) => {
    append({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.cost_price,
    })
    closePicker()
  }

  const onSubmit = async (data: FormValues) => {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("Authentication required")
      setSaving(false)
      return
    }

    const supplier = suppliers.find((s) => s.id === data.supplier_id)
    const poNo = generatePONo()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: po, error: poError } = await (supabase.from("purchase_orders") as any)
      .insert({
        po_no: poNo,
        supplier_id: data.supplier_id,
        supplier_name: supplier?.name ?? "",
        user_id: userData.user.id,
        subtotal,
        grand_total: subtotal,
        expected_date: data.expected_date || null,
        notes: data.notes || null,
      })
      .select("id")
      .single()

    if (poError || !po) {
      setError(poError?.message || "Failed to create purchase order")
      setSaving(false)
      return
    }

    const purchaseItems = data.items.map((item) => ({
      po_id: po.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from("purchase_items") as any).insert(purchaseItems)

    if (itemsError) {
      await (supabase.from("purchase_orders") as any).delete().eq("id", po.id)
      setError(itemsError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.push(`/${locale}/purchases`)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">{t("purchases.new_po")}</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("purchases.supplier")}
              </label>
              <select
                {...register("supplier_id")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="mt-1 text-xs text-red-500">{errors.supplier_id.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                {t("purchases.expected_date")}
              </label>
              <input
                type="date"
                {...register("expected_date")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black">{t("sales.item")}s</h2>
            <button
              type="button"
              onClick={() => {
                setShowProductPicker(true)
              }}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
            >
              <Plus size={16} />
              {t("sales.add_item")}
            </button>
          </div>

          {errors.items && (
            <p className="mb-3 text-xs text-red-500">{errors.items.message}</p>
          )}

          {showProductPicker && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                <input
                  type="text"
                  placeholder={t("common.search")}
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    searchProducts(e.target.value)
                  }}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {products.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-white">
                  {products.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm text-black hover:bg-emerald-50"
                    >
                      <span>{p.name}</span>
                      <span className="text-black">{p.code}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={closePicker}
                className="mt-2 text-xs text-black hover:text-black"
              >
                {t("common.cancel")}
              </button>
            </div>
          )}

          {fields.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("inventory.product_name")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.qty")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("inventory.cost_price")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-black">
                      {t("sales.amount")}
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-4 py-2 text-sm text-black">
                        {field.product_name}
                        <input type="hidden" {...register(`items.${index}.product_id`)} />
                        <input type="hidden" {...register(`items.${index}.product_name`)} />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="any"
                          {...register(`items.${index}.quantity`)}
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.unit_price`)}
                          className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-sm text-black">
                        {(
                          (getValues(`items.${index}.quantity`) || 0) *
                          (getValues(`items.${index}.unit_price`) || 0)
                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700"
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

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-black">
                <span>{t("common.subtotal")}</span>
                <span className="font-medium text-black">
                  {formatCurrency(subtotal, locale)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-semibold text-black">
                <span>{t("common.grand_total")}</span>
                <span>
                  {formatCurrency(subtotal, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <label className="mb-1 block text-sm font-medium text-black">
            {t("common.notes")}
          </label>
          <textarea
            rows={3}
            {...register("notes")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-6 py-2 text-sm font-medium text-black hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}
            {t("common.save")}
          </button>
        </div>
      </form>
    </div>
  )
}
