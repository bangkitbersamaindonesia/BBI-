# Customer invoice preview

Open Sales → Lihat contoh invoice A4, or `/?invoice-preview` for the sample layout. Existing session invoices also appear as preview buttons in Sales. Sample data is separate from transactions and clearly marked; it does not create an invoice or change stock.

The portrait sheet is 210 × 297 mm. Print CSS requests A4 portrait with 12 mm margins, removes application controls, repeats table headings, and avoids splitting item rows and totals/signatures. Longer invoices flow onto additional pages. Browser print settings may override paper/margins. Use Cetak / Simpan PDF to open the browser print dialog.

Real previews use invoice shipment snapshots and source SO details. Approved customer credits appear separately; the original invoice is preserved. Totals do not deduct payments. Purchase cost and gross margin are excluded from the customer document. Company address/contact, payment details and due date remain explicitly unfilled; the requested tax/discount calculations are preview-only and no shipping policy is inferred. This is a draft client-side layout for user correction, not an issued invoice.

The item table includes Diskon between Harga / pcs and Jumlah. Admin 2 simulation can set one invoice-wide discount percentage (0–100, up to two decimals). The heading displays Diskon x%, and the column displays discounted price per pcs, not the discount deduction. Discounted unit prices round half up to whole rupiah before multiplication by quantity. Subtotals, approved-return values, DPP, PPN and payable are recalculated for preview. Settings are per invoice in page-session memory; source transactions, receivables, margin reports and ledger remain unchanged. Production discount posting remains future work.

Per user request, DPP nilai lain2 appears below Sub total setelah retur and equals that subtotal × 11 / 12. BigInt arithmetic rounds the display to the nearest whole rupiah (half up). This display calculation does not change invoice totals or post tax/ledger entries.

Per user request, PPN 12% appears below DPP nilai lain2 and equals the displayed DPP × 12%, rounded half up to whole rupiah with BigInt arithmetic. It is a preview calculation only; invoice transaction totals and ledger posting are unchanged.

Jumlah yang harus dibayar follows PPN 12% and equals Sub total setelah retur + PPN 12%, styled in blue using the same subtotal emphasis. This preview amount does not deduct customer payments or change transaction/ledger totals.
