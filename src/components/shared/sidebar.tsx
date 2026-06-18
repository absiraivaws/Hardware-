"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Car,
  Wrench,
  IdCard,
  Wallet,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"

const DEFAULT_ORDER = [
  "dashboard",
  "sales",
  "sales/history",
  "purchases",
  "inventory",
  "customers",
  "suppliers",
  "deliveries",
  "drivers",
  "vehicles",
  "quotations",
  "rentals",
  "expenses",
  "reports",
  "ledgers",
]

const STORAGE_KEY = "sidebar_order"

const navItemConfig: Record<string, { icon: React.ComponentType<{ size?: number }>; labelKey: string }> = {
  dashboard: { icon: LayoutDashboard, labelKey: "nav.dashboard" },
  sales: { icon: ShoppingCart, labelKey: "nav.pos" },
  "sales/history": { icon: FileText, labelKey: "nav.sales" },
  purchases: { icon: Package, labelKey: "nav.purchases" },
  inventory: { icon: Warehouse, labelKey: "nav.inventory" },
  customers: { icon: Users, labelKey: "nav.customers" },
  suppliers: { icon: Truck, labelKey: "nav.suppliers" },
  deliveries: { icon: Truck, labelKey: "nav.deliveries" },
  drivers: { icon: IdCard, labelKey: "nav.drivers" },
  vehicles: { icon: Car, labelKey: "nav.vehicles" },
  quotations: { icon: FileText, labelKey: "nav.quotations" },
  rentals: { icon: Wrench, labelKey: "nav.rentals" },
  expenses: { icon: Wallet, labelKey: "nav.expenses" },
  reports: { icon: BarChart3, labelKey: "nav.reports" },
  ledgers: { icon: BookOpen, labelKey: "nav.ledgers" },
}

function loadOrder(): string[] {
  if (typeof window === "undefined") return DEFAULT_ORDER
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

export function Sidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const locale = pathname.split("/")[1]
  const [collapsed, setCollapsed] = useState(false)
  const [navOrder, setNavOrder] = useState<string[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  useEffect(() => {
    setNavOrder(loadOrder())
  }, [])

  const persistOrder = useCallback((order: string[]) => {
    setNavOrder(order)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch { /* ignore */ }
  }, [])

  const handleDragStart = (idx: number) => { setDragIdx(idx) }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const updated = [...navOrder]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    persistOrder(updated)
    setDragIdx(null)
    setOverIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        {!collapsed && (
          <span className="font-bold text-lg text-emerald-700 truncate">
            {t("common.app_name")}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto rounded-lg p-1.5 hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navOrder.map((href, idx) => {
          const cfg = navItemConfig[href]
          if (!cfg) return null
          const { icon: Icon, labelKey } = cfg
          const isActive = pathname.includes(`/${locale}/${href}`)
          const isDragging = dragIdx === idx
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx

          return (
            <div
              key={href}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center rounded-lg transition-colors",
                isDragging && "opacity-50",
                isOver && "border-t-2 border-emerald-500",
              )}
            >
              <button
                className="flex shrink-0 items-center justify-center px-1 py-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </button>
              <Link
                href={`/${locale}/${href}`}
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-black hover:bg-gray-100 hover:text-black",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon size={20} />
                {!collapsed && <span>{t(labelKey)}</span>}
              </Link>
            </div>
          )
        })}
      </nav>

      <div className="border-t p-2">
        {(() => {
          const isSettingsActive = pathname === `/${locale}/settings`
          return (
            <Link
              href={`/${locale}/settings`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isSettingsActive
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-black hover:bg-gray-100",
                collapsed && "justify-center px-2",
              )}
            >
              <Settings size={20} />
              {!collapsed && <span>{t("nav.settings")}</span>}
            </Link>
          )
        })()}
      </div>
    </aside>
  )
}
