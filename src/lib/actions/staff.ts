"use server"

import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function createStaff(data: {
  email: string
  full_name: string
  role: string
  branch_id: string | null
  phone: string | null
  date_of_birth: string | null
  status: string
  password: string
}) {
  const supabase = getAdminClient()

  const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password || "changeme123",
    email_confirm: true,
  })
  if (signUpError) throw new Error(signUpError.message)
  if (!newUser.user) throw new Error("Failed to create user")

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name,
      role: data.role,
      branch_id: data.branch_id || null,
      phone: data.phone || null,
      date_of_birth: data.date_of_birth || null,
      status: data.status,
    })
    .eq("id", newUser.user.id)
  if (updateError) throw new Error(updateError.message)

  return { id: newUser.user.id }
}

export async function updateStaff(
  id: string,
  data: {
    full_name?: string
    role?: string
    branch_id?: string | null
    phone?: string | null
    date_of_birth?: string | null
    status?: string
    password?: string
  },
) {
  const supabase = getAdminClient()

  const profileUpdate: Record<string, unknown> = {}
  for (const key of ["full_name", "role", "branch_id", "phone", "date_of_birth", "status"] as const) {
    if (data[key] !== undefined) profileUpdate[key] = data[key] ?? null
  }
  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", id)
    if (error) throw new Error(error.message)
  }

  if (data.password) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password: data.password })
    if (error) throw new Error(error.message)
  }

  return { success: true }
}
