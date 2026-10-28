import { WAREHOUSES } from './sku-model.js';
import { availablePcs } from './sales-model.js';
import { validDate } from './supplier-model.js';
const text=v=>String(v??'').trim();
function admin(role){if(role!=='admin1')throw Error('Langkah ini untuk Admin 1.');}
export function receiveSupplierGoods(store,poId,role){
  admin(role);const po=store.purchaseOrders.find(p=>p.id===poId);
  if(!po?.response||store.receipts.some(r=>r.poId===poId))throw Error('Respons final belum ada atau penerimaan sudah dicatat.');
  const lines=po.response.lines.filter(l=>l.quantityPcs>0);
  if(!lines.length)throw Error('Tidak ada barang supplier untuk diterima.');
  for(const l of lines){const current=store.balances.find(b=>b.sku===l.sku&&b.warehouseId===po.warehouseId)?.quantityPcs??0;if(!Number.isSafeInteger(current+l.quantityPcs))throw Error('Stok melebihi batas aman.');}
  const at=new Date().toISOString();const receipt={id:`GR-DEMO-${store.receipts.length+1}`,poId,orderId:po.orderId,warehouseId:po.warehouseId,lines:lines.map(l=>({sku:l.sku,quantityPcs:l.quantityPcs})),at};
  for(const l of lines){let b=store.balances.find(b=>b.sku===l.sku&&b.warehouseId===po.warehouseId);if(!b){b={sku:l.sku,warehouseId:po.warehouseId,quantityPcs:0};store.balances.push(b);}b.quantityPcs+=l.quantityPcs;store.reservations.push({orderId:po.orderId,sku:l.sku,warehouseId:po.warehouseId,quantityPcs:l.quantityPcs});store.movements.push({sourceId:receipt.id,kind:'receipt',sku:l.sku,warehouseId:po.warehouseId,quantityDelta:l.quantityPcs,at});}
  store.receipts.push(receipt);po.history.push({action:`${receipt.id}: barang dikonfirmasi diterima dan dialokasikan ke SO`,at});return receipt;
}
export function dispatchCustomerOrder(store,orderId,input,role){
  admin(role);const order=store.orders.find(o=>o.id===orderId);
  if(!order?.review||store.shipments.some(s=>s.orderId===orderId))throw Error('SO belum diperiksa atau pengiriman final sudah dicatat.');
  const po=store.purchaseOrders.find(p=>p.orderId===orderId);
  if(order.review.some(l=>l.shortage>0)&&(!po?.response||(po.response.lines.some(l=>l.quantityPcs>0)&&!store.receipts.some(r=>r.poId===po.id))))throw Error('Selesaikan respons final dan penerimaan supplier terlebih dahulu.');
  if(!validDate(input.date)||input.final!==true)throw Error('Isi tanggal dan konfirmasikan pengiriman final.');
  if(!Array.isArray(input.lines)||input.lines.length!==order.lines.length)throw Error('Isi pengiriman setiap item SO.');
  const planned=[];const invoiceLines=[];const fulfillments=[];const seen=new Set();let total=0;
  const claimed=(sku,warehouseId,own=null)=>planned.filter(p=>p.sku===sku&&p.warehouseId===warehouseId&&(own===null||p.own===own)).reduce((sum,p)=>sum+p.quantityPcs,0);
  function allocate(sku,qty,own){let remaining=qty;for(const w of WAREHOUSES){const capacity=own?store.reservations.filter(r=>r.orderId===orderId&&r.sku===sku&&r.warehouseId===w.id).reduce((sum,r)=>sum+r.quantityPcs,0):availablePcs(store,sku,w.id);const take=Math.min(remaining,Math.max(0,capacity-claimed(sku,w.id,own)));if(take){planned.push({sku,warehouseId:w.id,quantityPcs:take,own});remaining-=take;}}if(remaining)throw Error(`Stok tersedia ${sku} tidak cukup untuk pengiriman ini.`);}
  function integer(raw,label){const s=text(raw);const n=Number(s);if(!/^\d+$/.test(s)||!Number.isSafeInteger(n))throw Error(`${label} harus bilangan bulat tidak negatif.`);return n;}
  for(const raw of input.lines){
    const sale=order.lines.find(l=>l.sku===raw.sku);if(!sale||seen.has(raw.sku))throw Error('Item SO tidak valid atau duplikat.');seen.add(raw.sku);
    const originalPcs=integer(raw.originalPcs,'Qty SKU awal');const substitutePcs=integer(raw.substitutePcs,'Qty pengganti');
    if(!Number.isSafeInteger(originalPcs+substitutePcs)||originalPcs+substitutePcs>sale.quantityPcs)throw Error('Total qty dikirim tidak boleh melebihi pesanan awal.');
    const remaining=sale.quantityPcs-originalPcs-substitutePcs;const reason=text(raw.reason);if(reason.length>500||(remaining&&!reason))throw Error('Isi alasan sisa pesanan yang gagal dikirim (maksimal 500 karakter).');
    if(originalPcs){allocate(sale.sku,originalPcs,true);invoiceLines.push({sourceSku:sale.sku,sku:sale.sku,name:sale.name,size:sale.size,color:sale.color,quantityPcs:originalPcs,price:sale.price,subtotal:originalPcs*sale.price,substitution:false});}
    if(substitutePcs){const product=store.products.find(p=>p.sku===raw.substituteSku);if(!product||product.sku===sale.sku)throw Error('Pilih SKU pengganti berbeda yang valid.');if(input.customerApproved!==true)throw Error('Penggantian SKU memerlukan persetujuan pelanggan.');const price=integer(raw.substitutePrice,'Harga pengganti');allocate(product.sku,substitutePcs,false);invoiceLines.push({sourceSku:sale.sku,sku:product.sku,name:product.name,size:product.size,color:product.color,quantityPcs:substitutePcs,price,subtotal:substitutePcs*price,substitution:true});}
    fulfillments.push({sku:sale.sku,originalPcs,substitutePcs,substituteSku:substitutePcs?raw.substituteSku:null,remaining,reason});
  }
  for(const line of invoiceLines){total+=line.subtotal;if(!Number.isSafeInteger(line.subtotal)||!Number.isSafeInteger(total))throw Error('Nilai invoice melebihi batas aman.');}
  for(const p of planned){const b=store.balances.find(b=>b.sku===p.sku&&b.warehouseId===p.warehouseId);if(!b||b.quantityPcs<claimed(p.sku,p.warehouseId))throw Error('Stok fisik tidak cukup.');}
  const at=new Date().toISOString();const id=`SHIP-DEMO-${store.shipments.length+1}`;
  const recoveries=[];const losses=[];
  for(const f of fulfillments){const sale=order.lines.find(l=>l.sku===f.sku);const existing=store.lossSales.filter(l=>l.orderId===orderId&&l.sku===f.sku);let recover=f.substitutePcs;let existingNet=0;
    for(const loss of existing){const recovered=store.recoveries.filter(r=>r.lossId===loss.id).reduce((s,r)=>s+r.quantityPcs,0);const available=loss.quantityPcs-recovered;const qty=Math.min(recover,available);if(qty)recoveries.push({lossId:loss.id,shipmentId:id,quantityPcs:qty,substituteSku:f.substituteSku,date:input.date,at});recover-=qty;existingNet+=available-qty;}
    const extra=Math.max(0,f.remaining-existingNet);
    if(extra)losses.push({id:`LOSS-DEMO-${String(store.lossSales.length+losses.length+1).padStart(4,'0')}`,responseId:'',poId:po?.id??'',orderId,date:input.date,customer:order.customer,salesperson:order.salesperson,supplier:'BBI / gagal kirim',warehouseId:'',sku:sale.sku,name:sale.name,size:sale.size,color:sale.color,quantityPcs:extra,sellingPrice:sale.price,potentialRevenue:extra*sale.price,reason:f.reason,at});
  }
  const shipment={id,orderId,date:input.date,lines:invoiceLines,allocations:planned,fulfillments,customerApproved:input.customerApproved===true,at};
  const invoice=invoiceLines.length?{id:`INV-DEMO-${store.invoices.length+1}`,orderId,shipmentId:id,customer:order.customer,date:input.date,lines:invoiceLines.map(l=>({...l})),total,status:'Draft sesuai pengiriman',at}:null;
  for(const p of planned){store.balances.find(b=>b.sku===p.sku&&b.warehouseId===p.warehouseId).quantityPcs-=p.quantityPcs;store.movements.push({sourceId:id,kind:'delivery',sku:p.sku,warehouseId:p.warehouseId,quantityDelta:-p.quantityPcs,at});}
  store.reservations=store.reservations.filter(r=>r.orderId!==orderId);store.shipments.push(shipment);if(invoice)store.invoices.push(invoice);store.lossSales.push(...losses);store.recoveries.push(...recoveries);
  order.status=fulfillments.some(f=>f.remaining)?'Pengiriman final · ada sisa gagal':'Pengiriman final selesai';order.history.push({action:`${id}: pengiriman final; ${invoice?invoice.id:'tanpa invoice'}; SKU pengganti ${input.customerApproved?'disetujui pelanggan':'tidak digunakan'}`,at});return {shipment,invoice};
}
export function netLossRecords(store){return store.lossSales.map(loss=>{const recoveredPcs=store.recoveries.filter(r=>r.lossId===loss.id).reduce((sum,r)=>sum+r.quantityPcs,0);const netPcs=loss.quantityPcs-recoveredPcs;return {...loss,grossPcs:loss.quantityPcs,recoveredPcs,quantityPcs:netPcs,potentialRevenue:netPcs*loss.sellingPrice};});}
