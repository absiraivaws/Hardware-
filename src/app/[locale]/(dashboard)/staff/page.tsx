"use client"

import { use, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/format"
import { Plus, Pencil, X, Search, ExternalLink } from "lucide-react"

type UserRole = "super_admin" | "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  branch_id: string | null
  phone: string | null
  avatar_url: string | null
  staff_code: string
  status: "active" | "inactive" | "suspended" | "pending"
  date_of_birth: string | null
  last_login: string | null
  created_at: string
  updated_at: string
  branch_name?: string | null
}

interface Branch {
  id: string
  name: string
  code: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  branch_manager: "Branch Manager",
  cashier: "Cashier",
  store_keeper: "Store Keeper",
  accountant: "Accountant",
  sales_executive: "Sales Executive",
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
}

export default function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const t = useTranslations()
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "cashier" as UserRole,
    branch_id: "",
    phone: "",
    date_of_birth: "",
    status: "active" as StaffMember["status"],
    password: "",
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [branchFilter, setBranchFilter] = useState<string>("")

  const supabase = createClient()

  const fetchStaff = async () => {
    const { data: staffData } = await supabase
      .from("profiles")
      .select("*, branches!left(name)")
      .order("created_at", { ascending: false })

    if (staffData) {
      const enriched: StaffMember[] = staffData.map((s: Record<string, unknown>) => ({
        ...(s as unknown as StaffMember),
        branch_name: ((s.branches as { name?: string })?.name) ?? null,
      }))
      setStaff(enriched)
    }

    const { data: branchData } = await supabase.from("branches").select("id, name, code").eq("status", "active")
    if (branchData) setBranches(branchData as Branch[])

    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  const openCreateForm = () => {
    setEditingStaff(null)
    setForm({ email: "", full_name: "", role: "cashier", branch_id: "", phone: "", date_of_birth: "", status: "active", password: "" })
    setShowForm(true)
  }

  const openEditForm = (s: StaffMember) => {
    setEditingStaff(s)
    setForm({
      email: s.email,
      full_name: s.full_name ?? "",
      role: s.role,
      branch_id: s.branch_id ?? "",
      phone: s.phone ?? "",
      date_of_birth: s.date_of_birth ?? "",
      status: s.status,
      password: "",
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.full_name || !form.email) return
    const payload: Record<string, unknown> = {
      email: form.email,
      full_name: form.full_name,
      role: form.role,
      branch_id: form.branch_id || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      status: form.status,
    }

    if (editingStaff) {
      await supabase.from("profiles").update(payload).eq("id", editingStaff.id)
      if (form.password) {
        await supabase.auth.admin.updateUserById(editingStaff.id, { password: form.password })
      }
    } else {
      const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password || "changeme123",
        email_confirm: true,
      })
      if (signUpError) return
      if (newUser?.user) {
        await supabase.from("profiles").update(payload).eq("id", newUser.user.id)
      }
    }

    setShowForm(false)
    fetchStaff()
  }

  const filtered = staff.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!s.full_name?.toLowerCase().includes(q) && !s.staff_code.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q))
        return false
    }
    if (roleFilter && s.role !== roleFilter) return false
    if (statusFilter && s.status !== statusFilter) return false
    if (branchFilter && s.branch_id !== branchFilter) return false
    return true
  })

  const columns = [
    {
      key: "staff_code",
      label: "Staff Code",
      render: (s: StaffMember) => <span className="font-mono text-xs">{s.staff_code}</span>,
    },
    {
      key: "full_name",
      label: "Full Name",
      render: (s: StaffMember) => (
        <button
          onClick={() => router.push(`/${locale}/staff/${s.id}`)}
          className="group inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
        >
          <span>{s.full_name ?? "—"}</span>
          <ExternalLink size={13} className="opacity-0 group-hover:opacity-100 text-emerald-400" />
        </button>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (s: StaffMember) => (
        <button
          onClick={() => router.push(`/${locale}/staff/${s.id}`)}
          className="group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-gray-100"
        >
          <span>{ROLE_LABELS[s.role] ?? s.role}</span>
          <ExternalLink size={13} className="opacity-0 group-hover:opacity-100 text-gray-400" />
        </button>
      ),
    },
    {
      key: "branch_name",
      label: "Branch",
      render: (s: StaffMember) => s.branch_name ?? "—",
    },
    {
      key: "email",
      label: "Email",
      render: (s: StaffMember) => s.email,
    },
    {
      key: "phone",
      label: "Phone",
      render: (s: StaffMember) => s.phone ?? "—",
    },
    {
      key: "status",
      label: "Status",
      render: (s: StaffMember) => {
        const st = s.status ?? "active"
        return (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[st]}`}>
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </span>
        )
      },
    },
    {
      key: "last_login",
      label: "Last Login",
      render: (s: StaffMember) => (s.last_login ? formatDate(s.last_login) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (s: StaffMember) => (
        <button
          onClick={(e) => { e.stopPropagation(); openEditForm(s) }}
          className="rounded-lg p-1.5 text-black hover:bg-gray-100"
          title="Edit"
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader titleKey="nav.staff" />
        <DataTable columns={columns} data={[]} loading />
      </div>
    )
  }

  return (
    <div>
      <PageHeader titleKey="nav.staff" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
            <input
              type="text"
              placeholder="Search name, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm text-black focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      <DataTable columns={columns} data={filtered} searchKeys={["full_name", "staff_code", "email"]} />

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black">
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h3>
              <button onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black">Full Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  >
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Branch</label>
                  <select
                    value={form.branch_id}
                    onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">Date of Birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as StaffMember["status"] })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black">
                    {editingStaff ? "New Password (leave blank to keep)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-black hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  {editingStaff ? "Save Changes" : "Create Staff"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
