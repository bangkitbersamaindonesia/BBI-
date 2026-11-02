import { recordSupplierResponse } from './supplier-model.js';
// Bill edits are validated on a copy so extra SKU validation cannot partially write a bill.
export function finalizeBillDraft(store,poId,input,role){
 if(role!=='admin1')throw Error('Draft bills hanya dapat difinalisasi Admin 1.');
 const po=store.purchaseOrders.find(p=>p.id===poId);if(!po||po.status!=='Siap dikirim'||po.response)throw Error('PO belum diotorisasi atau bills sudah final.');
 const seen=new Set();const rows=(input.lines??[]).map(raw=>{
  const product=store.products.find(p=>p.sku===raw.sku);if(!product||seen.has(raw.sku))throw Error('Pilih SKU valid tanpa duplikat.');seen.add(raw.sku);
  const qty=String(raw.quantityPcs??'');const price=String(raw.price??'');if(!/^\d+$/.test(qty)||!Number.isSafeInteger(Number(qty))||Number(qty)<=0||!/^\d+$/.test(price)||!Number.isSafeInteger(Number(price)))throw Error('Qty bills harus pcs bulat positif dan harga rupiah bulat tidak negatif.');
  return {sku:raw.sku,quantityPcs:Number(qty),price:Number(price)};
 });
 const copy=structuredClone(store);const draft=copy.purchaseOrders.find(p=>p.id===poId);
 // The response engine handles ordered quantities; bill extras are appended separately.
 const responseLines=po.lines.map(l=>{const row=rows.find(r=>r.sku===l.sku);return {sku:l.sku,fulfilledPcs:Math.min(row?.quantityPcs??0,l.quantityPcs),price:row?.price??l.price,reason:'Selisih PO dengan bills final supplier'};});
 const result=recordSupplierResponse(copy,poId,{...input,lines:responseLines},role);
 // Bills reconciliation follows every authorized PO line, including Admin 1 additions.
 for(const line of result.response.lines){
  if(!line.shortagePcs)continue;
  const existing=result.losses.find(l=>l.sku===line.sku);
  const product=copy.products.find(p=>p.sku===line.sku);
  const sellingPrice=copy.orders.find(o=>o.id===po.orderId)?.lines.find(l=>l.sku===line.sku)?.price??product.sellingPrice;
  const value=line.shortagePcs*sellingPrice;if(!Number.isSafeInteger(value))throw Error('Nilai loss sales melebihi batas aman.');
  if(existing){existing.quantityPcs=line.shortagePcs;existing.potentialRevenue=value;}else{const loss={id:`LOSS-DEMO-${String(copy.lossSales.length+1).padStart(4,'0')}`,responseId:result.response.id,poId,orderId:po.orderId,date:input.responseDate,customer:copy.orders.find(o=>o.id===po.orderId).customer,salesperson:copy.orders.find(o=>o.id===po.orderId).salesperson,supplier:po.supplier,warehouseId:po.warehouseId,sku:line.sku,name:product.name,size:product.size,color:product.color,quantityPcs:line.shortagePcs,sellingPrice,potentialRevenue:value,reason:'Selisih PO dengan bills final supplier',at:new Date().toISOString()};copy.lossSales.push(loss);result.losses.push(loss);}
 }
 const extra=rows.flatMap(row=>{const ordered=po.lines.find(l=>l.sku===row.sku)?.quantityPcs??0;const quantityPcs=Math.max(0,row.quantityPcs-ordered);if(!quantityPcs)return [];const p=copy.products.find(p=>p.sku===row.sku);return [{sku:row.sku,name:p.name,size:p.size,color:p.color,quantityPcs,price:row.price,subtotal:quantityPcs*row.price}];});
 let bill=result.bill;
 if(extra.length){
  const reference=String(input.billReference??'').trim();if(!reference||reference.length>120)throw Error('Isi nomor bills supplier.');
  if(!bill&&copy.bills.some(b=>b.supplier.toLowerCase()===po.supplier.toLowerCase()&&b.reference.toLowerCase()===reference.toLowerCase()))throw Error('Nomor bills supplier sudah digunakan.');
  if(!bill){bill={id:`BILL-DEMO-${String(copy.bills.length+1).padStart(4,'0')}`,reference,supplier:po.supplier,poId,orderId:po.orderId,responseId:result.response.id,date:input.responseDate,warehouseId:po.warehouseId,lines:[],total:0,status:'Tercatat · belum diposting',at:new Date().toISOString()};copy.bills.push(bill);}
  for(const l of extra){bill.total+=l.subtotal;if(!Number.isSafeInteger(l.subtotal)||!Number.isSafeInteger(bill.total))throw Error('Total bills melebihi batas aman.');const existing=bill.lines.find(r=>r.sku===l.sku);if(existing){existing.quantityPcs+=l.quantityPcs;existing.subtotal+=l.subtotal;}else bill.lines.push({sku:l.sku,quantityPcs:l.quantityPcs,price:l.price,subtotal:l.subtotal});const responseRow=result.response.lines.find(r=>r.sku===l.sku);if(responseRow){responseRow.quantityPcs+=l.quantityPcs;responseRow.subtotal+=l.subtotal;}else result.response.lines.push({...l,orderedPcs:0,shortagePcs:0,lossPcs:0,reason:'Tambahan bills di luar qty PO',sellingPrice:0,lostRevenue:0});}
 }
 draft.status=result.losses.length?(bill?'Respons sebagian · ada loss sales':'Tidak tersedia · loss sales'):'Respons penuh';
 copy.orders.find(o=>o.id===po.orderId).status=result.losses.length?'Ada loss sales':'Menunggu barang supplier';
 draft.history.push({action:'Draft bills otomatis dari PO dicocokkan dan difinalisasi Admin 1',billLines:structuredClone(rows),at:new Date().toISOString()});
 Object.assign(store,copy);return {...result,bill};
}
