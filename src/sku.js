import {canManageProducts, requireProductAdmin, editProduct, deleteProduct} from './product-management.js';
import { mountPhotoPicker } from './product-photos.js';
import { demoStore, notifyDemo, subscribeDemo } from './demo-store.js';
import { UNITS, WAREHOUSES, validateSku, toPcs, totalPcs } from './sku-model.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = new Intl.NumberFormat('id-ID');
const money = value => 'Rp ' + number.format(value);
export function mountSku(root, user) {
  if (!canManageProducts(demoStore,user)) {root.replaceChildren();return;}


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
    </div><div id="new-sku-photos"></div><p class="sku-guidance">1 pcs = 1 · 1 lusin = 12 pcs · 1 kodi = 20 pcs · 1 gros = 144 pcs. Pecahan satuan boleh jika hasilnya pcs bulat. Harga selalu per pcs.</p>
    <p id="sku-conversion" class="selected-range" aria-live="polite"></p>
    <div class="sku-actions"><button class="primary-button" type="submit">Simpan SKU demo</button><button class="secondary-button" type="reset">Reset form</button></div>
    <p id="sku-message" role="status" aria-live="polite"></p></form></section>
    <section class="panel table-panel"><div class="panel-head"><div><h2>Daftar SKU</h2><p>Qty total dihitung dari stok pcs di seluruh gudang.</p></div><label for="sku-search" class="sku-search">Cari SKU / barang<input id="sku-search" type="search" placeholder="Kode, nama, size, warna…" /></label></div>
    <p id="sku-count" class="selected-range" aria-live="polite"></p><div class="table-scroll"><table class="sku-table"><thead><tr><th>AKSI</th><th>FOTO</th><th>KODE SKU</th><th>NAMA BARANG</th><th>SIZE</th><th>WARNA</th><th>HARGA BELI / PCS</th><th>HARGA JUAL / PCS</th><th>QTY TOTAL</th><th>SATUAN QTY</th><th>STOK PER GUDANG (PCS)</th><th>KETERANGAN</th></tr></thead><tbody id="sku-rows"></tbody></table></div></section>`;
  const form = root.querySelector('form');
  const photoPicker=mountPhotoPicker(root.querySelector('#new-sku-photos'));
  const message = root.querySelector('#sku-message');
  function preview() {
    try { root.querySelector('#sku-conversion').textContent = `Stok awal: ${number.format(toPcs(form.elements.qty.value, form.elements.unit.value))} pcs di ${form.elements.warehouseId.selectedOptions[0].textContent}.`; }
    catch { root.querySelector('#sku-conversion').textContent = 'Isi qty yang menghasilkan pcs bulat dan tidak negatif.'; }
  }
  function render() {
    const query = root.querySelector('#sku-search').value.trim().toLocaleLowerCase('id-ID');
    const shown = demoStore.products.filter(p => [p.sku,p.name,p.size,p.color].some(v=>v.toLocaleLowerCase('id-ID').includes(query)));
    root.querySelector('#sku-count').textContent = `${shown.length} dari ${demoStore.products.length} SKU`;
    root.querySelector('#sku-rows').innerHTML = shown.map(p => `<tr><td><button type="button" class="secondary-button" data-edit-product="${escape(p.sku)}">Edit</button><button type="button" class="secondary-button" data-delete-product="${escape(p.sku)}">Delete</button></td><td>${p.photos?.[0]?`<img class="sku-photo-thumb" src="${escape(p.photos[0].src)}" alt="${escape(p.name)}" width="64" height="64" loading="lazy">`:''}<button type="button" class="secondary-button" data-photos="${escape(p.sku)}">Foto (${p.photos?.length??0}/6)</button></td><td class="order-id">${escape(p.sku)}</td><td class="customer-name">${escape(p.name)}</td><td>${escape(p.size)}</td><td>${escape(p.color)}</td><td>${money(p.purchasePrice)}</td><td>${money(p.sellingPrice)}</td><td class="total">${number.format(totalPcs(p,demoStore.balances))} pcs</td><td>${escape(p.unit)}<br><small>Total setara ${number.format(totalPcs(p,demoStore.balances)/UNITS[p.unit])} ${escape(p.unit)}</small></td><td>${WAREHOUSES.map(w=>`${w.name}: ${number.format(demoStore.balances.find(b=>b.sku===p.sku && b.warehouseId===w.id)?.quantityPcs ?? 0)}`).join('<br>')}</td><td>${escape(p.notes || '—')}</td></tr>`).join('') || '<tr><td colspan="11">Tidak ada SKU yang cocok.</td></tr>';
  }
  function clearErrors() { root.querySelectorAll('.field-error').forEach(el=>el.textContent=''); form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid')); }
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  form.addEventListener('reset', () => { photoPicker.reset();clearErrors(); message.textContent=''; queueMicrotask(preview); });
  form.addEventListener('submit', event => {
    event.preventDefault(); clearErrors();
    try {requireProductAdmin(demoStore,user);} catch(error){message.textContent=error.message;return;}if(photoPicker.busy){message.textContent='Tunggu pemrosesan foto selesai.';return;}
    const {value, errors} = validateSku(Object.fromEntries(new FormData(form)), demoStore.products);
    if (Object.keys(errors).length) {
      for (const [key,error] of Object.entries(errors)) { root.querySelector(`#error-${key}`).textContent=error; form.elements[key].setAttribute('aria-invalid','true'); }
      message.textContent='SKU belum disimpan. Periksa kolom yang ditandai.';
      form.elements[Object.keys(errors)[0]].focus(); return;
    }
    const {quantityPcs, warehouseId, ...product} = value;
    product.photos=photoPicker.commit();demoStore.products.push(product);(demoStore.financialOpenings??=[]).push({id:'OPEN-SKU-'+product.sku,date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),amount:(BigInt(quantityPcs)*BigInt(product.purchasePrice)).toString()}); demoStore.balances.push({sku:product.sku,warehouseId,quantityPcs});
    form.reset(); render(); notifyDemo(); message.textContent=`SKU ${product.sku} berhasil ditambahkan ke demo.`;
  });
  const dialog=document.createElement('dialog');dialog.className='product-photo-dialog';root.append(dialog);
  let editPicker=null;
  const closePhotos=()=>{editPicker?.dispose();editPicker=null;dialog.close();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();closePhotos();});
  root.querySelector('#sku-rows').addEventListener('click',e=>{const b=e.target.closest('[data-photos]');if(!b)return;
  try{requireProductAdmin(demoStore,user);}catch(error){message.textContent=error.message;return;}const product=demoStore.products.find(p=>p.sku===b.dataset.photos);dialog.innerHTML=`<h2>Foto produk · ${escape(product.sku)}</h2><div class="edit-photo-picker"></div><div class="sku-actions"><button type="button" class="primary-button" data-save-photos>Simpan foto</button><button type="button" class="secondary-button" data-cancel-photos>Batal</button></div>`;editPicker=mountPhotoPicker(dialog.querySelector('.edit-photo-picker'),product.photos??[]);dialog.querySelector('[data-cancel-photos]').onclick=closePhotos;dialog.querySelector('[data-save-photos]').onclick=()=>{if(editPicker.busy){dialog.querySelector('.photo-status').textContent='Tunggu pemrosesan foto selesai.';return;}try{requireProductAdmin(demoStore,user);}catch(error){message.textContent=error.message;closePhotos();return;}product.photos=editPicker.commit();closePhotos();notifyDemo();};dialog.showModal();});
  const manageDialog=document.createElement('dialog');
  manageDialog.className='product-photo-dialog';
  root.append(manageDialog);
  root.querySelector('#sku-rows').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-product], [data-delete-product]');
    if(!button)return;
    const sku=button.dataset.editProduct ?? button.dataset.deleteProduct;
    const product=demoStore.products.find(row=>row.sku===sku);
    if(!product)return;
    const deleting=Boolean(button.dataset.deleteProduct);
    manageDialog.innerHTML=`<form><h2>${deleting?'Hapus':'Edit'} SKU · ${escape(sku)}</h2>
      ${deleting?'<p>Konfirmasi penghapusan SKU ini dari katalog.</p>':`
      <div class="sku-form-grid">${[['name','Nama barang'],['size','Size'],['color','Warna'],['purchasePrice','Harga beli / pcs'],['sellingPrice','Harga jual / pcs']].map(([key,label])=>
        `<label>${label}<input name="${key}" value="${escape(product[key])}" required ${key.endsWith('Price')?'type="number" min="0" step="1"':'maxlength="120"'}></label>`).join('')}
      <label>Satuan<select name="unit">${Object.keys(UNITS).map(unit=>`<option ${unit===product.unit?'selected':''}>${unit}</option>`).join('')}</select></label>
      <label>Keterangan<textarea name="notes" maxlength="500">${escape(product.notes??'')}</textarea></label></div>`}
      <p class="manage-product-error" role="alert"></p>
      <button type="submit" class="primary-button">${deleting?'Hapus SKU':'Simpan perubahan'}</button>
      <button type="button" class="secondary-button" data-cancel-management>Batal</button></form>`;
    manageDialog.querySelector('[data-cancel-management]').onclick=()=>manageDialog.close();
    manageDialog.querySelector('form').onsubmit=submit=>{
      submit.preventDefault();
      try {
        if(deleting)deleteProduct(demoStore,sku,user);
        else editProduct(demoStore,sku,Object.fromEntries(new FormData(submit.target)),user);
        manageDialog.close();notifyDemo();
        message.textContent=`SKU ${sku} berhasil ${deleting?'dihapus':'diperbarui'}.`;
      }catch(error){manageDialog.querySelector('.manage-product-error').textContent=error.message;}
    };
    manageDialog.showModal();
  });
  root.querySelector('#sku-search').addEventListener('input', render);
  subscribeDemo(render);
  render(); preview();
}
