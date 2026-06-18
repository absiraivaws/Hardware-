-- Create purchase_returns table
CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_no TEXT NOT NULL UNIQUE,
  po_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES profiles(id),
  reason TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_return_items table
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
