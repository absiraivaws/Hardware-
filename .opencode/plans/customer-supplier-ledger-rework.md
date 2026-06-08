# Customer & Supplier Ledger Rework

## Goal
- Auto-load ledger entries from URL param (no dropdown re-selection)
- Add A-Z / Z-A column sorting
- Add total debit/credit/net balance summary

## Files to modify

### 1. Translation keys

#### `src/messages/en.json`
- `customers` section: add `total_debit`, `total_credit`, `net_balance`
- `suppliers` section: add `total_debit`, `total_credit`, `net_balance`

#### `src/messages/si.json`
- Same keys in Sinhala: මුළු හර, මුළු ණය, ශුද්ධ ශේෂය

#### `src/messages/ta.json`
- Same keys in Tamil: மொத்த பற்று, மொத்த வரவு, நிகர இருப்பு

### 2. Customer Ledger (`src/app/[locale]/(dashboard)/customers/ledger/page.tsx`)

**New imports:**
- `useSearchParams` from `next/navigation`
- `useMemo` from `react`
- `ArrowUpDown, ArrowUp, ArrowDown` from `lucide-react`

**Auto-load from URL:**
- Read `customer_id` from `useSearchParams()` on mount
- If param present → auto-set `selectedId` → triggers fetch
- Keep dropdown as fallback but pre-populated

**UI changes:**
- Heading: `"Customer Ledger — {customerName}"` (find name from customers array)
- Sortable `<th>` with click handler to toggle asc/desc, show sort icon
- Sortable columns: Date (`created_at`), Description (`description`), Debit (`amount`), Credit (`amount`)
- Balance column NOT sortable (running balance is order-dependent)

**Sorting logic (useMemo):**
```
sorted = [...entries].sort((a, b) => {
  let valA, valB
  if (key === "created_at") compare dates
  if (key === "description") compare strings
  if (key === "debit") valA = a.entry_type === "debit" ? a.amount : 0
  if (key === "credit") valA = a.entry_type === "credit" ? a.amount : 0
  return sortDir === "asc" ? compare(valA, valB) : compare(valB, valA)
})
```

**Totals summary (below table):**
```
compute: totalDebit (sum of debit amounts)
         totalCredit (sum of credit amounts)
         netBalance = totalDebit - totalCredit
display: in a styled tfoot or div
```

### 3. Supplier Ledger (`src/app/[locale]/(dashboard)/suppliers/ledger/page.tsx`)

Same pattern as customer, but:
- Reads `supplier_id` from URL
- Net Balance = **Total Credit − Total Debit**
- Supplier name in heading

## Verification
- `npm run build` passes
- Navigate from customer list (Eye icon) → ledger auto-loads transactions
- Click column headers → sorts A-Z / Z-A with visual indicator
- Totals row shows correct values
