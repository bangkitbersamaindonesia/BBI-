# Accounting account master (client-side demo)

Accounting contains two separate groups. Names preserve the user's spelling and capitalization.

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

Everything is page-session memory; reload restores the supplied 18 accounts and discards demo edits. This is not a database migration or a complete accounting ledger. Opening balances, COA codes, SKU/category links, production authorization, posting accounts, payment/transfer integration and bank reconciliation remain future work. No real banking connection, credentials, account creation at a bank, payments or financial posting is performed.
