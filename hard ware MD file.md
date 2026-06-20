# Hardware Shop ERP System — Full Development Plan (Sri Lanka Market)

## Version: 1.0 (Sri Lanka Optimized)
## Last Updated: 2026-06-01

---

# Overview

The Hardware Shop ERP System is a complete web-based business management platform designed for **Sri Lankan hardware stores**, multi-branch operations, warehouses, and distributors.

This document includes:
- All original features
- Missing Sri Lanka-specific features
- Phased development roadmap
- Offline & language support
- SVAT & credit management

---

# 1. Dashboard Module

## Features

- Daily sales summary
- Monthly sales overview
- Cash in hand
- Credit sales tracking
- Outstanding payments
- Low stock alerts
- Fast moving items
- Branch-wise performance
- Purchase summary
- Expense summary
- WhatsApp order notifications
- **Daily cash drawer opening/closing status (new)**
- **Cheque bounce alerts (new)**

---

# 2. Product & Inventory Management

## Product Master

- Product code
- Barcode support
- Product categories
- Brand management
- Unit management (pieces, kg, tons, cubic feet, meters)
- Product images
- Multiple selling prices
- Minimum stock levels
- Reorder level alerts
- **Expiry date tracking for paints, chemicals, batteries (new)**
- **Decimal quantity support (e.g., 2.5 meters) (new)**

## Multiple Supplier Handling

- Supplier-wise pricing
- Purchase history
- Last purchase price
- Supplier comparison
- Preferred supplier settings
- **Supplier credit period & overdue penalty tracking (new)**

## Inventory Features

- Stock in/out management
- Damaged stock handling
- Returned stock management
- Batch tracking
- Serial number tracking
- Barcode printing
- Barcode scanning
- Real-time stock updates
- **Empty cement bag return tracking (new)**
- **Tool/equipment rental tracking (new)**

---

# 3. Multi-Branch & Warehouse Management

- Branch-wise stock management
- Warehouse transfers
- Inter-branch stock transfers
- Separate branch cashiers
- Branch-level permissions
- Centralized administration
- Branch-wise reporting

---

# 4. Purchase Management

- Purchase Orders (PO)
- Goods Received Notes (GRN)
- Supplier invoice management
- Partial receiving
- Purchase returns
- Supplier payment tracking
- Credit purchase handling
- Due date reminders
- Supplier ledger management
- **GRN vs Supplier Invoice matching (new)**
- **SVAT purchase tracking (new)**

---

# 5. Sales & Billing Module

## Supported Payment Types

- Cash
- Credit
- Bank Transfer
- Lanka QR
- Card Payments
- Mixed Payments
- **Cheque (with bounce tracking) (new)**

## Features

- POS billing system
- Fast checkout interface
- Barcode billing
- Discount handling
- Tax and VAT handling
- Invoice printing
- Digital invoice sharing
- WhatsApp invoice sending
- Refund and return management
- **Labour charge addition (new)**
- **Transport charge addition (new)**
- **Partial quantity billing (e.g., 2.5 bags) (new)**
- **SVAT invoice generation (new)**

---

# 6. Customer Management (CRM)

- Customer profiles
- Credit balance tracking
- Purchase history
- Loyalty management
- Customer pricing levels
- WhatsApp communication
- SMS notifications
- Promotional messaging
- **Credit limit per customer (new)**
- **Customer credit approval workflow (manager approval) (new)**
- **Promissory note / IOU tracking (new)**
- **Interest calculation on overdue credit (new)**
- **Legal reminder letter generation (new)**

---

# 7. Quotation & Estimate Module

- Create quotations
- Convert quotation to invoice
- Material estimation
- Approval workflows
- Validity period settings
- PDF quotation generation
- WhatsApp quotation sharing

---

# 8. WhatsApp Order Management

- Receive customer orders via WhatsApp
- Manual order creation from WhatsApp messages (Phase 1)
- WhatsApp Business API integration (Phase 2)
- Quotation sharing
- Delivery updates
- Payment confirmation notifications

## Integration Options

- WhatsApp Business App (free, manual)
- WhatsApp Business API (paid, automated)

---

# 9. Accounting & Ledger Module

## Ledger Management

- Customer ledger
- Supplier ledger
- Cash ledger
- Bank ledger
- Expense ledger

## Accounting Features

- Journal entries
- Trial balance
- Profit & Loss
- Balance sheet
- Cashbook
- Petty cash management
- Expense tracking
- Bank reconciliation
- **Cheque deposit & bounce reconciliation (new)**

---

# 10. Reports Module

## Sales Reports

- Daily sales reports
- Monthly sales reports
- Product-wise sales
- Branch-wise sales
- Sales by payment method
- Salesperson performance

