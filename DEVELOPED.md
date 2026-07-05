# HardPro ERP — Developed System Documentation

## 1. System Overview

**HardPro ERP** is a full-featured, multi-tenant hardware store management system built for Sri Lanka. It handles point-of-sale (POS), inventory, purchasing, sales, customer and supplier management, quotations, deliveries, rentals, expense tracking, financial ledgers, staff management, role-based access control, audit logging, and reporting.

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (email/password)
- **UI**: Tailwind CSS + Lucide React icons
- **i18n**: next-intl (English, Sinhala, Tamil)
- **State**: React Context + Zustand (POS cart)
- **PDF**: jsPDF (quotations)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (managed via Supabase) |
| ORM / Client | Supabase JS Client (`@supabase/ssr`) |
| Auth | Supabase Auth (email/password, admin API) |
| Styling | Tailwind CSS |
| Icons | Lucide React (`lucide-react@1.17.0`) |
| Internationalization | `next-intl` (en / si / ta) |
| State Management | React Context (auth, company settings) + Zustand (POS cart) |
| Form Validation | react-hook-form + Zod (login) |
| PDF Generation | jsPDF (quotations) |
| Code Quality | TypeScript strict mode, ESLint |

---

## 3. Architecture

### 3.1 Route Structure

```
/ (redirects to /{locale}/dashboard)
/{locale}/                    (locale root, redirects to /{locale}/dashboard)
/{locale}/login               (auth page)
/{locale}/dashboard            Dashboard with charts
/{locale}/sales                POS (point-of-sale)
/{locale}/sales/history        Sales history & void
/{locale}/inventory            Product listing
/{locale}/inventory/new        Add product
/{locale}/customers            Customer management
/{locale}/customers/ledger     Customer ledger (read-only)
/{locale}/suppliers            Supplier management
/{locale}/suppliers/ledger     Supplier ledger
/{locale}/purchases            Purchase order list
/{locale}/purchases/new        Create purchase order
/{locale}/purchases/[id]       PO detail (GRN, edit, return, payment)
/{locale}/quotations           Quotation list
/{locale}/quotations/new       Create quotation
/{locale}/quotations/[id]      Quotation detail (PDF, share, convert to sale)
/{locale}/deliveries           Delivery management
/{locale}/deliveries/[id]      Delivery detail
/{locale}/drivers              Driver management
/{locale}/vehicles             Vehicle management
/{locale}/rentals              Rental management
/{locale}/expenses             Expense & income tracking
/{locale}/reports              Reports (8 tabs)
/{locale}/ledgers              Cash & bank ledger
/{locale}/audit-log            Audit log viewer
/{locale}/stock-transfers      Inter-branch stock transfers
/{locale}/staff                Staff management
/{locale}/staff/[id]           Staff detail (sidebar config, activity)
/{locale}/settings             Company settings

/api/sms/send                  SMS API endpoint
/api/whatsapp/send             WhatsApp API endpoint
/api/seed-staff                Staff seeding utility
```

### 3.2 Layout & Provider Hierarchy

```
RootLayout (fonts, globals.css, WheelGuard)
 └── LocaleLayout (NextIntlClientProvider)
      └── AuthLayout (centered, for /login) OR
          DashboardLayout
           ├── DataProvider (company settings context)
           ├── AuthProvider (profile, permissions, sidebar modules context)
           ├── Sidebar (collapsible, drag-to-reorder, role-filtered)
           ├── Header (locale switcher, logout)
           └── <Page Content>
```

### 3.3 Middleware (`proxy.ts`)

The middleware runs on every request:

1. Creates a Supabase server client from request cookies
2. If unauthenticated and path is not public → redirect to `/{locale}/login`
3. If authenticated and on public path (login/register) → redirect to `/{locale}/dashboard`
4. If authenticated on a non-public path → checks `profiles.status`
   - `inactive`, `suspended`, `pending` → redirect to login with reason

Public paths: `/login`, `/register`

---

## 4. Database Schema

### 4.1 Enums

