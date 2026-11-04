import {salesOrderDocument, printSalesOrder} from './sales-order-document.js';
import { issueCustomerInvoice } from './customer-invoice-model.js';
import { finalizeBillDraft } from './bill-draft-model.js';
import { submitSalesWorkflow, editPurchaseOrder, purchaseOrderText, createStockPurchaseOrder } from './workflow-model.js';
import { poEditor, readEditor, handleEditor, editorRow } from './workflow-editor.js';
import { mountReturnHandlers } from './returns.js';
import { fulfillmentPanel, readDispatch } from './fulfillment.js';
import { receiveSupplierGoods, dispatchCustomerOrder } from './fulfillment-model.js';
import { supplierPanel, readSupplierResponse, previewSupplierResponse } from './supplier.js';
import { recordSupplierResponse } from './supplier-model.js';
import { demoStore as store, subscribeDemo, notifyDemo } from './demo-store.js';
import { UNITS, WAREHOUSES, toPcs } from './sku-model.js';
import { salesLineAmounts, salesOrderDate, nextSalesOrderNumber, reviewOrder, createPurchaseOrder, readyPurchaseOrder } from './sales-model.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>new Intl.NumberFormat('id-ID').format(value);
const money=value=>'Rp '+num(value);
const warehouseName=id=>WAREHOUSES.find(w=>w.id===id)?.name ?? id;
const units=()=>Object.keys(UNITS).map(u=>`<option value="${u}">${u}</option>`).join('');
const warehouses=()=>WAREHOUSES.map(w=>`<option value="${w.id}">${w.name}</option>`).join('');
const history=items=>`<details class="workflow-history"><summary>Riwayat demo</summary><ul>${items.map(h=>`<li>${esc(h.action)} · ${esc(new Date(h.at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}))}</li>`).join('')}</ul></details>`;
export function mountSales(salesRoot,purchasingRoot,currentUser=null) {
  const lockedSales=currentUser?.role==='sales';
  let role='sales'; let lineId=0;
  const banner=`<div class="demo-banner"><strong>SO → Draft PO otomatis → Otorisasi → Bills / penerimaan → Invoice</strong><span>Data sesi ini hilang saat reload. Peran simulasi, tanpa login. PO dan respons supplier dicatat manual; tidak ada pengiriman otomatis.</span></div>`;
  const roleControl=prefix=>`<div class="workflow-role"><label for="${prefix}-role">Peran simulasi</label><select id="${prefix}-role" class="role-select"><option value="sales">Sales</option><option value="admin1">Admin 1</option><option value="admin2">Admin 2</option></select><span>1. SO → 2. Stok / PO → 3. Tagihan / penerimaan → 4. Pengiriman / invoice</span></div>`;
  salesRoot.innerHTML=`${banner}${roleControl('sales')}<section class="panel" id="so-entry"><h2>Sales Order</h2>
  <div class="so-toolbar" role="group" aria-label="Aksi Sales Order">
    <button type="button" class="secondary-button" data-so-action="find">Find</button>
    <button type="button" class="secondary-button" data-so-action="previous" aria-label="Sales Order sebelumnya">←</button>
    <button type="button" class="secondary-button" data-so-action="next" aria-label="Sales Order sesudahnya">→</button>
    <button type="button" class="secondary-button" data-so-action="new">New</button>
    <button type="submit" class="primary-button" data-so-action="save" form="so-form">Save</button>
    <button type="button" class="secondary-button" data-so-action="pdf">PDF</button>
  </div>
  <dialog id="so-find"><h2>Find Sales Order</h2><label>Cari nomor SO atau customer<input type="search" /></label>
    <div class="so-find-results"></div><form method="dialog"><button class="secondary-button">Tutup</button></form>
  </dialog>
  <div id="so-saved" hidden></div>
  <form id="so-form"><p class="sku-guidance">Diisi oleh sales. Harga mengikuti satuan yang dipilih; 1 lusin = 12, kodi = 20, gros = 144 pcs.</p><div class="sku-form-grid">
    <label for="so-customer">Nama toko / customer<select id="so-customer" name="customer" required></select></label>
    <label>Tanggal SO<input name="orderDate" type="date" readonly /></label>
    <label>S.O No.<input name="orderNumber" readonly /></label>
    <label for="so-salesperson">Sales<select id="so-salesperson" name="salesperson" required>
      <option value="">Pilih Sales</option><option>Doni</option><option>Lutfi</option><option>Dipa</option>
    </select></label>
    <label>Opsi invoice<select name="letterhead" required><option value="">Pilih opsi</option><option value="A">A · PT Bangkit Bersama Indonesia</option><option value="B">B · BBI</option></select></label>
    <label for="so-date">Tanggal kebutuhan<input id="so-date" name="deliveryDate" type="date" required /></label>
    <label class="sku-notes" for="so-address">Alamat kirim<textarea id="so-address" name="address" readonly rows="2"></textarea></label>
    <label class="sku-notes">Alamat ekspedisi<textarea name="expeditionAddress" readonly rows="2"></textarea></label>
    <label class="sku-notes" for="so-notes">Catatan pelanggan (opsional)<textarea id="so-notes" name="notes" maxlength="500" rows="2"></textarea></label>
    </div><div class="table-scroll so-grid"><table>
    <thead><tr><th>SKU</th><th>Deskripsi barang</th><th>Jumlah</th><th>Satuan</th><th>Harga jual</th><th>Subtotal</th><th>Aksi</th></tr></thead>
    <tbody id="so-lines"></tbody></table></div><div class="sku-actions"><button class="secondary-button" id="add-so-line" type="button">+ Tambah item</button></div><p id="so-total" class="workflow-total" aria-live="polite"></p><p class="sku-guidance">Total barang sebelum pajak, diskon, dan ongkos kirim. Pengajuan SO belum mengurangi stok fisik.</p></form></section><p class="workflow-message" id="sales-message" role="status" aria-live="polite"></p><section id="so-orders" aria-label="Daftar Sales Order"></section>`;
  purchasingRoot.innerHTML=`${banner}${roleControl('purchase')}<section class="panel" id="stock-po-entry" hidden><h2>PO langsung · Pengisian stok gudang</h2><p class="sku-guidance">Admin 1 membuat PO tanpa Sales Order. Simpan draft, lalu otorisasi sebelum dikirim. Bills final barang datang langsung menambah stok bebas; kekurangan dicatat sebagai loss sales pengisian stok.</p><form id="stock-po-form"><div class="sku-form-grid"><label>Vendor / supplier<input name="supplier" maxlength="200" required></label><label>Gudang tujuan<select name="warehouseId">${warehouses()}</select></label><label>Diskon PO (%)<input name="discountPercent" type="number" min="0" max="100" step="0.01" value="0" required></label><label>Term of payment<input name="paymentTerms" maxlength="500" required></label></div><div class="editable-items">${editorRow({},'po')}</div><button class="secondary-button" type="button" data-add-edit="po">+ Tambah SKU pengisian stok</button> <button class="primary-button" type="submit">Buat draft PO pengisian stok</button></form></section><p class="workflow-message" id="purchase-message" role="status" aria-live="polite"></p><div id="po-orders"></div>`;
  const form=salesRoot.querySelector('#so-form');
  const linesRoot=salesRoot.querySelector('#so-lines');
  const toolbar = salesRoot.querySelector('.so-toolbar');
  const savedView = salesRoot.querySelector('#so-saved');
  const findDialog = salesRoot.querySelector('#so-find');
  const findQuery = findDialog.querySelector('input');
  const findResults = findDialog.querySelector('.so-find-results');
  const visibleOrders = () => store.orders.filter(order => !lockedSales || order.salesperson === currentUser.name);
  let selectedOrderId = null;
  function showOrder(id = selectedOrderId) {
    const orders = visibleOrders();
    const index = orders.findIndex(order => order.id === id);
    const order = orders[index];
    selectedOrderId = order?.id ?? null;
    form.hidden = Boolean(order);
    savedView.hidden = !order;
    savedView.innerHTML = order ? salesOrderDocument(order) : '';
    toolbar.querySelector('[data-so-action="previous"]').disabled = !orders.length || index === 0;
    toolbar.querySelector('[data-so-action="next"]').disabled = index < 0 || index === orders.length - 1;
    toolbar.querySelector('[data-so-action="save"]').disabled = Boolean(order);
    toolbar.querySelector('[data-so-action="pdf"]').disabled = !order;
  }
  function resetOrderForm() {
    form.reset();
    refreshOrderNumber();
    fillCustomer();
    linesRoot.replaceChildren();
    addLine();
  }
  function renderFind() {
    const query = findQuery.value.trim().toLocaleLowerCase('id-ID');
    const matches = visibleOrders().filter(order =>
      `${order.id} ${order.customer}`.toLocaleLowerCase('id-ID').includes(query));
    findResults.innerHTML = matches.map(order =>
      `<button type="button" class="secondary-button" data-found-order="${esc(order.id)}">${esc(order.id)} · ${esc(order.customer)}</button>`
    ).join('') || '<p>Tidak ada Sales Order yang cocok.</p>';
  }
  findQuery.addEventListener('input', renderFind);
  findResults.addEventListener('click', event => {
    const match = event.target.closest('[data-found-order]');
    if (!match) return;
    showOrder(match.dataset.foundOrder);
    findDialog.close();
  });
  toolbar.addEventListener('click', event => {
    const action = event.target.closest('[data-so-action]')?.dataset.soAction;
    const orders = visibleOrders();
    const index = orders.findIndex(order => order.id === selectedOrderId);
    if (action === 'find') {
      findQuery.value = '';
      renderFind();
      findDialog.showModal();
    } else if (action === 'previous') {
      showOrder(orders[index < 0 ? orders.length - 1 : index - 1]?.id);
    } else if (action === 'next') {
      showOrder(orders[index + 1]?.id);
    } else if (action === 'new') {
      resetOrderForm();
      showOrder(null);
      form.elements.customer.focus();
    } else if (action === 'pdf' && index >= 0) {
      printSalesOrder(orders[index]);
    }
  });
  function refreshOrderNumber() {
    const date = salesOrderDate();
    form.elements.orderDate.value = date;
    try {form.elements.orderNumber.value = nextSalesOrderNumber(store.orders, date);}
    catch {form.elements.orderNumber.value = 'Urutan penuh';}
  }
  form.elements.salesperson.disabled = lockedSales;
  const customers = () => (store.customers ?? []).filter(c => c.active !== false && (!lockedSales || c.salesperson === currentUser.name));
  function fillCustomer() {
    const customer = customers().find(c => c.name === form.elements.customer.value);
    form.elements.salesperson.value = customer?.salesperson ?? '';
    form.elements.address.value = customer?.shippingAddress ?? customer?.address ?? '';
    form.elements.expeditionAddress.value = customer?.expeditionAddress ?? '';
  }
  function refreshCustomers() {
    const selected = form.elements.customer.value;
    const available = customers();
    form.elements.customer.replaceChildren(new Option(available.length ? 'Pilih customer' : 'Belum ada customer aktif untuk Sales ini', ''));
    for (const customer of available) form.elements.customer.add(new Option(customer.name, customer.name));
    form.elements.customer.value = available.some(c => c.name === selected) ? selected : '';
    fillCustomer();
  }
  form.elements.customer.addEventListener('change', fillCustomer);
  function productOptions(selected='') {return '<option value="">Pilih SKU</option>'+store.products.map(p=>`<option value="${esc(p.sku)}" ${p.sku===selected?'selected':''}>${esc(p.sku+' · '+p.name+' · '+p.size+' · '+p.color)}</option>`).join('');}
  function addLine() {
    const id=++lineId;
    const line=document.createElement('tr'); line.className='so-line';
    line.innerHTML=`<td><select class="line-sku" aria-label="SKU item ${id}" required>${productOptions()}</select></td>
    <td class="line-description">—</td>
    <td><input class="line-qty" aria-label="Jumlah item ${id}" type="number" min="0" step="any" value="1" required /></td>
    <td><select class="line-unit" aria-label="Satuan item ${id}">${units()}</select></td>
    <td><label><span class="line-price-label">Harga jual (Rp / pcs)</span><input class="line-price" type="number" min="0" step="1" required /></label></td>
    <td class="line-summary total">—</td>
    <td><button class="secondary-button remove-so-line" type="button" aria-label="Hapus item ${id}">Hapus</button></td>`;
    linesRoot.append(line); preview();
  }
  function readLines() {return [...linesRoot.querySelectorAll('.so-line')].map(line=>({sku:line.querySelector('.line-sku').value,qty:line.querySelector('.line-qty').value,unit:line.querySelector('.line-unit').value,price:line.querySelector('.line-price').value}));}
  function preview() {
    let total=0; let valid=linesRoot.children.length>0;
    [...linesRoot.children].forEach(line=>{
      try {
        const unit=line.querySelector('.line-unit').value;
        const qty=line.querySelector('.line-qty').value;
        const {subtotal}=salesLineAmounts(qty,unit,line.querySelector('.line-price').value,true);
        total+=subtotal; if(!Number.isSafeInteger(total)) throw Error();
        line.querySelector('.line-summary').textContent=money(subtotal);
      } catch {valid=false;line.querySelector('.line-summary').textContent='—';}
    });
    salesRoot.querySelector('#so-total').textContent=valid?`Total barang: ${money(total)}`:'Total barang: lengkapi item pesanan.';
  }
  function setMessage(root,text) {root.querySelector('.workflow-message').textContent=text;}
  function renderOrders() {
    salesRoot.querySelector('#so-orders').innerHTML=store.orders.filter(o=>!lockedSales||o.salesperson===currentUser.name).length?store.orders.filter(o=>!lockedSales||o.salesperson===currentUser.name).map(o=>`<article class="panel table-panel"><div class="panel-head"><div><h2>${esc(o.id)} · ${esc(o.customer)}</h2><p>Sales: ${esc(o.salesperson)} · Kebutuhan: ${esc(o.deliveryDate)}</p></div><span class="status blue">${esc(o.status)}</span></div><p class="sku-guidance">Alamat kirim: ${esc(o.address)}<br>Alamat ekspedisi: ${esc(o.expeditionAddress || '—')}<br>Catatan: ${esc(o.notes || '—')}</p><div class="table-scroll"><table><thead><tr><th>SKU / BARANG</th><th>QTY PESAN</th><th>PCS</th><th>HARGA / SATUAN</th><th>SUBTOTAL</th></tr></thead><tbody>${o.lines.map(l=>`<tr><td>${esc(l.sku)}<br>${esc(l.name+' · '+l.size+' · '+l.color)}</td><td>${esc(l.qty+' '+l.unit)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.unitPrice ?? l.price)} / ${esc(l.unitPrice === undefined ? 'pcs' : l.unit)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang: ${money(o.total)}</p>
    ${o.review&&!lockedSales?`<h2>Ketersediaan & alokasi stok</h2><p class="sku-guidance">Snapshot pemeriksaan stok otomatis / Admin 1. Alokasi otomatis berurutan Lebak → Kediri → Besar. Pemeriksaan tidak mengurangi stok fisik; alokasi demo mengurangi ketersediaan untuk SO berikutnya.</p><div class="table-scroll"><table><thead><tr><th>SKU</th>${WAREHOUSES.map(w=>`<th>${w.name.toUpperCase()}<br>TERSEDIA / ALOKASI PCS</th>`).join('')}<th>KEKURANGAN PCS</th></tr></thead><tbody>${o.review.map(l=>`<tr><td>${esc(l.sku)}</td>${l.warehouses.map(w=>`<td>${num(w.available)} / ${num(w.allocated)}</td>`).join('')}<td>${num(l.shortage)}</td></tr>`).join('')}</tbody></table></div>`:''}
    ${role==='admin1' && o.status==='Menunggu Admin 1'?`<button class="primary-button" type="button" data-review="${esc(o.id)}">Cek stok semua gudang & alokasikan</button>`:''}
    ${role==='admin1' && o.status==='Perlu PO'?`<form class="po-create" data-order="${esc(o.id)}"><h2>Buat PO untuk kekurangan</h2><div class="sku-form-grid"><label for="supplier-${o.id}">Vendor / supplier<input id="supplier-${o.id}" name="supplier" required maxlength="200" placeholder="Nama supplier tujuan" /></label><label for="warehouse-${o.id}">Gudang tujuan<select id="warehouse-${o.id}" name="warehouseId">${warehouses()}</select></label></div><p class="sku-guidance">Hanya qty yang kurang. Harga beli awal memakai master SKU per pcs; periksa kesepakatan supplier sebelum pengiriman.</p><button class="primary-button" type="submit">Buat draft PO</button></form>`:''}${lockedSales?'':fulfillmentPanel(o,role)}${history(o.history)}</article>`).join(''):'<section class="panel table-panel"><h2>Belum ada Sales Order</h2><p class="sku-guidance">Sales dapat mengajukan pesanan pertama melalui form di atas.</p></section>';
  }
  function renderPurchasing() {
    if(lockedSales){purchasingRoot.querySelector('#po-orders').innerHTML='';return;}
    purchasingRoot.querySelector('#po-orders').innerHTML=store.purchaseOrders.length?store.purchaseOrders.map(po=>`<article class="panel table-panel"><div class="panel-head"><div><h2>${esc(po.id)} · ${esc(po.supplier)}</h2><p>Sumber: ${esc(po.orderId??'Pengisian stok · tanpa SO')} · Tujuan: ${esc(warehouseName(po.warehouseId))}<br>Diskon PO: ${esc(po.discountPercent??0)}% · Term of payment: ${esc(po.paymentTerms||'Belum diisi')}</p></div><span class="status amber">${esc(po.status)}</span></div><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY PO (PCS)</th><th>HARGA BELI / PCS</th><th>SUBTOTAL</th></tr></thead><tbody>${po.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.price)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang: ${money(po.total)}</p><p class="sku-guidance">Sebelum pajak dan ongkir. Pengiriman PO dilakukan di luar demo. Finalisasi bills barang datang langsung menambah stok gudang.</p>${role==='admin1' && po.status==='Draft'?poEditor(po):''}${role==='admin1' && po.status==='Draft'?`<button class="primary-button" type="button" data-ready="${esc(po.id)}">Otorisasi PO · Admin 1</button>`:''} ${po.authorizedBy?`<button class="secondary-button" type="button" data-download="${esc(po.id)}">Cetak / unduh PO terotorisasi (.txt)</button>`:'<p class="sku-guidance">Cetak / unduh tersedia setelah otorisasi Admin 1.</p>'}${supplierPanel(po,role)}${history(po.history)}</article>`).join(''):'<section class="panel"><h2>Belum ada Purchase Order</h2><p class="sku-guidance">Draft PO otomatis muncul dari kekurangan stok saat Sales mengajukan SO.</p></section>';
  }
  function syncRole() {
    for(const root of [salesRoot,purchasingRoot]) root.querySelector('.role-select').value=role;
    salesRoot.querySelector('#so-entry').hidden=role!=='sales';
    purchasingRoot.querySelector('#stock-po-entry').hidden=role!=='admin1';
    renderOrders();renderPurchasing();
  }
  for(const root of [salesRoot,purchasingRoot]) root.querySelector('.role-select').addEventListener('change',e=>{if(lockedSales)return;role=e.target.value;syncRole();});
  salesRoot.querySelector('#add-so-line').addEventListener('click',addLine);
  linesRoot.addEventListener('click',e=>{if(e.target.closest('.remove-so-line')){e.target.closest('.so-line').remove();preview();}});
  linesRoot.addEventListener('input',preview);
  linesRoot.addEventListener('change',e=>{
    if(e.target.matches('.line-sku, .line-unit')){
      const line=e.target.closest('.so-line');
      const unit=line.querySelector('.line-unit').value;
      const product=store.products.find(p=>p.sku===line.querySelector('.line-sku').value);
      line.querySelector('.line-description').textContent=product ? [product.name,product.size,product.color].filter(Boolean).join(' · ') : '—';
      line.querySelector('.line-price-label').textContent=`Harga jual (Rp / ${unit})`;
      line.querySelector('.line-price').value=product ? product.sellingPrice * UNITS[unit] : '';
    }
    preview();
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if (selectedOrderId) return;
    try {const {order:o,po}=submitSalesWorkflow(store,{...Object.fromEntries(new FormData(form)),customerFromCenter:true,salesOwner:lockedSales?currentUser.name:null,pricePerUnit:true,lines:readLines()},role); resetOrderForm();showOrder(o.id);notifyDemo();setMessage(salesRoot,`${o.id} diajukan; stok seluruh gudang dialokasikan. ${po?po.id+' otomatis dibuat. Admin 1 memilih supplier dan mengotorisasi di Purchasing.':'Stok mencukupi, tanpa PO.'}`);}
    catch(error){setMessage(salesRoot,error.message);}
  });
  salesRoot.querySelector('#so-orders').addEventListener('click',e=>{
    const button=e.target.closest('[data-review]'); if(!button)return;
    try{const o=reviewOrder(store,button.dataset.review,role);notifyDemo();setMessage(salesRoot,`${o.id}: ${o.status}.`);}catch(error){setMessage(salesRoot,error.message);}
  });
  salesRoot.querySelector('#so-orders').addEventListener('change',e=>{if(e.target.matches('.dispatch-sub-sku')){const product=store.products.find(p=>p.sku===e.target.value);e.target.closest('.dispatch-line').querySelector('.dispatch-price').value=product?.sellingPrice??'';}});
  salesRoot.querySelector('#so-orders').addEventListener('submit',e=>{
    const dispatchForm=e.target.closest('.customer-dispatch');if(dispatchForm){e.preventDefault();try{const result=issueCustomerInvoice(store,dispatchForm.dataset.order,readDispatch(dispatchForm),role);notifyDemo();setMessage(salesRoot,`${result.shipment.id} dicatat. ${result.invoice?result.invoice.id+' otomatis sesuai barang dikirim.':'Tanpa invoice karena tidak ada barang dikirim.'}`);}catch(error){setMessage(salesRoot,error.message);}return;}
    const poForm=e.target.closest('.po-create');if(!poForm)return;e.preventDefault();
    try{const po=createPurchaseOrder(store,poForm.dataset.order,Object.fromEntries(new FormData(poForm)),role);notifyDemo();setMessage(salesRoot,`${po.id} dibuat untuk ${po.supplier}. Buka Purchasing untuk memeriksa dan mengunduh PO.`);}catch(error){setMessage(salesRoot,error.message);}
  });
  purchasingRoot.querySelector('#po-orders').addEventListener('input',e=>{const responseForm=e.target.closest('.supplier-response');if(responseForm)previewSupplierResponse(responseForm);});
  purchasingRoot.querySelector('#po-orders').addEventListener('submit',e=>{
    const edit=e.target.closest('.po-edit');if(edit){e.preventDefault();try{editPurchaseOrder(store,edit.dataset.po,{...Object.fromEntries(new FormData(edit)),lines:readEditor(edit)},role);notifyDemo();setMessage(purchasingRoot,'Draft PO disimpan. Periksa lalu otorisasi.');}catch(error){setMessage(purchasingRoot,error.message);}return;}
    const responseForm=e.target.closest('.supplier-response');if(!responseForm)return;e.preventDefault();
    try{const result=finalizeBillDraft(store,responseForm.dataset.po,readSupplierResponse(responseForm),role);notifyDemo();setMessage(purchasingRoot,`Respons final tersimpan. ${result.bill?'Tagihan '+result.bill.reference+' dicatat.':'Tidak ada tagihan barang.'} ${result.losses.length} SKU dicatat sebagai loss sales; lihat Reports.`);}catch(error){setMessage(purchasingRoot,error.message);}
  });
  purchasingRoot.querySelector('#po-orders').addEventListener('click',e=>{
    const received=e.target.closest('[data-receive]');
    const ready=e.target.closest('[data-ready]');const download=e.target.closest('[data-download]');
    try{
      if(received){const receipt=receiveSupplierGoods(store,received.dataset.receive,role);notifyDemo();setMessage(purchasingRoot,`${receipt.id} diterima dan dialokasikan. Lanjutkan pengiriman pelanggan di Sales.`);}
      if(ready){const po=readyPurchaseOrder(store,ready.dataset.ready,role);notifyDemo();setMessage(purchasingRoot,`${po.id} siap dikirim. Pengiriman ke supplier dilakukan di luar demo.`);}
      if(download){const po=store.purchaseOrders.find(p=>p.id===download.dataset.download);const body=purchaseOrderText(po);const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=po.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }catch(error){setMessage(purchasingRoot,error.message);}
  });
  subscribeDemo(()=>{
    refreshOrderNumber();
    refreshCustomers();
    showOrder();
    if(findDialog.open)renderFind();
    linesRoot.querySelectorAll('.line-sku').forEach(select=>{const value=select.value;select.innerHTML=productOptions(value);});
    renderOrders();renderPurchasing();
  });
  purchasingRoot.querySelector('#stock-po-form').addEventListener('submit',e=>{e.preventDefault();const f=e.target;try{const po=createStockPurchaseOrder(store,{...Object.fromEntries(new FormData(f)),lines:readEditor(f)},role);f.reset();f.querySelector('.editable-items').innerHTML=editorRow({},'po');notifyDemo();setMessage(purchasingRoot,po.id+' dibuat tanpa SO. Periksa draft lalu otorisasi.');}catch(error){setMessage(purchasingRoot,error.message);}});
  handleEditor(salesRoot);handleEditor(purchasingRoot);
  mountReturnHandlers(salesRoot,()=>role);
  mountReturnHandlers(purchasingRoot,()=>role);
  if(lockedSales){salesRoot.querySelector('.workflow-role').hidden=true;salesRoot.querySelector('.role-select').disabled=true;salesRoot.querySelector('.role-select').innerHTML='<option value="sales">Sales</option>';purchasingRoot.querySelector('.workflow-role').hidden=true;}
  refreshOrderNumber();refreshCustomers();addLine();showOrder();syncRole();
}
