import { createClient } from "@/lib/supabase/client"

export async function generateNextCode(table: "customers" | "suppliers"): Promise<string> {
  const prefix = table === "customers" ? "CUST-" : "SUPP-"
  const supabase = createClient()
  const { data } = await supabase
    .from(table)
    .select("code")
    .like("code", `${prefix}%`)
    .order("code", { ascending: false })
    .limit(1)
  if (data && data.length > 0) {
    const num = parseInt(data[0].code.replace(prefix, ""), 10) + 1
    return `${prefix}${String(num).padStart(4, "0")}`
  }
  return `${prefix}0001`
}
