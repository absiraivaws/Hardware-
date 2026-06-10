const cache = new Map<string, { data: unknown; timestamp: number }>()

const TTL: Record<string, number> = {
  company_settings: 300_000,
  products: 120_000,
  customers: 120_000,
  suppliers: 120_000,
  sales: 30_000,
  purchase_orders: 30_000,
  quotations: 30_000,
  ledger_entries: 60_000,
  dashboard: 30_000,
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  const prefix = key.split(":")[0]
  const ttl = TTL[prefix] ?? 60_000
  if (Date.now() - entry.timestamp < ttl) return entry.data as T
  cache.delete(key)
  return null
}

export function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

type FetchFn<T> = () => Promise<T>

export async function fetchWithCache<T>(key: string, fetchFn: FetchFn<T>): Promise<T> {
  const cached = getCached<T>(key)
  if (cached) return cached
  const data = await fetchFn()
  setCache(key, data)
  return data
}

export function invalidateCache(pattern?: string) {
  if (!pattern) { cache.clear(); return }
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key)
  }
}
