-- HardPro ERP - Full Schema + Seed Data (Idempotent)
-- Run via: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create types idempotently
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'branch_manager', 'cashier', 'store_keeper', 'accountant', 'sales_executive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'damaged', 'return', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ledger_type AS ENUM ('customer', 'supplier', 'cash', 'bank', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entry_type AS ENUM ('debit', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'cashier',
  branch_id UUID REFERENCES branches(id),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_decimal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  barcode TEXT,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  unit_id UUID REFERENCES units(id),
  cost_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  wholesale_price DECIMAL(12,2),
  min_stock DECIMAL(12,3) DEFAULT 0,
  current_stock DECIMAL(12,3) DEFAULT 0,
  image_url TEXT,
  has_expiry BOOLEAN DEFAULT FALSE,
  is_decimal_qty BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  credit_balance DECIMAL(12,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'blocked')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_period INTEGER DEFAULT 30,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  labour_charge DECIMAL(12,2) DEFAULT 0,
  transport_charge DECIMAL(12,2) DEFAULT 0,
  tax_type TEXT CHECK (tax_type IN ('svat', 'non_vat')) DEFAULT 'non_vat',
  tax_amount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  payment_type TEXT CHECK (payment_type IN ('cash', 'credit', 'bank_transfer', 'lanka_qr', 'card', 'mixed', 'cheque')),
  amount_paid DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('completed', 'pending', 'cancelled')) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_no TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')) DEFAULT 'pending',
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  received_qty DECIMAL(12,3) DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_received_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_no TEXT NOT NULL UNIQUE,
  po_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  q_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  valid_until DATE,
  status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'converted')) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  type stock_movement_type NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ledger_type ledger_type NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  entry_type entry_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (IF NOT EXISTS for PG < 9.5)
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_po ON purchase_items(po_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON ledger_entries(ledger_type);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference_id);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent - drop and recreate)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Authenticated users can read products" ON products;
  DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
  DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
END $$;

CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated users can read products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON products FOR UPDATE TO authenticated USING (true);

-- Seed / Refresh data
DELETE FROM stock_movements;
DELETE FROM ledger_entries;
DELETE FROM quotation_items;
DELETE FROM quotations;
DELETE FROM purchase_items;
DELETE FROM goods_received_notes;
DELETE FROM purchase_orders;
DELETE FROM sale_items;
DELETE FROM sales;
DELETE FROM products;
DELETE FROM brands;
DELETE FROM customers;
DELETE FROM suppliers;
DELETE FROM categories;
DELETE FROM units;
DELETE FROM branches;

-- Branches
INSERT INTO branches (name, code, is_main) VALUES ('Main Branch', 'MAIN', true);

-- Units
INSERT INTO units (name, symbol, is_decimal) VALUES
  ('Pieces', 'pcs', false), ('Kilograms', 'kg', true), ('Tons', 't', true),
  ('Cubic Feet', 'ft³', true), ('Meters', 'm', true), ('Liters', 'L', true),
  ('Bags', 'bags', true), ('Dozens', 'doz', false);

-- Categories
INSERT INTO categories (name, description) VALUES
  ('Cement & Bricks', 'Cement, bricks, blocks'),
  ('Steel & Metal', 'Steel bars, pipes, sheets'),
  ('Paint & Chemicals', 'Paint, thinner, chemicals'),
  ('Timber & Plywood', 'Wood, plywood, boards'),
  ('Plumbing', 'Pipes, fittings, taps'),
  ('Electrical', 'Wires, switches, lights'),
  ('Tools & Hardware', 'Hand tools, power tools'),
  ('Sanitary', 'Basins, toilets, tiles'),
  ('Roofing', 'Roofing sheets, accessories'),
  ('Glass & Mirrors', 'Glass sheets, mirrors, frames');

-- Brands
INSERT INTO brands (name) VALUES
  ('Tokyo Cement'), ('Lanka Tiles'), ('Alumex'), ('Kebonix'),
  ('JAT Holdings'), ('Anchor'), ('Hayleys'), ('Singer'),
  ('RIEL Lanka'), ('Dankotuwa');

