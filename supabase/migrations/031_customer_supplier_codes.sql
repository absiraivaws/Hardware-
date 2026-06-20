ALTER TABLE customers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code TEXT;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM customers WHERE code IS NULL
)
UPDATE customers SET code = CONCAT('CUST-', LPAD(numbered.rn::TEXT, 4, '0'))
FROM numbered WHERE customers.id = numbered.id AND customers.code IS NULL;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM suppliers WHERE code IS NULL
)
UPDATE suppliers SET code = CONCAT('SUPP-', LPAD(numbered.rn::TEXT, 4, '0'))
FROM numbered WHERE suppliers.id = numbered.id AND suppliers.code IS NULL;

ALTER TABLE customers ALTER COLUMN code SET NOT NULL;
ALTER TABLE suppliers ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS customers_code_idx ON customers(code);
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_code_idx ON suppliers(code);
