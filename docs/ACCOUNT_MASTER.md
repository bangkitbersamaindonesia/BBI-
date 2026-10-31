# Accounting account master (client-side demo)

Accounting contains separate Cash / Bank, Accounts Receiveable, Accounts Payable, Inventory Assets, Fixed Assets, COGS / HPP, Expenses and Other Liabilities groups. Names preserve the user's spelling and capitalization.

## Cash / Bank

1. PT 3636
2. NP 222999
3. PC Dan
4. PC Her
5. PC don
6. PC Dip
7. PC Lut
8. PC Mer
9. PC BN PAN
10. PC Bazar

This is the latest replacement list, in the user's exact spelling, capitalization and order. PT 3636 and NP 222999 default to bank; the PC accounts default to petty cash. Types remain editable. Bank name and account number are blank until supplied; numeric fragments in labels are not inferred as account numbers. Currency is IDR.

Recognizable renamed/reordered accounts keep their prior demo IDs. PC Bazar receives a new stable ID and replaces the old petty cash DP entry in the initial list; no assumed identity or balance transfer between those two accounts is made. The old labels are no longer seeded. There is no production database or balance migration; reload restores this new list while other account groups are unchanged.

## Inventory Assets — Other Current Assets

The parent account is **Inventory Assets**, classified explicitly as `other_current_asset` / **Other Current Assets**. Its child accounts, in the latest requested order, are:

1. Dress Fashion
2. Bawahan
3. Blouse / Atasan
4. Gamis Anak
5. Gamis Dewasa
6. APD
7. Underwear
8. Misc

The parent has a new stable ID `INV-ASSET-ROOT`; existing category account IDs are retained when reparented/reordered, and only inventory “misc” is capitalized to “Misc”. COGS is independent and retains its previous order and “misc” spelling. Inventory Assets supports one subaccount level, with the same cycle/depth/group/active-parent checks as Expenses. The new-account form defaults its parent to Inventory Assets. Edits preserve the Other Current Assets classification.

These are chart-of-account records separate from SKUs. No balances, opening values, SKU/category links, GL posting, or changes to weighted-average invoice HPP were invented. Reload now restores 60 master accounts: 10 cash/bank, 1 AR, 9 inventory assets including the parent, 8 COGS, 22 expenses and 10 other liabilities. The app remains session-based demo.

## Behavior and limits

Admin 1 simulation can add/edit names, types, optional bank details, notes and active status; Sales simulation is read-only. Cash/bank accounts can change type; existing bank details must be explicitly cleared before converting a bank account to petty cash. Inventory accounts remain in their original group. Names must be unique within their account group ignoring capitalization and repeated whitespace; the same label can exist in Inventory Asset and COGS as different accounts. Records retain stable IDs and in-memory edit history. No deletion is provided.

Everything is page-session memory; reload restores the supplied 64 accounts and discards demo edits. This is not a database migration or a complete accounting ledger. Opening balances, COA codes, SKU/category links, production authorization, posting accounts, payment/transfer integration and bank reconciliation remain future work. No real banking connection, credentials, account creation at a bank, payments or financial posting is performed.

## Expenses

Fifteen main accounts and seven child accounts preserve the requested names:

- R&D
- Barang cacat/hilang
- Komisi sales
- Label Plastik Karung
- Advertising & Promotion
- Auto and Truck Expenses
  - Bensin
  - Cicilan Mobil
  - Perbaikan/Asuransi
  - Service Rutin
  - Toll & Parkir
- Bank service charges
- Business Licenses & Permits
- Depreciation expenses
- Insurance Expenses
  - General Liability Insurance
  - Health Insurance/BPJS
- Interest Expense
- Meal Entertainment & Meetings
- Office & Warehouse Supplies
- Payroll expenses
- misc expenses

Expenses is a third master-account group, with stable parent IDs and a single subaccount level. Display follows the requested order, nesting children under their parents. Searching a child includes its parent; searching a parent includes all its children. Admin 1 simulation can add/edit expenses and select an optional expense parent. Parents cannot be themselves or subaccounts, must belong to Expenses, and an account with children cannot become a child. Active children require active parents, and an active parent cannot be disabled while it has active children. Names remain unique within their account group after case/whitespace normalization. These are requested account labels only, not a new posting, depreciation, payroll, loan, insurance or tax policy. No balances or transactions were generated.

The Expenses group contains 22 records in addition to the cash/bank and inventory asset groups. All prior demo persistence/security limits still apply.

## Other Liabilities

Requested hierarchy (ten records):

- Loan Pinjaman
  - Fema rak promosi
  - tidak tahu siapa
  - Loan BN PAN
  - Loan Dan
  - Loan Her
  - Loan Dav
  - Loan KKB
    - L 1809 VZ
    - N 1369 IC

