export const locales = ["en", "si", "ta"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"

export const localeLabels: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
}
