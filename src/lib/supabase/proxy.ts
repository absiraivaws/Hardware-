import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const locale = pathname.split("/")[1]

  const publicPaths = ["/login", "/register"]
  const isPublicPath = publicPaths.some((p) => pathname.endsWith(p))

  if (!user && !isPublicPath && locale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  if (user && isPublicPath && locale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  if (user && !isPublicPath && locale) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single()

    if (profile && (profile.status === "inactive" || profile.status === "suspended" || profile.status === "pending")) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/login`
      url.searchParams.set("reason", profile.status === "suspended" ? "suspended" : "inactive")
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
