-- Enable RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Stock transfers policies
DROP POLICY IF EXISTS "Authenticated users can read stock_transfers" ON stock_transfers;
DROP POLICY IF EXISTS "Authenticated users can insert stock_transfers" ON stock_transfers;
DROP POLICY IF EXISTS "Authenticated users can update stock_transfers" ON stock_transfers;
CREATE POLICY "Authenticated users can read stock_transfers" ON stock_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stock_transfers" ON stock_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update stock_transfers" ON stock_transfers FOR UPDATE TO authenticated USING (true);

-- Stock transfer items policies
DROP POLICY IF EXISTS "Authenticated users can read stock_transfer_items" ON stock_transfer_items;
DROP POLICY IF EXISTS "Authenticated users can insert stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "Authenticated users can read stock_transfer_items" ON stock_transfer_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stock_transfer_items" ON stock_transfer_items FOR INSERT TO authenticated WITH CHECK (true);
