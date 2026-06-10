"use client"

import { useTranslations } from "next-intl"

interface PageHeaderProps {
  titleKey: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ titleKey, description, children }: PageHeaderProps) {
  const t = useTranslations()

  return (
    <div className="flex items-center justify-between border-b pb-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-black">{t(titleKey)}</h1>
        {description && <p className="text-sm text-black mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  )
}