The last two accounts are children of Loan KKB, which is itself a child of Loan Pinjaman. Other Liabilities supports two subaccount levels under a root; Expenses retains its single subaccount level. Parent selectors only offer valid candidates in the same group. Save validation rejects cycles, self/descendant parenting, moves exceeding the group's depth limit, and active children under inactive ancestors. Recursive table/search preserves the full ancestry, including Loan Pinjaman → Loan KKB → vehicle. Existing account IDs are retained on edits and parent changes are included in edit history.

These are master labels only. No loan balance, lender identity, interest rate, repayment schedule, debt maturity, current/noncurrent classification, journal, or financial posting has been inferred. The label “tidak tahu siapa” remains exactly as supplied. Initial reload now restores 50 accounts: 10 cash/bank, 8 inventory asset, 22 expenses and 10 Other Liabilities. All remain session-based demo records.

## COGS / HPP

Eight separate COGS accounts: Dress Fashion, Bawahan, Blouse / Atasan, APD, Gamis Anak, Gamis Dewasa, Underwear, misc. The labels intentionally match Inventory Asset, but these are distinct IDs and account groups. Name uniqueness is scoped to the group, so unchanged inventory/COGS accounts remain editable and same-group duplicates are rejected. No cross-group conversion is allowed on edit.

COGS supports the same add/edit/search and active-status demo behavior, with no bank details or parent-account hierarchy. SKU/category-to-COGS mapping, opening balances, chart-of-accounts codes and financial postings have not been inferred. Existing invoice weighted-average cost and gross-margin calculations are unchanged; account masters do not automatically allocate those values to GL accounts. The initial session now restores 58 records: 10 cash/bank, 8 inventory asset, 8 COGS, 22 expenses and 10 Other Liabilities.

## Accounts Receiveable

One control account `AR-001`, named exactly **Accounts Receiveable**, is added in its own group (`accounts_receivable`, Piutang usaha), bringing the initial account count to 59. It represents store/client receivables. Names/details can be edited by Admin 1 simulation; a second control account in this group is blocked. Other account groups retain their existing data and IDs.

The account page includes a read-only invoice-derived customer summary and source invoice list. It sums the session's created customer invoices, subtracts only approved customer return credits, preserves fully returned invoices as zero net, and excludes supplier credits and pending returns. Customer labels are grouped exactly as recorded; no identity merging is inferred without a customer master. BigInt totals preserve aggregate IDR precision.

This is explicitly an **unposted demo invoice/return projection before payments**, not a final AR balance or ledger posting. All invoices are currently draft/session objects. Opening receivables, payments/settlements, due dates, aging, GL account mapping and debit/credit journals remain unimplemented. Nothing is treated as paid or overdue. No real financial transaction, bank integration, migration or server authorization was added. Reload restores the account master but discards transactional demo data.


## Fixed Assets

Three accounts, in the user's requested order and spelling:

1. Mobil
2. Furniture dan perlengkapan
3. Laptop

Each belongs to the separate Fixed Assets group, explicitly classified `fixed_asset`, with a stable ID and editable active status/notes. No parent hierarchy, bank details or SKU mapping is implied. The table leaves acquisition value unfilled. No purchase cost, acquisition date, useful life, salvage value, depreciation method/rate, accumulated depreciation or financial journal was assumed. Existing Depreciation expenses and all other account groups are unchanged.

Initial session total is now 63 accounts, including these three fixed-asset accounts. This is still a session-based chart-of-accounts demo rather than a fixed-asset register, durable database or posted ledger.


## Accounts Payable

One control account `AP-001`, named **Accounts Payable**, classified `accounts_payable` / Utang usaha, represents vendor/supplier payables. Admin 1 simulation may edit its label/notes/status, but a second AP control record is blocked. It is separate from Other Liabilities loan accounts and AR customer receivables.

The account page derives a read-only session summary grouped by exact supplier label, with each source bill ID, vendor bill reference, PO and date. It totals recorded goods bills and subtracts approved supplier-return credits only. Pending/rejected returns and customer credits are excluded. Fully returned bills stay visible at zero net. PO commitments and items not billed by the supplier do not generate payable values. BigInt aggregation keeps combined integer IDR amounts exact.

All values are explicitly unposted demo bills less returns **before payments**, not final AP balances. Opening payables, settlements, due dates/aging, GL posting, bank reconciliation and payment integration remain unimplemented. No bills are marked paid, no tax/interest policy is inferred, and no external money movement is performed. The initial master now contains 64 accounts; transactional demo state still resets on reload.
