# Vendor Center demo

Admin 1, Admin 2, Admin 3 and superadmin can open Vendor Center. Sales remains restricted to Sales Order and Sales Tools. Dashboard, Accounting, Users and Reports restrictions are unchanged. QuickReport and Open Balance only filter this center's transaction table and do not open Reports.

The directory searches vendor names/contacts and filters active/all/inactive records. Vendors are derived from named POs, bills and session master records; unassigned draft POs do not create blank vendors. Vendor Information supports adding/editing contact, mobile, email, terms, address, notes and active status. Saved names are immutable because source transactions currently link by supplier label. Matching trims and ignores case in this projection. Customer and vendor masters remain separate.

Transactions lists Purchase Order, Bill, approved vendor return/credit, supplier payment and write-off, with date/type/open-bill filters. Positive amounts are PO/bill values; negative amounts are returns/payments/write-offs. Signed AP balances use bills including PPN minus approved returns (including tax reversal), payments and write-offs. POs do not create AP. Negative balances are vendor credit. No screenshot balances or vendor names are imported.

The screenshot guides the directory/information/transaction layout; no email sending, attachment upload, tasks, external 1099/check ordering or Office export is simulated. Data stays in the browser demo session and resets on reload. Production needs persistent vendor IDs, database storage, authenticated server permissions and audit trails.
