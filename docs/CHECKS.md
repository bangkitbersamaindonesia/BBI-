# Create Check — Admin 3

Payments includes a Create Check section. Admin 3 selects an active cash/bank source and the most specific active expense account/subaccount, enters unique check reference, date, positive whole-rupiah amount, payee and optional notes. A saved immutable record links the bank decrease and expense increase by identical amount. Invalid values, duplicate references and other roles fail before writes. No physical stock changes, external bank transactions or production GL postings occur.

Bank movement is derived from customer receipts minus supplier payments minus checks, per bank account. It is explicitly labeled net session movement, not an actual bank balance: no opening balance has been supplied or invented, and no insufficient-funds rule is imposed on unknown real balances. Check records provide expense allocation and history, not a bank transfer. The app still uses session memory and simulated roles; opening balances, production authorization, ledger and reversal UI remain future work. Admin super permissions remain unspecified.

## Latest revision: PPN is non-posting

ASSET-PPN now has nonPosting=true. New Write Checks to this account are rejected and the account is excluded from destination choices. Source invoice/bill PPN amounts, payable/receivable totals and reference tax history remain; no new posting is allocated to PPN or an inferred replacement account. Financial report entries omit PPN and the Balance Sheet omits the non-posting asset row. The tax reference panel is explicitly not an account balance. As gross AR/AP still contain document tax, reconciliation may show an unallocated-tax difference until a posting account mapping is specified. Prior check records remain in source history rather than being silently deleted. This supersedes earlier direct PPN posting instructions.

## Approved PPN settlement workflow (current)

This supersedes the earlier unmapped/non-posting-only and double-asset-check descriptions. PPN (ASSET-PPN) remains a non-posting parent. PPN Masukan (PPN-IN) and PPN Keluaran (PPN-OUT) are posting children. Bills add positive input VAT; option-A invoices add negative output VAT. Approved returns reverse their associated VAT. The tracker separates input, output before deposits, deposits, net VAT and remaining payable/overpayment.

Admin 3 selects Setoran PPN in Write Check: credit bank, debit PPN Keluaran. The signed net balance rises toward zero; no tax expense is created. Deposits cannot exceed the outstanding deficit as of the check date; parent and input VAT are not valid payment targets. No customer/supplier invoice payments repost VAT. The PPN parent is derived only, never directly posted or double counted.

Balance Sheet shows negative net PPN as PPN Kurang Bayar / Utang PPN under liabilities; positive net PPN is PPN lebih bayar under assets. Settlement reduces both bank and the liability equally, preserves net income and reconciles Assets = Liabilities + Equity. Tax expense remains a separate available expense for actual tax costs and does not participate in this settlement flow. All remain session-derived demo records, not a production GL.
