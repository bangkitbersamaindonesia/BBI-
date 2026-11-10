import {validateSku, totalPcs} from './sku-model.js';

export function canManageProducts(store, user) {
  return Boolean(user?.active && ['admin1','admin2','admin3','superadmin'].includes(user.role) &&
    store.users.some(row=>row.id===user.id && row.active && row.role===user.role));
}
export function requireProductAdmin(store, user) {
  if (!canManageProducts(store,user)) throw Error('Hanya admin yang dapat mengelola SKU.');
}
export function editProduct(store, sku, input, user) {
  requireProductAdmin(store,user);
  const product = store.products.find(row=>row.sku===sku);
  if (!product) throw Error('SKU tidak ditemukan.');
  const {value,errors} = validateSku({...input,sku,qty:'0',warehouseId:'lebak'},store.products.filter(row=>row.sku!==sku));
  if (Object.keys(errors).length) throw Error(Object.values(errors)[0]);
  // Inventory cost pools remain historical. Opening inventory uses purchase price until a pool exists.
  if (value.purchasePrice !== product.purchasePrice && totalPcs(product,store.balances)>0 && !store.costPools?.[sku]) {
    throw Error('Harga beli stok awal tidak dapat diubah selama stok masih tersedia.');
  }
  for (const key of ['name','size','color','purchasePrice','sellingPrice','unit','notes']) product[key]=value[key];
  return product;
}
export function deleteProduct(store, sku, user) {
  requireProductAdmin(store,user);
  const product=store.products.find(row=>row.sku===sku);
  if (!product) throw Error('SKU tidak ditemukan.');
  const referenced = ['orders','purchaseOrders','bills','invoices','returns','credits','movements','reservations']
    .some(key=>(store[key]??[]).some(row=>row.sku===sku || row.lines?.some(line=>line.sku===sku || line.sourceSku===sku)));
  if (referenced || totalPcs(product,store.balances)!==0 || BigInt(store.costPools?.[sku]?.valueMicros??0)!==0n) {
    throw Error('SKU masih memiliki stok atau riwayat transaksi sehingga tidak dapat dihapus.');
  }
  store.products=store.products.filter(row=>row.sku!==sku);
  store.balances=store.balances.filter(row=>row.sku!==sku);
  store.newArrivalSkus=(store.newArrivalSkus??[]).filter(value=>value!==sku);
  if(store.costPools)delete store.costPools[sku];
}
