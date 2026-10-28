# SKU master demo

Planned warehouses: Gudang Lebak, Gudang Kediri, and Gudang Besar.

Inventory opens Master SKU. Add garment variants, search the list, and inspect pcs by warehouse. Data lives in memory for this page session; reload restores examples. No backend transaction or accounting posting is performed.

- Unique, case-insensitive normalized SKU code; required item name, size, color.
- Purchase and selling prices are nonnegative integer IDR **per pcs**, not pack prices or stock valuation. Decimal prices remain a production decision.
- Input quantity can use pcs (1), lusin (12), kodi (20), or gros (144). Fractional packs are accepted only when the conversion gives a safe nonnegative integer pcs. Stored balances use quantityPcs exclusively.
- Products hold descriptive fields, prices, preferred display unit and notes. Separate balances use `(sku, warehouseId)` and `quantityPcs`; total quantity is derived across warehouses, never stored on the product. Initial stock belongs only to the chosen warehouse. Display equivalents are rounded by locale formatting; pcs is authoritative.
- Reset clears only the form. Navigation keeps demo data until reload. There is deliberately no stock overwrite or product deletion workflow.

## Production design (not an executed migration)

Use organization-scoped product IDs with unique `(organization_id, normalized_sku)` and stock balances keyed by `(organization_id, variant_id, warehouse_id)`. Validate warehouse ownership and server-side permissions. Add product name/style, size, color, purchase/selling prices as decimal-safe NUMERIC, preferred quantity unit, and notes. Use canonical integer pcs for garment stock balances and movement deltas; retain original input unit/quantity and conversion factor on source lines for auditability.

Opening quantities must become authorized opening-stock movements, not direct master-data edits. Derive balance totals from append-only movements; transfers create paired warehouse movements atomically. Enforce nonnegative stock, row locking, idempotency and reversal records. The existing SQL remains a conceptual draft, not a deployable migration. Confirm price precision, SKU generation/variant uniqueness, warehouse setup, opening valuation and costing policy before transactional implementation.

Checks: `npm test` and `npm run build`.
