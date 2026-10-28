import { demoStore as store, subscribeDemo, notifyDemo } from './demo-store.js';
import { UNITS, WAREHOUSES, toPcs } from './sku-model.js';
import { submitOrder, reviewOrder, createPurchaseOrder, readyPurchaseOrder } from './sales-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>new Intl.NumberFormat('id-ID').format(value);
const money=value=>'Rp '+num(value);
const warehouseName=id=>WAREHOUSES.find(w=>w.id===id)?.name ?? id;
const units=()=>Object.keys(UNITS).map(u=>`<option value="${u}">${u}</option>`).join('');
const warehouses=()=>WAREHOUSES.map(w=>`<option value="${w.id}">${w.name}</option>`).join('');
const history=items=>`<details class="workflow-history"><summary>Riwayat demo</summary><ul>${items.map(h=>`<li>${esc(h.action)} · ${esc(new Date(h.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}))}</li>`).join('')}</ul></details>`;
export function mountSales(salesRoot,purchasingRoot) {
  let role='sales'; let lineId=0;
  const banner=`<div class="demo-banner"><strong>Demo alur Sales → Admin 1 → Purchasing</strong><span>Data sesi ini hilang saat reload. Peran simulasi, tanpa login. PO belum dikirim ke supplier.</span></div>`;
  const roleControl=prefix=>`<div class="workflow-role"><label for="${prefix}-role">Peran simulasi</label><select id="${prefix}-role" class="role-select"><option value="sales">Sales</option><option value="admin1">Admin 1</option></select><span>1. Input SO → 2. Cek stok → 3. Draft PO kekurangan</span></div>`;
  salesRoot.innerHTML=`${banner}${roleControl('sales')}<section class="panel" id="so-entry"><h2>Sales Order pelanggan</h2><p class="sku-guidance">Diisi oleh sales. Harga per pcs; 1 lusin = 12, kodi = 20, gros = 144 pcs.</p><form id="so-form"><div class="sku-form-grid">
    <label for="so-customer">Nama pelanggan<input id="so-customer" name="customer" required maxlength="500" placeholder="PT / CV / nama toko" /></label>
    <label for="so-salesperson">Nama sales<input id="so-salesperson" name="salesperson" required maxlength="500" /></label>
    <label for="so-date">Tanggal kebutuhan<input id="so-date" name="deliveryDate" type="date" required /></label>
    <label class="sku-notes" for="so-address">Alamat kirim<textarea id="so-address" name="address" required maxlength="500" rows="2"></textarea></label>
    <label class="sku-notes" for="so-notes">Catatan pelanggan (opsional)<textarea id="so-notes" name="notes" maxlength="500" rows="2"></textarea></label>
    </div><div id="so-lines"></div><div class="sku-actions"><button class="secondary-button" id="add-so-line" type="button">+ Tambah item</button></div><p id="so-total" class="workflow-total" aria-live="polite"></p><p class="sku-guidance">Total barang sebelum pajak, diskon, dan ongkos kirim. Pengajuan SO belum mengurangi stok fisik.</p><button class="primary-button" type="submit">Ajukan ke Admin 1</button></form></section><p class="workflow-message" id="sales-message" role="status" aria-live="polite"></p><section id="so-orders" aria-label="Daftar Sales Order"></section>`;
  purchasingRoot.innerHTML=`${banner}${roleControl('purchase')}<p class="workflow-message" id="purchase-message" role="status" aria-live="polite"></p><div id="po-orders"></div>`;
  const form=salesRoot.querySelector('#so-form');
  const linesRoot=salesRoot.querySelector('#so-lines');
  function productOptions(selected='') {return '<option value="">Pilih SKU</option>'+store.products.map(p=>`<option value="${esc(p.sku)}" ${p.sku===selected?'selected':''}>${esc(p.sku+' · '+p.name+' · '+p.size+' · '+p.color)}</option>`).join('');}
  function addLine() {
    const id=++lineId;
    const line=document.createElement('fieldset'); line.className='so-line';
    line.innerHTML=`<legend>Item pesanan</legend><div class="sku-form-grid"><label for="so-item-${id}">SKU<select class="line-sku" id="so-item-${id}" required>${productOptions()}</select></label><label for="so-qty-${id}">Qty<input class="line-qty" id="so-qty-${id}" type="number" min="0" step="any" value="1" required /></label><label for="so-unit-${id}">Satuan<select class="line-unit" id="so-unit-${id}">${units()}</select></label><label for="so-price-${id}">Harga jual (Rp / pcs)<input class="line-price" id="so-price-${id}" type="number" min="0" step="1" required /></label></div><p class="line-summary selected-range"></p><button class="secondary-button remove-so-line" type="button">Hapus item</button>`;
    linesRoot.append(line); preview();
  }
  function readLines() {return [...linesRoot.querySelectorAll('.so-line')].map(line=>({sku:line.querySelector('.line-sku').value,qty:line.querySelector('.line-qty').value,unit:line.querySelector('.line-unit').value,price:line.querySelector('.line-price').value}));}
  function preview() {
    let total=0; let valid=linesRoot.children.length>0;
    [...linesRoot.children].forEach(line=>{
      try {
        const qty=toPcs(line.querySelector('.line-qty').value,line.querySelector('.line-unit').value);
        const raw=line.querySelector('.line-price').value; const price=Number(raw); const subtotal=qty*price;
        if (!raw || !Number.isSafeInteger(price) || price<0 || qty<=0 || !Number.isSafeInteger(subtotal)) throw Error();
        total+=subtotal; if(!Number.isSafeInteger(total)) throw Error();
        line.querySelector('.line-summary').textContent=`${num(qty)} pcs × ${money(price)} = ${money(subtotal)}`;
      } catch {valid=false;line.querySelector('.line-summary').textContent='Isi qty positif dengan hasil pcs bulat dan harga rupiah bulat.';}
    });
    salesRoot.querySelector('#so-total').textContent=valid?`Total barang: ${money(total)}`:'Total barang: lengkapi item pesanan.';
  }
  function setMessage(root,text) {root.querySelector('.workflow-message').textContent=text;}
  function renderOrders() {
    salesRoot.querySelector('#so-orders').innerHTML=store.orders.length?store.orders.map(o=>`<article class="panel table-panel"><div class="panel-head"><div><h2>${esc(o.id)} · ${esc(o.customer)}</h2><p>Sales: ${esc(o.salesperson)} · Kebutuhan: ${esc(o.deliveryDate)}</p></div><span class="status blue">${esc(o.status)}</span></div><p class="sku-guidance">Alamat: ${esc(o.address)}<br>Catatan: ${esc(o.notes || '—')}</p><div class="table-scroll"><table><thead><tr><th>SKU / BARANG</th><th>QTY PESAN</th><th>PCS</th><th>HARGA / PCS</th><th>SUBTOTAL</th></tr></thead><tbody>${o.lines.map(l=>`<tr><td>${esc(l.sku)}<br>${esc(l.name+' · '+l.size+' · '+l.color)}</td><td>${esc(l.qty+' '+l.unit)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.price)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang: ${money(o.total)}</p>
    ${o.review?`<h2>Hasil pemeriksaan Admin 1</h2><p class="sku-guidance">Snapshot saat diperiksa. Alokasi otomatis berurutan Lebak → Kediri → Besar. Stok fisik belum berkurang; alokasi demo mengurangi ketersediaan untuk SO berikutnya.</p><div class="table-scroll"><table><thead><tr><th>SKU</th>${WAREHOUSES.map(w=>`<th>${w.name.toUpperCase()}<br>TERSEDIA / ALOKASI PCS</th>`).join('')}<th>KEKURANGAN PCS</th></tr></thead><tbody>${o.review.map(l=>`<tr><td>${esc(l.sku)}</td>${l.warehouses.map(w=>`<td>${num(w.available)} / ${num(w.allocated)}</td>`).join('')}<td>${num(l.shortage)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${role==='admin1' && o.status==='Menunggu Admin 1'?`<button class="primary-button" type="button" data-review="${esc(o.id)}">Cek stok semua gudang & alokasikan</button>`:''}
    ${role==='admin1' && o.status==='Perlu PO'?`<form class="po-create" data-order="${esc(o.id)}"><h2>Buat PO untuk kekurangan</h2><div class="sku-form-grid"><label for="supplier-${o.id}">Vendor / supplier<input id="supplier-${o.id}" name="supplier" required maxlength="200" placeholder="Nama supplier tujuan" /></label><label for="warehouse-${o.id}">Gudang tujuan<select id="warehouse-${o.id}" name="warehouseId">${warehouses()}</select></label></div><p class="sku-guidance">Hanya qty yang kurang. Harga beli awal memakai master SKU per pcs; periksa kesepakatan supplier sebelum pengiriman.</p><button class="primary-button" type="submit">Buat draft PO</button></form>`:''}${history(o.history)}</article>`).join(''):'<section class="panel table-panel"><h2>Belum ada Sales Order</h2><p class="sku-guidance">Sales dapat mengajukan pesanan pertama melalui form di atas.</p></section>';
  }
  function renderPurchasing() {
    purchasingRoot.querySelector('#po-orders').innerHTML=store.purchaseOrders.length?store.purchaseOrders.map(po=>`<article class="panel table-panel"><div class="panel-head"><div><h2>${esc(po.id)} · ${esc(po.supplier)}</h2><p>Sumber: ${esc(po.orderId)} · Tujuan: ${esc(warehouseName(po.warehouseId))}</p></div><span class="status amber">${esc(po.status)}</span></div><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY KEKURANGAN (PCS)</th><th>HARGA BELI / PCS</th><th>SUBTOTAL</th></tr></thead><tbody>${po.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.price)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang: ${money(po.total)}</p><p class="sku-guidance">Sebelum pajak dan ongkir. Belum dikirim ke supplier; belum ada penerimaan barang atau penambahan stok.</p>${role==='admin1' && po.status==='Draft'?`<button class="primary-button" type="button" data-ready="${esc(po.id)}">Tandai siap dikirim</button>`:''} <button class="secondary-button" type="button" data-download="${esc(po.id)}">Unduh PO demo (.txt)</button>${history(po.history)}</article>`).join(''):'<section class="panel"><h2>Belum ada Purchase Order</h2><p class="sku-guidance">Admin 1 membuat draft PO dari SO yang kekurangan stok pada menu Sales.</p></section>';
  }
  function syncRole() {
    for(const root of [salesRoot,purchasingRoot]) root.querySelector('.role-select').value=role;
    salesRoot.querySelector('#so-entry').hidden=role!=='sales';
    renderOrders();renderPurchasing();
  }
  for(const root of [salesRoot,purchasingRoot]) root.querySelector('.role-select').addEventListener('change',e=>{role=e.target.value;syncRole();});
  salesRoot.querySelector('#add-so-line').addEventListener('click',addLine);
  linesRoot.addEventListener('click',e=>{if(e.target.closest('.remove-so-line')){e.target.closest('.so-line').remove();preview();}});
  linesRoot.addEventListener('input',preview);
  linesRoot.addEventListener('change',e=>{
    if(e.target.matches('.line-sku')){const p=store.products.find(p=>p.sku===e.target.value);e.target.closest('.so-line').querySelector('.line-price').value=p?.sellingPrice ?? '';}
    preview();
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    try {const o=submitOrder(store,{...Object.fromEntries(new FormData(form)),lines:readLines()},role); form.reset();linesRoot.replaceChildren();addLine();notifyDemo();setMessage(salesRoot,`${o.id} diajukan. Pilih peran Admin 1 untuk memeriksa stok.`);}
    catch(error){setMessage(salesRoot,error.message);}
  });
  salesRoot.querySelector('#so-orders').addEventListener('click',e=>{
    const button=e.target.closest('[data-review]'); if(!button)return;
    try{const o=reviewOrder(store,button.dataset.review,role);notifyDemo();setMessage(salesRoot,`${o.id}: ${o.status}.`);}catch(error){setMessage(salesRoot,error.message);}
  });
  salesRoot.querySelector('#so-orders').addEventListener('submit',e=>{
    const poForm=e.target.closest('.po-create');if(!poForm)return;e.preventDefault();
    try{const po=createPurchaseOrder(store,poForm.dataset.order,Object.fromEntries(new FormData(poForm)),role);notifyDemo();setMessage(salesRoot,`${po.id} dibuat untuk ${po.supplier}. Buka Purchasing untuk memeriksa dan mengunduh PO.`);}catch(error){setMessage(salesRoot,error.message);}
  });
  purchasingRoot.querySelector('#po-orders').addEventListener('click',e=>{
    const ready=e.target.closest('[data-ready]');const download=e.target.closest('[data-download]');
    try{
      if(ready){const po=readyPurchaseOrder(store,ready.dataset.ready,role);notifyDemo();setMessage(purchasingRoot,`${po.id} siap dikirim. Pengiriman ke supplier dilakukan di luar demo.`);}
      if(download){const po=store.purchaseOrders.find(p=>p.id===download.dataset.download);const body=`PURCHASE ORDER DEMO — BUKAN PESANAN RESMI\n${po.id}\nSupplier: ${po.supplier}\nSumber SO: ${po.orderId}\nGudang tujuan: ${warehouseName(po.warehouseId)}\nStatus: ${po.status}\n\n${po.lines.map(l=>`${l.sku} | ${l.quantityPcs} pcs | ${money(l.price)}/pcs | ${money(l.subtotal)}`).join('\n')}\n\nTotal barang: ${money(po.total)}\nSebelum pajak dan ongkir. Belum dikirim.\n`;const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=po.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch(error){setMessage(purchasingRoot,error.message);}
  });
  subscribeDemo(()=>{
    linesRoot.querySelectorAll('.line-sku').forEach(select=>{const value=select.value;select.innerHTML=productOptions(value);});
    renderOrders();renderPurchasing();
  });
  addLine();syncRole();
}
