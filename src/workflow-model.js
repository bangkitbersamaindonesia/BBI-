import { submitOrder,reviewOrder,createPurchaseOrder } from './sales-model.js';
import { WAREHOUSES } from './sku-model.js';
// Build SO, reservation and shortage draft atomically. Authorization remains with Admin 1.
export function submitSalesWorkflow(store,input,role){
 const draft=structuredClone(store);const order=submitOrder(draft,input,role);
 reviewOrder(draft,order.id,'admin1');
 order.history[order.history.length-1].action='Stok diperiksa otomatis saat pengajuan SO; alokasi demo dicatat';
 let po=null;
 if(order.status==='Perlu PO'){
  po=createPurchaseOrder(draft,order.id,{supplier:'Belum dipilih',warehouseId:WAREHOUSES[0].id},'admin1');
  po.supplier='';po.history=[{action:'Draft otomatis dari kekurangan SO; menunggu pemeriksaan dan otorisasi Admin 1',at:new Date().toISOString()}];
 }
 order.history.push({action:'Ketersediaan semua gudang diperiksa otomatis; draft PO hanya untuk kekurangan',at:new Date().toISOString()});
 Object.assign(store,draft);return {order,po};
}
export function editPurchaseOrder(store,id,input,role){
 if(role!=='admin1')throw Error('Hanya Admin 1 yang dapat mengubah draft PO.');
 const po=store.purchaseOrders.find(p=>p.id===id);
 if(!po||po.status!=='Draft')throw Error('Hanya draft PO yang dapat diubah sebelum otorisasi.');
 const supplier=String(input.supplier??'').trim();if(!supplier||supplier.length>200)throw Error('Isi vendor / supplier (maksimal 200 karakter).');
 if(!WAREHOUSES.some(w=>w.id===input.warehouseId))throw Error('Pilih gudang tujuan.');
 if(!input.lines?.length)throw Error('PO harus memiliki minimal satu SKU.');
 const seen=new Set();let total=0;
 const lines=input.lines.map(raw=>{
  const product=store.products.find(p=>p.sku===raw.sku);if(!product||seen.has(raw.sku))throw Error('Pilih SKU valid tanpa duplikat.');seen.add(raw.sku);
  const qty=String(raw.quantityPcs??'');const price=String(raw.price??'');
  if(!/^\d+$/.test(qty)||!Number.isSafeInteger(Number(qty))||Number(qty)<=0||!/^\d+$/.test(price)||!Number.isSafeInteger(Number(price)))throw Error('Qty harus pcs bulat positif, harga rupiah bulat tidak negatif.');
  const subtotal=Number(qty)*Number(price);total+=subtotal;if(!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(total))throw Error('Total PO melebihi batas aman.');
  return {sku:raw.sku,quantityPcs:Number(qty),price:Number(price),subtotal};
 });
 const before={supplier:po.supplier,warehouseId:po.warehouseId,lines:structuredClone(po.lines),total:po.total};
 Object.assign(po,{supplier,warehouseId:input.warehouseId,lines,total});
 po.history.push({action:'Draft PO diubah Admin 1 sebelum otorisasi',before,after:{supplier,warehouseId:po.warehouseId,lines:structuredClone(lines),total},at:new Date().toISOString()});return po;
}
export function purchaseOrderText(po){
 if(!po||po.status==='Draft'||!po.authorizedBy)throw Error('PO harus diotorisasi Admin 1 sebelum dicetak / diunduh.');
 return `PURCHASE ORDER DEMO\n${po.id}\nSupplier: ${po.supplier}\nSO: ${po.orderId}\nGudang: ${po.warehouseId}\nOtorisasi: ${po.authorizedBy}\n\n${po.lines.map(l=>`${l.sku} | ${l.quantityPcs} pcs | Rp ${l.price}/pcs | Rp ${l.subtotal}`).join('\n')}\n\nTotal barang: Rp ${po.total}\nPengiriman ke supplier dilakukan di luar aplikasi demo.\n`;
}
