# BBI ERP — Technical Architecture v1.0 (Design, not implemented)
Date: 2026-10-26

## Locked business configuration
- Single legal entity, multi-warehouse, B2B/wholesale garments, perpetual moving weighted-average inventory costing.
- Indonesian UI, Asia/Jakarta operational timezone; save timestamps UTC; IDR base currency.
- This is a *design*, not a deployment or completed feature.

## Recommended stack
- React + TypeScript + Vite + Tailwind CSS; NestJS + TypeScript modular monolith REST API with OpenAPI; PostgreSQL; Prisma migrations.
- Containerized deploy, secrets external to repo, database backups, CI builds/tests.
- Authentication: server-side sessions, password hashing, RBAC per action; approval workflows; structured audit logs.
- Do NOT introduce microservices for MVP. Keep domain modules independently testable.

## Components/modules
core(auth, user, roles, organizations, fiscal-periods, numbering, audit)
catalog(products/styles/variants/colors/sizes, customers, vendors, warehouses)
inventory(stock lots or valuation layers, movement, reservations, transfer, adjustment, count)
purchasing(PO, receipt, vendor bill, vendor credit, payment)
sales(SO, reservation, shipment, customer invoice, return, credit, payment)
accounting(chart of accounts, journal entries, journal lines, bank/cash, reconciliation, financial reports)
reporting(dashboard, stock ledger/value, inventory aging, sales, AP/AR aging, P&L, balance sheet, trial balance)

## Domain boundaries
- Stock on hand is derived from posted immutable stock movements; cached balance records used with row locking/reconciliation. Reservations separate from actual physical stock.
- Purchase order does not post financial journal. Goods receipt posts receipt valuation; match bill to receipt to prevent double-counting inventory and liabilities. Payment posts clearing AP.
- Sales order does not post financial journal. Delivery removes inventory and posts COGS. Customer invoice posts AR/revenue. Customer receipt posts bank/AR clearing.
- Returns reference original transaction and reverse valuation and tax/accounting using credit documents; returned stock only after inspection/acceptance.
- All posted journal entries balance; never edit or delete a posted entry—reverse/correct with audit links.
- Use DECIMAL/NUMERIC precision, integer monetary subunits if adopted consistently, explicit rounding rules. Financial and stock writes must be atomic and idempotent.
- Weighted average for each SKU+warehouse (a *proposed policy*, confirm with accountant): receipt increases cost basis; issues use average immediately before issue; warehouse transfer out uses sending cost, transfer in adds sending value to destination pool; adjustment/return must have defined valuation policy.
- Backdated entries are dangerous: choose controlled periods + recomputation policy before allowing backdating. Enforce fiscal locks.

## Major relations
ProductStyle 1:N ProductVariant (unique SKU, unique style/color/size combo)
Warehouse 1:N StockMovement per ProductVariant
Customer 1:N SalesOrder 1:N SalesOrderLine
SalesOrder 1:N Shipment 1:N ShipmentLine
SalesOrder/Shipment -> CustomerInvoice -> CustomerReceiptAllocation
Supplier 1:N PurchaseOrder 1:N PurchaseOrderLine
PurchaseOrder 1:N GoodsReceipt 1:N GoodsReceiptLine
Receipt -> VendorBill -> VendorPaymentAllocation
Every posted stock/financial document links to its source, company (fixed one now), period, user.
JournalEntry 1:N JournalLine, each to Account.
CreditNotes and Returns reference source document and lines.

## Delivery phases
0. Architecture and business-policy signoff, COA baseline, accountant review.
1. App scaffold React/NestJS/Postgres, migrations, login, roles, audit.
2. Catalog, SKUs, warehouses, inventory ledger, weighted average, stock transfer.
3. Supplier/PO/receipt/bill/AP/return.
4. Customer/SO/reserve/delivery/invoice/AR/return.
5. Auto-posting/GL/trial balance/P&L/balance sheet and bank reconciliation.
6. Approvals, reports, automated tests, deployment operations.

## Key acceptance tests
- A product can have same style with distinct color/size SKU; uniqueness enforced.
- Distinct warehouse balances and SKU valuations reconcile with movements.
- Receipt 100 units @80k then 50 @92k yields moving-average 84k; issue 20 yields COGS 1.68m.
- Concurrent shipment requests do not oversell.
- All receipts/deliveries/payments are idempotent; duplicate API retries do not double-post.
- Partial receipts, backorder, staged delivery, partial invoice/bill payments, credit note/returns.
- Every journal balanced; AR/AP tie to subledgers; assets = liabilities + equity.
- Month-end lock blocks unapproved retroactive stock/GL changes.

## Business decisions pending
1. Company legal name, tax status and required document templates.
2. Warehouse names and need for internal bin locations.
3. Cost basis confirmation: per warehouse average vs pooled company-wide; handling freight, discounts and purchase price differences.
4. Whether goods can ship before invoice, invoicing before delivery, customer deposits, tax inclusive/exclusive pricing.
5. Returns policies; credit notes vs refund; multi-step approval hierarchy.
6. Opening balances and stock imports.
7. Accounting standard, taxes and reconciliations to review with qualified accountant.

## Implementation guardrails
Prioritize transactional correctness over UI polish. Build DB constraints, services and tests before dashboards. Never treat this architecture document as proof that features are already implemented.
