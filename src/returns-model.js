import { planReturnCosts,commitCostPools } from './margin-model.js';
import { WAREHOUSES } from './sku-model.js';
import { availablePcs } from './sales-model.js';
import { validDate } from './supplier-model.js';
const text=value=>String(value??'').trim();
function sourceDocument(store,type,id){
  if(!['customer','supplier'].includes(type))throw Error('Jenis retur tidak valid.');
  const source=(type==='customer'?store.invoices:store.bills).find(d=>d.id===id);
  if(!source)throw Error('Dokumen asal retur tidak ditemukan.');
  if(type==='customer'&&!store.shipments.some(s=>s.id===source.shipmentId))throw Error('Invoice belum memiliki pengiriman asal.');
  if(type==='supplier'&&!store.receipts.some(r=>r.poId===source.poId))throw Error('Barang tagihan ini belum diterima BBI.');
  return source;
}
export function returnablePcs(store,type,sourceId,lineIndex){
  const source=sourceDocument(store,type,sourceId);const line=source.lines[lineIndex];if(!line)return 0;
  const claimed=store.returns.filter(r=>r.type===type&&r.sourceId===sourceId&&r.status!=='Ditolak').flatMap(r=>r.lines).filter(l=>l.lineIndex===lineIndex).reduce((sum,l)=>sum+l.quantityPcs,0);
  return line.quantityPcs-claimed;
}
export function adjustedDocumentTotal(store,type,sourceId){
  const doc=(type==='customer'?store.invoices:store.bills).find(d=>d.id===sourceId);
  if(!doc)throw Error('Dokumen tidak ditemukan.');
  const credits=store.credits.filter(c=>c.type===type&&c.sourceId===sourceId).reduce((sum,c)=>sum+c.total,0);
  return {original:doc.total,credits,net:doc.total-credits};
}
export function requestReturn(store,type,sourceId,input,role){
  if((type==='customer'&&role!=='sales')||(type==='supplier'&&role!=='admin1'))throw Error('Retur pelanggan diajukan Sales; retur supplier oleh Admin 1.');
  const source=sourceDocument(store,type,sourceId);
  if(!validDate(input.date)||input.date<source.date)throw Error('Tanggal retur harus valid dan tidak mendahului dokumen asal.');
  if(!text(input.requestedBy)||text(input.requestedBy).length>120)throw Error('Isi nama pengaju (maksimal 120 karakter).');
  if(!text(input.reason)||text(input.reason).length>500)throw Error('Isi alasan retur (maksimal 500 karakter).');
  if(type==='supplier'&&!WAREHOUSES.some(w=>w.id===input.warehouseId))throw Error('Pilih gudang retur yang valid.');
  if(!Array.isArray(input.lines)||!input.lines.length)throw Error('Pilih minimal satu item dengan qty retur lebih dari 0.');
  const seen=new Set();let total=0;
  const lines=input.lines.map(raw=>{
    const lineIndex=raw.lineIndex;const original=source.lines[lineIndex];const qty=text(raw.quantityPcs);const quantityPcs=Number(qty);
    if(!Number.isInteger(lineIndex)||lineIndex<0||!original||seen.has(lineIndex))throw Error('Baris dokumen tidak valid atau duplikat.');seen.add(lineIndex);
    if(!/^\d+$/.test(qty)||!Number.isSafeInteger(quantityPcs)||quantityPcs<=0||quantityPcs>returnablePcs(store,type,sourceId,lineIndex))throw Error('Qty retur harus pcs bulat positif, maksimal sisa barang yang belum diajukan/diretur.');
    if(type==='supplier'){
      const received=store.receipts.filter(r=>r.poId===source.poId).flatMap(r=>r.lines).filter(l=>l.sku===original.sku).reduce((sum,l)=>sum+l.quantityPcs,0);
      if(quantityPcs>received)throw Error('Qty retur melebihi barang yang diterima BBI.');
    }
    const subtotal=quantityPcs*original.price;total+=subtotal;
    if(!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(total))throw Error('Nilai retur melebihi batas aman.');
    return {lineIndex,sku:original.sku,name:original.name??store.products.find(p=>p.sku===original.sku)?.name??original.sku,sourceSku:original.sourceSku??original.sku,quantityPcs,price:original.price,subtotal};
  });
  const at=new Date().toISOString();const record={id:`RET-${type==='customer'?'C':'S'}-DEMO-${String(store.returns.length+1).padStart(4,'0')}`,type,sourceId,orderId:source.orderId,poId:source.poId??null,party:type==='customer'?source.customer:source.supplier,date:input.date,warehouseId:type==='customer'?null:input.warehouseId,requestedBy:text(input.requestedBy),reason:text(input.reason),lines,total,status:type==='customer'?'Menunggu Admin 2':'Menunggu Admin 1',history:[{action:`Diajukan oleh ${text(input.requestedBy)}`,at}]};
  store.returns.push(record);return record;
}
export function decideReturn(store,returnId,input,role){
  const record=store.returns.find(r=>r.id===returnId);
  if(!record)throw Error('Retur tidak ditemukan.');
  const approver=record.type==='customer'?'Admin 2':'Admin 1';
  if(role!==(record.type==='customer'?'admin2':'admin1'))throw Error(`Hanya ${approver} yang dapat memutuskan retur ini.`);
  if(record.status!==`Menunggu ${approver}`)throw Error('Retur sudah diputuskan.');
  if(!['approve','reject'].includes(input.decision))throw Error('Pilih keputusan yang valid.');
  const note=text(input.note);if(!note||note.length>500)throw Error('Isi catatan keputusan (maksimal 500 karakter).');
  const at=new Date().toISOString();
  if(input.decision==='reject'){record.status='Ditolak';record.history.push({action:`Ditolak ${approver}: ${note}`,at});return record;}
  if(input.physicalConfirmed!==true)throw Error(record.type==='customer'?'Konfirmasikan barang retur sudah diterima dan layak masuk stok.':'Konfirmasikan barang telah dikembalikan dan pengurangan tagihan disepakati supplier.');
  const warehouseId=record.type==='customer'?input.warehouseId:record.warehouseId;
  if(!WAREHOUSES.some(w=>w.id===warehouseId))throw Error('Admin 2 harus memilih gudang penerima retur yang valid.');
  const source=sourceDocument(store,record.type,record.sourceId);
  const totals=adjustedDocumentTotal(store,record.type,record.sourceId);if(record.total>totals.net)throw Error('Nilai retur melebihi sisa tagihan dokumen.');
  const qtyBySku=new Map();
  for(const line of record.lines){
    const original=source.lines[line.lineIndex];const approved=store.returns.filter(r=>r.id!==returnId&&r.type===record.type&&r.sourceId===record.sourceId&&r.status==='Disetujui').flatMap(r=>r.lines).filter(l=>l.lineIndex===line.lineIndex).reduce((sum,l)=>sum+l.quantityPcs,0);
    if(!original||approved+line.quantityPcs>original.quantityPcs)throw Error('Qty retur kumulatif melebihi dokumen asal.');
    qtyBySku.set(line.sku,(qtyBySku.get(line.sku)??0)+line.quantityPcs);
  }
  for(const [sku,qty]of qtyBySku){
    const current=store.balances.find(b=>b.sku===sku&&b.warehouseId===warehouseId)?.quantityPcs??0;
    if(!Number.isSafeInteger(qty)||!Number.isSafeInteger(current+(record.type==='customer'?qty:-qty)))throw Error('Stok retur melebihi batas aman.');
    if(record.type==='supplier'&&availablePcs(store,sku,warehouseId)<qty)throw Error(`Stok bebas ${sku} di gudang terpilih tidak cukup; stok yang dialokasikan ke SO tidak dapat diretur.`);
  }
  const valuation=planReturnCosts(store,record,source);
  const credit={id:`CR-${record.type==='customer'?'C':'S'}-DEMO-${String(store.credits.length+1).padStart(4,'0')}`,type:record.type,sourceId:record.sourceId,returnId:record.id,party:record.party,warehouseId,approvedBy:approver,date:record.date,lines:valuation.lines,costReversal:valuation.costReversal,total:record.total,status:'Penyesuaian demo · belum diposting',at};
  // Validation completes before stock, credit and status changes are committed together in memory.
  for(const [sku,qty]of qtyBySku){let balance=store.balances.find(b=>b.sku===sku&&b.warehouseId===warehouseId);if(!balance){balance={sku,warehouseId,quantityPcs:0};store.balances.push(balance);}const delta=record.type==='customer'?qty:-qty;balance.quantityPcs+=delta;store.movements.push({sourceId:record.id,creditId:credit.id,kind:record.type==='customer'?'customer_return':'supplier_return',sku,warehouseId,quantityDelta:delta,at});}
  commitCostPools(store,valuation.pools);
  store.credits.push(credit);record.status='Disetujui';record.warehouseId=warehouseId;record.approvedBy=approver;record.creditId=credit.id;record.history.push({action:`Disetujui ${approver}: ${note}; gudang ${warehouseId}; stok diperbarui; ${credit.id} mengurangi tagihan`,at});return record;
}