| Enum | Values |
|---|---|
| `user_role` | `super_admin`, `owner`, `branch_manager`, `cashier`, `store_keeper`, `accountant`, `sales_executive` |
| `user_status` | `active`, `inactive`, `suspended`, `pending` |
| `payment_type` | `cash`, `credit`, `bank_transfer`, `lanka_qr`, `card`, `mixed`, `cheque` |
| `sale_status` | `pending`, `completed`, `cancelled` |
| `tax_type` | `non_vat`, `svat` |
| `stock_movement_type` | `in`, `out`, `damaged`, `return`, `transfer` |
| `ledger_type` | `customer`, `supplier`, `cash`, `bank`, `expense`, `income` |
| `entry_type` | `debit`, `credit` |
| `po_status` | `pending`, `partial`, `completed`, `cancelled` |
| `quotation_status` | `draft`, `sent`, `accepted`, `expired`, `converted` |
| `transfer_status` | `pending`, `completed`, `cancelled` |
| `delivery_status` | `pending`, `in_transit`, `delivered`, `cancelled` |
| `rental_type` | `tool`, `cement_bag` |
| `rental_status` | `active`, `returned`, `overdue`, `cancelled` |
| `cheque_status` | `pending`, `cleared`, `bounced` |
| `category_type` | `expense`, `income` |

### 4.2 Tables

#### Core Business Tables

| Table | Key Columns | Description |
|---|---|---|
| `branches` | `id, name, code, is_main, status` | Business branches/locations |
| `categories` | `id, name` | Product categories |
| `brands` | `id, name` | Product brands |
| `units` | `id, name, symbol, is_decimal` | Units of measure |
| `products` | `id, code, name, barcode, serial_no, selling_price, wholesale_price, cost_price, current_stock, min_stock, expiry_date, status` | Inventory items |
| `branch_stock` | `product_id, branch_id, current_stock` | Per-branch inventory levels |
| `stock_movements` | `id, product_id, type, quantity, reference_type, reference_id, unit_price, notes` | Audit trail for all stock changes |
| `customers` | `id, code, name, phone, email, nic, whatsapp, handphone, date_of_birth, credit_limit, credit_balance, status` | Customer records |
| `suppliers` | `id, code, name, contact_person, phone, email, credit_period, overdue_penalty_rate, status` | Supplier records |

#### Sales & POS

| Table | Key Columns | Description |
|---|---|---|
| `sales` | `id, invoice_no, customer_id, customer_name, subtotal, discount, labour_charge, transport_charge, tax_type, tax_amount, grand_total, payment_type, amount_paid, balance_due, status, credit_approval_status, approved_by, cheque_status, payment_details` | POS transactions |
| `sale_items` | `id, sale_id, product_id, product_name, quantity, unit_price, total_price` | Line items for each sale |

#### Purchasing

| Table | Key Columns | Description |
|---|---|---|
| `purchase_orders` | `id, po_no, supplier_id, supplier_name, subtotal, discount, grand_total, status, expected_date, payment_due_date, amount_paid, balance_due, payment_type, payment_details` | Purchase orders |
| `purchase_items` | `id, po_id, product_id, product_name, quantity, received_qty, unit_price, total_price` | Line items for each PO |
| `goods_received_notes` | `id, grn_no, po_id, supplier_id, notes` | Goods received notes |
| `purchase_returns` | `id, return_no, po_id, supplier_id, reason, total_amount` | Purchase returns |
| `purchase_return_items` | `id, return_id, product_id, product_name, quantity, unit_price, total_price` | Return line items |

#### Quotations

| Table | Key Columns | Description |
|---|---|---|
| `quotations` | `id, q_no, customer_id, customer_name, subtotal, discount, grand_total, valid_until, status` | Sales quotations |
| `quotation_items` | `id, quotation_id, product_id, product_name, quantity, unit_price, total_price` | Quotation line items |

#### Stock Transfers

| Table | Key Columns | Description |
|---|---|---|
| `stock_transfers` | `id, transfer_no, from_branch_id, to_branch_id, status, created_by, completed_at` | Inter-branch transfers |
| `stock_transfer_items` | `id, transfer_id, product_id, product_name, quantity` | Transfer line items |

#### Deliveries & Logistics

