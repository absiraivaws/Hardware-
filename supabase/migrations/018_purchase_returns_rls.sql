-- Enable RLS on purchase_returns and purchase_return_items
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Purchase returns policies
DROP POLICY IF EXISTS "Authenticated users can read purchase_returns" ON purchase_returns;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_returns" ON purchase_returns;
DROP POLICY IF EXISTS "Authenticated users can update purchase_returns" ON purchase_returns;
CREATE POLICY "Authenticated users can read purchase_returns" ON purchase_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase_returns" ON purchase_returns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase_returns" ON purchase_returns FOR UPDATE TO authenticated USING (true);

-- Purchase return items policies
DROP POLICY IF EXISTS "Authenticated users can read purchase_return_items" ON purchase_return_items;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_return_items" ON purchase_return_items;
DROP POLICY IF EXISTS "Authenticated users can update purchase_return_items" ON purchase_return_items;
CREATE POLICY "Authenticated users can read purchase_return_items" ON purchase_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert purchase_return_items" ON purchase_return_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update purchase_return_items" ON purchase_return_items FOR UPDATE TO authenticated USING (true);
