import { toPcs, WAREHOUSES } from './sku-model.js';
function requireRole(role, expected) { if (role !== expected) throw new Error(`Langkah ini untuk ${expected === 'sales' ? 'Sales' : 'Admin 1'}.`); }
const text = value => String(value ?? '').trim();
export function submitOrder(store, input, role) {
  requireRole(role, 'sales');
  if (!text(input.customer) || !text(input.salesperson) || !text(input.address)) throw new Error('Pelanggan, nama sales, dan alamat kirim wajib diisi.');
  if ([input.customer,input.salesperson,input.address,input.notes].some(v=>text(v).length>500)) throw new Error('Isian maksimal 500 karakter.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate ?? '') || !Number.isFinite(Date.parse(input.deliveryDate)) || new Date(input.deliveryDate).toISOString().slice(0,10)!==input.deliveryDate) throw new Error('Tanggal kebutuhan wajib diisi.');
  if (!input.lines?.length) throw new Error('Tambahkan minimal satu item.');
  const seen = new Set();
  let total = 0;
  const lines = input.lines.map(line => {
    const product = store.products.find(p=>p.sku===line.sku);
    if (!product || seen.has(line.sku)) throw new Error('Pilih SKU valid dan gabungkan SKU yang sama dalam satu baris.');
    seen.add(line.sku);
    const quantityPcs = toPcs(line.qty,line.unit);
    if (quantityPcs <= 0) throw new Error('Qty pesanan harus lebih dari 0 pcs.');
    const price = String(line.price ?? '').trim();
    if (!/^\d+$/.test(price) || !Number.isSafeInteger(Number(price))) throw new Error('Harga jual harus rupiah bulat dan tidak negatif.');
    const subtotal = quantityPcs * Number(price); total += subtotal;
    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(total)) throw new Error('Nilai pesanan melebihi batas aman.');
    return {sku:product.sku,name:product.name,size:product.size,color:product.color,qty:String(line.qty),unit:line.unit,quantityPcs,price:Number(price),subtotal};
  });
  const order = {id:`SO-DEMO-${String(store.orders.length+1).padStart(4,'0')}`,customer:text(input.customer),salesperson:text(input.salesperson),address:text(input.address),deliveryDate:input.deliveryDate,notes:text(input.notes),lines,total,status:'Menunggu Admin 1',history:[{action:'Diajukan sales',at:new Date().toISOString()}]};
  store.orders.push(order); return order;
}
export function availablePcs(store, sku, warehouseId) {
  const onHand = store.balances.find(b=>b.sku===sku && b.warehouseId===warehouseId)?.quantityPcs ?? 0;
  const reserved = store.reservations.filter(r=>r.sku===sku && r.warehouseId===warehouseId).reduce((sum,r)=>sum+r.quantityPcs,0);
  return Math.max(0,onHand-reserved);
}
export function reviewOrder(store, id, role) {
  requireRole(role,'admin1');
  const order=store.orders.find(o=>o.id===id);
  if (!order || order.status!=='Menunggu Admin 1') throw new Error('SO ini sudah diperiksa atau tidak ditemukan.');
  const reservations=[];
  const review=order.lines.map(line=>{
    let remaining=line.quantityPcs;
    const warehouses=WAREHOUSES.map(w=>{
      const available=availablePcs(store,line.sku,w.id);
      const allocated=Math.min(remaining,available); remaining-=allocated;
      if (allocated) reservations.push({orderId:id,sku:line.sku,warehouseId:w.id,quantityPcs:allocated});
      return {warehouseId:w.id,available,allocated};
    });
    return {sku:line.sku,requested:line.quantityPcs,warehouses,shortage:remaining};
  });
  store.reservations.push(...reservations); order.review=review;
  order.status=review.some(l=>l.shortage>0)?'Perlu PO':'Stok dialokasikan';
  order.history.push({action:'Stok diperiksa Admin 1; alokasi demo dicatat',at:new Date().toISOString()});
  return order;
}
export function createPurchaseOrder(store, orderId, input, role) {
  requireRole(role,'admin1');
  const order=store.orders.find(o=>o.id===orderId);
  if (!order || order.status!=='Perlu PO' || store.purchaseOrders.some(p=>p.orderId===orderId)) throw new Error('PO hanya dapat dibuat sekali untuk SO yang kekurangan stok.');
  if (!text(input.supplier) || text(input.supplier).length>200) throw new Error('Isi supplier (maksimal 200 karakter).');
  if (!WAREHOUSES.some(w=>w.id===input.warehouseId)) throw new Error('Pilih gudang tujuan.');
  let total=0;
  const lines=order.review.filter(l=>l.shortage>0).map(l=>{
    const price=store.products.find(p=>p.sku===l.sku).purchasePrice;
    const subtotal=l.shortage*price; total+=subtotal;
    if (!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(total)) throw new Error('Nilai PO melebihi batas aman.');
    return {sku:l.sku,quantityPcs:l.shortage,price,subtotal};
  });
  const po={id:`PO-DEMO-${String(store.purchaseOrders.length+1).padStart(4,'0')}`,orderId,supplier:text(input.supplier),warehouseId:input.warehouseId,lines,total,status:'Draft',history:[{action:'Draft dibuat Admin 1',at:new Date().toISOString()}]};
  store.purchaseOrders.push(po); order.status='PO dibuat'; order.history.push({action:`Draft ${po.id} dibuat`,at:new Date().toISOString()}); return po;
}
export function readyPurchaseOrder(store,id,role) {
  requireRole(role,'admin1');
  const po=store.purchaseOrders.find(p=>p.id===id);
  if (!po || po.status!=='Draft') throw new Error('Hanya draft PO yang dapat ditandai siap.');
  po.status='Siap dikirim'; po.history.push({action:'Ditandai siap dikirim oleh Admin 1 (belum dikirim)',at:new Date().toISOString()}); return po;
}
