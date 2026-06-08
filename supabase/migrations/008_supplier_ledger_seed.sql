-- Seed supplier ledger entries based on purchase orders
-- supplier ledger: debit = what we owe, credit = what we've paid, balance = credit - debit

-- Tokyo Cement: PO-20260601-00001 completed
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'purchase', 'debit', 250000.00, 'PO PO-20260601-00001', 250000.00, NOW() - INTERVAL '10 days'
FROM suppliers s WHERE s.name = 'Tokyo Cement Company Lanka PLC';

INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'payment', 'credit', 245000.00, 'Payment for PO-20260601-00001', 5000.00, NOW() - INTERVAL '3 days'
FROM suppliers s WHERE s.name = 'Tokyo Cement Company Lanka PLC';

-- JAT Holdings: PO-20260601-00002 partial
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'purchase', 'debit', 140000.00, 'PO PO-20260601-00002', 140000.00, NOW() - INTERVAL '5 days'
FROM suppliers s WHERE s.name = 'JAT Holdings PLC';

INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'payment', 'credit', 80000.00, 'Partial payment PO-20260601-00002', 60000.00, NOW() - INTERVAL '2 days'
FROM suppliers s WHERE s.name = 'JAT Holdings PLC';

-- Anchor Steel: PO-20260601-00003 pending
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'purchase', 'debit', 77500.00, 'PO PO-20260601-00003', 77500.00, NOW()
FROM suppliers s WHERE s.name = 'Anchor Steel Corporation';

-- Anchor Steel: PO-20260601-00005 pending
INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
SELECT 'supplier', s.id, 'purchase', 'debit', 45000.00, 'PO PO-20260601-00005', 45000.00, NOW()
FROM suppliers s WHERE s.name = 'Anchor Steel Corporation';
