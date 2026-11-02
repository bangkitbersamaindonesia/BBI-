# Customer Center demo

Customer Center is available to Admin 1, Admin 2, Admin 3 and superadmin. Sales stays limited to Sales Order and Sales Tools. Existing restrictions on Dashboard, Accounting, Users and Reports remain in effect. QuickReport and Open Balance filter this customer view; they do not grant access to Reports.

The left directory supports search and active/all/inactive status, shows customers from SO/invoice labels and optional session master records, and displays signed AR balances including PPN, approved credits, payments and write-offs. SO amounts never contribute to AR. Negative balances are customer credits. No opening AR or imported screenshot balances are invented.

The information pane supports creating/editing contact details, terms, addresses, notes and active status. Saved customer names are fixed because the existing demo links transactions by exact customer name rather than database customer IDs. Matching trims and ignores letter case in this projection. Contacts and Notes tabs show saved details. Transactions supports type/date/open-invoice filters and lists SO, invoices, approved returns, payments and write-offs. Return amounts include the original invoice's tax reversal and payments display negative amounts. There is no email sending, attachment upload, jobs or task management in this implementation.

All data remains in browser memory for the current demo session, including during user changes; reload resets it. Production requires persistent customer IDs, a database, authenticated server authorization and audit trails before real customer data is used.