| Table | Key Columns | Description |
|---|---|---|
| `drivers` | `id, name, phone, license_no, status` | Delivery drivers |
| `vehicles` | `id, registration_no, model, capacity, status` | Delivery vehicles |
| `deliveries` | `id, delivery_no, sale_id, driver_id, vehicle_id, delivery_date, status, address, notes` | Delivery records |
| `delivery_items` | `id, delivery_id, product_id, product_name, quantity` | Delivery line items |

#### Rentals

| Table | Key Columns | Description |
|---|---|---|
| `rentals` | `id, rental_no, customer_id, customer_name, rental_type, status, start_date, expected_return_date, deposit_amount, total_fee, late_fee` | Tool/cement bag rentals |
| `rental_items` | `id, rental_id, product_id, product_name, quantity, rate, deposit, returned_quantity` | Rental line items |

#### Financial

| Table | Key Columns | Description |
|---|---|---|
| `ledger_entries` | `id, ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after` | Double-entry ledger for all financial transactions |
| `expense_categories` | `id, name, type` | Custom expense/income categories |

#### Staff & Access Control

| Table | Key Columns | Description |
|---|---|---|
| `profiles` | `id, email, full_name, role, branch_id, staff_code, status, date_of_birth, last_login` | Extended user profiles (linked 1:1 to auth.users) |
| `permissions` | `id, module, action, label` | System permission definitions |
| `role_permissions` | `role, permission_id` | Many-to-many role→permission mapping |
| `role_sidebar_items` | `role, module` | Sidebar navigation visibility per role |

#### Audit & Configuration

| Table | Key Columns | Description |
|---|---|---|
| `audit_log` | `id, user_id, action, entity_type, entity_id, metadata, ip_address` | Immutable audit trail |
| `company_settings` | `id, company_name, logo_url, address, contact_number, vat_number, manager_pin, quotation_valid_days, max_discount_percent, social_links, api_keys, opening_balances` | Single-row company configuration |

### 4.3 Database Functions (RPC)

| Function | Purpose |
|---|---|
| `public.user_role()` | Returns the current user's role from profiles table |
| `public.has_permission(module, action)` | Checks if current user's role has a specific permission |
| `public.get_role_sidebar_modules(p_role)` | Returns array of sidebar module keys for the given role |

### 4.4 Row-Level Security (RLS)

- Migration 037 replaces blanket "authenticated can do everything" with role-aware policies
- `profiles`: Users read their own profile; super_admin/owner read all
- `permissions`/`role_permissions`: All authenticated users can read
- `audit_log`: Users read own entries; super_admin/owner read all; anyone can insert
- `role_sidebar_items`: All read; only super_admin/owner can manage
- Helper functions `user_role()` and `has_permission()` are PUBLIC schema functions (not auth schema) because `supabase db push` cannot write to the auth schema

---

## 5. Process Flows

### 5.1 POS (Point of Sale) — `/[locale]/sales`

**Complete sale flow:**

1. **Product search**: Barcode scan, serial number (`000` + 3 digits), or free-text search (name/code/barcode)
2. **Add to cart**: Product added to Zustand `pos-store` with quantity 1; user can adjust quantity inline
3. **Customer selection**: Dropdown of active customers with `total_outstanding ≤ credit_limit`; "Walk-in Customer" option
4. **Extra charges**: Labour charge, transport charge (free-form numbers)
5. **Tax**: Toggle between `non_vat` (0%) and `svat` (15%)
6. **Discount**: Amount-based (not percentage), clamped by role permission and company setting
7. **Payment**: 7 types — `cash`, `credit`, `bank_transfer`, `cheque`, `lanka_qr`, `card`, `mixed`
   - `credit` requires `approve_credit` permission; hidden otherwise
   - Credit over limit requires manager PIN approval
8. **Complete sale**: Inserts sale + items, decrements stock, creates stock movement, updates customer credit, creates ledger entry, logs audit

**Database operations (in order):**
```
1. INSERT INTO sales (...)
2. INSERT INTO sale_items (...) for each item
3. UPDATE products SET current_stock = current_stock - qty
4. UPDATE branch_stock SET current_stock = current_stock - qty (if branch_id exists)
5. INSERT INTO stock_movements (type='out', reference_type='sale')
6. UPDATE customers SET credit_balance = credit_balance + balanceDue (if credit)
7. SELECT last ledger_entries balance → INSERT ledger_entries (cash or bank, debit)
8. INSERT INTO audit_log (action='create_sale')
```

