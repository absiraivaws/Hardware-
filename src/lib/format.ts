export function formatCompactCurrency(amount: number, locale = "en-US"): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })}Mn`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toLocaleString(locale, { maximumFractionDigits: 2 })}K`
  }
  return formatCurrency(amount, locale)
}

export function formatCurrency(amount: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatDate(date: string | Date, _locale?: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, "0")
  const month = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}
