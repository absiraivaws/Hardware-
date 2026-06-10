"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type CompanySettings = Database["public"]["Tables"]["company_settings"]["Row"]

interface DataContextValue {
  companySettings: CompanySettings | null
}

const DataContext = createContext<DataContextValue>({ companySettings: null })

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setCompanySettings(data as CompanySettings)
      })
  }, [])

  return (
    <DataContext.Provider value={{ companySettings }}>
      {children}
    </DataContext.Provider>
  )
}
