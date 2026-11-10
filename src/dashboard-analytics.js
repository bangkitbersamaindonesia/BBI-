import {arAgingSummary} from './ar-aging-model.js';
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

export function overdueCollectionTotals(store, today) {
  const aging = arAgingSummary(store, today);
  const totals = [0n, 0n, 0n, 0n];
  for (const {documents} of aging.rows) {
    for (const invoice of documents) {
      if (invoice.hasDue && invoice.bucket > 0 && invoice.amount > 0n) {
        totals[invoice.bucket - 1] += invoice.amount;
      }
    }
  }
  return totals;
}

export function collectionPanel(store, today) {
  const totals = overdueCollectionTotals(store, today);
  const groups = [['<30', '1–30 hari'], ['<60', '31–60 hari'], ['<90', '61–90 hari'], ['NPL', 'Lebih dari 90 hari']];
  return `<section class="panel dashboard-section" aria-labelledby="dashboard-collection-title">
    <div class="panel-head"><div><h2 id="dashboard-collection-title">Total A/R Aging yang Harus Segera Ditagih</h2>
    <p>Sisa saldo invoice lewat jatuh tempo dari seluruh periode</p></div>
    <button type="button" class="secondary-button" data-collection="all">Lihat semua · ${money(totals.reduce((total, amount) => total + amount, 0n))}</button></div>
    <div class="stats">${groups.map(([label, days], index) => `<button type="button" class="stat collection-card" data-collection="${index+1}">
      <div class="stat-top"><span>${esc(label)}</span><span>${days}</span></div>
      <strong>${money(totals[index])}</strong><small>Lihat tagihan →</small></button>`).join('')}</div>
    <dialog class="collection-dialog"><h2>Tagihan customer yang harus ditagih</h2>
      <p>Posisi ${esc(today)} · <span class="collection-filter-label">Semua keterlambatan</span></p>
      <div class="table-scroll"><table><thead><tr><th>Nama toko / customer</th><th>Invoice</th><th>Jatuh tempo</th><th>Terlambat</th><th>Sisa tagihan</th></tr></thead>
      <tbody>${arAgingSummary(store,today).rows.flatMap(customer=>customer.documents
        .filter(invoice=>invoice.hasDue && invoice.bucket>0 && invoice.amount>0n)
        .map(invoice=>`<tr data-collection-monthly="${invoice.baseDate.startsWith(today.slice(0,7))}" data-collection-bucket="${invoice.bucket}"><td>${esc(customer.name)}</td><td>${esc(invoice.id)}</td><td>${esc(invoice.baseDate)}</td><td>${invoice.days} hari</td><td>${money(invoice.amount)}</td></tr>`)).join('')}</tbody></table></div>
      <p class="collection-empty" hidden>Tidak ada tagihan dalam kelompok ini.</p>
      <p>Total <strong class="collection-selected-total"></strong></p>
      <form method="dialog"><button class="primary-button">Tutup</button></form>
    </dialog>
  </section>`;
}

export function bindCollectionDetails(root) {
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-collection]');
    if (!button) return;
    const dialog = root.querySelector('.collection-dialog');
    if (!dialog) return;
    const bucket = button.dataset.collection;
    const labels = ['Semua keterlambatan','1–30 hari','31–60 hari','61–90 hari','Lebih dari 90 hari'];
    dialog.querySelector('.collection-filter-label').textContent = bucket === 'month' ? 'Jatuh tempo bulan ini sampai tanggal laporan' : labels[bucket === 'all' ? 0 : Number(bucket)];
    let shown = 0;
    dialog.querySelectorAll('[data-collection-bucket]').forEach(row => {
      row.hidden = bucket === 'month' ? row.dataset.collectionMonthly !== 'true' : bucket !== 'all' && row.dataset.collectionBucket !== bucket;
      if (!row.hidden) shown++;
    });
    dialog.querySelector('.collection-empty').hidden = shown > 0;
    dialog.querySelector('.collection-selected-total').textContent = button.querySelector('strong')?.textContent ?? button.textContent.split('·').pop().trim();
    dialog.showModal();
  });
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

export function mountDashboardAnalytics(root, onLogout) {
  root.addEventListener('click', event => {
    if(event.target.closest('[data-dashboard-logout]'))onLogout?.();
  });
  bindCollectionDetails(root);
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
      root.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button type="button" class="secondary-button" data-dashboard-logout>Logout</button></div><section class="stats" aria-label="Ringkasan indikator bisnis">
        ${stats.map(([label,value,note,tone,icon])=>`<${icon==='↙'?'button type="button" data-collection="month"':'article'} class="stat ${icon==='↙'?'collection-card':''}"><div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div>
        <strong>${value===null?'—':money(value)}</strong><div class="stat-foot">${value===null?'HPP invoice belum lengkap':note}</div>
        ${tone==='blue' && icon==='↗' ? progressChart('Perubahan vs. bulan lalu',summary.sales-summary.previousSales,summary.previousSales) : ''}
        ${icon==='↙' ? progressChart('Belum dibayar · invoice jatuh tempo bulan ini',summary.receivables,summary.receivablesDue) : ''}
        ${tone==='purple' ? progressChart('Belum dibayar · bills jatuh tempo bulan ini',summary.dueUnpaid,summary.dueTotal) : ''}</${icon==='↙'?'button':'article'}>`).join('')}</section>
        ${summary.missingDueDates ? `<p class="sku-guidance">${summary.missingDueDates} dokumen belum memiliki jatuh tempo dan dikecualikan dari indikator jatuh tempo.</p>` : ''}
        ${collectionPanel(demoStore,today)}
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
