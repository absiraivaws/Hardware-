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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "sales", icon: ShoppingCart, labelKey: "nav.sales" },
  { href: "purchases", icon: Package, labelKey: "nav.purchases" },
  { href: "inventory", icon: Warehouse, labelKey: "nav.inventory" },
  { href: "customers", icon: Users, labelKey: "nav.customers" },
  { href: "suppliers", icon: Truck, labelKey: "nav.suppliers" },
  { href: "quotations", icon: FileText, labelKey: "nav.quotations" },
  { href: "reports", icon: BarChart3, labelKey: "nav.reports" },
]

export function Sidebar() {
  const t = useTranslations()
  const pathname = usePathname()
  const locale = pathname.split("/")[1]
  const [collapsed, setCollapsed] = useState(false)

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

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.includes(`/${locale}/${item.href}`)
          return (
            <Link
              key={item.href}
              href={`/${locale}/${item.href}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-gray-800 hover:bg-gray-100 hover:text-gray-900",
                collapsed && "justify-center px-2",
              )}
            >
              <item.icon size={20} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
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
                  : "text-gray-800 hover:bg-gray-100",
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
