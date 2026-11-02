# A/P Aging Summary

Reports → Vendor → A/P Aging Summary remains within the existing superadmin-only Reports access. Sales users cannot open Reports or mount AP report data. Admin 1/2/3 retain the previously requested restriction on Reports.

As of defaults to today in Asia/Jakarta. Columns: Vendor, Current, 1–30, 31–60, 61–90, >90, TOTAL, with column totals. Includes dated vendor bills and PPN minus approved supplier credits/tax reversal, payments and write-offs dated on/before As of. PO is not payable. Negative values are vendor credit and remain in the original bill aging bucket.

Uses valid bill dueDate when available, otherwise bill date, with a count/disclosure of missing due dates. Shared AR date/bucket boundaries are reused; free-text payment terms do not invent a due date. Zero-balance bills are omitted. Screenshot amounts and opening AP have not been imported. Demo data resets on reload; production still needs authenticated server authorization and persistent records.
