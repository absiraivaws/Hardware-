-- Add serial_no column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS serial_no TEXT;

-- Backfill existing products with sequential 6-digit serial numbers
UPDATE products
SET serial_no = LPAD(seq::TEXT, 6, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM products
) sub
WHERE products.id = sub.id
  AND products.serial_no IS NULL;

-- Make serial_no NOT NULL after backfill
ALTER TABLE products ALTER COLUMN serial_no SET NOT NULL;

-- Add unique constraint on serial_no
ALTER TABLE products ADD CONSTRAINT products_serial_no_key UNIQUE (serial_no);