## Inventory Reports

- Current stock report
- Low stock report
- Dead stock report
- Fast moving items
- Stock valuation
- **Expiry date report (new)**

## Financial Reports

- Profit reports
- Expense reports
- Outstanding reports
- Credit collection reports
- **SVAT report for IRD filing (new)**
- **Aged credit customer report (new)**

---

# 11. Reminder & Notification System

- Customer payment reminders
- Supplier due reminders
- Low stock alerts
- Order follow-up reminders
- WhatsApp reminders
- SMS notifications (Dialog/Mobitel API)
- Email notifications
- **Credit limit exceeded alert (new)**
- **Cheque bounce notification (new)**

---

# 12. User & Role Management

## User Roles

- Super Admin
- Owner
- Branch Manager
- Cashier
- Store Keeper
- Accountant
- Sales Executive

## Features

- Permission management
- Activity logs
- Login history
- User tracking
- Role-based access control

---

# 13. Delivery & Logistics Module

- Delivery order management
- Delivery tracking
- Driver management
- Vehicle management
- Delivery confirmations
- GPS tracking support (Phase 3)

---

# 14. Offline & PWA Support (Sri Lanka Critical)

## Features

- Offline-first mode using local browser storage
- Automatic sync when internet returns
- Progressive Web App (PWA) for mobile/tablet
- Works during power cuts (if device has battery)
- **No internet? Continue billing and sync later (new)**

---

# 15. Multi-Language Support (Sri Lanka)

## Languages

- English
- Sinhala (full UI + invoices)
- Tamil (full UI + invoices)

## Features

- Language toggle on login/settings
- Invoices in Sinhala/Tamil for customers

---

# 16. E-Commerce Integration (Future Expansion)

- Online ordering portal
- Mobile application
- Customer portal
- Online payment support
- Live inventory display

---

# 17. Technical Architecture (Sri Lanka Optimized)

## Frontend Technologies

- React.js
- Next.js
- Tailwind CSS
- PWA support

## Backend Technologies (Recommended)

- Laravel (PHP) — easier local support
- Node.js (alternative)

## Database

- MySQL (preferred)
- PostgreSQL (optional)

## Hosting Strategy

- Local server in main branch + automatic cloud backup
- Or cloud-only (if internet is stable)

---

# 18. Sri Lanka Payment & Service Integrations

## Payment Integrations

- Lanka QR
- PayHere
- MintPay
- Dialog Genie

## SMS Integrations

- Dialog SMS API
- Mobitel SMS API

## Tax Support

- Sri Lanka VAT (regular)
- Sri Lanka SVAT (Suspended VAT)
- SVAT invoice & reconciliation report
- Tax invoice handling

---

# 19. Advanced Features (Phase 3)

## AI Features

- Sales forecasting
- Demand prediction
- Smart reorder suggestions

## Analytics

- KPI dashboards
- Profit margin analysis
- Branch performance analytics

## Security

- Daily backups
- Two-factor authentication
- IP restrictions
- Data encryption

---

# 20. Mobile Responsive Support

- Desktop
- Tablet
- Mobile browser (PWA)

Optional later:
- Android application
- iOS application

---

# 21. Hardware Industry Special Features (Sri Lanka)

- Color mixing management
- Cutting size management (timber, pipes, metal)
- Weight scale integration
- Printer integration
- **Unit conversion (kg to tons, pieces to dozens, etc.) (new)**
- **Cement bag return deposit tracking (new)**
- **Tool rental with deposit & late fee (new)**

---

# 22. Full Phased Development Roadmap

## Phase 1 — MVP (Month 1–4)

**Goal:** Single branch, online only, basic hardware POS

- Dashboard (basic)
- Sales + POS (cash/credit)
- Inventory (low stock alerts)
- Customer & Supplier ledger
- Purchase orders (basic)
- Quotations
- Basic reports (sales, stock, profit)
- Invoice print + WhatsApp share
- **SVAT invoice support**
- **Multi-language UI (English/Sinhala/Tamil)**

---

## Phase 2 — Core Sri Lanka Features (Month 5–7)

- Multi-branch stock management
- Inter-branch stock transfer
- Purchase returns & GRN
- Supplier credit period & penalty
- Customer credit limit + approval workflow
- Cheque handling & bounce tracking
- **Offline mode + PWA**
- WhatsApp Business API integration
- SMS reminders (Dialog/Mobitel)
- Expiry date tracking & alerts

---

## Phase 3 — Advanced & Automation (Month 8–10)

- Delivery & logistics module
- Driver & vehicle tracking
- Tool rental management
- Cement bag return tracking
- Advanced accounting (P&L, balance sheet)
- Aged credit customer report
- AI-based reorder suggestions
- Sales forecasting

