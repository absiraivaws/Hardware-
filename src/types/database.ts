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
          serial_no: string
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
          expiry_date: string | null
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
          serial_no?: string
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
          expiry_date?: string | null
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
          serial_no?: string
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
          expiry_date?: string | null
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          code: string
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
          code?: string
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
          code?: string
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
          code: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          credit_period: number
          overdue_penalty_rate: number
          status: "active" | "inactive"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_period?: number
          overdue_penalty_rate?: number
          status?: "active" | "inactive"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          credit_period?: number
          overdue_penalty_rate?: number
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
          credit_approval_status: string
          approved_by: string | null
          cheque_status: string | null
          notes: string | null
          created_at: string
          updated_at: string
          payment_details: Json
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
          credit_approval_status?: string
          approved_by?: string | null
          cheque_status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          payment_details?: Json
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
          credit_approval_status?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
          payment_details?: Json
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
          payment_due_date: string | null
          notes: string | null
          amount_paid: number
          balance_due: number
          payment_type: string | null
          payment_details: Record<string, string> | null
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
          payment_due_date?: string | null
          notes?: string | null
          amount_paid?: number
          balance_due?: number
          payment_type?: string | null
          payment_details?: Record<string, string> | null
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
          payment_due_date?: string | null
          notes?: string | null
          amount_paid?: number
          balance_due?: number
          payment_type?: string | null
          payment_details?: Record<string, string> | null
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
      purchase_returns: {
        Row: {
          id: string
          return_no: string
          po_id: string
          supplier_id: string
          branch_id: string | null
          user_id: string
          reason: string | null
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          return_no: string
          po_id: string
          supplier_id: string
          branch_id?: string | null
          user_id: string
          reason?: string | null
          total_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          return_no?: string
          po_id?: string
          supplier_id?: string
          branch_id?: string | null
          user_id?: string
          reason?: string | null
          total_amount?: number
          created_at?: string
        }
      }
      purchase_return_items: {
        Row: {
          id: string
          return_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          return_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          return_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
          total_price?: number
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
          ledger_type: "customer" | "supplier" | "cash" | "bank" | "expense" | "income"
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
          ledger_type: "customer" | "supplier" | "cash" | "bank" | "expense" | "income"
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
          ledger_type?: "customer" | "supplier" | "cash" | "bank" | "expense" | "income"
          reference_id?: string | null
          reference_type?: string | null
          entry_type?: "debit" | "credit"
          amount?: number
          description?: string | null
          balance_after?: number
          created_at?: string
        }
      }
      company_settings: {
        Row: {
          id: string
          company_name: string
          logo_url: string
          address: string
          contact_number: string
          vat_number: string
          manager_pin: string
          whatsapp_api_key: string
          whatsapp_phone_number_id: string
          whatsapp_business_account_id: string
          sms_provider: string
          sms_api_key: string
          sms_api_secret: string
          whatsapp_link: string
          facebook_link: string
          tiktok_link: string
          youtube_link: string
          cash_opening_balance: number
          bank_opening_balance: number
          quotation_valid_days: number
          updated_at: string
        }
        Insert: {
          id?: string
          company_name?: string
          logo_url?: string
          address?: string
          contact_number?: string
          vat_number?: string
          manager_pin?: string
          whatsapp_api_key?: string
          whatsapp_phone_number_id?: string
          whatsapp_business_account_id?: string
          sms_provider?: string
          sms_api_key?: string
          sms_api_secret?: string
          whatsapp_link?: string
          facebook_link?: string
          tiktok_link?: string
          youtube_link?: string
          cash_opening_balance?: number
          bank_opening_balance?: number
          quotation_valid_days?: number
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          logo_url?: string
          address?: string
          contact_number?: string
          vat_number?: string
          manager_pin?: string
          whatsapp_api_key?: string
          whatsapp_phone_number_id?: string
          whatsapp_business_account_id?: string
          sms_provider?: string
          sms_api_key?: string
          sms_api_secret?: string
          whatsapp_link?: string
          facebook_link?: string
          tiktok_link?: string
          youtube_link?: string
          cash_opening_balance?: number
          bank_opening_balance?: number
          quotation_valid_days?: number
          updated_at?: string
        }
      }
      branch_stock: {
        Row: {
          id: string
          product_id: string
          branch_id: string
          current_stock: number
        }
        Insert: {
          id?: string
          product_id: string
          branch_id: string
          current_stock?: number
        }
        Update: {
          id?: string
          product_id?: string
          branch_id?: string
          current_stock?: number
        }
      }
      stock_transfers: {
        Row: {
          id: string
          transfer_no: string
          from_branch_id: string
          to_branch_id: string
          status: "pending" | "completed" | "cancelled"
          notes: string | null
          created_by: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transfer_no: string
          from_branch_id: string
          to_branch_id: string
          status?: "pending" | "completed" | "cancelled"
          notes?: string | null
          created_by: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transfer_no?: string
          from_branch_id?: string
          to_branch_id?: string
          status?: "pending" | "completed" | "cancelled"
          notes?: string | null
          created_by?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      stock_transfer_items: {
        Row: {
          id: string
          transfer_id: string
          product_id: string
          product_name: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          transfer_id: string
          product_id: string
          product_name: string
          quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          transfer_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          created_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          name: string
          phone: string
          license_no: string
          status: "active" | "inactive"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string
          license_no?: string
          status?: "active" | "inactive"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          license_no?: string
          status?: "active" | "inactive"
          created_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          registration_no: string
          model: string
          capacity: string
          status: "active" | "maintenance" | "inactive"
          created_at: string
        }
        Insert: {
          id?: string
          registration_no: string
          model?: string
          capacity?: string
          status?: "active" | "maintenance" | "inactive"
          created_at?: string
        }
        Update: {
          id?: string
          registration_no?: string
          model?: string
          capacity?: string
          status?: "active" | "maintenance" | "inactive"
          created_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          sale_id: string | null
          delivery_no: string
          driver_id: string | null
          vehicle_id: string | null
          delivery_date: string
          status: "pending" | "in_transit" | "delivered" | "cancelled"
          address: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_id?: string | null
          delivery_no: string
          driver_id?: string | null
          vehicle_id?: string | null
          delivery_date?: string
          status?: "pending" | "in_transit" | "delivered" | "cancelled"
          address?: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string | null
          delivery_no?: string
          driver_id?: string | null
          vehicle_id?: string | null
          delivery_date?: string
          status?: "pending" | "in_transit" | "delivered" | "cancelled"
          address?: string
          notes?: string
          created_at?: string
        }
      }
      delivery_items: {
        Row: {
          id: string
          delivery_id: string
          product_id: string | null
          product_name: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          delivery_id: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          created_at?: string
        }
      }
      rentals: {
        Row: {
          id: string
          rental_no: string
          customer_id: string | null
          customer_name: string
          rental_type: "tool" | "cement_bag"
          status: "active" | "returned" | "overdue" | "cancelled"
          start_date: string
          expected_return_date: string
          actual_return_date: string | null
          deposit_amount: number
          total_fee: number
          late_fee: number
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          rental_no: string
          customer_id?: string | null
          customer_name?: string
          rental_type: "tool" | "cement_bag"
          status?: "active" | "returned" | "overdue" | "cancelled"
          start_date?: string
          expected_return_date: string
          actual_return_date?: string | null
          deposit_amount?: number
          total_fee?: number
          late_fee?: number
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          rental_no?: string
          customer_id?: string | null
          customer_name?: string
          rental_type?: "tool" | "cement_bag"
          status?: "active" | "returned" | "overdue" | "cancelled"
          start_date?: string
          expected_return_date?: string
          actual_return_date?: string | null
          deposit_amount?: number
          total_fee?: number
          late_fee?: number
          notes?: string
          created_at?: string
        }
      }
      rental_items: {
        Row: {
          id: string
          rental_id: string
          product_id: string | null
          product_name: string
          quantity: number
          rate: number
          deposit: number
          returned_quantity: number
          damage_notes: string
          created_at: string
        }
        Insert: {
          id?: string
          rental_id: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          deposit?: number
          returned_quantity?: number
          damage_notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          rental_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          deposit?: number
          returned_quantity?: number
          damage_notes?: string
          created_at?: string
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          type: "expense" | "income"
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: "expense" | "income"
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: "expense" | "income"
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
