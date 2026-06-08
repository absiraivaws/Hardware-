interface StockInMovement {
  quantity: number
  unit_price: number
  created_at: string
}

interface StockOutMovement {
  quantity: number
  created_at: string
}

interface FIFOLayer {
  qty: number
  price: number
  value: number
}

export function calculateFIFOValue(
  inMovements: StockInMovement[],
  outMovements: StockOutMovement[],
): { value: number; quantity: number; layers: FIFOLayer[] } {
  const sortedIn = [...inMovements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const sortedOut = [...outMovements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const layers: FIFOLayer[] = sortedIn.map((m) => ({ qty: m.quantity, price: m.unit_price, value: 0 }))

  for (const sale of sortedOut) {
    let toConsume = sale.quantity
    for (const layer of layers) {
      if (toConsume <= 0) break
      const consumed = Math.min(layer.qty, toConsume)
      layer.qty -= consumed
      toConsume -= consumed
    }
  }

  const remaining = layers.filter((l) => l.qty > 0).map((l) => ({ ...l, value: l.qty * l.price }))
  const quantity = remaining.reduce((sum, l) => sum + l.qty, 0)
  const value = remaining.reduce((sum, l) => sum + l.value, 0)

  return { value, quantity, layers: remaining }
}
