"use client"

import type { Database } from "@/types/database"

export type CompanySettings = Database["public"]["Tables"]["company_settings"]["Row"]

export function CompanyHeader({ settings }: { settings: CompanySettings | null }) {
  if (!settings) return null

  return (
    <div className="mb-4 text-center border-b pb-3">
      {settings.logo_url && (
        <img
          src={settings.logo_url}
          alt={settings.company_name}
          className="mx-auto h-16 w-auto mb-2 object-contain"
        />
      )}
      {settings.company_name && (
        <h1 className="text-lg font-bold text-black">{settings.company_name}</h1>
      )}
      {settings.address && <p className="text-xs text-black">{settings.address}</p>}
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-black">
        {settings.contact_number && <span>Tel: {settings.contact_number}</span>}
        {settings.vat_number && <span>VAT: {settings.vat_number}</span>}
      </div>
    </div>
  )
}

export function CompanyFooter({ settings }: { settings: CompanySettings | null }) {
  if (!settings) return null

  const hasAnyLink =
    settings.whatsapp_link ||
    settings.facebook_link ||
    settings.tiktok_link ||
    settings.youtube_link

  if (!hasAnyLink) return null

  return (
    <div className="mt-4 border-t pt-3 text-center">
      <div className="flex items-center justify-center gap-3 text-xs text-black">
        {settings.whatsapp_link && (
          <a href={settings.whatsapp_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            WhatsApp
          </a>
        )}
        {settings.facebook_link && (
          <a href={settings.facebook_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            Facebook
          </a>
        )}
        {settings.tiktok_link && (
          <a href={settings.tiktok_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            TikTok
          </a>
        )}
        {settings.youtube_link && (
          <a href={settings.youtube_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
            YouTube
          </a>
        )}
      </div>
    </div>
  )
}