-- Products
INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'CEM-001', 'Tokyo Super Cement 50kg', '4791156000124', c.id, b.id, u.id, 1250.00, 1400.00, 1350.00, 50, 170, true, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Cement & Bricks' AND b.name='Tokyo Cement' AND u.symbol='bags';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'CEM-002', 'Lanka Cement 50kg (Rajarata)', '4791156000131', c.id, b.id, u.id, 1200.00, 1350.00, 1300.00, 50, 0, true, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Cement & Bricks' AND b.name='Tokyo Cement' AND u.symbol='bags';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'STL-001', '10mm Steel Bar (Anchor)', '4791156000148', c.id, b.id, u.id, 155.00, 185.00, 175.00, 100, 380, false, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Steel & Metal' AND b.name='Anchor' AND u.symbol='kg';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'STL-002', '16mm Steel Bar (Anchor)', '4791156000155', c.id, b.id, u.id, 160.00, 190.00, 180.00, 80, 350, false, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Steel & Metal' AND b.name='Anchor' AND u.symbol='kg';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'PNT-001', 'JAT Emulsion Paint White 4L', '4791156000162', c.id, b.id, u.id, 2800.00, 3500.00, 3300.00, 20, 43, true, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Paint & Chemicals' AND b.name='JAT Holdings' AND u.symbol='L';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'PNT-002', 'JAT Emulsion Paint Blue 4L', '4791156000179', c.id, b.id, u.id, 2800.00, 3500.00, 3300.00, 15, 3, true, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Paint & Chemicals' AND b.name='JAT Holdings' AND u.symbol='L';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'PLB-001', 'PVC Pipe 1/2" 6m (Kebonix)', '4791156000186', c.id, b.id, u.id, 250.00, 350.00, 320.00, 30, 118, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Plumbing' AND b.name='Kebonix' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'PLB-002', 'PVC Pipe 1" 6m (Kebonix)', '4791156000193', c.id, b.id, u.id, 380.00, 520.00, 480.00, 25, 85, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Plumbing' AND b.name='Kebonix' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'ELC-001', '1.5mm Electrical Wire 100m (RIEL)', '4791156000209', c.id, b.id, u.id, 4500.00, 5800.00, 5500.00, 10, 22, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Electrical' AND b.name='RIEL Lanka' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'ELC-002', '2.5mm Electrical Wire 100m (RIEL)', '4791156000216', c.id, b.id, u.id, 6200.00, 7800.00, 7400.00, 10, 0, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Electrical' AND b.name='RIEL Lanka' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'TL-001', 'Ceramic Floor Tile 60x60 (Lanka Tiles)', '4791156000223', c.id, b.id, u.id, 850.00, 1100.00, 1050.00, 40, 180, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Sanitary' AND b.name='Lanka Tiles' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'TL-002', 'Ceramic Wall Tile 30x60 (Lanka Tiles)', '4791156000230', c.id, b.id, u.id, 420.00, 580.00, 540.00, 50, 220, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Sanitary' AND b.name='Lanka Tiles' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'TMB-001', 'Plywood Sheet 8x4 12mm (Hayleys)', '4791156000247', c.id, b.id, u.id, 3200.00, 4200.00, 3900.00, 15, 28, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Timber & Plywood' AND b.name='Hayleys' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'TMB-002', 'Plywood Sheet 8x4 6mm (Hayleys)', '4791156000254', c.id, b.id, u.id, 2100.00, 2800.00, 2600.00, 20, 35, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Timber & Plywood' AND b.name='Hayleys' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'HDW-001', 'Stanley Hammer 500g', '4791156000261', c.id, b.id, u.id, 650.00, 890.00, 820.00, 10, 11, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Tools & Hardware' AND b.name='Singer' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'HDW-002', 'Measuring Tape 5m (Stanley)', '4791156000278', c.id, b.id, u.id, 280.00, 450.00, 400.00, 15, 2, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Tools & Hardware' AND b.name='Singer' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'RF-001', 'Roofing Sheet Zinc 8ft (Alumex)', '4791156000285', c.id, b.id, u.id, 1850.00, 2400.00, 2200.00, 25, 60, false, false, 'active'
FROM categories c, brands b, units u WHERE c.name='Roofing' AND b.name='Alumex' AND u.symbol='pcs';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'PNT-003', 'Thinner 1L (JAT)', '4791156000292', c.id, b.id, u.id, 450.00, 650.00, 590.00, 30, 94, true, true, 'active'
FROM categories c, brands b, units u WHERE c.name='Paint & Chemicals' AND b.name='JAT Holdings' AND u.symbol='L';

