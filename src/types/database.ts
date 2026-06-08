export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"
          branch_id: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"
          branch_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: "owner" | "branch_manager" | "cashier" | "store_keeper" | "accountant" | "sales_executive"
          branch_id?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          name: string
          code: string
          address: string | null
          phone: string | null
          is_main: boolean
          status: "active" | "inactive"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          address?: string | null
          phone?: string | null
          is_main?: boolean
          status?: "active" | "inactive"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string | null
          phone?: string | null
          is_main?: boolean
          status?: "active" | "inactive"
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      units: {
        Row: {
          id: string
          name: string
          symbol: string
          is_decimal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          is_decimal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          is_decimal?: boolean
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          code: string
          name: string
          barcode: string | null
          description: string | null
          category_id: string | null
          brand_id: string | null
          unit_id: string | null
          cost_price: number
          selling_price: number
          wholesale_price: number | null
          min_stock: number
          current_stock: number
          image_url: string | null
          has_expiry: boolean
          is_decimal_qty: boolean
          status: "active" | "inactive"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          barcode?: string | null
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          unit_id?: string | null
          cost_price?: number
          selling_price?: number
          wholesale_price?: number | null
          min_stock?: number
          current_stock?: number
          image_url?: string | null
          has_expiry?: boolean
          is_decimal_qty?: boolean
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          barcode?: string | null
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          unit_id?: string | null
          cost_price?: number
          selling_price?: number
          wholesale_price?: number | null
          min_stock?: number
          current_stock?: number
          image_url?: string | null
          has_expiry?: boolean
          is_decimal_qty?: boolean
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          address: string | null
          credit_limit: number
          credit_balance: number
          loyalty_points: number
          status: "active" | "blocked"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_limit?: number
          credit_balance?: number
          loyalty_points?: number
          status?: "active" | "blocked"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_limit?: number
          credit_balance?: number
          loyalty_points?: number
          status?: "active" | "blocked"
          created_at?: string
          updated_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          credit_period: number
          status: "active" | "inactive"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_period?: number
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_period?: number
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          invoice_no: string
          customer_id: string | null
          customer_name: string | null
          branch_id: string | null
          user_id: string
          subtotal: number
          discount: number
          labour_charge: number
          transport_charge: number
          tax_type: "svat" | "non_vat"
          tax_amount: number
          grand_total: number
          payment_type: "cash" | "credit" | "bank_transfer" | "lanka_qr" | "card" | "mixed" | "cheque"
          amount_paid: number
          balance_due: number
          status: "completed" | "pending" | "cancelled"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_no: string
          customer_id?: string | null
          customer_name?: string | null
          branch_id?: string | null
          user_id: string
          subtotal?: number
          discount?: number
          labour_charge?: number
          transport_charge?: number
          tax_type?: "svat" | "non_vat"
          tax_amount?: number
          grand_total?: number
          payment_type: "cash" | "credit" | "bank_transfer" | "lanka_qr" | "card" | "mixed" | "cheque"
          amount_paid?: number
          balance_due?: number
          status?: "completed" | "pending" | "cancelled"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_no?: string
          customer_id?: string | null
          customer_name?: string | null
          branch_id?: string | null
          user_id?: string
          subtotal?: number
          discount?: number
          labour_charge?: number
          transport_charge?: number
          tax_type?: "svat" | "non_vat"
          tax_amount?: number
          grand_total?: number
          payment_type?: "cash" | "credit" | "bank_transfer" | "lanka_qr" | "card" | "mixed" | "cheque"
          amount_paid?: number
          balance_due?: number
          status?: "completed" | "pending" | "cancelled"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_no: string
          supplier_id: string
          supplier_name: string
          branch_id: string | null
          user_id: string
          subtotal: number
          discount: number
          grand_total: number
          status: "pending" | "partial" | "completed" | "cancelled"
          expected_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_no: string
          supplier_id: string
          supplier_name: string
          branch_id?: string | null
          user_id: string
          subtotal?: number
          discount?: number
          grand_total?: number
          status?: "pending" | "partial" | "completed" | "cancelled"
          expected_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_no?: string
          supplier_id?: string
          supplier_name?: string
          branch_id?: string | null
          user_id?: string
          subtotal?: number
          discount?: number
          grand_total?: number
          status?: "pending" | "partial" | "completed" | "cancelled"
          expected_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          product_name: string
          quantity: number
          received_qty: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          po_id: string
          product_id: string
          product_name: string
          quantity: number
          received_qty?: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          received_qty?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      goods_received_notes: {
        Row: {
          id: string
          grn_no: string
          po_id: string
          supplier_id: string
          branch_id: string | null
          user_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grn_no: string
          po_id: string
          supplier_id: string
          branch_id?: string | null
          user_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grn_no?: string
          po_id?: string
          supplier_id?: string
          branch_id?: string | null
          user_id?: string
          notes?: string | null
          created_at?: string
        }
      }
      quotations: {
        Row: {
          id: string
          q_no: string
          customer_id: string | null
          customer_name: string | null
          branch_id: string | null
          user_id: string
          subtotal: number
          discount: number
          grand_total: number
          valid_until: string | null
          status: "draft" | "sent" | "accepted" | "expired" | "converted"
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          q_no: string
          customer_id?: string | null
          customer_name?: string | null
          branch_id?: string | null
          user_id: string
          subtotal?: number
          discount?: number
          grand_total?: number
          valid_until?: string | null
          status?: "draft" | "sent" | "accepted" | "expired" | "converted"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          q_no?: string
          customer_id?: string | null
          customer_name?: string | null
          branch_id?: string | null
          user_id?: string
          subtotal?: number
          discount?: number
          grand_total?: number
          valid_until?: string | null
          status?: "draft" | "sent" | "accepted" | "expired" | "converted"
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotation_items: {
        Row: {
          id: string
          quotation_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          quotation_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          quotation_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: "in" | "out" | "damaged" | "return" | "transfer"
          quantity: number
          reference_type: string | null
          reference_id: string | null
          notes: string | null
          branch_id: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          type: "in" | "out" | "damaged" | "return" | "transfer"
          quantity: number
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          branch_id?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          type?: "in" | "out" | "damaged" | "return" | "transfer"
          quantity?: number
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          branch_id?: string | null
          user_id?: string
          created_at?: string
        }
      }
      ledger_entries: {
        Row: {
          id: string
          ledger_type: "customer" | "supplier" | "cash" | "bank" | "expense"
          reference_id: string | null
          reference_type: string | null
          entry_type: "debit" | "credit"
          amount: number
          description: string | null
          balance_after: number
          created_at: string
        }
        Insert: {
          id?: string
          ledger_type: "customer" | "supplier" | "cash" | "bank" | "expense"
          reference_id?: string | null
          reference_type?: string | null
          entry_type: "debit" | "credit"
          amount: number
          description?: string | null
          balance_after?: number
          created_at?: string
        }
        Update: {
          id?: string
          ledger_type?: "customer" | "supplier" | "cash" | "bank" | "expense"
          reference_id?: string | null
          reference_type?: string | null
          entry_type?: "debit" | "credit"
          amount?: number
          description?: string | null
          balance_after?: number
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