**Discount enforcement:**
- `maxDiscountPercent = Math.min(roleMax, companyMax)`
- `roleMax`: 25% if `discount_up_to_25` permission, 10% if `discount_up_to_10`, else 0
- `companyMax`: `companySettings.max_discount_percent` (from settings page)
- If `maxDiscountPercent === 0`: discount input disabled entirely
- `maxDiscount = taxableAmount × maxDiscountPercent / 100` (flat amount cap)

**Credit approval flow:**
- Selected customer's `credit_balance + saleAmount > credit_limit` → manager PIN required
- PIN validated against `company_settings.manager_pin`
- On match: `credit_approval_status = 'approved'`, `approved_by = user.id`

### 5.2 Sales History — `/[locale]/sales/history`

**Void sale:**
- Soft cancel only: `UPDATE sales SET status = 'cancelled'` 
- Does NOT restore stock, reverse ledger entries, or update customer credit
- Gated behind `pos.void_sale` permission
- Logs audit: `action='void_sale'`

**Record payment:**
- `UPDATE sales SET amount_paid += paymentAmount, balance_due = MAX(0, grand_total - new_amount_paid)`
- If balance_due reaches 0, status set to `'completed'`
- Reduces customer credit balance
- Creates ledger entries: customer (credit) + cash/bank (debit)
- Logs audit: `action='record_payment'`

### 5.3 Customers — `/[locale]/customers`

**Create:**
- Code auto-generated: `CUST-XXXX` (sequential)
- Fields: name (required), phone, email, address, NIC, WhatsApp, handphone, DOB, credit_limit
- Fallback: WhatsApp ← handphone ← phone; handphone ← phone
- Audit: `action='create_customer'`

**Edit:**
- Modal with pre-filled fields
- Trim + null coalesce on save
- Audit: `action='edit_customer'`

**Status toggle:**
- `active` ↔ `blocked` (DB `status` column — used for login blocking)
- Client-side computed status: "Inactive" when `total_outstanding > credit_limit` (display-only, not stored)

### 5.4 Suppliers — `/[locale]/suppliers`

**Create:**
- Code auto-generated: `SUPP-XXXX`
- Fields: name (required), contact_person, phone, email, address, credit_period, overdue_penalty_rate
- Audit: `action='create_supplier'`

**Status toggle:**
- `active` ↔ `inactive` (no confirmation modal)
- Audit: `action='edit_supplier'`

### 5.5 Purchases — `/[locale]/purchases/`

**PO Creation:**
- PO Number: `PO-YYYYMMDD-XXXXX`
- Supplier selection, expected date, notes, product items
- Inserts PO + items; no stock or ledger changes until GRN

**GRN (Goods Received Note):**
- Available when PO status is `pending` or `partial`
- Per-item receiving quantities
- Inserts GRN + stock movements (`type='in'`)
- Increments `products.current_stock` and `branch_stock`
- Updates `purchase_items.received_qty`
- On first receipt: creates supplier ledger entry (debit), sets `balance_due = total`
- Updates PO status: `completed` (all received) or `partial`

**Edit PO:**
- Only when status is `pending`
- Inline edit of quantities and unit prices
- Recalculates subtotal/grand_total

**Payment recording:**
- Reduces PO `balance_due`
- Creates ledger entries: supplier (credit, reducing liability) + cash/bank (credit, money out)
- Logs audit: `action='record_payment'`

**Purchase return:**
- Available when PO is `completed` or `partial`
- Reason + items with quantities
- Creates return record, decrements stock, creates stock movement (`type='out'`)
- Does NOT update `received_qty`, `branch_stock`, or PO status

### 5.6 Quotations — `/[locale]/quotations/`

**Create:**
- Q Number: `Q-YYYYMMDD-XXXXX`
- Customer selection, product search (client-side), editable quantities and prices
- Default `valid_until`: today + `quotation_valid_days` (from settings)
- Discount: free-form amount
- Inserts quotation + items with status `draft`

**Detail page actions:**