INSERT INTO products (code, name, barcode, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, min_stock, current_stock, has_expiry, is_decimal_qty, status)
SELECT 'STL-003', 'GI Pipe 1/2" 6m (Alumex)', '4791156000308', c.id, b.id, u.id, 1200.00, 1600.00, 1500.00, 20, 0, false, false, 'inactive'
FROM categories c, brands b, units u WHERE c.name='Steel & Metal' AND b.name='Alumex' AND u.symbol='pcs';

-- Customers
INSERT INTO customers (name, phone, email, address, credit_limit, credit_balance, loyalty_points, status) VALUES
  ('Priyankara Construction (Pvt) Ltd', '077-1234567', 'priyankara@email.com', '123 Galle Road, Colombo 03', 500000.00, 185000.00, 1200, 'active'),
  ('Samarasinghe Hardware', '071-2345678', 'samar@email.com', '45 Kandy Road, Kadawatha', 250000.00, 75000.00, 800, 'active'),
  ('Lakmini Wijesinghe', '076-3456789', 'lakmini.w@email.com', '78 Temple Road, Nugegoda', 100000.00, 25000.00, 350, 'active'),
  ('Ranasinghe Builders', '072-4567890', 'ranabuild@email.com', '12 High Level Road, Maharagama', 300000.00, 0.00, 600, 'active'),
  ('Dissanayake Stores', '078-5678901', NULL, '234 Main Street, Negombo', 150000.00, 55000.00, 200, 'active'),
  ('Fernando & Sons Traders', '075-6789012', 'fernando@email.com', '56 Sea Street, Colombo 11', 200000.00, 0.00, 0, 'blocked');

-- Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, credit_period, status) VALUES
  ('Tokyo Cement Company Lanka PLC', 'Mr. Nimal Perera', '011-2345678', 'nimal@tokyocement.lk', '42 Nawara Road, Colombo 05', 30, 'active'),
  ('JAT Holdings PLC', 'Ms. Sanduni Kumari', '011-3456789', 'sanduni@jat.lk', '180 Union Place, Colombo 02', 45, 'active'),
  ('Anchor Steel Corporation', 'Mr. Sampath Rathnayake', '011-4567890', 'sampath@anchor.lk', '78 Baseline Road, Colombo 09', 60, 'active'),
  ('Lanka Tiles PLC', 'Mr. Thusitha Jayawardena', '011-5678901', 'thusitha@lankatiles.lk', '25 Industrial Zone, Ekala', 30, 'active');

