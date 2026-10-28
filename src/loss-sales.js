import { netLossRecords } from './fulfillment-model.js';
import { demoStore as store, subscribeDemo } from './demo-store.js';
import { filterLossSales, summarizeLossSales, lossSalesCsv, validDate } from './supplier-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>new Intl.NumberFormat('id-ID').format(value);
const money=value=>'Rp '+num(value);
export function mountLossSales(root) {
  root.innerHTML=`<div class="demo-banner"><strong>Loss sales · Data demo sesi ini</strong><span>Kekurangan final supplier dan kegagalan kirim BBI, dengan pemulihan lewat SKU pengganti. PO menunggu respons tidak dihitung.</span></div><section class="panel"><h2>Laporan loss sales</h2><p class="sku-guidance">Kekurangan awal tetap tersimpan. Loss net = kekurangan awal dikurangi qty yang sudah dipenuhi lewat SKU pengganti. Filter tanggal memakai tanggal kejadian awal; pemulihan mencerminkan pengiriman terbaru. Potensi omzet = loss pcs × harga jual pada SO; bukan laba, penjualan terealisasi, atau nilai tagihan.</p><form id="loss-filters" class="sku-form-grid"><label for="loss-start">Tanggal kejadian dari<input id="loss-start" name="start" type="date" /></label><label for="loss-end">Tanggal kejadian sampai<input id="loss-end" name="end" type="date" /></label><label for="loss-sku">SKU<input id="loss-sku" name="sku" type="search" placeholder="Kode SKU" /></label><label for="loss-supplier">Supplier<input id="loss-supplier" name="supplier" type="search" /></label><label for="loss-customer">Pelanggan<input id="loss-customer" name="customer" type="search" /></label><div class="sku-actions"><button class="secondary-button" type="reset">Reset filter</button><button class="primary-button" id="loss-export" type="button">Ekspor CSV</button></div></form><p id="loss-filter-message" role="status" class="workflow-message"></p></section><div id="loss-summary" class="stats loss-stats" aria-live="polite"></div><section class="panel table-panel"><h2>Prioritas SKU berdasarkan potensi omzet hilang</h2><div class="table-scroll"><table><thead><tr><th>SKU / BARANG</th><th>LOSS PCS</th><th>POTENSI OMZET</th></tr></thead><tbody id="loss-groups"></tbody></table></div></section><section class="panel table-panel"><h2>Rincian loss sales</h2><div class="table-scroll"><table class="loss-details"><thead><tr><th>TANGGAL KEJADIAN</th><th>SO / PO</th><th>PELANGGAN / SALES</th><th>SUPPLIER</th><th>SKU / VARIAN</th><th>KEKURANGAN AWAL PCS</th><th>TERPENUHI PENGGANTI PCS</th><th>LOSS NET PCS</th><th>HARGA JUAL / PCS</th><th>POTENSI OMZET</th><th>ALASAN</th></tr></thead><tbody id="loss-details"></tbody></table></div></section>`;
  const form=root.querySelector('form');let filtered=[];
  function render(){
    const filters=Object.fromEntries(new FormData(form));
    const invalid=(filters.start&&!validDate(filters.start))||(filters.end&&!validDate(filters.end))||(filters.start&&filters.end&&filters.start>filters.end);
    root.querySelector('#loss-filter-message').textContent=invalid?'Periksa rentang tanggal kejadian. Tanggal awal harus sebelum atau sama dengan tanggal akhir.':'';
    root.querySelector('#loss-export').disabled=Boolean(invalid);
    filtered=invalid?[]:filterLossSales(netLossRecords(store),filters);
    const summary=summarizeLossSales(filtered);
    root.querySelector('#loss-summary').innerHTML=[['Kekurangan awal (pcs)',num(summary.grossPcs)],['Terpenuhi pengganti (pcs)',num(summary.recoveredPcs)],['Loss net (pcs)',num(summary.quantityPcs)],['Potensi omzet net hilang',money(summary.potentialRevenue)]].map(([label,value])=>`<article class="stat"><div class="stat-top">${label}</div><strong>${value}</strong></article>`).join('');
    root.querySelector('#loss-groups').innerHTML=summary.groups.map(g=>`<tr><td>${esc(g.sku)}<br>${esc(g.name+' · '+g.size+' · '+g.color)}</td><td>${num(g.quantityPcs)}</td><td>${money(g.potentialRevenue)}</td></tr>`).join('')||'<tr><td colspan="3">Belum ada loss sales yang cocok dengan filter.</td></tr>';
    root.querySelector('#loss-details').innerHTML=filtered.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.orderId)}<br>${esc(r.poId)}</td><td>${esc(r.customer)}<br>${esc(r.salesperson)}</td><td>${esc(r.supplier)}</td><td>${esc(r.sku)}<br>${esc(r.name+' · '+r.size+' · '+r.color)}</td><td>${num(r.grossPcs)}</td><td>${num(r.recoveredPcs)}</td><td>${num(r.quantityPcs)}</td><td>${money(r.sellingPrice)}</td><td>${money(r.potentialRevenue)}</td><td>${esc(r.reason)}</td></tr>`).join('')||'<tr><td colspan="11">Belum ada loss sales yang cocok dengan filter.</td></tr>';
  }
  form.addEventListener('input',render);form.addEventListener('change',render);form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('reset',()=>queueMicrotask(render));
  root.querySelector('#loss-export').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([lossSalesCsv(filtered)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='loss-sales-demo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  subscribeDemo(render);render();
}
