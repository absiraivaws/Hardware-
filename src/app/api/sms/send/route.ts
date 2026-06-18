import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json()
    if (!to || !message) {
      return NextResponse.json({ error: "Missing required fields: to, message" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: company } = await supabase.from("company_settings").select("sms_provider, sms_api_key, sms_api_secret").limit(1).single()

    if (!company?.sms_provider || !company?.sms_api_key) {
      return NextResponse.json({ error: "SMS API not configured" }, { status: 400 })
    }

    let res: Response

    if (company.sms_provider === "dialog") {
      const payload = new URLSearchParams({
        destination: to,
        message,
        api_key: company.sms_api_key,
        ...(company.sms_api_secret ? { api_secret: company.sms_api_secret } : {}),
      })
      res = await fetch("https://api.dialog.lk/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload.toString(),
      })
    } else if (company.sms_provider === "mobitel") {
      res = await fetch("https://api.mobitel.lk/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${company.sms_api_key}`,
        },
        body: JSON.stringify({
          destination: to,
          message,
          ...(company.sms_api_secret ? { api_secret: company.sms_api_secret } : {}),
        }),
      })
    } else {
      return NextResponse.json({ error: "Unsupported SMS provider" }, { status: 400 })
    }

    const data = await res.json()
    if (!res.ok) {
      console.error("SMS API error:", data)
      return NextResponse.json({ error: "SMS API request failed", details: data }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("SMS send error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
