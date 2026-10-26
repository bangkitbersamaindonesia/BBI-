# Instructions for Codex contributors to BBI ERP

Read docs/PRODUCT_REQUIREMENTS.md before changing architecture or implementing modules.
The repository currently contains a tiny Vite vanilla JS starter, not a finished ERP. Treat the requirements as a draft and highlight unresolved business decisions.
For each task:
1. Propose implementation scope and file changes.
2. Keep changes small, use migrations and automated tests for transactional code.
3. Apply server-side role and organization isolation; avoid leaking credentials.
4. Preserve immutable audit trails and reversal-based accounting. Use decimal-safe money and atomic transactions for stock and ledger changes.
5. Run available checks/build and report failures transparently.
6. Do not implement or hardcode tax/accounting policy when not confirmed.
