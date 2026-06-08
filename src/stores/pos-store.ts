import { create } from "zustand"

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface POSState {
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, "total_price">) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.product_id === item.product_id
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  total_price: (i.quantity + item.quantity) * i.unit_price,
                }
              : i,
          ),
        }
      }
      return {
        cart: [...state.cart, { ...item, total_price: item.quantity * item.unit_price }],
      }
    }),
  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((i) => i.product_id !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cart: state.cart.map((i) =>
        i.product_id === productId
          ? { ...i, quantity, total_price: quantity * i.unit_price }
          : i,
      ),
    })),
  clearCart: () => set({ cart: [] }),
}))
