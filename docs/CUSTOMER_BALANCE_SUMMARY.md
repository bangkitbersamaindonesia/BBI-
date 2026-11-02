# Customer Balance Summary

Reports → Customer → Customer Balance Summary displays the company name, report title, All Transactions subtitle and customer balances under a date column formatted like Nov 3, 26. The As of control defaults to today in Asia/Jakarta. Reports remains superadmin-only.

Uses the same dated invoice/credit/payment/write-off projection as A/R Aging Summary. Customer totals include invoice PPN and approved return tax reversals, excluding records after As of. Negative balances are customer credit. Zero-net customers are hidden. SOs never create AR. The grand total equals the aging report grand total for the same date. No aging columns or due-date assumptions affect these totals.

All Transactions means all session history up to As of, not a date interval. No screenshot figures or opening customer balances are imported. Demo data resets on reload; production storage and authenticated server access remain separate work.
