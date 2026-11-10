export function selectNewArrival(store, sku, selected, user) {
  const identity = store.users.find(row =>
    row.id === user?.id && row.active && row.role === 'superadmin');
  if (!identity || user.role !== 'superadmin') {
    throw Error('Hanya Admin super yang dapat memilih barang baru datang.');
  }
  if (!store.products.some(product => product.sku === sku)) {
    throw Error('SKU tidak ditemukan.');
  }
  const choices = new Set(store.newArrivalSkus ?? []);
  if (selected) choices.add(sku);
  else choices.delete(sku);
  store.newArrivalSkus = [...choices];
}
