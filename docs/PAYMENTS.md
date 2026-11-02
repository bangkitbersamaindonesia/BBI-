# Payments and settlement — session demo

Payments menu lists customer invoices and supplier bills. Admin 2 records date, unique document reference, cash/bank account and whole-rupiah amount. Repeated partial payments accumulate; exact settlement is LUNAS. Overpayment, invalid dates, duplicate references and unauthorized roles fail without writes. No stock changes occur.

Balances subtract approved return credits, payments and write-offs. Option A customer totals include requested DPP 11/12 and PPN 12%, recalculated after approved merchandise returns; B has no PPN. Retur after settlement can produce a separately shown credit balance requiring future refund handling; balances never silently become negative AR/AP.

Admin 2 may explicitly write off the entire residual after a payment, or enter zero payment to write off all residual, with a required reason. Write-offs are immutable separate records with account IDs: Expenses / toko tidak bayar (`EXP-BAD-DEBT`) and Income / misc expenses (`INCOME-AP-WRITEOFF`), preserving the user's requested name and Income classification even though an expense group also contains misc expenses. Written-off documents show SELESAI · WRITE-OFF, not a claim of full cash payment. Cash/bank selection is required for positive cash amounts. Source merchandise totals and invoice lines are preserved.

Accounting AR/AP panels use the remaining settlement balance. Payment/write-off history is available for each document. This is a client-side session record system, not bank transfers, production authentication, or posted double-entry ledger. Opening balances, bank reconciliation, reversal UI, cash balances, tax ledger and refunds remain future work.
