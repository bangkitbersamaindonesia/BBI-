import { editorRow, readEditor } from './workflow-editor.js';
import { returnPanel } from './returns.js';
import { demoStore as store } from './demo-store.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>new Intl.NumberFormat('id-ID').format(value);
const money=value=>'Rp '+num(value);
export function supplierPanel(po,role) {
  if(po.response){
    const response=po.response;const bill=store.bills.find(b=>b.poId===po.id);
    return `<section class="supplier-panel"><h2>Respons final supplier · ${esc(response.date)}</h2><p class="sku-guidance">${esc(response.id)} · Qty sesuai bills supplier. Status penerimaan dan penambahan stok tercantum di bawah.</p><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY PO PCS</th><th>DIPENUHI PCS</th><th>TIDAK DIPENUHI PCS</th><th>ALASAN</th></tr></thead><tbody>${response.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.orderedPcs)}</td><td>${num(l.quantityPcs)}</td><td>${num(l.shortagePcs)}</td><td>${esc(l.reason||'—')}</td></tr>`).join('')}</tbody></table></div>
    ${bill?`<h2>Tagihan supplier ${esc(bill.reference)}</h2><p class="sku-guidance">${esc(bill.id)} · ${esc(bill.status)} · Hanya qty yang dipenuhi.</p><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY TAGIHAN PCS</th><th>HARGA BELI / PCS</th><th>SUBTOTAL</th></tr></thead><tbody>${bill.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.price)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang ditagih: ${money(bill.total)}</p><p class="sku-guidance">Sebelum pajak/ongkir; belum menjadi jurnal, utang terposting, atau pembayaran.</p>`:'<p class="sku-guidance">Seluruh barang tidak tersedia: tidak ada tagihan barang yang dicatat.</p>'}
    ${bill?(store.receipts.some(r=>r.poId===po.id)?'<p class="sku-guidance">Barang supplier sudah dikonfirmasi diterima dan dialokasikan ke SO.</p>':role==='admin1'?`<button class="primary-button" type="button" data-receive="${esc(po.id)}">Konfirmasi barang sesuai tagihan diterima</button>`:''):''}
    ${bill?returnPanel('supplier',bill,role):''}
    ${response.lines.some(l=>l.shortagePcs>0)?'<p class="loss-notice">Loss sales telah dicatat. Lihat menu Reports untuk rincian, filter, dan ekspor CSV.</p>':''}</section>`;
  }
  if(role!=='admin1'||po.status!=='Siap dikirim')return '';
  return `<form class="supplier-response supplier-panel" data-po="${esc(po.id)}"><h2>Draft bills otomatis dari PO</h2><p class="sku-guidance">Draft terisi otomatis sesuai PO. Admin 1 mencocokkan jenis SKU, qty, dan harga dengan bills supplier. Hapus SKU yang tidak tersedia atau tambahkan SKU sesuai bills. Selisih kurang PO dengan bills final dicatat sebagai loss sales. Finalisasi bills mengonfirmasi barang sudah datang dan langsung menambah stok gudang.</p><div class="sku-form-grid"><label for="response-date-${po.id}">Tanggal respons final<input id="response-date-${po.id}" name="responseDate" type="date" required /></label><label for="bill-ref-${po.id}">Nomor tagihan supplier<input id="bill-ref-${po.id}" name="billReference" maxlength="120" placeholder="Wajib jika ada barang dipenuhi" /></label></div>
    <div class="editable-items">${po.lines.map(l=>editorRow({...l,grossPrice:l.price},'bill')).join('')}</div><button type="button" class="secondary-button" data-add-edit="bill">+ Tambah SKU bills</button>
    <p class="response-preview selected-range" aria-live="polite">Lengkapi qty respons setiap SKU.</p><label class="response-confirm"><input type="checkbox" name="final" required /> Barang sesuai bills sudah diterima di gudang; finalisasi menambah stok dan mencatat selisih PO sebagai loss sales.</label><p class="sku-guidance">Pencatatan final hanya sekali dalam demo. Pastikan qty dan harga sesuai respons/tagihan supplier.</p><button class="primary-button" type="submit">Finalisasi bills & catat selisih loss sales</button></form>`;
}
export function readSupplierResponse(form) {
 return {responseDate:form.elements.responseDate.value,billReference:form.elements.billReference.value,final:form.elements.final.checked,lines:readEditor(form)};
}
export function previewSupplierResponse(form) {
 try{const rows=readEditor(form);let total=0n;for(const r of rows){if(!/^\d+$/.test(r.quantityPcs)||!/^\d+$/.test(r.price))throw Error();total+=BigInt(r.quantityPcs)*BigInt(r.price);}form.querySelector('.response-preview').textContent=`Total draft bills: ${money(total)} · Selisih PO dihitung saat finalisasi.`;}catch{form.querySelector('.response-preview').textContent='Lengkapi qty dan harga bills.';}
}
