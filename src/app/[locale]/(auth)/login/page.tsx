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

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("login_title")}</h1>
        <p className="mt-2 text-sm text-gray-700">{showReset ? t("reset_password") : t("sign_in")}</p>
      </div>

      {showReset ? (
        resetSent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {t("reset_link_sent")}
            </div>
            <button
              onClick={() => { setShowReset(false); setResetSent(false) }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {t("back_to_login")}
            </button>
          </div>
        ) : (
          <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("email")}</label>
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
              className="w-full text-center text-sm text-gray-700 hover:text-gray-900"
            >
              {t("back_to_login")}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("email")}</label>
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
            <label className="block text-sm font-medium text-gray-700">{t("password")}</label>
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
        </form>
      )}
    </div>
  )
}
