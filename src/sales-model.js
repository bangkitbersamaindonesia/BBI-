import { toPcs, UNITS, WAREHOUSES } from './sku-model.js';
function requireRole(role, expected) { if (role !== expected) throw new Error(`Langkah ini untuk ${expected === 'sales' ? 'Sales' : 'Admin 1'}.`); }
const text = value => String(value ?? '').trim();
export function salesLineAmounts(qty, unit, rawPrice, perUnit = false) {
  const quantityPcs = toPcs(qty, unit);
  const unitPrice = Number(rawPrice);
  if (quantityPcs <= 0 || !/^\d+$/.test(text(rawPrice)) || !Number.isSafeInteger(unitPrice)) {
    throw Error('Isi qty positif dan harga jual rupiah bulat.');
  }
  const divisor = BigInt(perUnit ? UNITS[unit] : 1);
  const rounded = value => Number((value + divisor / 2n) / divisor);
  const subtotal = rounded(BigInt(quantityPcs) * BigInt(unitPrice));
  if (!Number.isSafeInteger(subtotal)) throw Error('Nilai pesanan melebihi batas aman.');
  return {quantityPcs, price:rounded(BigInt(unitPrice)), subtotal, ...(perUnit ? {unitPrice} : {})};
}
export function salesOrderDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta', year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}
export function nextSalesOrderNumber(orders, date) {
  const prefix = date.slice(2).replaceAll('-', '');
  const last = orders.reduce((max, order) => {
    const id = String(order.id);
    return id.length === 9 && id.startsWith(prefix) && /^\d+$/.test(id)
      ? Math.max(max, Number(id.slice(6))) : max;
  }, 0);
  if (last >= 999) throw Error('Nomor Sales Order hari ini sudah mencapai 999.');
  return prefix + String(last + 1).padStart(3, '0');
}
export function submitOrder(store, input, role, existing = null) {
  requireRole(role, 'sales');
  if (input.customerFromCenter) {
    const customer = store.customers?.find(c => c.name === input.customer && c.active !== false);
    if (!customer || (input.salesOwner && customer.salesperson !== input.salesOwner)) throw Error('Pilih customer aktif yang sesuai dengan Sales.');
    input = {...input, salesperson:input.salesOwner || text(input.salesperson) || customer.salesperson, address:customer.shippingAddress ?? customer.address,
      expeditionAddress:customer.expeditionAddress};
  }
  if (input.customerFromCenter && !['Doni','Lutfi','Dipa'].includes(text(input.salesperson))) {
    throw Error('Pilih Sales Doni, Lutfi, atau Dipa.');
  }
  const letterhead = input.letterhead ?? 'B';
  if (!['A','B'].includes(letterhead)) throw Error('Pilih opsi invoice A atau B.');
  if (!text(input.customer) || !text(input.salesperson) || !text(input.address)) throw new Error('Pelanggan, nama sales, dan alamat kirim wajib diisi.');
  if ([input.customer,input.salesperson,input.notes].some(v=>text(v).length>500)) throw new Error('Isian maksimal 500 karakter.');
  if ([input.address,input.expeditionAddress].some(v=>text(v).length>1000)) throw Error('Alamat maksimal 1.000 karakter.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate ?? '') || !Number.isFinite(Date.parse(input.deliveryDate)) || new Date(input.deliveryDate).toISOString().slice(0,10)!==input.deliveryDate) throw new Error('Tanggal kebutuhan wajib diisi.');
  if (!input.lines?.length) throw new Error('Tambahkan minimal satu item.');
  const seen = new Set();
  let total = 0;
  const lines = input.lines.map(line => {
    const product = store.products.find(p=>p.sku===line.sku);
    if (!product || seen.has(line.sku)) throw new Error('Pilih SKU valid dan gabungkan SKU yang sama dalam satu baris.');
    seen.add(line.sku);
    const amounts = salesLineAmounts(line.qty,line.unit,line.price,input.pricePerUnit);
    total += amounts.subtotal;
    if (!Number.isSafeInteger(total)) throw Error('Nilai pesanan melebihi batas aman.');
    return {sku:product.sku,name:product.name,size:product.size,color:product.color,qty:String(line.qty),unit:line.unit,...amounts};
  });
  const date = existing?.date ?? salesOrderDate();
  const order = {id:existing?.id ?? nextSalesOrderNumber([...store.orders,...(store.deletedOrders ?? [])],date),date,customer:text(input.customer),salesperson:text(input.salesperson),address:text(input.address),expeditionAddress:text(input.expeditionAddress),deliveryDate:input.deliveryDate,letterhead,notes:text(input.notes),lines,total,status:'Menunggu Admin 1',history:[{action:'Diajukan sales',at:new Date().toISOString()}]};
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
export function nextPurchaseOrderId(store) {
  const ids = [...store.purchaseOrders.map(po=>po.id), ...(store.deletedPurchaseOrderIds ?? [])];
  const last = ids.reduce((max,id)=>Math.max(max, Number(/^PO-DEMO-(\d+)$/.exec(id)?.[1] ?? 0)),0);
  return 'PO-DEMO-' + String(last + 1).padStart(4,'0');
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
  const po={id:nextPurchaseOrderId(store),orderId,supplier:text(input.supplier),warehouseId:input.warehouseId,lines,total,status:'Draft',history:[{action:'Draft dibuat Admin 1',at:new Date().toISOString()}]};
  store.purchaseOrders.push(po); order.status='PO dibuat'; order.history.push({action:`Draft ${po.id} dibuat`,at:new Date().toISOString()}); return po;
}
export function readyPurchaseOrder(store,id,role) {
  requireRole(role,'admin1');
  const po=store.purchaseOrders.find(p=>p.id===id);
  if (!po || po.status!=='Draft') throw new Error('Hanya draft PO yang dapat ditandai siap.');
  if(!po.supplier?.trim())throw Error('Pilih supplier dan simpan draft PO sebelum otorisasi.');
  po.authorizedBy='Admin 1';po.authorizedAt=new Date().toISOString();
  po.status='Siap dikirim'; po.history.push({action:'Ditandai siap dikirim oleh Admin 1 (belum dikirim)',at:new Date().toISOString()}); return po;
}
