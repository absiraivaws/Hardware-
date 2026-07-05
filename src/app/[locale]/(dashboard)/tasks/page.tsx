"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/format"
import { DataTable } from "@/components/shared/data-table"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Check, X, Eye, ArrowLeft } from "lucide-react"

interface Task {
  id: string
  ref_number: string
  assign_date: string
  created_by: string | null
  created_by_name: string | null
  related_module: string
  user_action: string
  entity_id: string | null
  entity_description: string | null
  before_values: Record<string, unknown>
  new_values: Record<string, unknown>
  status: string
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

export default function TasksPage() {
  const params = useParams()
  const locale = params.locale as string
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchTasks = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) setTasks(data as Task[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleAction = async (task: Task, newStatus: "approved" | "rejected") => {
    if (!confirm(`Are you sure you want to ${newStatus} this task?`)) return
    setProcessing(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userName = user?.email || user?.id || "Unknown"

    if (newStatus === "approved") {
      if (task.related_module === "Inventory" && task.entity_id) {
        if (task.user_action === "edit") {
          await supabase.from("products").update(task.new_values).eq("id", task.entity_id)
        } else if (task.user_action === "delete") {
          await supabase.from("products").delete().eq("id", task.entity_id)
        }
      }
    }

    await supabase
      .from("tasks")
      .update({
        status: newStatus,
        approved_by: user?.id,
        approved_by_name: userName,
        approved_at: new Date().toISOString(),
      })
      .eq("id", task.id)
    setSelectedTask(null)
    fetchTasks()
    setProcessing(false)
  }

  const columns = [
    {
      key: "assign_date",
      label: "Task Assign Date",
      sortable: true,
      render: (item: Task) => <span>{formatDate(item.assign_date)}</span>,
    },
    {
      key: "ref_number",
      label: "Task Ref Number",
      sortable: true,
      render: (item: Task) => <span className="font-mono font-medium text-black">{item.ref_number}</span>,
    },
    {
      key: "created_by_name",
      label: "Task Create User",
      sortable: true,
      render: (item: Task) => <span>{item.created_by_name || "System"}</span>,
    },
    {
      key: "related_module",
      label: "Related Module",
      sortable: true,
      render: (item: Task) => (
        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-black">{item.related_module}</span>
      ),
    },
    {
      key: "user_action",
      label: "User Action",
      sortable: true,
      render: (item: Task) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-black ${
          item.user_action === "delete" ? "bg-red-100" : item.user_action === "edit" ? "bg-yellow-100" : "bg-gray-100"
        }`}>
          {item.user_action}
        </span>
      ),
    },
    {
      key: "entity_description",
      label: "Description",
      render: (item: Task) => <span className="max-w-[150px] truncate text-black">{item.entity_description || "-"}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: Task) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-black ${
          item.status === "approved" ? "bg-green-100" :
          item.status === "rejected" ? "bg-red-100" : "bg-yellow-100"
        }`}>
          {item.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      render: (item: Task) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTask(item)}
            className="rounded-lg p-1.5 text-black hover:bg-gray-100"
            title="View"
          >
            <Eye size={16} />
          </button>
          {item.status === "pending" && (
            <>
              <button
                onClick={() => handleAction(item, "approved")}
                disabled={processing}
                className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                title="Approve"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => handleAction(item, "rejected")}
                disabled={processing}
                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                title="Reject"
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">Approval Tasks</h1>
        <Link
          href={`/${locale}/inventory`}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          <ArrowLeft size={18} className="text-emerald-600" />
          Back
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={tasks}
        loading={loading}
        searchable
        searchKeys={["ref_number", "related_module", "user_action", "created_by_name", "entity_description"]}
      />

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !processing && setSelectedTask(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-black">Task Details</h2>
              <button onClick={() => setSelectedTask(null)} className="rounded p-1 text-black hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-black">Ref Number:</span> <span className="font-mono text-black">{selectedTask.ref_number}</span></div>
              <div><span className="font-medium text-black">Status:</span> <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-black ${
                selectedTask.status === "approved" ? "bg-green-100" :
                selectedTask.status === "rejected" ? "bg-red-100" : "bg-yellow-100"
              }`}>{selectedTask.status}</span></div>
              <div><span className="font-medium text-black">Module:</span> <span className="text-black">{selectedTask.related_module}</span></div>
              <div><span className="font-medium text-black">Action:</span> <span className="capitalize text-black">{selectedTask.user_action}</span></div>
              <div><span className="font-medium text-black">Created By:</span> <span className="text-black">{selectedTask.created_by_name || "System"}</span></div>
              <div><span className="font-medium text-black">Assign Date:</span> <span className="text-black">{formatDate(selectedTask.assign_date)}</span></div>
              {selectedTask.approved_by_name && (
                <>
                  <div><span className="font-medium text-black">Approved By:</span> <span className="text-black">{selectedTask.approved_by_name}</span></div>
                  <div><span className="font-medium text-black">Approved At:</span> <span className="text-black">{formatDate(selectedTask.approved_at || "")}</span></div>
                </>
              )}
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-black">Description</h3>
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-black">{selectedTask.entity_description || "No description"}</p>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-black">Changes</h3>
              <div className="overflow-x-auto rounded-lg border border-neutral-300">
                {selectedTask.user_action === "delete" && !Object.keys(selectedTask.new_values).length ? (
                  <div className="px-3 py-4 text-sm text-black">This item has been marked for deletion.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-neutral-100">
                        <th className="px-3 py-2 text-left font-medium text-black">Field</th>
                        <th className="px-3 py-2 text-left font-medium text-black">Before Value</th>
                        <th className="px-3 py-2 text-left font-medium text-black">Proposed Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allKeys = [...new Set([...Object.keys(selectedTask.before_values || {}), ...Object.keys(selectedTask.new_values || {})])]
                        const changedKeys = allKeys.filter(key => {
                          const before = JSON.stringify(selectedTask.before_values?.[key])
                          const after = JSON.stringify(selectedTask.new_values?.[key])
                          return before !== after
                        })
                        return changedKeys.length > 0 ? changedKeys.map((key) => (
                          <tr key={key} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium text-black capitalize">{key.replace(/_/g, " ")}</td>
                            <td className="px-3 py-2 text-black">{selectedTask.before_values[key] !== undefined ? String(selectedTask.before_values[key]) : "-"}</td>
                            <td className="px-3 py-2 text-black">{selectedTask.new_values[key] !== undefined ? String(selectedTask.new_values[key]) : "-"}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={3} className="px-3 py-4 text-center text-black">No changes recorded</td></tr>
                        )
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {selectedTask.status === "pending" && (
              <div className="flex items-center gap-3 border-t pt-4">
                <button
                  onClick={() => handleAction(selectedTask, "approved")}
                  disabled={processing}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(selectedTask, "rejected")}
                  disabled={processing}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
