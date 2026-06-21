import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { amount } = body
    if (!amount) {
      return NextResponse.json({ error: "amount is required" }, { status: 400 })
    }

    const apiKey = process.env.QR_API_KEY
    const baseUrl = process.env.NEXT_PUBLIC_QR_CHECKOUT_URL || "http://localhost:8791"

    if (!apiKey) {
      return NextResponse.json({ error: "QR API key not configured" }, { status: 500 })
    }

    const res = await fetch(`${baseUrl}/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error("QR checkout API error:", data)
      return NextResponse.json(
        { error: (data as { error?: string }).error || "QR checkout failed" },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("QR checkout proxy error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
