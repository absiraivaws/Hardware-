-- Add unit_price column for FIFO costing
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2);

-- Create helper RPC functions
CREATE OR REPLACE FUNCTION increment_product_stock(p_product_id UUID, p_qty DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE products SET current_stock = current_stock + p_qty WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_qty DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE products SET current_stock = current_stock - p_qty WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete existing starting_stock movements (to start fresh)
DELETE FROM stock_movements WHERE reference_type = 'starting_stock';

-- Insert starting_stock for ALL products: qty=100, unit_price=150.00
INSERT INTO stock_movements (product_id, type, quantity, unit_price, reference_type, notes, created_at)
SELECT
  p.id,
  'in',
  100,
  150.00,
  'starting_stock',
  'Opening stock: 100 units',
  p.created_at
FROM products p;

-- Update all products: cost_price = 150.00, current_stock = 100
UPDATE products SET cost_price = 150.00, current_stock = 100;
