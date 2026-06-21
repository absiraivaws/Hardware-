import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const STAFF_SEED = [
  { email: "absiraiva@gmail.com", full_name: "Absiraiva", role: "super_admin", password: "123456", phone: "0771234567", date_of_birth: "1990-01-15" },
  { email: "owner@hardware.lk", full_name: "Owner User", role: "owner", password: "123456", phone: "0772345678", date_of_birth: "1985-06-20" },
  { email: "manager@hardware.lk", full_name: "Branch Manager", role: "branch_manager", password: "123456", phone: "0773456789", date_of_birth: "1992-03-10" },
  { email: "cashier@hardware.lk", full_name: "Cashier User", role: "cashier", password: "123456", phone: "0774567890", date_of_birth: "1998-11-05" },
  { email: "storekeeper@hardware.lk", full_name: "Store Keeper", role: "store_keeper", password: "123456", phone: "0775678901", date_of_birth: "1993-07-22" },
  { email: "accountant@hardware.lk", full_name: "Accountant User", role: "accountant", password: "123456", phone: "0776789012", date_of_birth: "1988-09-15" },
  { email: "salesexec@hardware.lk", full_name: "Sales Executive", role: "sales_executive", password: "123456", phone: "0777890123", date_of_birth: "1995-02-28" },
]

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Add SUPABASE_SERVICE_ROLE_KEY to .env (get it from Supabase Dashboard > Settings > API)" },
      { status: 500 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const results: Record<string, unknown>[] = []

  for (const s of STAFF_SEED) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes("already exists")) {
        const { data: existing } = await supabase.auth.admin.listUsers()
        const user = existing?.users.find((u) => u.email === s.email)
        if (user) {
          await supabase.from("profiles").update({
            full_name: s.full_name,
            role: s.role as never,
            status: "active",
            phone: s.phone,
            date_of_birth: s.date_of_birth,
          }).eq("id", user.id)
        }
        results.push({ email: s.email, success: true, note: "already existed, details updated" })
      } else {
        results.push({ email: s.email, success: false, error: error.message })
      }
      continue
    }

    if (data.user) {
      const { error: updateErr } = await supabase.from("profiles").update({
        full_name: s.full_name,
        role: s.role as never,
        status: "active",
        phone: s.phone,
        date_of_birth: s.date_of_birth,
      }).eq("id", data.user.id)

      if (updateErr) {
        results.push({ email: s.email, success: true, note: "created but profile update failed: " + updateErr.message })
      } else {
        results.push({ email: s.email, success: true })
      }
    }
  }

  return NextResponse.json({ results })
}