-- Sales
INSERT INTO sales (invoice_no, customer_id, customer_name, branch_id, user_id, subtotal, discount, labour_charge, transport_charge, tax_type, tax_amount, grand_total, payment_type, amount_paid, balance_due, status, created_at) VALUES
  ('INV-MAIN-20260601-00001', (SELECT id FROM customers WHERE name='Priyankara Construction (Pvt) Ltd'), 'Priyankara Construction (Pvt) Ltd', (SELECT id FROM branches WHERE code='MAIN'), NULL, 46200.00, 2000.00, 1500.00, 2500.00, 'svat', 6930.00, 55130.00, 'credit', 20000.00, 35130.00, 'completed', NOW() - INTERVAL '1 hour'),
  ('INV-MAIN-20260601-00002', NULL, 'Walk-in Customer', (SELECT id FROM branches WHERE code='MAIN'), NULL, 5600.00, 0.00, 0.00, 0.00, 'non_vat', 0.00, 5600.00, 'cash', 5600.00, 0.00, 'completed', NOW() - INTERVAL '2 hours'),
  ('INV-MAIN-20260531-00003', (SELECT id FROM customers WHERE name='Samarasinghe Hardware'), 'Samarasinghe Hardware', (SELECT id FROM branches WHERE code='MAIN'), NULL, 28500.00, 1500.00, 1000.00, 2000.00, 'svat', 4275.00, 34275.00, 'credit', 15000.00, 19275.00, 'completed', NOW() - INTERVAL '1 day'),
  ('INV-MAIN-20260530-00004', NULL, 'Walk-in Customer', (SELECT id FROM branches WHERE code='MAIN'), NULL, 1250.00, 0.00, 0.00, 0.00, 'non_vat', 0.00, 1250.00, 'cash', 1250.00, 0.00, 'completed', NOW() - INTERVAL '2 days'),
  ('INV-MAIN-20260529-00005', (SELECT id FROM customers WHERE name='Lakmini Wijesinghe'), 'Lakmini Wijesinghe', (SELECT id FROM branches WHERE code='MAIN'), NULL, 10800.00, 500.00, 0.00, 500.00, 'non_vat', 0.00, 10800.00, 'card', 10800.00, 0.00, 'completed', NOW() - INTERVAL '3 days'),
  ('INV-MAIN-20260528-00006', (SELECT id FROM customers WHERE name='Dissanayake Stores'), 'Dissanayake Stores', (SELECT id FROM branches WHERE code='MAIN'), NULL, 32000.00, 1000.00, 0.00, 1500.00, 'svat', 4800.00, 37300.00, 'credit', 10000.00, 27300.00, 'completed', NOW() - INTERVAL '4 days'),
  ('INV-MAIN-20260527-00007', NULL, 'Walk-in Customer', (SELECT id FROM branches WHERE code='MAIN'), NULL, 890.00, 0.00, 0.00, 0.00, 'non_vat', 0.00, 890.00, 'cash', 890.00, 0.00, 'completed', NOW() - INTERVAL '5 days'),
  ('INV-MAIN-20260525-00008', (SELECT id FROM customers WHERE name='Priyankara Construction (Pvt) Ltd'), 'Priyankara Construction (Pvt) Ltd', (SELECT id FROM branches WHERE code='MAIN'), NULL, 78000.00, 3000.00, 2500.00, 3500.00, 'svat', 11700.00, 92700.00, 'cheque', 50000.00, 42700.00, 'pending', NOW() - INTERVAL '7 days'),
  ('INV-MAIN-20260520-00009', NULL, 'Walk-in Customer', (SELECT id FROM branches WHERE code='MAIN'), NULL, 3500.00, 0.00, 0.00, 0.00, 'non_vat', 0.00, 3500.00, 'lanka_qr', 3500.00, 0.00, 'completed', NOW() - INTERVAL '12 days'),
  ('INV-MAIN-20260515-00010', (SELECT id FROM customers WHERE name='Samarasinghe Hardware'), 'Samarasinghe Hardware', (SELECT id FROM branches WHERE code='MAIN'), NULL, 15000.00, 0.00, 0.00, 1000.00, 'non_vat', 0.00, 16000.00, 'credit', 0.00, 16000.00, 'completed', NOW() - INTERVAL '17 days'),
  ('INV-MAIN-20260510-00011', NULL, 'Walk-in Customer', (SELECT id FROM branches WHERE code='MAIN'), NULL, 4200.00, 200.00, 0.00, 0.00, 'non_vat', 0.00, 4000.00, 'cash', 4000.00, 0.00, 'completed', NOW() - INTERVAL '22 days'),
  ('INV-MAIN-20260505-00012', (SELECT id FROM customers WHERE name='Ranasinghe Builders'), 'Ranasinghe Builders', (SELECT id FROM branches WHERE code='MAIN'), NULL, 22500.00, 0.00, 0.00, 0.00, 'non_vat', 0.00, 22500.00, 'bank_transfer', 22500.00, 0.00, 'completed', NOW() - INTERVAL '27 days'),
  ('INV-MAIN-20260501-00013', (SELECT id FROM customers WHERE name='Priyankara Construction (Pvt) Ltd'), 'Priyankara Construction (Pvt) Ltd', (SELECT id FROM branches WHERE code='MAIN'), NULL, 51000.00, 1000.00, 2000.00, 3000.00, 'svat', 7650.00, 62650.00, 'mixed', 40000.00, 22650.00, 'completed', NOW() - INTERVAL '31 days');

