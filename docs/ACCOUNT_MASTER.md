# Accounting account master (client-side demo)

Accounting contains separate Cash / Bank, Inventory Asset, Expenses and Other Liabilities groups. Names preserve the user's spelling and capitalization.

## Cash / Bank

1. petty cash BN PAN
2. petty cash DP
3. PC Merry
4. PC DAN
5. PC Herry
6. PC Doni
7. PC Lutfi
8. PC Dipa
9. PT 3636
10. NP 222999

The first eight default to petty cash; PT 3636 and NP 222999 default to bank. These types are editable assumptions. Bank name and account number are blank until supplied; number fragments in account labels are not inferred as account numbers. Currency defaults to IDR, consistent with the ERP requirements.

## Inventory Asset

Dress Fashion; Bawahan; Blouse / Atasan; APD; Gamis Anak; Gamis Dewasa; Underwear; misc.

These are inventory asset account names, separate from individual SKUs. No SKU-to-account mapping, balances, chart-of-accounts numbering, journal policy or inventory valuation mapping was invented. The existing SKU weighted-average HPP calculation is unaffected.

## Behavior and limits

Admin 1 simulation can add/edit names, types, optional bank details, notes and active status; Sales simulation is read-only. Cash/bank accounts can change type; existing bank details must be explicitly cleared before converting a bank account to petty cash. Inventory accounts remain in their original group. Names must be unique across all accounts ignoring capitalization and repeated whitespace. Records retain stable IDs and in-memory edit history. No deletion is provided.

Everything is page-session memory; reload restores the supplied 50 accounts and discards demo edits. This is not a database migration or a complete accounting ledger. Opening balances, COA codes, SKU/category links, production authorization, posting accounts, payment/transfer integration and bank reconciliation remain future work. No real banking connection, credentials, account creation at a bank, payments or financial posting is performed.

## Expenses

Fifteen main accounts and seven child accounts preserve the requested names:

- R&D
- Barang cacat/hilang
- Komisi sales
- Label Plastik Karung
- Advertising & Promotion
- Auto and Truck Expenses
  - Bensin
  - Cicilan Mobil
  - Perbaikan/Asuransi
  - Service Rutin
  - Toll & Parkir
- Bank service charges
- Business Licenses & Permits
- Depreciation expenses
- Insurance Expenses
  - General Liability Insurance
  - Health Insurance/BPJS
- Interest Expense
- Meal Entertainment & Meetings
- Office & Warehouse Supplies
- Payroll expenses
- misc expenses

Expenses is a third master-account group, with stable parent IDs and a single subaccount level. Display follows the requested order, nesting children under their parents. Searching a child includes its parent; searching a parent includes all its children. Admin 1 simulation can add/edit expenses and select an optional expense parent. Parents cannot be themselves or subaccounts, must belong to Expenses, and an account with children cannot become a child. Active children require active parents, and an active parent cannot be disabled while it has active children. Names remain globally unique after case/whitespace normalization. These are requested account labels only, not a new posting, depreciation, payroll, loan, insurance or tax policy. No balances or transactions were generated.

The Expenses group contains 22 records in addition to the cash/bank and inventory asset groups. All prior demo persistence/security limits still apply.

## Other Liabilities

Requested hierarchy (ten records):

- Loan Pinjaman
  - Fema rak promosi
  - tidak tahu siapa
  - Loan BN PAN
  - Loan Dan
  - Loan Her
  - Loan Dav
  - Loan KKB
    - L 1809 VZ
    - N 1369 IC

The last two accounts are children of Loan KKB, which is itself a child of Loan Pinjaman. Other Liabilities supports two subaccount levels under a root; Expenses retains its single subaccount level. Parent selectors only offer valid candidates in the same group. Save validation rejects cycles, self/descendant parenting, moves exceeding the group's depth limit, and active children under inactive ancestors. Recursive table/search preserves the full ancestry, including Loan Pinjaman → Loan KKB → vehicle. Existing account IDs are retained on edits and parent changes are included in edit history.

These are master labels only. No loan balance, lender identity, interest rate, repayment schedule, debt maturity, current/noncurrent classification, journal, or financial posting has been inferred. The label “tidak tahu siapa” remains exactly as supplied. Initial reload now restores 50 accounts: 10 cash/bank, 8 inventory asset, 22 expenses and 10 Other Liabilities. All remain session-based demo records.
