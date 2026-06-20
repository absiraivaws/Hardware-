"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type LoginForm = z.infer<typeof loginSchema>
type ResetForm = z.infer<typeof resetSchema>

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations("auth")
  const tc = useTranslations("common")
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/en/dashboard")
    router.refresh()
  }

  const handleReset = async (data: ResetForm) => {
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/en/login`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setResetSent(true)
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/en/dashboard`,
      },
    })
    if (authError) setError(authError.message)
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black">{t("login_title")}</h1>
        <p className="mt-2 text-sm text-black">{showReset ? t("reset_password") : t("sign_in")}</p>
      </div>

      {showReset ? (
        resetSent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {t("reset_link_sent")}
            </div>
            <button
              onClick={() => { setShowReset(false); setResetSent(false) }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-gray-50"
            >
              {t("back_to_login")}
            </button>
          </div>
        ) : (
          <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black">{t("email")}</label>
              <input
                type="email"
                {...resetForm.register("email")}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {resetForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-500">{resetForm.formState.errors.email.message}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? t("common.loading", {}) : t("send_reset_link")}
            </button>

            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="w-full text-center text-sm text-black hover:text-black"
            >
              {t("back_to_login")}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black">{t("email")}</label>
            <input
              type="email"
              {...loginForm.register("email")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {loginForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-black">{t("password")}</label>
            <input
              type="password"
              {...loginForm.register("password")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {loginForm.formState.errors.password && (
              <p className="mt-1 text-xs text-red-500">{loginForm.formState.errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t("forgot_password")}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? tc("loading") : t("sign_in")}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-black">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </form>
      )}
    </div>
  )
}