-- Sale Items
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 30, 1400.00, 42000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00001' AND p.code='CEM-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 5, 185.00, 925.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00001' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 2, 3500.00, 7000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00001' AND p.code='PNT-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 4200.00, 4200.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00001' AND p.code='TMB-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 4, 890.00, 3560.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00002' AND p.code='HDW-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 3, 450.00, 1350.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00002' AND p.code='HDW-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 2, 350.00, 700.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260601-00002' AND p.code='PLB-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 15, 1350.00, 20250.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260531-00003' AND p.code='CEM-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 10, 580.00, 5800.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260531-00003' AND p.code='TL-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 650.00, 650.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260531-00003' AND p.code='PNT-003';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 1250.00, 1250.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260530-00004' AND p.code='PNT-003';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 2, 3500.00, 7000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260529-00005' AND p.code='PNT-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 5, 185.00, 925.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260529-00005' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 2, 350.00, 700.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260529-00005' AND p.code='PLB-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 20, 1400.00, 28000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260528-00006' AND p.code='CEM-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 10, 185.00, 1850.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260528-00006' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 3500.00, 3500.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260528-00006' AND p.code='PNT-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 890.00, 890.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260527-00007' AND p.code='HDW-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 40, 1400.00, 56000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260525-00008' AND p.code='CEM-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 100, 185.00, 18500.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260525-00008' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 1, 3500.00, 3500.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260525-00008' AND p.code='PNT-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 2, 3500.00, 7000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260520-00009' AND p.code='PNT-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 10, 450.00, 4500.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260520-00009' AND p.code='HDW-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 10, 1350.00, 13500.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260515-00010' AND p.code='CEM-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 20, 185.00, 3700.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260515-00010' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 5, 520.00, 2600.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260510-00011' AND p.code='PLB-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 3, 450.00, 1350.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260510-00011' AND p.code='HDW-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 15, 1400.00, 21000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260505-00012' AND p.code='CEM-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 3, 520.00, 1560.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260505-00012' AND p.code='PLB-002';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 25, 1400.00, 35000.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260501-00013' AND p.code='CEM-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 50, 185.00, 9250.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260501-00013' AND p.code='STL-001';
INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
SELECT s.id, p.id, p.name, 5, 350.00, 1750.00 FROM sales s, products p WHERE s.invoice_no='INV-MAIN-20260501-00013' AND p.code='PLB-001';

-- Purchase Orders
INSERT INTO purchase_orders (po_no, supplier_id, supplier_name, branch_id, user_id, subtotal, discount, grand_total, status, expected_date, created_at)
SELECT 'PO-20260601-00001', s.id, s.name, br.id, NULL, 250000.00, 5000.00, 245000.00, 'completed', NOW() + INTERVAL '7 days', NOW() - INTERVAL '10 days'
FROM suppliers s, branches br WHERE s.name='Tokyo Cement Company Lanka PLC' AND br.code='MAIN';

INSERT INTO purchase_orders (po_no, supplier_id, supplier_name, branch_id, user_id, subtotal, discount, grand_total, status, expected_date, created_at)
SELECT 'PO-20260601-00002', s.id, s.name, br.id, NULL, 140000.00, 0.00, 140000.00, 'partial', NOW() + INTERVAL '3 days', NOW() - INTERVAL '5 days'
FROM suppliers s, branches br WHERE s.name='JAT Holdings PLC' AND br.code='MAIN';

INSERT INTO purchase_orders (po_no, supplier_id, supplier_name, branch_id, user_id, subtotal, discount, grand_total, status, expected_date, created_at)
SELECT 'PO-20260601-00003', s.id, s.name, br.id, NULL, 77500.00, 2000.00, 75500.00, 'pending', NOW() + INTERVAL '14 days', NOW()
FROM suppliers s, branches br WHERE s.name='Anchor Steel Corporation' AND br.code='MAIN';

