"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: "super_admin" | "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"
  branch_id: string | null
  phone: string | null
  avatar_url: string | null
  staff_code: string
  status: "active" | "inactive" | "suspended" | "pending"
  date_of_birth: string | null
  last_login: string | null
}

type Permission = {
  id: string
  module: string
  action: string
}

interface AuthContextValue {
  profile: Profile | null
  loading: boolean
  hasPermission: (module: string, action: string) => boolean
  sidebarModules: string[]
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  loading: true,
  hasPermission: () => false,
  sidebarModules: [],
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const ALL_SIDEBAR_MODULES = [
  "dashboard", "sales", "sales/history", "staff", "purchases", "inventory",
  "customers", "suppliers", "deliveries", "drivers", "vehicles", "quotations",
  "rentals", "expenses", "reports", "ledgers", "audit-log",
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [sidebarModules, setSidebarModules] = useState<string[]>(ALL_SIDEBAR_MODULES)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfile(null)
      setPermissions([])
      setSidebarModules([])
      setLoading(false)
      return
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    if (prof) {
      setProfile(prof as Profile)

      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permissions(id, module, action)")
        .eq("role", prof.role)
      if (perms) {
        setPermissions(
          perms
            .map((rp: unknown) => {
              const p = (rp as Record<string, unknown>).permissions as { id: string; module: string; action: string }
              return p ? { id: p.id, module: p.module, action: p.action } : null
            })
            .filter(Boolean) as Permission[],
        )
      }

      if (prof.role === "super_admin") {
        setSidebarModules(ALL_SIDEBAR_MODULES)
      } else {
        const { data: items } = await supabase
          .rpc("get_role_sidebar_modules", { p_role: prof.role })
        setSidebarModules(items ?? ALL_SIDEBAR_MODULES)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const hasPermission = (module: string, action: string) => {
    if (profile?.role === "super_admin") return true
    return permissions.some((p) => p.module === module && p.action === action)
  }

  return (
    <AuthContext.Provider value={{ profile, loading, hasPermission, sidebarModules, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
