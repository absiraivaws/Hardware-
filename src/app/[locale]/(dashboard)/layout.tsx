"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Sidebar } from "@/components/shared/sidebar"
import { Header } from "@/components/shared/header"
import { DataProvider } from "@/providers/data-provider"
import { AuthProvider } from "@/providers/auth-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <DataProvider>
      <AuthProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
            <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </AuthProvider>
    </DataProvider>
  )
}
