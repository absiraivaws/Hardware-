-- Custom expense/income categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expense_categories"
  ON expense_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert expense_categories"
  ON expense_categories FOR INSERT TO authenticated WITH CHECK (true);
