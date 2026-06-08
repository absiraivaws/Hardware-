"use client"

import { useTranslations } from "next-intl"
import { use } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { Settings as SettingsIcon, Globe, Bell, Shield, Database } from "lucide-react"

const sections = [
  {
    key: "general",
    icon: Globe,
    fields: [
      { key: "app_name", type: "text", defaultValue: "HardPro ERP" },
      { key: "currency", type: "text", defaultValue: "LKR" },
      { key: "branch_name", type: "text", defaultValue: "Main Branch" },
    ],
  },
  {
    key: "notifications",
    icon: Bell,
    fields: [
      { key: "whatsapp_reminders", type: "toggle", defaultValue: true },
      { key: "low_stock_alerts", type: "toggle", defaultValue: true },
      { key: "payment_reminders", type: "toggle", defaultValue: true },
    ],
  },
  {
    key: "inventory",
    icon: Database,
    fields: [
      { key: "default_min_stock", type: "number", defaultValue: 10 },
      { key: "expiry_warning_days", type: "number", defaultValue: 30 },
    ],
  },
  {
    key: "security",
    icon: Shield,
    fields: [
      { key: "two_factor_auth", type: "toggle", defaultValue: false },
      { key: "session_timeout", type: "number", defaultValue: 60 },
    ],
  },
]

export default function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  use(params)
  const t = useTranslations()

  return (
    <div>
      <PageHeader titleKey="nav.settings" />

      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key} className="rounded-lg border bg-white">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <section.icon className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-gray-900">
                {t(`settings.${section.key}`)}
              </h2>
            </div>
            <div className="divide-y px-6 py-4">
              {section.fields.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-3">
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      {t(`settings.${field.key}`)}
                    </label>
                  </div>
                  {field.type === "toggle" ? (
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        defaultChecked={field.defaultValue as boolean}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
                    </label>
                  ) : (
                    <input
                      type={field.type}
                      defaultValue={field.defaultValue as string | number}
                      className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  )
}
