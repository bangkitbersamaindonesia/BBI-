# BBI ERP — Product Requirements (Draft v0.1)

## Goal
A web ERP for Indonesian garment / apparel trading: inventory, purchasing, sales, vendor bills, customer invoices, payments, returns, and integrated double-entry accounting. Default language Bahasa Indonesia, timezone Asia/Jakarta, currency IDR. This document is a draft; business policy decisions remain open.

## Scope and modules
1. Master data: organization, users/roles, suppliers, customers, warehouses, locations, units, taxes, payment terms, accounts, brands, categories, product styles and SKU variants (style + color + size).
2. Inventory: multi-warehouse stock, stock movements and reservations, receiving, delivery, adjustments, counts, transfers, returns, stock valuation, reorder alerts. No negative stock by default.
3. Purchasing: purchase orders, partial goods receipts, three-way matching or controlled two-way matching, vendor bills, vendor credits/returns, accounts payable aging, partial and multiple payments.
4. Sales: sales orders, allocation, partial delivery, invoices, sales returns, credit notes, customer receipts, accounts receivable aging, partial and multiple payments.
5. Finance: chart of accounts, double-entry journals, general ledger, trial balance, P&L, balance sheet, bank/cash accounts, reconciliations, fiscal period closing and re-opening with approvals.
6. Audit/security: role-based permissions, approvals, audit trails, soft/archive master records; no silent edits to posted transactions.

## Document states
DRAFT -> CONFIRMED/APPROVED -> PARTIAL/FULFILLED -> CLOSED; CANCELLED allowed only when safe.
Bills/invoices: DRAFT -> POSTED -> PARTIALLY_PAID -> PAID; VOID/CREDIT_NOTE for reversal (avoid deleting posted records).
Every document gets unique, sequential, human-readable numbering per document type/period and organization.

## Posting principles (design decisions to validate with accountant)
- PO/SO alone normally no GL entry; they can reserve/commit stock.
- Receipt: Dr Inventory; Cr Goods Received Not Invoiced (GRNI), where perpetual-inventory model is chosen.
- Vendor bill for received merchandise: Dr GRNI (+ purchase price variance / tax as relevant); Cr Accounts Payable.
- AP payment: Dr Accounts Payable; Cr Cash/Bank.
- Delivery: Dr Cost of Goods Sold; Cr Inventory.
- Customer invoice: Dr Accounts Receivable; Cr Sales Revenue (+ output tax liability where applicable).
- AR receipt: Dr Cash/Bank; Cr Accounts Receivable.
- Returns reverse appropriate original inventory, tax and accounting impact; valuation based on linked original cost where possible.
- No journal may post unless total debits equal total credits and accounts belong to the organization.
- Costing method: weighted-average or FIFO **TBD**; define before implementing transactions.
- All reports derive from posted ledger entries; balance sheet equation must reconcile.
- Use decimal-safe currency amounts and explicit rounding, not floating-point financial math.
- Tax defaults are configurable; never hardcode a VAT percentage. Final tax and accounting treatment require local professional review.

## Data model (high-level)
Organization, User, Role, UserRole, Customer, Supplier, Warehouse, Location, ProductStyle, Color, Size, ProductVariant (SKU), Unit, PriceList, StockMovement, StockBalance (derived), StockCount, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine, VendorBill, VendorBillLine, VendorPayment, SalesOrder, SalesOrderLine, Delivery, DeliveryLine, CustomerInvoice, CustomerInvoiceLine, CustomerPayment, SalesReturn, PurchaseReturn, CreditNote, BankAccount, Account, FiscalPeriod, JournalEntry, JournalLine, Allocation, AuditLog, Attachment.

All business transaction tables must reference organization_id, created_at, updated_at and relevant creator/poster user. Financial postings and stock movement histories should be append-only with reversal records.

## Minimum workflows / acceptance criteria
- Create product style with color/size SKU matrix; see stock per warehouse and SKU.
- PO -> partial/full receipts -> bill -> partial/full payments, with AP and inventory correct.
- SO -> partial/full delivery -> invoice -> partial/full receipts, with AR, revenue, COGS and inventory correct.
- Sales and purchase returns correctly refer to original docs and support credit/refund.
- P&L and balance sheet reconcile against trial balance and journal activity for date/period.
- Validate no overselling, prevent duplicate posting/payment, handle concurrency and idempotency.
- Basic permission split for sales, purchasing, warehouse, accounting, manager, admin.
- Automated tests cover unit prices, discounts, taxes, partial payments, returns, journal balancing, and stock costing.

## Suggested technology
Existing Vite vanilla JS is a temporary starter only. For production, propose React + TypeScript + Vite frontend, Node.js TypeScript backend (e.g. NestJS), PostgreSQL, Prisma/Drizzle, migrations, robust API validation, and server-side transaction boundaries. Compare tradeoffs before migration. Never expose database credentials or secrets in GitHub.

## Roadmap
Phase 0: define business requirements, chart of accounts, accounting policies, flows and roles; design UX and relational schema.
Phase 1: authentication/roles, companies, customers, suppliers, product variants, warehouses, inventory.
Phase 2: PO -> receipt -> bill -> vendor payments and returns.
Phase 3: SO -> delivery -> invoice -> customer receipts and returns.
Phase 4: GL and automated postings, reconciliation, P&L, balance sheet, aging reports.
Phase 5: dashboards, PDF/Excel exports, tests, security hardening, backups, deployment.

## Questions before production implementation
- One company or several? One or multiple warehouses?
- Are sales wholesale/B2B, retail, marketplaces, or all?
- Cost accounting: weighted average or FIFO? Opening stock and opening balances?
- Tax registration/status and required invoice format / e-Faktur integration?
- Currency other than IDR? Discount terms, prepayments, shipping/landed costs?
- Approval matrix, roles, branch separation, payroll/manufacturing scope?
