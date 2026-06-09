-- Backfill cash/bank ledger entries from seed sales data
-- Cash payments route to 'cash' ledger, all others to 'bank' ledger

DO $$
DECLARE
  sale_record RECORD;
  ltype ledger_type;
  running_balance_cash NUMERIC := 0;
  running_balance_bank NUMERIC := 0;
BEGIN
  FOR sale_record IN
    SELECT * FROM sales WHERE amount_paid > 0 ORDER BY created_at ASC
  LOOP
    IF sale_record.payment_type = 'cash' THEN
      ltype := 'cash'::ledger_type;
    ELSE
      ltype := 'bank'::ledger_type;
    END IF;

    IF ltype = 'cash' THEN
      running_balance_cash := running_balance_cash + sale_record.amount_paid;
    ELSE
      running_balance_bank := running_balance_bank + sale_record.amount_paid;
    END IF;

    INSERT INTO ledger_entries (ledger_type, reference_id, reference_type, entry_type, amount, description, balance_after, created_at)
    VALUES (
      ltype,
      sale_record.id,
      'sale',
      'debit'::entry_type,
      sale_record.amount_paid,
      'Sale ' || sale_record.invoice_no,
      CASE WHEN ltype = 'cash' THEN running_balance_cash ELSE running_balance_bank END,
      sale_record.created_at
    );
  END LOOP;
END;
$$;