| Action | Description |
|---|---|
| Download PDF | jsPDF A4 with company logo, info, item table, totals, social links |
| Share WhatsApp | Opens `wa.me` with formatted text summary |
| Convert to Invoice | Creates sale from quotation |

**Convert to invoice flow:**
1. Editable modal: items (qty, price, remove), labour/transport charges, tax type, notes
2. Tax: 15% SVAT on subtotal, or non_vat
3. Generates invoice no, inserts sale + items (payment_type='credit', balance_due=grand_total, status='pending')
4. Decrements stock, creates stock movements
5. Updates customer credit balance (increase by grand_total)
6. Updates quotation status to `'converted'`
7. Logs audit: `action='convert_quotation'`
8. Redirects to sales history

### 5.7 Stock Transfers — `/[locale]/stock-transfers`

**Create:**
- Transfer Number: `TRF-YYYYMMDD-XXXXX`
- Source branch, destination branch, items
- Inserts transfer + items with status `pending`
- Stock NOT moved at creation time

**Complete transfer:**
- Only available when status is `pending`
- Decrements `branch_stock` at source branch
- Increments (upsert) `branch_stock` at destination branch
- Sets status to `completed` + timestamp
- Does NOT update `products.current_stock` or create `stock_movements`

**Cancel:**
- Sets status to `cancelled` with no side effects

### 5.8 Staff Management — `/[locale]/staff`

**Roles:** `super_admin`, `owner`, `branch_manager`, `cashier`, `store_keeper`, `accountant`, `sales_executive`

**Create staff:**
- Uses Supabase Admin API: `supabase.auth.admin.createUser()` (requires service_role)
- Fields: email, password, full_name, role, branch, phone, DOB, status
- After auth user created, updates the auto-created profile

**Edit staff:**
- Same modal, pre-filled
- If password provided: `supabase.auth.admin.updateUserById()`

**Staff detail page sections:**
| Section | Content |
|---|---|
| Personal Info | Staff code, email, phone, DOB |
| Account Info | Role badge, branch name, status badge, last login, member since |
| Sidebar Menu | 17 checkbox toggles per role (affects ALL users with that role) |
| Sales Performance | Completed sales count, total amount, avg per day |
| Recent Activity | Last 5 audit log entries for this user |

### 5.9 Ledger System

**Ledger types:** `customer`, `supplier`, `cash`, `bank`, `expense`, `income`

Each ledger entry has: `entry_type` (debit/credit), `amount`, `balance_after` (running balance).

**Transaction → Ledger mapping:**

| Transaction | Ledger Type | Entry Type | Description |
|---|---|---|---|
| Sale (cash payment) | cash | debit (+) | "Sale INV-..." |
| Sale (credit) | — | — | No ledger entry (recorded as customer balance) |
| Sale (bank payment) | bank | debit (+) | "Sale INV-..." |
| Payment received on sale | customer | credit (-) | "Payment received INV-..." |
| Payment received on sale | cash/bank | debit (+) | "Payment received INV-..." |
| PO receipt (first GRN) | supplier | debit (+) | "PO PO-... (SUPP-...)" |
| Payment to supplier | supplier | credit (-) | "Payment for PO-... (SUPP-...)" |
| Payment to supplier | cash/bank | credit (-) | "Payment for PO-... (SUPP-...)" |
| Expense | expense | debit (+) | "Expense for ..." |

**Running balance**: Each ledger entry stores the balance AFTER the transaction by reading the previous entry's `balance_after` and adding/subtracting the amount.

### 5.10 Audit Logging

Every CRUD operation and key business event is logged via `logAudit()` helper:

| Action | Entity Type | Triggered By |
|---|---|---|
| `create_sale` | sale | POS complete sale |
| `void_sale` | sale | Void sale button |
| `record_payment` | sale | Record payment in sales history |
| `create_quotation` | quotation | Save new quotation |
| `convert_quotation` | quotation | Convert quotation to invoice |
| `delete_quotation` | quotation | Delete quotation |
| `create_customer` | customer | Create customer form |
| `edit_customer` | customer | Edit customer / status toggle |
| `create_supplier` | supplier | Create supplier form |
| `edit_supplier` | supplier | Status toggle supplier |
| `create_purchase` | purchase_order | Create PO / GRN received / purchase return |
| `edit_purchase` | purchase_order | Edit PO items |
| `record_payment` | purchase_order | Record payment on PO |
| `stock_transfer` | stock_transfer | Create stock transfer |

