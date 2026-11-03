import {mountInventoryValuation} from './inventory-valuation.js';
import {mountVendorBalance} from './vendor-balance.js';
import {mountApAging} from './ap-aging.js';
import {mountSalesReport} from './sales-report.js';
import {mountCustomerBalance} from './customer-balance.js';
import {mountAveragePay} from './average-pay.js';
import {mountArAging} from './ar-aging.js';
import {mountFinancialReports} from './financial-reports.js';
import {mountLossSales} from './loss-sales.js';
import {mountMarginReport} from './margin.js';
export function mountReports(root,user){
 root.innerHTML=`<div class="reports-workspace"><nav class="panel reports-menu" aria-label="Menu Reports"><details open><summary>Financial</summary><button type="button" data-report="balance">Balance Sheet</button><button type="button" data-report="profit">P&L</button></details><details open><summary>Customer</summary><button type="button" data-report="ar-aging">A/R Aging Summary</button><button type="button" data-report="average-pay">Avg day to pay Summary</button><button type="button" data-report="customer-balance">Customer Balance Summary</button></details><details open><summary>Vendor</summary><button type="button" data-report="ap-aging">A/P Aging Summary</button><button type="button" data-report="vendor-balance">Vendor Balance Summary</button></details><details open><summary>Inventory</summary><button type="button" data-report="valuation">Inventory Valuation Summary</button></details><details open><summary>Sales</summary><button type="button" data-report="sales">Sales Summary</button></details><div class="reports-other"><button type="button" data-report="loss">Loss Sales</button><button type="button" data-report="margin">Gross Margin</button></div></nav><div class="reports-main"><div id="report-valuation" hidden></div><div id="report-vendor-balance" hidden></div><div id="report-ap-aging" hidden></div><div id="report-sales" hidden></div><div id="report-financial"></div><div id="report-customer-balance" hidden></div><div id="report-average-pay" hidden></div><div id="report-ar-aging" hidden></div><div id="report-loss" hidden></div><div id="report-margin" hidden></div></div></div>`;
 const valuation=root.querySelector('#report-valuation');mountInventoryValuation(valuation);
 const vendorBalance=root.querySelector('#report-vendor-balance');mountVendorBalance(vendorBalance);
 const apAging=root.querySelector('#report-ap-aging');mountApAging(apAging);
 const sales=root.querySelector('#report-sales');mountSalesReport(sales,user);
 const financial=root.querySelector('#report-financial'),loss=root.querySelector('#report-loss'),margin=root.querySelector('#report-margin');
 const customerBalance=root.querySelector('#report-customer-balance');mountCustomerBalance(customerBalance);
 const average=root.querySelector('#report-average-pay');mountAveragePay(average);
 const aging=root.querySelector('#report-ar-aging');mountArAging(aging);
 const selectFinancial=mountFinancialReports(financial);mountLossSales(loss);mountMarginReport(margin);
 function select(report){valuation.hidden=report!=='valuation';vendorBalance.hidden=report!=='vendor-balance';apAging.hidden=report!=='ap-aging';sales.hidden=report!=='sales';customerBalance.hidden=report!=='customer-balance';average.hidden=report!=='average-pay';aging.hidden=report!=='ar-aging';financial.hidden=!['balance','profit'].includes(report);loss.hidden=report!=='loss';margin.hidden=report!=='margin';if(!financial.hidden)selectFinancial(report);root.querySelectorAll('[data-report]').forEach(button=>{const selected=button.dataset.report===report;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 root.querySelectorAll('[data-report]').forEach(button=>button.onclick=()=>select(button.dataset.report));select('balance');
}
