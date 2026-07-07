"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type CompanySettings = Database["public"]["Tables"]["company_settings"]["Row"]
type PrinterSettings = Database["public"]["Tables"]["printer_settings"]["Row"]

interface DataContextValue {
  companySettings: CompanySettings | null
  printerSettings: PrinterSettings | null
  refreshCompany: () => Promise<void>
  updateCompanySettings: (settings: Partial<CompanySettings>) => void
  refreshPrinter: () => Promise<void>
  updatePrinterSettings: (settings: Partial<PrinterSettings>) => void
}

const DataContext = createContext<DataContextValue>({
  companySettings: null,
  printerSettings: null,
  refreshCompany: async () => {},
  updateCompanySettings: () => {},
  refreshPrinter: async () => {},
  updatePrinterSettings: () => {},
})

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings | null>(null)

  const updateCompanySettings = useCallback((settings: Partial<CompanySettings>) => {
    setCompanySettings(prev => prev ? { ...prev, ...settings } : null)
  }, [])

  const updatePrinterSettings = useCallback((settings: Partial<PrinterSettings>) => {
    setPrinterSettings(prev => prev ? { ...prev, ...settings } : null)
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

  const fetchPrinter = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("printer_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
    if (data) setPrinterSettings(data as PrinterSettings)
  }, [])

  useEffect(() => {
    fetchCompany()
    fetchPrinter()
  }, [fetchCompany, fetchPrinter])

  return (
    <DataContext.Provider value={{
      companySettings,
      printerSettings,
      refreshCompany: fetchCompany,
      updateCompanySettings,
      refreshPrinter: fetchPrinter,
      updatePrinterSettings,
    }}>
      {children}
    </DataContext.Provider>
  )
}
