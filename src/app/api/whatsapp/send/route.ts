import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { to, template, variables } = await req.json()
    if (!to || !template) {
      return NextResponse.json({ error: "Missing required fields: to, template" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: company } = await supabase.from("company_settings").select("whatsapp_api_key, whatsapp_phone_number_id").limit(1).single()

    if (!company?.whatsapp_api_key || !company?.whatsapp_phone_number_id) {
      return NextResponse.json({ error: "WhatsApp API not configured" }, { status: 400 })
    }

    const body: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
      } as Record<string, unknown>,
    }

    if (variables?.length) {
      ;(body.template as Record<string, unknown>).components = variables.map((v: string) => ({
        type: "header",
        parameters: [{ type: "text", text: v }],
      }))
    }

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${company.whatsapp_phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${company.whatsapp_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    )

    const data = await res.json()
    if (!res.ok) {
      console.error("WhatsApp API error:", data)
      return NextResponse.json({ error: "WhatsApp API request failed", details: data }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: data.messages?.[0]?.id })
  } catch (err) {
    console.error("WhatsApp send error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
