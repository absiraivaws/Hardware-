-- Add overdue penalty rate to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS overdue_penalty_rate DECIMAL(5,2) DEFAULT 0;

-- Add payment due date to purchase orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_due_date DATE;
