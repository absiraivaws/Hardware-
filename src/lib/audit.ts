import { createClient } from "@/lib/supabase/client"

type AuditAction =
  | "create_sale"
  | "void_sale"
  | "record_payment"
  | "create_quotation"
  | "convert_quotation"
  | "delete_quotation"
  | "create_customer"
  | "edit_customer"
  | "delete_customer"
  | "create_supplier"
  | "edit_supplier"
  | "delete_supplier"
  | "create_purchase"
  | "edit_purchase"
  | "delete_purchase"
  | "create_staff"
  | "edit_staff"
  | "delete_staff"
  | "stock_adjust"
  | "stock_transfer"

export async function logAudit({
  action,
  entity_type,
  entity_id,
  metadata,
}: {
  action: AuditAction
  entity_type: string
  entity_id?: string | null
  metadata?: Record<string, unknown> | null
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action,
    entity_type,
    entity_id: entity_id ?? null,
    metadata: metadata ?? null,
    ip_address: null,
  })
}
