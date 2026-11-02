# A/R Aging Summary

Reports → Customer → A/R Aging Summary is available under the existing superadmin-only Reports guard. Rows group invoice customer labels case-insensitively. Columns are Current (days <= 0), 1–30, 31–60, 61–90, >90 and Total, plus column grand totals. IDR values use integer-safe BigInt math and Indonesian formatting.

The As of date defaults to today in Asia/Jakarta. Only invoices issued on/before that date and approved credits, payments and write-offs dated on/before that date are included. Net invoice balances include the original PPN calculation and tax reversal on returns. Negative balances are customer credits, kept in the source invoice's aging bucket. SO and PO do not create receivables. Settled invoices are omitted.

Aging uses a valid stored invoice dueDate when available. Existing invoices do not yet capture due dates, so it falls back to invoice date and discloses the number of affected outstanding invoices in the report. It does not infer due dates from editable free-text customer terms or silently invent a Net 30 policy. Historical accuracy is bounded by dated session records; there is no imported opening AR, backend or persistent ledger. Reload resets the demo.
