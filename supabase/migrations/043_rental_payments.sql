CREATE TABLE IF NOT EXISTS rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rental_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rental_payments"
  ON rental_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rental_payments"
  ON rental_payments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rental_payments"
  ON rental_payments FOR UPDATE TO authenticated USING (true);
