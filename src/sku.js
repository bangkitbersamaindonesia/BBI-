import { demoStore, notifyDemo } from './demo-store.js';
import { UNITS, WAREHOUSES, validateSku, toPcs, totalPcs } from './sku-model.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = new Intl.NumberFormat('id-ID');
const money = value => 'Rp ' + number.format(value);
export function mountSku(root) {
  const { products, balances } = demoStore;
  const field = (key, label, type='text', extra='') => `<label for="sku-${key}">${label}<input id="sku-${key}" name="${key}" type="${type}" ${extra} aria-describedby="error-${key}" /><small class="field-error" id="error-${key}"></small></label>`;
  root.innerHTML = `
    <div class="demo-banner"><strong>Master SKU · Demo</strong><span>Data hanya tersimpan selama halaman terbuka dan akan kembali ke contoh saat dimuat ulang.</span></div>
    <section class="panel"><div class="panel-head"><div><h2>Tambah SKU garment</h2><p>Satu kode SKU untuk setiap kombinasi barang, size, dan warna.</p></div></div>
    <form id="sku-form" novalidate><div class="sku-form-grid">
      ${field('sku','Kode SKU','text','required maxlength="64" placeholder="OXF-BLK-XL"')}
      ${field('name','Nama barang','text','required maxlength="120"')}
      ${field('size','Size','text','required maxlength="120" placeholder="S, M, L, XL, 28…"')}
      ${field('color','Warna','text','required maxlength="120"')}
      ${field('purchasePrice','Harga beli (Rp / pcs)','number','required min="0" step="1"')}
      ${field('sellingPrice','Harga jual (Rp / pcs)','number','required min="0" step="1"')}
      ${field('qty','Qty awal di gudang terpilih','number','required min="0" step="any" value="0"')}
      <label for="sku-unit">Satuan qty<select id="sku-unit" name="unit">${Object.keys(UNITS).map(u=>`<option>${u}</option>`).join('')}</select></label>
      <label for="sku-warehouse">Gudang stok awal<select id="sku-warehouse" name="warehouseId" aria-describedby="error-warehouseId">${WAREHOUSES.map(w=>`<option value="${w.id}">${w.name}</option>`).join('')}</select><small class="field-error" id="error-warehouseId"></small></label>
      <label class="sku-notes" for="sku-notes">Keterangan (opsional)<textarea id="sku-notes" name="notes" maxlength="500" rows="2" aria-describedby="error-notes"></textarea><small class="field-error" id="error-notes"></small></label>
    </div><p class="sku-guidance">1 pcs = 1 · 1 lusin = 12 pcs · 1 kodi = 20 pcs · 1 gros = 144 pcs. Pecahan satuan boleh jika hasilnya pcs bulat. Harga selalu per pcs.</p>
    <p id="sku-conversion" class="selected-range" aria-live="polite"></p>
    <div class="sku-actions"><button class="primary-button" type="submit">Simpan SKU demo</button><button class="secondary-button" type="reset">Reset form</button></div>
    <p id="sku-message" role="status" aria-live="polite"></p></form></section>
    <section class="panel table-panel"><div class="panel-head"><div><h2>Daftar SKU</h2><p>Qty total dihitung dari stok pcs di seluruh gudang.</p></div><label for="sku-search" class="sku-search">Cari SKU / barang<input id="sku-search" type="search" placeholder="Kode, nama, size, warna…" /></label></div>
    <p id="sku-count" class="selected-range" aria-live="polite"></p><div class="table-scroll"><table class="sku-table"><thead><tr><th>KODE SKU</th><th>NAMA BARANG</th><th>SIZE</th><th>WARNA</th><th>HARGA BELI / PCS</th><th>HARGA JUAL / PCS</th><th>QTY TOTAL</th><th>SATUAN QTY</th><th>STOK PER GUDANG (PCS)</th><th>KETERANGAN</th></tr></thead><tbody id="sku-rows"></tbody></table></div></section>`;
  const form = root.querySelector('form');
  const message = root.querySelector('#sku-message');
  function preview() {
    try { root.querySelector('#sku-conversion').textContent = `Stok awal: ${number.format(toPcs(form.elements.qty.value, form.elements.unit.value))} pcs di ${form.elements.warehouseId.selectedOptions[0].textContent}.`; }
    catch { root.querySelector('#sku-conversion').textContent = 'Isi qty yang menghasilkan pcs bulat dan tidak negatif.'; }
  }
  function render() {
    const query = root.querySelector('#sku-search').value.trim().toLocaleLowerCase('id-ID');
    const shown = products.filter(p => [p.sku,p.name,p.size,p.color].some(v=>v.toLocaleLowerCase('id-ID').includes(query)));
    root.querySelector('#sku-count').textContent = `${shown.length} dari ${products.length} SKU`;
    root.querySelector('#sku-rows').innerHTML = shown.map(p => `<tr><td class="order-id">${escape(p.sku)}</td><td class="customer-name">${escape(p.name)}</td><td>${escape(p.size)}</td><td>${escape(p.color)}</td><td>${money(p.purchasePrice)}</td><td>${money(p.sellingPrice)}</td><td class="total">${number.format(totalPcs(p,balances))} pcs</td><td>${escape(p.unit)}<br><small>Total setara ${number.format(totalPcs(p,balances)/UNITS[p.unit])} ${escape(p.unit)}</small></td><td>${WAREHOUSES.map(w=>`${w.name}: ${number.format(balances.find(b=>b.sku===p.sku && b.warehouseId===w.id)?.quantityPcs ?? 0)}`).join('<br>')}</td><td>${escape(p.notes || '—')}</td></tr>`).join('') || '<tr><td colspan="10">Tidak ada SKU yang cocok.</td></tr>';
  }
  function clearErrors() { root.querySelectorAll('.field-error').forEach(el=>el.textContent=''); form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid')); }
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  form.addEventListener('reset', () => { clearErrors(); message.textContent=''; queueMicrotask(preview); });
  form.addEventListener('submit', event => {
    event.preventDefault(); clearErrors();
    const {value, errors} = validateSku(Object.fromEntries(new FormData(form)), products);
    if (Object.keys(errors).length) {
      for (const [key,error] of Object.entries(errors)) { root.querySelector(`#error-${key}`).textContent=error; form.elements[key].setAttribute('aria-invalid','true'); }
      message.textContent='SKU belum disimpan. Periksa kolom yang ditandai.';
      form.elements[Object.keys(errors)[0]].focus(); return;
    }
    const {quantityPcs, warehouseId, ...product} = value;
    products.push(product); balances.push({sku:product.sku,warehouseId,quantityPcs});
    form.reset(); render(); notifyDemo(); message.textContent=`SKU ${product.sku} berhasil ditambahkan ke demo.`;
  });
  root.querySelector('#sku-search').addEventListener('input', render);
  render(); preview();
}
