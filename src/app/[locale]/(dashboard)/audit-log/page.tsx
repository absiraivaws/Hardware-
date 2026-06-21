"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/format"
import { DataTable } from "@/components/shared/data-table"
import { useAuth } from "@/providers/auth-provider"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ShieldAlert } from "lucide-react"

interface AuditEntry {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user_name: string | null
}

export default function AuditLogPage() {
  const params = useParams()
  const locale = params.locale as string
  const { hasPermission, loading: authLoading } = useAuth()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  const canView = !authLoading && hasPermission("staff", "view_activity_logs")

  useEffect(() => {
    if (!canView) return
    const fetchLogs = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, user_id, action, entity_type, entity_id, metadata, created_at, profiles!left(full_name)")
        .order("created_at", { ascending: false })
      if (!error && data) {
        setLogs(
          data.map((r: Record<string, unknown>) => {
            const profile = r.profiles as { full_name?: string } | null
            return {
              id: r.id as string,
              user_id: r.user_id as string,
              action: r.action as string,
              entity_type: r.entity_type as string,
              entity_id: r.entity_id as string | null,
              metadata: r.metadata as Record<string, unknown> | null,
              created_at: r.created_at as string,
              user_name: profile?.full_name ?? null,
            } as AuditEntry
          }),
        )
      }
      setLoading(false)
    }
    fetchLogs()
  }, [canView])

  const columns = [
    {
      key: "created_at",
      label: "Date & Time",
      sortable: true,
      render: (item: AuditEntry) => <span>{formatDate(item.created_at)} {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>,
    },
    {
      key: "user_name",
      label: "User",
      sortable: true,
      render: (item: AuditEntry) => (
        <Link href={`/${locale}/staff/${item.user_id}`} className="text-emerald-600 hover:underline">
          {item.user_name ?? "Unknown"}
        </Link>
      ),
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (item: AuditEntry) => <span className="capitalize">{item.action.replace(/_/g, " ")}</span>,
    },
    {
      key: "entity_type",
      label: "Entity",
      sortable: true,
      render: (item: AuditEntry) => <span className="capitalize">{item.entity_type.replace(/_/g, " ")}</span>,
    },
    {
      key: "entity_id",
      label: "Entity ID",
      sortable: true,
      render: (item: AuditEntry) => <span className="text-xs text-gray-500">{item.entity_id ? item.entity_id.slice(0, 8) + "..." : "-"}</span>,
    },
    {
      key: "details",
      label: "Details",
      render: (item: AuditEntry) => {
        if (!item.metadata) return <span className="text-gray-400">-</span>
        const summary = Object.entries(item.metadata)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
        return <span className="max-w-[200px] truncate text-xs text-gray-500" title={JSON.stringify(item.metadata)}>{summary}</span>
      },
    },
  ]

  if (!authLoading && !hasPermission("staff", "view_activity_logs")) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Access Denied</p>
          <p className="mt-1 text-sm text-gray-400">You do not have permission to view audit logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/reports`}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-black">Audit Log</h1>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading || authLoading}
        searchable
        searchKeys={["action", "entity_type", "user_name"]}
      />
    </div>
  )
}