---

## Phase 4 — Expansion & Ecosystem (Month 11–12)

- Mobile apps (Android & iOS)
- Customer portal (view credit, payments)
- E-commerce website integration
- Supplier portal
- Bank reconciliation API
- Accounting software export (e.g., to QuickBooks)

---

# 23. Suggested ERP Menu Structure

1. Dashboard
2. Sales (POS)
3. Purchases
4. Inventory
5. Customers
6. Suppliers
7. Quotations
8. Accounts
9. Reports
10. Branches
11. WhatsApp Orders
12. Settings

---

# 24. Success Factors for Sri Lanka Hardware Shops

- ✅ Offline mode is **not optional**
- ✅ Sinhala/Tamil UI is **critical**
- ✅ SVAT support is **mandatory** for B2B
- ✅ Credit customer management must be strict
- ✅ Cashier training & simple UI = adoption
- ✅ Start with 1 branch, prove, then expand

---

# 25. Estimated Development Cost (Sri Lanka, LKR)

| Phase | Estimated Cost |
|---|---|
| Phase 1 (MVP) | 1.5M – 2.5M LKR |
| Phase 2 | 1M – 1.5M LKR |
| Phase 3 | 800k – 1.2M LKR |
| Phase 4 | 1M – 1.5M LKR |
| **Total** | **4.3M – 6.7M LKR** |

Monthly maintenance after Phase 1: 30k – 60k LKR

---

# 26. Backup & Disaster Recovery Strategy

## Supabase Database Backup (Recommended)

Use Supabase's built-in database backup:

```bash
pg_dump --dbname=postgresql://postgres:[PASSWORD]@db.maltdmkjsrnnvwtnblvr.supabase.co:5432/postgres > backup.sql
```

Or from the Supabase dashboard: **Database → Backups → Download Backup**.

---

## Excel/CSV Backup Files (Manual Export)

If Supabase data is lost, the following CSV exports are needed for a full restore. Listed in restore dependency order.

### Tier 1 — Reference Data (restore first, no dependencies)

| File | Tables |
|---|---|
| `categories.csv` | categories |
| `brands.csv` | brands |
| `units.csv` | units |
| `branches.csv` | branches |
| `expense_categories.csv` | expense_categories |
| `profiles.csv` | profiles (users + roles) |
| `company_settings.csv` | company_settings |
| `drivers.csv`, `vehicles.csv` | drivers, vehicles |

### Tier 2 — Master Data (depends on Tier 1)

| File | Tables |
|---|---|
| `products.csv` | products |
| `customers.csv` | customers |
| `suppliers.csv` | suppliers |

### Tier 3 — Transactions (depends on Tier 2)

| File | Tables |
|---|---|
| `sales.csv` + `sale_items.csv` | sales + sale_items |
| `purchase_orders.csv` + `purchase_items.csv` | purchase_orders + purchase_items |
| `goods_received_notes.csv` | goods_received_notes |
| `purchase_returns.csv` + `purchase_return_items.csv` | purchase_returns + purchase_return_items |
| `stock_movements.csv` | stock_movements |
| `stock_transfers.csv` + `stock_transfer_items.csv` | stock_transfers + stock_transfer_items |
| `quotations.csv` + `quotation_items.csv` | quotations + quotation_items |
| `branch_stock.csv` | branch_stock |
| `deliveries.csv` + `delivery_items.csv` | deliveries + delivery_items |
| `rentals.csv` + `rental_items.csv` | rentals + rental_items |
| `ledger_entries.csv` | ledger_entries |

### Most Critical Files for Offline Backup

If you only keep a few files for emergency records:
- `products.csv` — inventory master list
- `customers.csv` — customer records + credit balances
- `suppliers.csv` — supplier records
- `sales.csv` + `sale_items.csv` — all invoices
- `ledger_entries.csv` — the financial spine (cannot reconstruct from other tables)
- `stock_movements.csv` — inventory audit trail

Export these from Supabase Table Editor: click **Export → Download as CSV** for each table.

---

# 27. Recommended SaaS Pricing for Sri Lanka

| Plan | Price per month (per branch) |
|---|---|
| Basic (Phase 1) | 9,900 LKR |
| Professional (Phase 2) | 19,900 LKR |
| Enterprise (Phase 3–4) | 34,900 LKR |

---

# Conclusion

This **single MD file** now contains:

- Original requirements
- Sri Lanka market realities
- Missing features (SVAT, offline, credit limits, cheques, language)
- Full 4-phase roadmap
- Cost estimates
- SaaS pricing

You can hand this **directly to a development team** without explaining anything twice.

---

**End of Document**