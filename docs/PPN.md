# PPN account — requested session workflow

PPN is an Other Current Asset with stable ID ASSET-PPN. Accounting → Other Current Assets displays the account and a derived movement log linked to source documents. It is a session projection rather than a posted production GL; opening balance is not invented.

Admin 1 enters the actual supplier bill PPN amount in whole rupiah, default zero; no supplier tax rate is guessed. Bill tax is validated before committing bills/receipt/loss/stock. It increases PPN once, and is included in supplier payable/payment total. Invoice option A uses the requested DPP and PPN formula and decreases the PPN account; option B contributes no PPN. Cash settlement of invoices/bills does not post PPN a second time.

Admin 3 may select PPN as the destination of a Write Check: bank movement and PPN both decrease. It is an asset-targeted check, not an expense check. Other check expenses leave PPN unchanged. Duplicate checks and bills finalization remain blocked.

Approved returns reverse related PPN: invoice return tax follows existing option-A net recalculation; bill return tax is proportional to credited merchandise, rounded to whole rupiah with cumulative reconciliation so full return reverses full tax. History derives from original documents and approved credits, never from pending drafts or mere rerendering. No filing, e-Faktur, external tax payment, or production tax ledger is performed.

## Latest revision: PPN is non-posting

ASSET-PPN now has nonPosting=true. New Write Checks to this account are rejected and the account is excluded from destination choices. Source invoice/bill PPN amounts, payable/receivable totals and reference tax history remain; no new posting is allocated to PPN or an inferred replacement account. Financial report entries omit PPN and the Balance Sheet omits the non-posting asset row. The tax reference panel is explicitly not an account balance. As gross AR/AP still contain document tax, reconciliation may show an unallocated-tax difference until a posting account mapping is specified. Prior check records remain in source history rather than being silently deleted. This supersedes earlier direct PPN posting instructions.

## Approved PPN settlement workflow (current)

This supersedes the earlier unmapped/non-posting-only and double-asset-check descriptions. PPN (ASSET-PPN) remains a non-posting parent. PPN Masukan (PPN-IN) and PPN Keluaran (PPN-OUT) are posting children. Bills add positive input VAT; option-A invoices add negative output VAT. Approved returns reverse their associated VAT. The tracker separates input, output before deposits, deposits, net VAT and remaining payable/overpayment.

Admin 3 selects Setoran PPN in Write Check: credit bank, debit PPN Keluaran. The signed net balance rises toward zero; no tax expense is created. Deposits cannot exceed the outstanding deficit as of the check date; parent and input VAT are not valid payment targets. No customer/supplier invoice payments repost VAT. The PPN parent is derived only, never directly posted or double counted.

Balance Sheet shows negative net PPN as PPN Kurang Bayar / Utang PPN under liabilities; positive net PPN is PPN lebih bayar under assets. Settlement reduces both bank and the liability equally, preserves net income and reconciles Assets = Liabilities + Equity. Tax expense remains a separate available expense for actual tax costs and does not participate in this settlement flow. All remain session-derived demo records, not a production GL.
