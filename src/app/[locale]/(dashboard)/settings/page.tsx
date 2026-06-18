"use client"

import { useTranslations } from "next-intl"
import { use, useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { createClient } from "@/lib/supabase/client"
import { Globe, Bell, Shield, Database as DatabaseIcon, Building2, Share2, MessageCircle, Smartphone, Upload, X } from "lucide-react"
import { useData } from "@/providers/data-provider"

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
    icon: DatabaseIcon,
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
  const { companySettings: contextCompany, updateCompanySettings } = useData()
  const supabase = createClient()
  const [companyName, setCompanyName] = useState("")
  const [address, setAddress] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [whatsappLink, setWhatsappLink] = useState("")
  const [whatsappApiKey, setWhatsappApiKey] = useState("")
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("")
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState("")
  const [smsProvider, setSmsProvider] = useState("")
  const [smsApiKey, setSmsApiKey] = useState("")
  const [smsApiSecret, setSmsApiSecret] = useState("")
  const [facebookLink, setFacebookLink] = useState("")
  const [tiktokLink, setTiktokLink] = useState("")
  const [youtubeLink, setYoutubeLink] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (contextCompany) {
      setCompanyName(contextCompany.company_name)
      setAddress(contextCompany.address)
      setContactNumber(contextCompany.contact_number)
      setVatNumber(contextCompany.vat_number)
      setWhatsappLink(contextCompany.whatsapp_link)
      setWhatsappApiKey(contextCompany.whatsapp_api_key)
      setWhatsappPhoneNumberId(contextCompany.whatsapp_phone_number_id)
      setWhatsappBusinessAccountId(contextCompany.whatsapp_business_account_id)
      setWhatsappBusinessAccountId(contextCompany.whatsapp_business_account_id)
      setSmsProvider(contextCompany.sms_provider)
      setSmsApiKey(contextCompany.sms_api_key)
      setSmsApiSecret(contextCompany.sms_api_secret)
      setFacebookLink(contextCompany.facebook_link)
      setTiktokLink(contextCompany.tiktok_link)
      setYoutubeLink(contextCompany.youtube_link)
      setLogoUrl(contextCompany.logo_url)
    }
  }, [contextCompany])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `logo.${fileExt}`

    const { error } = await supabase.storage
      .from("company")
      .upload(fileName, file, { upsert: true })

    if (error) {
      console.error("Upload error:", error)
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from("company")
      .getPublicUrl(fileName)

    setLogoUrl(publicUrl.publicUrl)
    setUploading(false)
  }

  async function handleRemoveLogo() {
    setLogoUrl("")
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const settings = {
      company_name: companyName,
      logo_url: logoUrl,
      address,
      contact_number: contactNumber,
      vat_number: vatNumber,
      whatsapp_link: whatsappLink,
      whatsapp_api_key: whatsappApiKey,
      whatsapp_phone_number_id: whatsappPhoneNumberId,
      whatsapp_business_account_id: whatsappBusinessAccountId,
      sms_provider: smsProvider,
      sms_api_key: smsApiKey,
      sms_api_secret: smsApiSecret,
      facebook_link: facebookLink,
      tiktok_link: tiktokLink,
      youtube_link: youtubeLink,
    }

    if (contextCompany?.id) {
      await supabase
        .from("company_settings")
        .update(settings as never)
        .eq("id", contextCompany.id)
    } else {
      await supabase
        .from("company_settings")
        .insert(settings as never)
    }

    updateCompanySettings(settings)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <PageHeader titleKey="nav.settings" />

      <div className="space-y-6">
        {/* Company Information */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-black">
              {t("settings.company")}
            </h2>
          </div>
          <div className="divide-y px-6 py-4 space-y-4">
            {/* Logo Upload */}
            <div className="py-3">
              <label className="mb-2 block text-sm font-medium text-black">
                {t("settings.company_logo")}
              </label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500">
                    <Upload size={20} className="text-black" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {!logoUrl && (
                  <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-black hover:bg-gray-50">
                    {t("settings.upload_logo")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
                {uploading && <span className="text-sm text-black">Uploading...</span>}
              </div>
            </div>

            {/* Company Name */}
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.company_name")}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Address */}
            <div className="flex items-start justify-between py-3">
              <label className="pt-2 text-sm font-medium text-black">
                {t("settings.address")}
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Contact Number */}
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.contact_number")}
              </label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* VAT Number */}
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.vat_number")}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <Share2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-black">
              {t("settings.social_media")}
            </h2>
          </div>
          <div className="divide-y px-6 py-4">
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.whatsapp_link")}
              </label>
              <input
                type="text"
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                placeholder="https://wa.me/..."
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.facebook_link")}
              </label>
              <input
                type="text"
                value={facebookLink}
                onChange={(e) => setFacebookLink(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.tiktok_link")}
              </label>
              <input
                type="text"
                value={tiktokLink}
                onChange={(e) => setTiktokLink(e.target.value)}
                placeholder="https://tiktok.com/@..."
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">
                {t("settings.youtube_link")}
              </label>
              <input
                type="text"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://youtube.com/@..."
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Business API */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-black">WhatsApp Business API</h2>
          </div>
          <div className="divide-y px-6 py-4">
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">API Key</label>
              <input
                type="text"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
                placeholder="Permanent access token"
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">Phone Number ID</label>
              <input
                type="text"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                placeholder="From Meta Business dashboard"
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">Business Account ID</label>
              <input
                type="text"
                value={whatsappBusinessAccountId}
                onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                placeholder="From Meta Business dashboard"
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SMS API */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center gap-3 border-b px-6 py-4">
            <Smartphone className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-black">SMS API</h2>
          </div>
          <div className="divide-y px-6 py-4">
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">Provider</label>
              <select
                value={smsProvider}
                onChange={(e) => setSmsProvider(e.target.value)}
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None</option>
                <option value="dialog">Dialog</option>
                <option value="mobitel">Mobitel</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">API Key</label>
              <input
                type="text"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder="API key from provider"
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between py-3">
              <label className="text-sm font-medium text-black">API Secret</label>
              <input
                type="text"
                value={smsApiSecret}
                onChange={(e) => setSmsApiSecret(e.target.value)}
                placeholder="API secret from provider"
                className="w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Existing settings sections */}
        {sections.map((section) => (
          <div key={section.key} className="rounded-lg border bg-white">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <section.icon className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-black">
                {t(`settings.${section.key}`)}
              </h2>
            </div>
            <div className="divide-y px-6 py-4">
              {section.fields.map((field) => (
                <div key={field.key} className="flex items-center justify-between py-3">
                  <div>
                    <label className="text-sm font-medium text-black">
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

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm font-medium text-emerald-600">
              {t("settings.saved")}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  )
}