INSERT INTO purchase_orders (po_no, supplier_id, supplier_name, branch_id, user_id, subtotal, discount, grand_total, status, expected_date, created_at)
SELECT 'PO-20260601-00004', s.id, s.name, br.id, NULL, 220000.00, 10000.00, 210000.00, 'cancelled', NOW() - INTERVAL '5 days', NOW() - INTERVAL '15 days'
FROM suppliers s, branches br WHERE s.name='Lanka Tiles PLC' AND br.code='MAIN';

INSERT INTO purchase_orders (po_no, supplier_id, supplier_name, branch_id, user_id, subtotal, discount, grand_total, status, expected_date, created_at)
SELECT 'PO-20260601-00005', s.id, s.name, br.id, NULL, 45000.00, 0.00, 45000.00, 'pending', NOW() + INTERVAL '10 days', NOW()
FROM suppliers s, branches br WHERE s.name='Anchor Steel Corporation' AND br.code='MAIN';

-- Purchase Items
INSERT INTO purchase_items (po_id, product_id, product_name, quantity, received_qty, unit_price, total_price)
SELECT po.id, p.id, p.name, 200, 200, 1250.00, 250000.00 FROM purchase_orders po, products p WHERE po.po_no='PO-20260601-00001' AND p.code='CEM-001';
INSERT INTO purchase_items (po_id, product_id, product_name, quantity, received_qty, unit_price, total_price)
SELECT po.id, p.id, p.name, 50, 30, 2800.00, 140000.00 FROM purchase_orders po, products p WHERE po.po_no='PO-20260601-00002' AND p.code='PNT-001';
INSERT INTO purchase_items (po_id, product_id, product_name, quantity, received_qty, unit_price, total_price)
SELECT po.id, p.id, p.name, 500, 0, 155.00, 77500.00 FROM purchase_orders po, products p WHERE po.po_no='PO-20260601-00003' AND p.code='STL-001';
INSERT INTO purchase_items (po_id, product_id, product_name, quantity, received_qty, unit_price, total_price)
SELECT po.id, p.id, p.name, 200, 0, 1100.00, 220000.00 FROM purchase_orders po, products p WHERE po.po_no='PO-20260601-00004' AND p.code='TL-001';
INSERT INTO purchase_items (po_id, product_id, product_name, quantity, received_qty, unit_price, total_price)
SELECT po.id, p.id, p.name, 300, 0, 150.00, 45000.00 FROM purchase_orders po, products p WHERE po.po_no='PO-20260601-00005' AND p.code='STL-002';

-- GRNs
INSERT INTO goods_received_notes (grn_no, po_id, supplier_id, branch_id, user_id, notes, created_at)
SELECT 'GRN-20260601-00001', po.id, po.supplier_id, po.branch_id, NULL, 'Full delivery received - 200 bags Tokyo Cement', NOW() - INTERVAL '3 days'
FROM purchase_orders po WHERE po.po_no='PO-20260601-00001';

INSERT INTO goods_received_notes (grn_no, po_id, supplier_id, branch_id, user_id, notes, created_at)
SELECT 'GRN-20260601-00002', po.id, po.supplier_id, po.branch_id, NULL, 'Partial delivery - 30 out of 50 cans', NOW() - INTERVAL '1 day'
FROM purchase_orders po WHERE po.po_no='PO-20260601-00002';

-- Quotations
INSERT INTO quotations (q_no, customer_id, customer_name, branch_id, user_id, subtotal, discount, grand_total, valid_until, status, created_at)
SELECT 'Q-20260601-00001', c.id, c.name, br.id, NULL, 58500.00, 2000.00, 56500.00, NOW() + INTERVAL '14 days', 'sent', NOW() - INTERVAL '3 days'
FROM customers c, branches br WHERE c.name='Ranasinghe Builders' AND br.code='MAIN';

INSERT INTO quotations (q_no, customer_id, customer_name, branch_id, user_id, subtotal, discount, grand_total, valid_until, status, created_at)
SELECT 'Q-20260601-00002', c.id, c.name, br.id, NULL, 125000.00, 5000.00, 120000.00, NOW() + INTERVAL '21 days', 'draft', NOW() - INTERVAL '1 day'
FROM customers c, branches br WHERE c.name='Priyankara Construction (Pvt) Ltd' AND br.code='MAIN';

