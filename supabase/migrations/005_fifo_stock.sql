-- Add unit_price column to stock_movements for FIFO costing
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2);