Audit log is immutable (no UPDATE or DELETE policies). Super admin and owner can read all logs; other roles read only their own (controlled by RLS).

---

## 6. Permissions & Roles

### 6.1 Permission Modules & Actions

| Module | Actions | Description |
|---|---|---|
| `pos` | `access_pos`, `approve_credit`, `discount_up_to_10`, `discount_up_to_25`, `void_sale` | POS access control |
| `inventory` | `view`, `create`, `edit`, `delete` | Inventory management |
| `purchases` | `view`, `create`, `edit`, `delete`, `approve` | Purchase order management |
| `customers` | `view`, `create`, `edit`, `delete` | Customer management |
| `suppliers` | `view`, `create`, `edit`, `delete` | Supplier management |
| `reports` | `view` | Report access |
| `staff` | `view`, `create`, `edit`, `delete`, `reset_password`, `change_role`, `view_activity_logs` | Staff management |
| `settings` | `edit`, `view` | Company settings |

### 6.2 Role → Permission Mapping

| Role | Has Access To |
|---|---|
| `super_admin` | ALL permissions |
| `owner` | ALL permissions |
| `branch_manager` | pos (access, approve_credit, discount_up_to_25, void_sale), inventory (all), purchases (all), customers (all), suppliers (all), reports (view), staff (view, view_activity_logs), settings (edit) |
| `cashier` | pos (access), inventory (view), customers (view, create) |
| `store_keeper` | inventory (all), purchases (view, create), suppliers (view) |
| `accountant` | purchases (view), customers (view), suppliers (view), reports (view), settings (view) |
| `sales_executive` | pos (access, discount_up_to_10), customers (view, create), quotations (all) |

### 6.3 Sidebar Visibility by Role

Sidebar items are controlled by the `role_sidebar_items` table. Each role has a curated set of visible modules:

| Role | Visible Modules |
|---|---|
| `super_admin` | All 17 modules (including audit-log) |
| `owner` | All 17 modules (including audit-log) |
| `branch_manager` | All except staff (including audit-log) |
| `cashier` | dashboard, sales, sales/history, customers |
| `store_keeper` | dashboard, purchases, inventory, suppliers |
| `accountant` | dashboard, expenses, reports, ledgers, customers, suppliers |
| `sales_executive` | dashboard, sales, sales/history, customers, quotations, rentals |

---

## 7. Reports — `/[locale]/reports`

Eight report tabs, each with date range filtering where applicable:

| Tab | Data Source | Date Filter | Special Logic |
|---|---|---|---|
| **Daily Sales** | `sales` + `customers` | Yes | Customer codes shown |
| **Stock Report** | `products` + `categories` | No | Computed status: in_stock / low / out |
| **Profit Report** | `sale_items` + `products` | No | profit_per_item = selling_price - cost_price |
| **Outstanding** | `customers` | No | Filtered: credit_balance > 0 |
| **SVAT Report** | `sales` + `customers` | Yes | Filtered: tax_type = 'svat' |
| **Aged Credit** | `sales` + `customers` | No | Bucketed: 0–30, 31–60, 61–90, 90+ days |
| **Profit & Loss** | sales, sale_items, products, ledger_entries | Yes | Revenue - COGS - Expenses |
| **Balance Sheet** | ledger_entries, products, customers, suppliers | No | Assets = cash + bank + inventory + receivables; Liabilities = payables |

All reports use sortable column headers (A-Z / Z-A) and display real product codes (PROD-XXXX), customer codes (CUST-XXXX), and supplier codes (SUPP-XXXX).

---

## 8. API Endpoints

| Endpoint | Method | Purpose | Implementation |
|---|---|---|---|
| `/api/seed-staff` | POST | Seeds 8 staff accounts with predefined roles | Uses auth.admin API to create users, updates profiles |
| `/api/sms/send` | POST | Sends SMS via Dialog/Mobitel provider | Reads API keys from company_settings, formats message |
| `/api/whatsapp/send` | POST | Sends WhatsApp message via Meta Cloud API | Reads WhatsApp Business API credentials from company_settings |

