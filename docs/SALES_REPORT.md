# Sales report

Sales users now have Sales Order, Sales Tools and Sales Report. The general Reports page remains denied to Sales. Admin 1/2/3 cannot mount/open Sales Report; superadmin can use the page and Reports → Sales → Sales Summary. Superadmin may choose all sales or one rep; Sales has no rep selector and a supplied filter cannot widen their projection.

The model resolves an active known user ID and role from the session store before aggregating. Only invoices attributed through their salesperson snapshot or linked SO to the selected named salesperson, and approved credits linked to those invoices, enter that Sales user's aggregates. It returns monthly totals and rep totals only, excluding customer, invoice detail, cost and margin data. Superadmin can also see unattributed invoices as Tanpa sales.

Sales by Month shows invoice net amounts after discounts and before PPN, minus approved returns in the return month. SO, payments and write-offs do not count as revenue. Dates default to Jan 1 through today in Asia/Jakarta. Month bars use Rp millions, exact amounts appear on hover and in rep totals. Negative net amounts use red bars; pie proportions are omitted for nonpositive totals or any negative rep total. No sample screenshot values are seeded.

This is browser demo isolation, not production authentication or server authorization. Demo user selection and in-memory records remain alterable in the browser. Production requires authenticated server queries restricted to the salesperson and immutable attribution. Data resets on reload.
