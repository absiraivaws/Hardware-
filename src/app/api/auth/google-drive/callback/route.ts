import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/en/settings?drive=error", process.env.NEXT_PUBLIC_APP_URL))
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-drive/callback`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || !tokenData.refresh_token) {
    return NextResponse.redirect(new URL("/en/settings?drive=error", process.env.NEXT_PUBLIC_APP_URL))
  }

  const infoRes = await fetch(
    `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`,
  )
  const info = await infoRes.json()
  const email = info.email ?? ""

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/en/login", process.env.NEXT_PUBLIC_APP_URL))
  }

  const { data: settings } = await supabase
    .from("company_settings")
    .select("id")
    .limit(1)
    .maybeSingle()

  if (settings?.id) {
    await supabase
      .from("company_settings")
      .update({
        google_drive_refresh_token: tokenData.refresh_token,
        google_drive_email: email,
      })
      .eq("id", settings.id)
  }

  return NextResponse.redirect(
    new URL("/en/settings?drive=connected", process.env.NEXT_PUBLIC_APP_URL),
  )
}
