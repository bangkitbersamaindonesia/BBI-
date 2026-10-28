# Sales Order → Admin 1 → Purchase Order (client-side demo)

## Implemented scope

Sales uses Sales to enter customer name, salesperson, requested date, delivery address, optional notes, and multiple SKU lines. Catalog options share the same session data as Inventory, including newly created SKUs. Lines retain SKU/name/size/color snapshots, original qty/unit, canonical integer pcs, and integer IDR price per pcs. Totals exclude unconfirmed tax, discounts and freight. Duplicate SKU lines must be combined. Submission freezes the order in the demo and queues Admin 1 review.

Select the Admin 1 simulation role to check every warehouse: Gudang Lebak, Gudang Kediri and Gudang Besar. Available means physical pcs minus existing demo reservations. Review snapshots each warehouse's availability and allocates sequentially Lebak → Kediri → Besar, up to the requested pcs. Reservations are separate from physical balances and prevent subsequent orders from using those pcs again. The demo does not ship, transfer or decrement physical stock.

A fully allocated order becomes `Stok dialokasikan`. Any shortage, including partial availability, becomes `Perlu PO`. Admin 1 supplies a vendor name and receiving warehouse, then creates exactly one linked draft PO for only the shortage lines. Initial PO prices snapshot master purchase prices per pcs. Creation does not add stock, reserve incoming goods or post accounting. Purchasing lists the PO, its source SO, supplier, destination, quantities and totals. Admin 1 can mark it `Siap dikirim`; this is not transmission. Download a clearly labeled text demo for review. No email, vendor submission, goods receipt, or production document is generated.

## Limits and decisions to confirm

Everything is in page-session memory and resets on reload. Role selection is UI simulation, not authentication/authorization. Histories are append-only in the demo workflow but not a protected production audit trail. There is no production backend or executed migration.

Confirm supplier/customer master data and contacts, allocation priority/manual allocation, reservation expiry/cancellation, partial delivery policy, procurement approval authority, supplier-specific prices, splitting shortages across multiple suppliers, delivery schedules and actual vendor submission channel before production. One supplier per shortage PO is the demo scope; vendors are entered explicitly, never guessed. Customer contact and reference numbers can be added once their required fields are agreed.

Production needs server-side organization/role checks, atomic reservations and immutable stock movements, row locks/idempotency, persistent SO/line/PO/reservation tables and audit events. Add unique source SO/line procurement linkage to prevent duplicate buying. Submitted orders and PO changes require controlled revision/cancellation and reservation release. Supplier delivery remains a separate workflow and requires a confirmed recipient and channel. Taxes and accounting policy remain configurable and unimplemented here.

## Verification

`node --test` covers canonical units and money limits, required fields, roles, cross-warehouse allocation, reservation reuse prevention, full and partial availability, shortage-only PO quantities, duplicate transition rejection, shared catalog products and frozen PO prices. `vite build` verifies module integration. Browser smoke check: submit SO → switch to Admin 1 → review → create shortage PO → open Purchasing → mark ready.
