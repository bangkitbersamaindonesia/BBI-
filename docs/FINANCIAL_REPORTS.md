# Balance Sheet and Profit & Loss — session reports

Reports begins with comparative P&L and Balance Sheet. This month/quarter/semester/fiscal year automatically pair with the immediately preceding calendar month/quarter/semester/year. Fiscal year is January–December, following the existing dashboard assumption. Custom dates compare the immediately preceding contiguous range with equal day count. Calendar presets span complete calendar periods; only recorded dated transactions contribute.

P&L covers the selected start/end dates; Balance Sheet is cumulative through the ending date, compared to the prior period ending date. Columns show current, comparison and difference. P&L includes net invoice merchandise revenue, frozen invoice COGS, approved returns, check expenses, customer bad-debt write-offs and supplier write-off income. Bank payments settle AR/AP without creating revenue/expense; PPN is excluded from P&L.

Balance Sheet derives bank movements, AR, inventory movements at stored document costs, PPN, AP, initial demo inventory offset by Opening Balance Equity, and cumulative net income. Initial demo inventory is carried as an opening balance before both periods; new SKU starting stock is a dated opening-equity contribution. No initial cash, fixed assets, loans or owner balances are invented. Rows with no recorded transactions do not imply a verified zero production balance. Reports are derived document projections, not a posted production GL.

A reconciliation difference is displayed, never plugged with invented income/equity. In particular, the requested Write Check PPN behavior decreases both bank and the PPN asset; without a separately specified counter-entry this creates a double-asset reduction not balanced by liabilities/equity. The report explicitly surfaces that mismatch. Production accounting treatment/counter-account for this case remains unresolved. Inventory uses rounded document COGS/return values, not a full unrounded inventory subledger. Backdated documents affect their stated date. Full authentication, persistence, fiscal close, opening balance entry and production ledger remain future work.

All expense master accounts and subaccounts are displayed in P&L, even with zero amounts in both periods. Child rows show the parent path. Expense totals count actual account-linked transactions once, without duplicating parent rollups.

## Latest revision: PPN is non-posting

ASSET-PPN now has nonPosting=true. New Write Checks to this account are rejected and the account is excluded from destination choices. Source invoice/bill PPN amounts, payable/receivable totals and reference tax history remain; no new posting is allocated to PPN or an inferred replacement account. Financial report entries omit PPN and the Balance Sheet omits the non-posting asset row. The tax reference panel is explicitly not an account balance. As gross AR/AP still contain document tax, reconciliation may show an unallocated-tax difference until a posting account mapping is specified. Prior check records remain in source history rather than being silently deleted. This supersedes earlier direct PPN posting instructions.

## Approved PPN settlement workflow (current)

This supersedes the earlier unmapped/non-posting-only and double-asset-check descriptions. PPN (ASSET-PPN) remains a non-posting parent. PPN Masukan (PPN-IN) and PPN Keluaran (PPN-OUT) are posting children. Bills add positive input VAT; option-A invoices add negative output VAT. Approved returns reverse their associated VAT. The tracker separates input, output before deposits, deposits, net VAT and remaining payable/overpayment.

Admin 3 selects Setoran PPN in Write Check: credit bank, debit PPN Keluaran. The signed net balance rises toward zero; no tax expense is created. Deposits cannot exceed the outstanding deficit as of the check date; parent and input VAT are not valid payment targets. No customer/supplier invoice payments repost VAT. The PPN parent is derived only, never directly posted or double counted.

Balance Sheet shows negative net PPN as PPN Kurang Bayar / Utang PPN under liabilities; positive net PPN is PPN lebih bayar under assets. Settlement reduces both bank and the liability equally, preserves net income and reconciles Assets = Liabilities + Equity. Tax expense remains a separate available expense for actual tax costs and does not participate in this settlement flow. All remain session-derived demo records, not a production GL.
