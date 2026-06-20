import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { refreshToken } = await request.json()

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refreshToken" }, { status: 400 })
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.error_description ?? "Token refresh failed" }, { status: 500 })
  }

  return NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in })
}
