# Average Days to Pay Summary

Reports → Customer → Avg day to pay Summary displays the company name, Average Days to Pay Summary title, All Transactions subtitle and one average-days column per customer, formatted to two Indonesian decimal places. It retains the existing superadmin-only Reports access.

Calculation: arithmetic mean of calendar days between invoice date and the first actual payment date on which cumulative payments cover that invoice's amount due, including PPN and approved returns dated by that payment date. Each invoice is equally weighted, not weighted by payment amount. Same-day settlement is zero days; installment settlement uses the payment that completes settlement. Customer labels merge case-insensitively.

Unpaid invoices, invoices with any customer write-off, and invoices settled only by return are excluded. Later returns cannot backdate a payment's settlement date. All Transactions means all recorded session history, with no imported opening invoices or screenshot data. This definition is stated on screen; no claim of identical behavior to external accounting software is made.

Demo memory resets on reload. Production needs persisted source records, authenticated server permissions and customer IDs.