---

## 9. Utilities

### `src/lib/format.ts`
- `formatCurrency(amount, locale?)` → LKR formatted string
- `formatCompactCurrency(amount, locale?)` → Short form (1.25Mn, 1.25K)
- `formatDate(date, locale?)` → `DD-Mon-YYYY` (e.g. `22-Jun-2026`)

### `src/lib/code-gen.ts`
- `generateNextCode("customers")` → `CUST-0001`, `CUST-0002`, ...
- `generateNextCode("suppliers")` → `SUPP-0001`, `SUPP-0002`, ...

### `src/lib/audit.ts`
- `logAudit({ action, entity_type, entity_id, metadata })` → inserts into `audit_log`

### `src/lib/fifo.ts`
- `calculateFIFOValue(inMovements, outMovements)` → FIFO cost layers

### `src/lib/query-cache.ts`
- In-memory client-side cache with per-table TTLs
- `getCached<T>(key)`, `setCache(key, data)`, `fetchWithCache(key, fn)`, `invalidateCache(pattern?)`
- TTLs: company_settings=300s, products=120s, customers=120s, suppliers=120s, sales=30s, purchase_orders=30s, quotations=30s, ledger_entries=60s, dashboard=30s

### `src/stores/pos-store.ts`
- Zustand store for POS cart state
- Actions: `addProduct`, `updateQuantity`, `removeItem`, `clearCart`

### `src/lib/supabase/`
- `client.ts`: Browser-side Supabase client (uses `createBrowserClient`)
- `server.ts`: Server-side Supabase client (uses `createServerClient` + cookie handling)
- `proxy.ts`: Middleware for auth session management + profile status checks

---

## 10. Internationalization

| Locale | File | Keys | Coverage |
|---|---|---|---|
| English | `src/messages/en.json` | ~383 | Full |
| Sinhala | `src/messages/si.json` | ~224 | Common + nav + core CRUD pages + basic reports + settings |
| Tamil | `src/messages/ta.json` | ~224 | Same coverage as Sinhala |

Missing in si/ta: deliveries, drivers, vehicles, rentals, expense, ledger, aged credit, P&L, balance sheet namespaces.

---

## 11. Reference Number Formats

| Document | Format | Example | Generation |
|---|---|---|---|
| Invoice | `INV-YYMMDD-XXXXX` | `INV-260622-00001` | Queries last invoice with same date prefix, increments |
| Purchase Order | `PO-YYYYMMDD-XXXXX` | `PO-20260622-00001` | Random 5-digit suffix |
| GRN | `GRN-YYYYMMDD-XXXXX` | `GRN-20260622-00001` | Random 5-digit suffix |
| Quotation | `Q-YYYYMMDD-XXXXX` | `Q-20260622-00001` | Queries last Q with same date prefix, increments |
| Purchase Return | `RET-YYYYMMDD-XXXXX` | `RET-20260622-00001` | Random 5-digit suffix |
| Stock Transfer | `TRF-YYYYMMDD-XXXXX` | `TRF-20260622-00001` | Not specified (likely sequential) |
| Customer Code | `CUST-XXXX` | `CUST-0001` | Sequential from DB max |
| Supplier Code | `SUPP-XXXX` | `SUPP-0001` | Sequential from DB max |
| Staff Code | `EMP-XXXX` | `EMP-0001` | Auto-generated via DB trigger |

---

## 12. Key Application States

### 12.1 Sidebar Order
- Users can drag-and-drop reorder sidebar items
- Order persisted in `localStorage` key `sidebar_order`
- New items from DEFAULT_ORDER are merged in on load

### 12.2 Customer Status (Computed)
- DB column `customers.status` = `active` / `blocked` (manual admin toggle)
- UI badge shows "Inactive" when `total_outstanding > credit_limit` (computed, not stored)

### 12.3 Customer POS Visibility
- Hidden from POS dropdown when `total_outstanding > credit_limit`
- Filtered client-side after fetching sales' `balance_due`

### 12.4 Staff Status Checks
- Middleware checks `profiles.status` on every non-public request
- `inactive` / `suspended` / `pending` are blocked from accessing any dashboard page
