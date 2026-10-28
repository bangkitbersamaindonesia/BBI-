import { WAREHOUSES } from './sku-model.js';
const text=value=>String(value??'').trim();
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value??'') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
// Record a final external response, not a receipt, payment, or ledger posting.
export function recordSupplierResponse(store,poId,input,role) {
  if(role!=='admin1')throw new Error('Respons supplier dicatat oleh Admin 1.');
  const po=store.purchaseOrders.find(p=>p.id===poId);
  if(!po || po.status!=='Siap dikirim' || po.response)throw new Error('PO belum siap atau respons final sudah tercatat.');
  if(input.final!==true)throw new Error('Konfirmasikan bahwa respons final dan sisa tidak akan dikirim.');
  if(!validDate(input.responseDate))throw new Error('Isi tanggal respons yang valid.');
  if(!Array.isArray(input.lines)||input.lines.length!==po.lines.length)throw new Error('Isi respons untuk setiap SKU PO.');
  const order=store.orders.find(o=>o.id===po.orderId);
  if(!order || !WAREHOUSES.some(w=>w.id===po.warehouseId))throw new Error('Sumber SO atau gudang tidak ditemukan.');
  const seen=new Set(); let billTotal=0;let lossTotal=0;
  const lines=input.lines.map(raw=>{
    const original=po.lines.find(l=>l.sku===raw.sku);
    const sale=order.lines.find(l=>l.sku===raw.sku);
    if(!original||!sale||seen.has(raw.sku))throw new Error('SKU respons tidak valid atau duplikat.');
    seen.add(raw.sku);
    const qtyText=text(raw.fulfilledPcs);const priceText=text(raw.price);
    const quantityPcs=Number(qtyText);const price=Number(priceText);
    if(!/^\d+$/.test(qtyText)||!Number.isSafeInteger(quantityPcs)||quantityPcs>original.quantityPcs)throw new Error('Qty dipenuhi harus pcs bulat antara 0 dan qty PO.');
    if(!/^\d+$/.test(priceText)||!Number.isSafeInteger(price))throw new Error('Harga tagihan harus rupiah bulat dan tidak negatif.');
    const shortagePcs=original.quantityPcs-quantityPcs;
    const reason=text(raw.reason);
    if(reason.length>500 || (shortagePcs>0&&!reason))throw new Error('Isi alasan ketidaktersediaan untuk setiap qty yang kurang (maksimal 500 karakter).');
    const subtotal=quantityPcs*price;const lostRevenue=shortagePcs*sale.price;
    billTotal+=subtotal;lossTotal+=lostRevenue;
    if(![subtotal,lostRevenue,billTotal,lossTotal].every(Number.isSafeInteger))throw new Error('Nilai respons melebihi batas aman.');
    return {sku:original.sku,name:sale.name,size:sale.size,color:sale.color,orderedPcs:original.quantityPcs,quantityPcs,shortagePcs,price,subtotal,reason,sellingPrice:sale.price,lostRevenue};
  });
  const supplied=lines.filter(l=>l.quantityPcs>0);
  const billReference=text(input.billReference);
  if(billReference.length>120 || (supplied.length&&!billReference))throw new Error('Nomor tagihan supplier wajib untuk barang yang dipenuhi (maksimal 120 karakter).');
  if(supplied.length && store.bills.some(b=>b.supplier.toLowerCase()===po.supplier.toLowerCase() && b.reference.toLowerCase()===billReference.toLowerCase()))throw new Error('Nomor tagihan supplier ini sudah tercatat.');
  const at=new Date().toISOString();
  const response={id:`RESP-DEMO-${String(store.responses.length+1).padStart(4,'0')}`,poId,orderId:order.id,date:input.responseDate,final:true,lines,at};
  const bill=supplied.length?{id:`BILL-DEMO-${String(store.bills.length+1).padStart(4,'0')}`,reference:billReference,supplier:po.supplier,poId,orderId:order.id,responseId:response.id,date:input.responseDate,warehouseId:po.warehouseId,lines:supplied.map(l=>({sku:l.sku,quantityPcs:l.quantityPcs,price:l.price,subtotal:l.subtotal})),total:billTotal,status:'Tercatat · belum diposting',at}:null;
  const losses=lines.filter(l=>l.shortagePcs>0).map((l,index)=>({id:`LOSS-DEMO-${String(store.lossSales.length+index+1).padStart(4,'0')}`,responseId:response.id,poId,orderId:order.id,date:input.responseDate,customer:order.customer,salesperson:order.salesperson,supplier:po.supplier,warehouseId:po.warehouseId,sku:l.sku,name:l.name,size:l.size,color:l.color,quantityPcs:l.shortagePcs,sellingPrice:l.sellingPrice,potentialRevenue:l.lostRevenue,reason:l.reason,at}));
  // Validate everything before mutating any records so a failed response leaves no partial bill/loss.
  store.responses.push(response);if(bill)store.bills.push(bill);store.lossSales.push(...losses);
  po.response=response;po.status=losses.length?(bill?'Respons sebagian · ada loss sales':'Tidak tersedia · loss sales'):'Respons penuh';
  po.history.push({action:`Respons final supplier dicatat; ${bill?bill.id:'tanpa tagihan'}; ${losses.length} SKU loss sales`,at});
  order.status=losses.length?'Ada loss sales':'Menunggu barang supplier';
  order.history.push({action:`Respons final ${po.id}: ${losses.length} SKU loss sales; bukan bukti penerimaan barang`,at});
  return {response,bill,losses};
}
export function filterLossSales(records,filters={}) {
  return records.filter(r=>(!filters.start||r.date>=filters.start)&&(!filters.end||r.date<=filters.end)&&['sku','supplier','customer'].every(key=>!text(filters[key])||String(r[key]).toLocaleLowerCase('id-ID').includes(text(filters[key]).toLocaleLowerCase('id-ID'))));
}
export function summarizeLossSales(records) {
  const groups=new Map();
  let quantityPcs=0n,potentialRevenue=0n,grossPcs=0n,recoveredPcs=0n;
  for(const record of records){
    const qty=BigInt(record.quantityPcs);const value=BigInt(record.potentialRevenue);
    quantityPcs+=qty;potentialRevenue+=value;grossPcs+=BigInt(record.grossPcs??record.quantityPcs);recoveredPcs+=BigInt(record.recoveredPcs??0);
    if(!groups.has(record.sku))groups.set(record.sku,{sku:record.sku,name:record.name,size:record.size,color:record.color,quantityPcs:0n,potentialRevenue:0n});
    const group=groups.get(record.sku);group.quantityPcs+=qty;group.potentialRevenue+=value;
  }
  return {quantityPcs,potentialRevenue,grossPcs,recoveredPcs,orderCount:new Set(records.map(r=>r.orderId)).size,skuCount:groups.size,groups:[...groups.values()].sort((a,b)=>a.potentialRevenue===b.potentialRevenue?a.sku.localeCompare(b.sku):a.potentialRevenue>b.potentialRevenue?-1:1)};
}
export function lossSalesCsv(records) {
  const cell=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const headers=['Tanggal kejadian','SO','PO','Respons','Pelanggan','Sales','Supplier','Gudang','SKU','Nama barang','Size','Warna','Kekurangan awal pcs','Terpenuhi pengganti pcs','Loss net pcs','Harga jual SO per pcs','Potensi omzet IDR','Alasan'];
  return '\uFEFF'+[headers,...records.map(r=>[r.date,r.orderId,r.poId,r.responseId,r.customer,r.salesperson,r.supplier,WAREHOUSES.find(w=>w.id===r.warehouseId)?.name??r.warehouseId,r.sku,r.name,r.size,r.color,r.grossPcs??r.quantityPcs,r.recoveredPcs??0,r.quantityPcs,r.sellingPrice,r.potentialRevenue,r.reason])].map(row=>row.map(cell).join(',')).join('\r\n');
}
