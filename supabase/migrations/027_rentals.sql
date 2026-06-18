-- Phase 3: Tool Rental & Cement Bag Deposit Tracking

CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_no TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  rental_type TEXT NOT NULL CHECK (rental_type IN ('tool', 'cement_bag')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE NOT NULL,
  actual_return_date DATE,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  total_fee NUMERIC NOT NULL DEFAULT 0,
  late_fee NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rentals"
  ON rentals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rentals"
  ON rentals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rentals"
  ON rentals FOR UPDATE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS rental_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  deposit NUMERIC NOT NULL DEFAULT 0,
  returned_quantity NUMERIC NOT NULL DEFAULT 0,
  damage_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rental_items"
  ON rental_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rental_items"
  ON rental_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rental_items"
  ON rental_items FOR UPDATE TO authenticated USING (true);
