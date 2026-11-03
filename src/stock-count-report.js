import {demoStore, subscribeDemo} from './demo-store.js';
import {WAREHOUSES} from './sku-model.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => (
 {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]
));

export function mountStockCountReport(root) {
 const counts = new Map();
 root.innerHTML = `<section class="panel ar-aging">
 <label>Gudang <select name="warehouse">${WAREHOUSES.map(w =>
  `<option value="${escape(w.id)}">${escape(w.name)}</option>`).join('')}</select></label>
 <header class="ar-aging-title"><h2>Bangkit Bersama Indonesia</h2>
 <h3>Physical Inventory Worksheet</h3><p class="stock-count-date"></p></header>
 <div class="table-scroll"><table style="min-width:680px">
 <thead><tr><th>Item</th><th>Description</th><th>Preferred Vendor</th>
 <th>Quantity On Hand (pcs)</th><th>Physical Count (pcs)</th></tr></thead>
 <tbody></tbody></table></div>
 <p class="sku-guidance">Hasil hitung fisik tersimpan sementara selama workspace terbuka. Stok sistem ditampilkan secara langsung. Pengisian lembar ini tidak membukukan penyesuaian stok.</p>
 </section>`;
 const warehouse = root.querySelector('select');
 const body = root.querySelector('tbody');
 const key = sku => JSON.stringify([warehouse.value, sku]);
 function render() {
  const date = new Intl.DateTimeFormat('en-US', {dateStyle:'long', timeZone:'Asia/Jakarta'}).format(new Date());
  root.querySelector('.stock-count-date').textContent = date + ' · ' + warehouse.selectedOptions[0].textContent;
  const quantities = new Map();
  for (const balance of demoStore.balances) {
   if (balance.warehouseId === warehouse.value) {
    quantities.set(balance.sku, (quantities.get(balance.sku) ?? 0) + balance.quantityPcs);
   }
  }
  const products = [...demoStore.products].sort((a,b) => a.sku.localeCompare(b.sku, 'id'));
  body.innerHTML = products.map(product => `<tr>
  <th scope="row">${escape(product.sku)}</th>
  <td>${escape([product.name, product.size, product.color].filter(Boolean).join(' · '))}</td>
  <td>${escape(product.preferredVendor || '—')}</td>
  <td class="total">${(quantities.get(product.sku) ?? 0).toLocaleString('id-ID')}</td>
  <td><input type="number" min="0" step="1" style="width:8em" data-sku="${escape(product.sku)}"
  aria-label="Physical Count ${escape(product.sku)} (pcs)" value="${escape(counts.get(key(product.sku)) ?? '')}"></td>
  </tr>`).join('') || '<tr><td colspan="5">Belum ada SKU.</td></tr>';
 }
 body.addEventListener('input', event => {
  const input = event.target;
  if (input.validity.valid) counts.set(key(input.dataset.sku), input.value);
 });
 warehouse.addEventListener('change', render);
 subscribeDemo(render);
 render();
}
