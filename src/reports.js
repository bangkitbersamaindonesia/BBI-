import {mountFinancialReports} from './financial-reports.js';
import {mountLossSales} from './loss-sales.js';
import {mountMarginReport} from './margin.js';
export function mountReports(root){
 root.innerHTML=`<div class="reports-workspace"><nav class="panel reports-menu" aria-label="Menu Reports"><details open><summary>Financial</summary><button type="button" data-report="balance">Balance Sheet</button><button type="button" data-report="profit">P&L</button></details><div class="reports-other"><button type="button" data-report="loss">Loss Sales</button><button type="button" data-report="margin">Gross Margin</button></div></nav><div class="reports-main"><div id="report-financial"></div><div id="report-loss" hidden></div><div id="report-margin" hidden></div></div></div>`;
 const financial=root.querySelector('#report-financial'),loss=root.querySelector('#report-loss'),margin=root.querySelector('#report-margin');
 const selectFinancial=mountFinancialReports(financial);mountLossSales(loss);mountMarginReport(margin);
 function select(report){financial.hidden=!['balance','profit'].includes(report);loss.hidden=report!=='loss';margin.hidden=report!=='margin';if(!financial.hidden)selectFinancial(report);root.querySelectorAll('[data-report]').forEach(button=>{const selected=button.dataset.report===report;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});}
 root.querySelectorAll('[data-report]').forEach(button=>button.onclick=()=>select(button.dataset.report));select('balance');
}
