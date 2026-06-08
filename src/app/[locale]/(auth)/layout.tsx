import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
