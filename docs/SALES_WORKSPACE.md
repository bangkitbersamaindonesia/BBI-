# Sales workspace and Sales Tools

A demo user chooser starts the workspace. Named Sales users Doni, Lutfi and Dipa see only Sales Order and Sales Tools. The page guard redirects attempts to other workspace pages to Sales Tools, hides the report shortcut and does not mount Inventory/Purchasing/Accounting/Payments/Users/Reports or invoice preview for a Sales session. Admin modules keep their existing simulated controls. Logout returns to the demo chooser.

Sales Tools shows a searchable catalog with SKU/name, size/color, selling price per pcs and lazy-loaded product photos (up to six, existing photo limits). Purchase cost, valuation, margins and internal notes are not in the catalog projection. Missing photos display a placeholder. Catalog thumbnails select the main image.

SO fixes the salesperson to the selected named Sales user, prevents role changes through its simulated selector, lists only that salesperson's SOs, and omits procurement/fulfillment/HPP/margin panels. SO submission still creates shortage POs for Admin 1 automatically. Switching demo users remounts the workspace in the same page and preserves shared photos/transactions for Sales Tools; subscriptions are cleared before remount to avoid duplicate handlers. Browser reload still resets demo data as before.

This is client-side demo navigation and UI isolation, not production security. Selecting a demo identity is not authentication; sessionStorage and browser-side data can be altered by a device user. Real authorization requires authenticated server sessions and server-side data/role checks before exposure. No passwords, backend or production login have been invented. Admin 3 and superadmin page restrictions beyond previously specified responsibilities remain out of scope.
