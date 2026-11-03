import {priceForLevel} from './price-level.js';
import { demoStore as store } from './demo-store.js';
import { WAREHOUSES } from './sku-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rowId=0;
export function editorRow(line={},kind='po'){
 const id=++rowId;return `<fieldset class="editable-item so-line"><legend>${kind==='po'?'Item PO':kind==='bill'?'Item bills':'Item invoice'}</legend><div class="sku-form-grid"><label for="edit-sku-${id}">SKU / Nama barang<select id="edit-sku-${id}" class="edit-sku" required><option value="">Pilih SKU</option>${store.products.map(p=>`<option value="${esc(p.sku)}" ${line.sku===p.sku?'selected':''}>${esc(p.sku+' · '+p.name+' · '+p.size+' · '+p.color)}</option>`).join('')}</select></label><label for="edit-qty-${id}">Qty (pcs)<input id="edit-qty-${id}" class="edit-qty" type="number" min="1" step="1" value="${esc(line.quantityPcs??1)}" required></label><label for="edit-price-${id}">Harga / pcs<input id="edit-price-${id}" class="edit-price" ${kind==='invoice'?'readonly':''} type="number" min="0" step="1" value="${esc(line.grossPrice??line.price??'')}" required></label></div><button type="button" class="secondary-button" data-remove-edit>Hapus SKU</button></fieldset>`;
}
export function poEditor(po){return `<form class="po-edit supplier-panel" data-po="${esc(po.id)}"><h2>Periksa draft PO · Admin 1</h2><p class="sku-guidance">Draft awal hanya berisi kekurangan stok. Tambah/hapus SKU sesuai keputusan pembelian, lalu simpan sebelum otorisasi. Tambahan pembelian di luar kebutuhan SO masuk stok bebas.</p><div class="sku-form-grid"><label>Vendor / supplier<input name="supplier" value="${esc(po.supplier)}" maxlength="200" required></label><label>Diskon PO (%)<input name="discountPercent" type="number" min="0" max="100" step="0.01" value="${esc(po.discountPercent??0)}" required></label><label>Term of payment<input name="paymentTerms" maxlength="500" value="${esc(po.paymentTerms??'')}" placeholder="Contoh: 30 hari setelah bills" required></label><label>Gudang tujuan<select name="warehouseId">${WAREHOUSES.map(w=>`<option value="${w.id}" ${w.id===po.warehouseId?'selected':''}>${w.name}</option>`).join('')}</select></label></div><div class="editable-items">${po.lines.map(l=>editorRow(l)).join('')}</div><button type="button" class="secondary-button" data-add-edit="po">+ Tambah SKU PO</button> <button type="submit" class="primary-button">Simpan perubahan PO</button></form>`;}
export function readEditor(form){return [...form.querySelectorAll('.editable-item')].map(row=>({sku:row.querySelector('.edit-sku').value,quantityPcs:row.querySelector('.edit-qty').value,price:row.querySelector('.edit-price').value}));}
export function handleEditor(root){
 root.addEventListener('click',e=>{const add=e.target.closest('[data-add-edit]');if(add){const form=add.closest('form');form.querySelector('.editable-items').insertAdjacentHTML('beforeend',editorRow({},add.dataset.addEdit));}const remove=e.target.closest('[data-remove-edit]');if(remove)remove.closest('.editable-item').remove();const omit=e.target.closest('[data-omit-dispatch]');if(omit){const row=omit.closest('.dispatch-line');row.querySelector('.dispatch-original').value='0';row.querySelector('.dispatch-sub-qty').value='0';row.querySelector('.dispatch-sub-sku').value='';row.querySelector('.dispatch-reason').value='Dihapus dari invoice oleh Admin 1';}});
 root.addEventListener('change',e=>{
  const invoice=e.target.closest('.customer-dispatch');
  if(invoice && e.target.matches('.edit-sku, [name="priceLevel"]')){
   for(const row of invoice.querySelectorAll('.editable-item')){
    const product=store.products.find(p=>p.sku===row.querySelector('.edit-sku').value);
    row.querySelector('.edit-price').value=product?priceForLevel(product.sellingPrice,invoice.elements.priceLevel.value):'';
   }
   return;
  }
  if(e.target.matches('.edit-sku')){const p=store.products.find(p=>p.sku===e.target.value);e.target.closest('.editable-item').querySelector('.edit-price').value=(e.target.closest('.po-edit')||e.target.closest('.supplier-response')||e.target.closest('#stock-po-form'))?p?.purchasePrice??'':p?.sellingPrice??'';}});
}
