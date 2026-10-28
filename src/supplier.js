import { demoStore as store } from './demo-store.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=value=>new Intl.NumberFormat('id-ID').format(value);
const money=value=>'Rp '+num(value);
export function supplierPanel(po,role) {
  if(po.response){
    const response=po.response;const bill=store.bills.find(b=>b.poId===po.id);
    return `<section class="supplier-panel"><h2>Respons final supplier · ${esc(response.date)}</h2><p class="sku-guidance">${esc(response.id)} · Qty dikirim berdasarkan konfirmasi/tagihan supplier, belum merupakan bukti barang diterima atau dikirim ke pelanggan.</p><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY PO PCS</th><th>DIPENUHI PCS</th><th>LOSS PCS</th><th>ALASAN</th></tr></thead><tbody>${response.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.orderedPcs)}</td><td>${num(l.quantityPcs)}</td><td>${num(l.shortagePcs)}</td><td>${esc(l.reason||'—')}</td></tr>`).join('')}</tbody></table></div>
    ${bill?`<h2>Tagihan supplier ${esc(bill.reference)}</h2><p class="sku-guidance">${esc(bill.id)} · ${esc(bill.status)} · Hanya qty yang dipenuhi.</p><div class="table-scroll"><table><thead><tr><th>SKU</th><th>QTY TAGIHAN PCS</th><th>HARGA BELI / PCS</th><th>SUBTOTAL</th></tr></thead><tbody>${bill.lines.map(l=>`<tr><td>${esc(l.sku)}</td><td>${num(l.quantityPcs)}</td><td>${money(l.price)}</td><td>${money(l.subtotal)}</td></tr>`).join('')}</tbody></table></div><p class="workflow-total">Total barang ditagih: ${money(bill.total)}</p><p class="sku-guidance">Sebelum pajak/ongkir; belum menjadi jurnal, utang terposting, atau pembayaran.</p>`:'<p class="sku-guidance">Seluruh barang tidak tersedia: tidak ada tagihan barang yang dicatat.</p>'}
    ${bill?(store.receipts.some(r=>r.poId===po.id)?'<p class="sku-guidance">Barang supplier sudah dikonfirmasi diterima dan dialokasikan ke SO.</p>':role==='admin1'?`<button class="primary-button" type="button" data-receive="${esc(po.id)}">Konfirmasi barang sesuai tagihan diterima</button>`:''):''}
    ${response.lines.some(l=>l.shortagePcs>0)?'<p class="loss-notice">Loss sales telah dicatat. Lihat menu Reports untuk rincian, filter, dan ekspor CSV.</p>':''}</section>`;
  }
  if(role!=='admin1'||po.status!=='Siap dikirim')return '';
  return `<form class="supplier-response supplier-panel" data-po="${esc(po.id)}"><h2>Catat pengiriman final & tagihan supplier</h2><p class="sku-guidance">Admin 1 menyalin pengiriman final supplier. Isi qty yang dikirim untuk setiap SKU; sisa yang dipastikan tidak akan dikirim dicatat sebagai loss sales. Jika masih menunggu/backorder, jangan finalisasi.</p><div class="sku-form-grid"><label for="response-date-${po.id}">Tanggal respons final<input id="response-date-${po.id}" name="responseDate" type="date" required /></label><label for="bill-ref-${po.id}">Nomor tagihan supplier<input id="bill-ref-${po.id}" name="billReference" maxlength="120" placeholder="Wajib jika ada barang dipenuhi" /></label></div>
    ${po.lines.map((l,index)=>`<fieldset class="response-line so-line" data-sku="${esc(l.sku)}"><legend>${esc(l.sku)} · PO ${num(l.quantityPcs)} pcs</legend><div class="sku-form-grid"><label for="fulfilled-${po.id}-${index}">Qty dikirim supplier (pcs)<input id="fulfilled-${po.id}-${index}" class="response-qty" type="number" min="0" max="${l.quantityPcs}" step="1" required data-ordered="${l.quantityPcs}" /></label><label for="bill-price-${po.id}-${index}">Harga tagihan (Rp / pcs)<input id="bill-price-${po.id}-${index}" class="response-price" type="number" min="0" step="1" required value="${l.price}" /></label><label for="reason-${po.id}-${index}">Alasan barang tidak tersedia<input id="reason-${po.id}-${index}" class="response-reason" maxlength="500" placeholder="Wajib jika ada sisa tidak dikirim" /></label></div></fieldset>`).join('')}
    <p class="response-preview selected-range" aria-live="polite">Lengkapi qty respons setiap SKU.</p><label class="response-confirm"><input type="checkbox" name="final" required /> Respons ini final; sisa qty tidak akan dikirim supplier dan dicatat sebagai loss sales.</label><p class="sku-guidance">Pencatatan final hanya sekali dalam demo. Pastikan qty dan harga sesuai respons/tagihan supplier.</p><button class="primary-button" type="submit">Simpan respons final & catat loss sales</button></form>`;
}
export function readSupplierResponse(form) {
  return {responseDate:form.elements.responseDate.value,billReference:form.elements.billReference.value,final:form.elements.final.checked,lines:[...form.querySelectorAll('.response-line')].map(line=>({sku:line.dataset.sku,fulfilledPcs:line.querySelector('.response-qty').value,price:line.querySelector('.response-price').value,reason:line.querySelector('.response-reason').value}))};
}
export function previewSupplierResponse(form) {
  let total=0n,loss=0n;let valid=true;
  for(const line of form.querySelectorAll('.response-line')){
    const qty=line.querySelector('.response-qty');const price=line.querySelector('.response-price').value;
    if(!/^\d+$/.test(qty.value)||!/^\d+$/.test(price)||!Number.isSafeInteger(Number(qty.value))||!Number.isSafeInteger(Number(price))||Number(qty.value)>Number(qty.dataset.ordered)){valid=false;break;}
    total+=BigInt(qty.value)*BigInt(price);loss+=BigInt(qty.dataset.ordered)-BigInt(qty.value);
  }
  form.querySelector('.response-preview').textContent=valid?`Total barang ditagih: ${money(total)} · Loss sales: ${num(loss)} pcs (akan dicatat setelah finalisasi).`:'Lengkapi qty pcs dan harga rupiah bulat yang valid.';
}
