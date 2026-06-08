-- HardPro ERP - RLS Policies for all tables
-- Run via: supabase db push

-- Branches
DROP POLICY IF EXISTS "Authenticated users can read branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can insert branches" ON branches;
DROP POLICY IF EXISTS "Authenticated users can update branches" ON branches;
CREATE POLICY "Authenticated users can read branches" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert branches" ON branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update branches" ON branches FOR UPDATE TO authenticated USING (true);

-- Categories
DROP POLICY IF EXISTS "Authenticated users can read categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
CREATE POLICY "Authenticated users can read categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON categories FOR UPDATE TO authenticated USING (true);

-- Brands
DROP POLICY IF EXISTS "Authenticated users can read brands" ON brands;
DROP POLICY IF EXISTS "Authenticated users can insert brands" ON brands;
DROP POLICY IF EXISTS "Authenticated users can update brands" ON brands;
CREATE POLICY "Authenticated users can read brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert brands" ON brands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update brands" ON brands FOR UPDATE TO authenticated USING (true);

-- Units
DROP POLICY IF EXISTS "Authenticated users can read units" ON units;
DROP POLICY IF EXISTS "Authenticated users can insert units" ON units;
DROP POLICY IF EXISTS "Authenticated users can update units" ON units;
CREATE POLICY "Authenticated users can read units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert units" ON units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update units" ON units FOR UPDATE TO authenticated USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
CREATE POLICY "Authenticated users can read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON customers FOR UPDATE TO authenticated USING (true);

-- Suppliers
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON suppliers;
CREATE POLICY "Authenticated users can read suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON suppliers FOR UPDATE TO authenticated USING (true);

-- Sales
DROP POLICY IF EXISTS "Authenticated users can read sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON sales;
CREATE POLICY "Authenticated users can read sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales" ON sales FOR UPDATE TO authenticated USING (true);

-- Sale Items
DROP POLICY IF EXISTS "Authenticated users can read sale_items" ON sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale_items" ON sale_items;
CREATE POLICY "Authenticated users can read sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sale_items" ON sale_items FOR UPDATE TO authenticated USING (true);

-- Purchase Orders
DROP POLICY IF EXISTS "Authenticated users can read purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can update purchase_orders" ON purchase_orders;
CREATE POLICY "Authenticated users can read purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (true);

-- Purchase Items
DROP POLICY IF EXISTS "Authenticated users can read purchase_items" ON purchase_items;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_items" ON purchase_items;
DROP POLICY IF EXISTS "Authenticated users can update purchase_items" ON purchase_items;
CREATE POLICY "Authenticated users can read purchase_items" ON purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase_items" ON purchase_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase_items" ON purchase_items FOR UPDATE TO authenticated USING (true);

-- Goods Received Notes
DROP POLICY IF EXISTS "Authenticated users can read goods_received_notes" ON goods_received_notes;
DROP POLICY IF EXISTS "Authenticated users can insert goods_received_notes" ON goods_received_notes;
DROP POLICY IF EXISTS "Authenticated users can update goods_received_notes" ON goods_received_notes;
CREATE POLICY "Authenticated users can read goods_received_notes" ON goods_received_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert goods_received_notes" ON goods_received_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update goods_received_notes" ON goods_received_notes FOR UPDATE TO authenticated USING (true);

-- Quotations
DROP POLICY IF EXISTS "Authenticated users can read quotations" ON quotations;
DROP POLICY IF EXISTS "Authenticated users can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON quotations;
CREATE POLICY "Authenticated users can read quotations" ON quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotations" ON quotations FOR UPDATE TO authenticated USING (true);

-- Quotation Items
DROP POLICY IF EXISTS "Authenticated users can read quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Authenticated users can insert quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "Authenticated users can update quotation_items" ON quotation_items;
CREATE POLICY "Authenticated users can read quotation_items" ON quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotation_items" ON quotation_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotation_items" ON quotation_items FOR UPDATE TO authenticated USING (true);

-- Stock Movements
DROP POLICY IF EXISTS "Authenticated users can read stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can update stock_movements" ON stock_movements;
CREATE POLICY "Authenticated users can read stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stock_movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stock_movements" ON stock_movements FOR UPDATE TO authenticated USING (true);

-- Ledger Entries
DROP POLICY IF EXISTS "Authenticated users can read ledger_entries" ON ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can insert ledger_entries" ON ledger_entries;
DROP POLICY IF EXISTS "Authenticated users can update ledger_entries" ON ledger_entries;
CREATE POLICY "Authenticated users can read ledger_entries" ON ledger_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ledger_entries" ON ledger_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ledger_entries" ON ledger_entries FOR UPDATE TO authenticated USING (true);
