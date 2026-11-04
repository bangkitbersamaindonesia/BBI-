import { previewInvoiceAmounts } from './invoice-preview-model.js';
import { submitOrder,reviewOrder,createPurchaseOrder,nextPurchaseOrderId } from './sales-model.js';
import { WAREHOUSES } from './sku-model.js';
// Build SO, reservation and shortage draft atomically. Authorization remains with Admin 1.
export function submitSalesWorkflow(store,input,role){
 const draft=structuredClone(store);
 const result=allocateSalesOrder(draft,submitOrder(draft,input,role));
 Object.assign(store,draft);
 return result;
}
function allocateSalesOrder(draft,order){
 reviewOrder(draft,order.id,'admin1');
 order.history[order.history.length-1].action='Stok diperiksa otomatis saat pengajuan SO; alokasi demo dicatat';
 let po=null;
 if(order.status==='Perlu PO'){
  po=createPurchaseOrder(draft,order.id,{supplier:'Belum dipilih',warehouseId:WAREHOUSES[0].id},'admin1');
  po.supplier='';po.history=[{action:'Draft otomatis dari kekurangan SO; menunggu pemeriksaan dan otorisasi Admin 1',at:new Date().toISOString()}];
 }
 order.history.push({action:'Ketersediaan semua gudang diperiksa otomatis; draft PO hanya untuk kekurangan',at:new Date().toISOString()});
 return {order,po};
}
export function canChangeSalesOrder(store,order,role,salesOwner=null){
 if(!order || role!=='sales' || (salesOwner && order.salesperson!==salesOwner))return false;
 if(!['Menunggu Admin 1','Stok dialokasikan','Perlu PO','PO dibuat'].includes(order.status))return false;
 if(['invoices','shipments','bills','receipts','returns','credits','lossSales'].some(key=>store[key]?.some(row=>row.orderId===order.id)))return false;
 return !store.purchaseOrders.some(po=>po.orderId===order.id &&
  (po.status!=='Draft' || po.authorizedBy || po.response || po.history?.some(event=>event.before)));
}

function releaseSalesOrder(store,id){
 store.reservations=store.reservations.filter(row=>row.orderId!==id);
 const removed=store.purchaseOrders.filter(po=>po.orderId===id);
 if(removed.length)(store.deletedPurchaseOrderIds ??= []).push(...removed.map(po=>po.id));
 store.purchaseOrders=store.purchaseOrders.filter(po=>po.orderId!==id);
 store.orders=store.orders.filter(order=>order.id!==id);
}

export function editSalesWorkflow(store,id,input,role){
 const original=store.orders.find(order=>order.id===id);
 if(!canChangeSalesOrder(store,original,role,input.salesOwner))throw Error('SO ini sudah diproses atau tidak dapat diedit.');
 const draft=structuredClone(store);
 const position=draft.orders.findIndex(order=>order.id===id);
 releaseSalesOrder(draft,id);
 const order=submitOrder(draft,input,role,original);
 const result=allocateSalesOrder(draft,order);
 order.history=[...original.history,{action:'SO diedit dan alokasi stok dihitung ulang',at:new Date().toISOString()},...order.history.slice(1)];
 draft.orders.pop();
 draft.orders.splice(position,0,order);
 Object.assign(store,draft);
 return result;
}

export function deleteSalesWorkflow(store,id,role,salesOwner=null){
 const order=store.orders.find(row=>row.id===id);
 if(!canChangeSalesOrder(store,order,role,salesOwner))throw Error('SO ini sudah diproses atau tidak dapat dihapus.');
 const draft=structuredClone(store);
 releaseSalesOrder(draft,id);
 (draft.deletedOrders ??= []).push({id,deletedAt:new Date().toISOString()});
 Object.assign(store,draft);
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
 const discountPercent=previewInvoiceAmounts({lines:[]},[],input.discountPercent??po.discountPercent??'0').percent;
 const paymentTerms=String(input.paymentTerms??po.paymentTerms??'Belum ditentukan').trim();if(!paymentTerms||paymentTerms.length>500)throw Error('Isi term of payment (maksimal 500 karakter).');
 const discounted=previewInvoiceAmounts({lines},[],discountPercent);
 for(let i=0;i<lines.length;i++){lines[i].grossPrice=lines[i].price;lines[i].price=Number(discounted.lines[i].discountedPrice);lines[i].subtotal=Number(discounted.lines[i].discountedSubtotal);}
 total=Number(discounted.total);if(!Number.isSafeInteger(total))throw Error('Total PO melebihi batas aman.');
 const before={discountPercent:po.discountPercent,paymentTerms:po.paymentTerms,supplier:po.supplier,warehouseId:po.warehouseId,lines:structuredClone(po.lines),total:po.total};
 Object.assign(po,{supplier,warehouseId:input.warehouseId,lines,total,discountPercent,paymentTerms});
 po.history.push({action:'Draft PO diubah Admin 1 sebelum otorisasi',before,after:{discountPercent,paymentTerms,supplier,warehouseId:po.warehouseId,lines:structuredClone(lines),total},at:new Date().toISOString()});return po;
}
export function purchaseOrderText(po){
 if(!po||po.status==='Draft'||!po.authorizedBy)throw Error('PO harus diotorisasi Admin 1 sebelum dicetak / diunduh.');
 return `PURCHASE ORDER DEMO\n${po.id}\nSupplier: ${po.supplier}\nSO: ${po.orderId??'Pengisian stok · tanpa SO'}\nGudang: ${po.warehouseId}\nOtorisasi: ${po.authorizedBy}\nDiskon: ${po.discountPercent??0}%\nTerm of payment: ${po.paymentTerms??'Belum ditentukan'}\n\n${po.lines.map(l=>`${l.sku} | ${l.quantityPcs} pcs | Rp ${l.price}/pcs | Rp ${l.subtotal}`).join('\n')}\n\nTotal barang: Rp ${po.total}\nPengiriman ke supplier dilakukan di luar aplikasi demo.\n`;
}
export function createStockPurchaseOrder(store,input,role){
 if(role!=='admin1')throw Error('Hanya Admin 1 yang dapat membuat PO pengisian stok.');
 const draft=structuredClone(store);const id=nextPurchaseOrderId(draft);
 const po={id,orderId:null,purpose:'stock_replenishment',supplier:'',warehouseId:'',lines:[],total:0,status:'Draft',history:[{action:'Draft PO pengisian stok dibuat Admin 1 tanpa SO',at:new Date().toISOString()}]};
 draft.purchaseOrders.push(po);editPurchaseOrder(draft,id,input,role);Object.assign(store,draft);return po;
}
