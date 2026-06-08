"use client"

import { useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Languages, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCallback, useState } from "react"
import { localeLabels, type Locale } from "@/i18n/config"

export function Header() {
  const t = useTranslations()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [localeMenu, setLocaleMenu] = useState(false)

  const currentLocale = pathname.split("/")[1] as Locale

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      const segments = pathname.split("/")
      segments[1] = newLocale
      router.push(segments.join("/"))
      setLocaleMenu(false)
    },
    [pathname, router],
  )

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push(`/${currentLocale}/login`)
  }, [supabase, router, currentLocale])

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setLocaleMenu(!localeMenu)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
        >
          <Languages size={18} />
          <span>{localeLabels[currentLocale]}</span>
        </button>

        {localeMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setLocaleMenu(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border bg-white py-1 shadow-lg">
              {(Object.entries(localeLabels) as [Locale, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => switchLocale(key)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    key === currentLocale ? "font-medium text-emerald-700" : "text-gray-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100"
      >
        <LogOut size={18} />
        <span>{t("nav.logout")}</span>
      </button>
    </header>
  )
}
