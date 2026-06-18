-- Create branch_stock table for per-branch stock tracking
CREATE TABLE IF NOT EXISTS branch_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  current_stock DECIMAL(12,3) DEFAULT 0,
  UNIQUE(product_id, branch_id)
);

-- Backfill: distribute global stock to first active branch (Main)
INSERT INTO branch_stock (product_id, branch_id, current_stock)
SELECT p.id, b.id, p.current_stock
FROM products p
CROSS JOIN LATERAL (
  SELECT id FROM branches WHERE status = 'active' ORDER BY is_main DESC, created_at LIMIT 1
) b
ON CONFLICT (product_id, branch_id) DO NOTHING;
