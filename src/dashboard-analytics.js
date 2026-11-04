import {demoStore,subscribeDemo} from './demo-store.js';
import {documentBalance} from './payments-model.js';
import {inventoryValuation} from './inventory-valuation.js';
import {COST_SCALE,roundRatio} from './margin-model.js';
import {salesOrderDate} from './sales-model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => 'Rp ' + value.toLocaleString('id-ID');
const sum = (rows, pick) => rows.reduce((total,row) => total + BigInt(pick(row)),0n);

export function dashboardSummary(store,today) {
  const month = today.slice(0,7);
  const current = rows => rows.filter(row => row.date?.startsWith(month) && row.date <= today);
  const invoices = current(store.invoices);
  const [year,monthNumber] = month.split('-').map(Number);
  const previousMonth = new Date(Date.UTC(year,monthNumber-2,1)).toISOString().slice(0,7);
  const previousSales = sum(store.invoices.filter(row=>row.date?.startsWith(previousMonth)),row=>row.total);
  const sales = sum(invoices,row=>row.total);
  const returns = current(store.credits).filter(row=>row.type==='customer');
  const grossProfit = sales - sum(invoices,row=>row.costTotal ?? 0)
    - sum(returns,row=>row.total) + sum(returns,row=>row.costReversal ?? 0);
  const snapshot = {...store};
  for(const key of ['credits','payments','writeOffs']) snapshot[key] = store[key].filter(row=>row.date<=today);
  const dueBills = store.bills.filter(bill=>bill.date<=today && bill.dueDate?.startsWith(month))
    .map(bill=>documentBalance(snapshot,'supplier',bill.id));
  const dueTotal = sum(dueBills,bill=>bill.due);
  const dueUnpaid = sum(dueBills,bill=>bill.remaining);
  const overdueInvoices = store.invoices
    .filter(row=>row.date<=today && row.dueDate?.startsWith(month) && row.dueDate<=today)
    .map(invoice=>documentBalance(snapshot,'customer',invoice.id));
  return {
    sales, previousSales, dueTotal, dueUnpaid,
    receivables:sum(overdueInvoices,invoice=>invoice.remaining),
    receivablesDue:sum(overdueInvoices,invoice=>invoice.due),
    missingDueDates:[...store.invoices,...store.bills].filter(row=>row.date<=today && !row.dueDate).length,
    unpaid:sum(current(store.bills),bill=>documentBalance(snapshot,'supplier',bill.id).remaining),
    inventory:roundRatio(inventoryValuation(store).assetMicros,COST_SCALE),
    grossProfit,
    missingCosts:invoices.some(invoice=>invoice.costTotal == null),
  };
}

function salesChart(store,today) {
  const [year,month] = today.split('-').map(Number);
  const months = Array.from({length:6},(_,index)=>{
    const date = new Date(Date.UTC(year,month-6+index,1));
    const key = date.toISOString().slice(0,7);
    const within = row => row.date?.startsWith(key) && row.date<=today;
    return {
      label:new Intl.DateTimeFormat('id-ID',{month:'short',year:'2-digit',timeZone:'UTC'}).format(date),
      sales:sum(store.invoices.filter(within),row=>row.total),
      purchases:sum(store.bills.filter(within),row=>row.total),
    };
  });
  const max = months.reduce((n,row)=>[row.sales,row.purchases].reduce((a,b)=>a>b?a:b,n),1n);
  const points = key => months.map((row,i)=>`${i*144},${205-Number(row[key]*19000n/max)/100}`).join(' ');
  return `<section class="panel chart-panel dashboard-section">
    <div class="panel-head"><div><h2>Performa Penjualan</h2><p>Invoice dan bills sebelum PPN</p></div><span class="period-pill">6 bulan terakhir</span></div>
    <div class="legend"><span><i class="dot blue-dot"></i>Penjualan</span><span><i class="dot gray-dot"></i>Pembelian</span></div>
    <div class="plot"><svg viewBox="0 0 720 220" preserveAspectRatio="none" role="img"
      aria-label="Tren penjualan dan pembelian enam bulan">
      <line x1="0" y1="205" x2="720" y2="205" stroke="#dce5f0"/>
      <polyline points="${points('purchases')}" stroke="#8796ad" stroke-dasharray="8 6" stroke-width="4" fill="none"/>
      <polyline points="${points('sales')}" stroke="#3769de" stroke-width="4" fill="none"/>
    </svg></div>
    <div class="dashboard-months">${months.map(row=>`<div><strong>${esc(row.label)}</strong><span>${money(row.sales)}</span><small>${money(row.purchases)}</small></div>`).join('')}</div>
  </section>`;
}

