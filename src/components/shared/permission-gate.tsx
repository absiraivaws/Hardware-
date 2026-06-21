"use client"

import { useAuth } from "@/providers/auth-provider"
import type { ReactNode } from "react"

interface PermissionGateProps {
  module: string
  action: string
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({ module, action, fallback = null, children }: PermissionGateProps) {
  const { hasPermission, loading } = useAuth()

  if (loading) return null
  if (!hasPermission(module, action)) return fallback
  return <>{children}</>
}

export function Protect({ module, action, children }: { module: string; action: string; children: ReactNode }) {
  return <PermissionGate module={module} action={action} fallback={null} children={children} />
}
