-- Backfill initial stock movements for existing products
-- that don't have any stock movements yet
INSERT INTO stock_movements (product_id, type, quantity, unit_price, reference_type, notes, created_at)
SELECT
  p.id,
  'in',
  p.current_stock,
  p.cost_price,
  'starting_stock',
  'Opening stock: ' || p.current_stock || ' units',
  p.created_at
FROM products p
WHERE p.current_stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements sm WHERE sm.product_id = p.id
  );

-- Helper function to atomically increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(p_product_id UUID, p_qty DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE products SET current_stock = current_stock + p_qty WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to atomically decrement product stock
CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id UUID, p_qty DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE products SET current_stock = current_stock - p_qty WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