function progressChart(label, numerator, denominator) {
  if (denominator === 0n) return `<p class="dashboard-indicator">${label} · —</p>`;
  const ratio = Number(roundRatio(numerator * 10000n, denominator)) / 100;
  const percent = ratio.toLocaleString('id-ID', {maximumFractionDigits:2, signDisplay:ratio<0?'always':'auto'});
  return `<div class="dashboard-indicator"><span>${label} · <b>${percent}%</b></span>
    <div class="dashboard-meter ${ratio<0?'down':''}" aria-hidden="true"><span style="width:${Math.min(Math.abs(ratio),100)}%"></span></div></div>`;
}

export function mountDashboardAnalytics(root) {
  function render(){
    try {
      const today = salesOrderDate();
      const summary = dashboardSummary(demoStore,today);
      const stats = [
        ['Total Penjualan Bulan Ini',summary.sales,'Invoice yang sudah diterbitkan, sebelum PPN','blue','↗'],
        ['Total Tagihan Bulan Ini',summary.unpaid,'Sisa bills bulan ini, termasuk PPN','purple','▣'],
        ['Total Piutang Bulan Ini',summary.receivables,'Sisa invoice yang sudah jatuh tempo bulan ini','blue','↙'],
        ['Nilai Persediaan',summary.inventory,'Nilai stok seluruh gudang saat ini','amber','◫'],
        ['Estimasi Laba Kotor Bulan Ini',summary.missingCosts ? null : summary.grossProfit,'Penjualan neto dikurangi HPP, setelah retur','green','◎'],
      ];
      const orders = demoStore.orders.slice(-4).reverse();
      const activities = [
        ...demoStore.orders.map(o=>({label:'Sales Order dibuat',detail:o.id+' · '+o.customer,at:o.history?.[0]?.at ?? o.date})),
        ...demoStore.invoices.map(i=>({label:'Invoice diterbitkan',detail:i.id+' · '+i.customer,at:i.at ?? i.date})),
        ...demoStore.bills.map(b=>({label:'Tagihan vendor dicatat',detail:b.id+' · '+b.supplier,at:b.at ?? b.date})),
        ...demoStore.payments.map(p=>({label:p.type==='customer'?'Pembayaran customer':'Pembayaran vendor',detail:p.sourceId+' · '+money(BigInt(p.amount)),at:p.at ?? p.date})),
      ].filter(row=>row.at).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,6);
      root.innerHTML = `<section class="stats" aria-label="Ringkasan indikator bisnis">
        ${stats.map(([label,value,note,tone,icon])=>`<article class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div>
        <strong>${value===null?'—':money(value)}</strong><div class="stat-foot">${value===null?'HPP invoice belum lengkap':note}</div>
        ${tone==='blue' && icon==='↗' ? progressChart('Perubahan vs. bulan lalu',summary.sales-summary.previousSales,summary.previousSales) : ''}
        ${icon==='↙' ? progressChart('Belum dibayar · invoice jatuh tempo bulan ini',summary.receivables,summary.receivablesDue) : ''}
        ${tone==='purple' ? progressChart('Belum dibayar · bills jatuh tempo bulan ini',summary.dueUnpaid,summary.dueTotal) : ''}</article>`).join('')}</section>
        ${summary.missingDueDates ? `<p class="sku-guidance">${summary.missingDueDates} dokumen belum memiliki jatuh tempo dan dikecualikan dari indikator jatuh tempo.</p>` : ''}
        ${salesChart(demoStore,today)}
        <section class="panel table-panel dashboard-section"><h2>Sales Order Terbaru</h2>
        <div class="table-scroll"><table><thead><tr><th>NO. ORDER</th><th>CUSTOMER</th><th>PRODUK</th><th>TOTAL</th><th>STATUS</th></tr></thead>
        <tbody>${orders.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(o.customer)}</td><td>${esc(o.lines.map(l=>l.name).join(', '))}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada Sales Order.</td></tr>'}</tbody></table></div></section>
        <section class="panel activities dashboard-section"><h2>Aktivitas Terbaru</h2>
        <div class="activity-list">${activities.map(row=>`<div class="activity"><span class="activity-icon blue">•</span><div><strong>${esc(row.label)}</strong><p>${esc(row.detail)}</p><small>${esc(new Date(row.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}))}</small></div></div>`).join('')||'<p>Belum ada aktivitas transaksi.</p>'}</div></section>`;
    } catch(error) {
      root.innerHTML = `<p role="alert">${esc(error.message)}</p>`;
    }
  }
  subscribeDemo(render);
  render();
}
