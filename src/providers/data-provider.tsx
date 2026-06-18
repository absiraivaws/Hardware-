"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type CompanySettings = Database["public"]["Tables"]["company_settings"]["Row"]

interface DataContextValue {
  companySettings: CompanySettings | null
  refreshCompany: () => Promise<void>
  updateCompanySettings: (settings: Partial<CompanySettings>) => void
}

const DataContext = createContext<DataContextValue>({ companySettings: null, refreshCompany: async () => {}, updateCompanySettings: () => {} })

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)

  const updateCompanySettings = useCallback((settings: Partial<CompanySettings>) => {
    setCompanySettings(prev => prev ? { ...prev, ...settings } : null)
  }, [])

  const fetchCompany = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single()
    if (data) setCompanySettings(data as CompanySettings)
  }, [])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return (
    <DataContext.Provider value={{ companySettings, refreshCompany: fetchCompany, updateCompanySettings }}>
      {children}
    </DataContext.Provider>
  )
}