INSERT INTO quotations (q_no, customer_id, customer_name, branch_id, user_id, subtotal, discount, grand_total, valid_until, status, created_at)
SELECT 'Q-20260601-00003', c.id, c.name, br.id, NULL, 12500.00, 500.00, 12000.00, NOW() - INTERVAL '5 days', 'expired', NOW() - INTERVAL '25 days'
FROM customers c, branches br WHERE c.name='Lakmini Wijesinghe' AND br.code='MAIN';

-- Quotation Items
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 15, 2400.00, 36000.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00001' AND p.code='RF-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 30, 350.00, 10500.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00001' AND p.code='PLB-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 20, 580.00, 11600.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00001' AND p.code='TL-002';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 50, 1400.00, 70000.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00002' AND p.code='CEM-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 100, 185.00, 18500.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00002' AND p.code='STL-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 20, 2400.00, 48000.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00002' AND p.code='RF-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 5, 1850.00, 9250.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00002' AND p.code='STL-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 2, 3500.00, 7000.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00003' AND p.code='PNT-001';
INSERT INTO quotation_items (quotation_id, product_id, product_name, quantity, unit_price, total_price)
SELECT q.id, p.id, p.name, 10, 650.00, 6500.00 FROM quotations q, products p WHERE q.q_no='Q-20260601-00003' AND p.code='PNT-003';

-- Stock Movements
INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id, notes, branch_id, user_id, created_at)
SELECT p.id, 'out', -30, 'sale', s.id, 'Sale INV-MAIN-20260601-00001', (SELECT id FROM branches WHERE code='MAIN'), NULL, s.created_at FROM products p, sales s WHERE p.code='CEM-001' AND s.invoice_no='INV-MAIN-20260601-00001';
INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id, notes, branch_id, user_id, created_at)
SELECT p.id, 'out', -5, 'sale', s.id, 'Sale INV-MAIN-20260601-00001', (SELECT id FROM branches WHERE code='MAIN'), NULL, s.created_at FROM products p, sales s WHERE p.code='STL-001' AND s.invoice_no='INV-MAIN-20260601-00001';
INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id, notes, branch_id, user_id, created_at)
SELECT p.id, 'in', 200, 'purchase', po.id, 'PO PO-20260601-00001 via GRN', (SELECT id FROM branches WHERE code='MAIN'), NULL, NOW() - INTERVAL '3 days' FROM products p, purchase_orders po WHERE p.code='CEM-001' AND po.po_no='PO-20260601-00001';

-- Ledger Entries
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 35130.00, 'Sale INV-MAIN-20260601-00001', 185000.00, NOW() - INTERVAL '1 hour' FROM customers c WHERE c.name='Priyankara Construction (Pvt) Ltd';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'payment', 'credit', 20000.00, 'Payment received INV-MAIN-20260601-00001', 165000.00, NOW() FROM customers c WHERE c.name='Priyankara Construction (Pvt) Ltd';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 19275.00, 'Sale INV-MAIN-20260531-00003', 75000.00, NOW() - INTERVAL '1 day' FROM customers c WHERE c.name='Samarasinghe Hardware';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 27300.00, 'Sale INV-MAIN-20260528-00006', 55000.00, NOW() - INTERVAL '4 days' FROM customers c WHERE c.name='Dissanayake Stores';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 42700.00, 'Sale INV-MAIN-20260525-00008', 42700.00, NOW() - INTERVAL '7 days' FROM customers c WHERE c.name='Priyankara Construction (Pvt) Ltd';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 16000.00, 'Sale INV-MAIN-20260515-00010', 16000.00, NOW() - INTERVAL '17 days' FROM customers c WHERE c.name='Samarasinghe Hardware';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'payment', 'credit', 10000.00, 'Payment received INV-MAIN-20260528-00006', 47300.00, NOW() - INTERVAL '2 days' FROM customers c WHERE c.name='Dissanayake Stores';
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'customer', c.id, 'sale', 'debit', 22650.00, 'Sale INV-MAIN-20260501-00013', 22650.00, NOW() - INTERVAL '31 days' FROM customers c WHERE c.name='Priyankara Construction (Pvt) Ltd';
