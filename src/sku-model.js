export const UNITS = Object.freeze({ pcs: 1, lusin: 12, kodi: 20, gros: 144 });
export const WAREHOUSES = Object.freeze([
  { id: 'lebak', name: 'Gudang Lebak' },
  { id: 'kediri', name: 'Gudang Kediri' },
  { id: 'besar', name: 'Gudang Besar' },
]);
export function toPcs(qty, unit) {
  if (!Object.hasOwn(UNITS, unit) || String(qty).trim() === '') throw new Error('Qty dan satuan wajib diisi.');
  const pcs = Number(qty) * UNITS[unit];
  if (!Number.isFinite(Number(qty)) || Number(qty) < 0 || !Number.isSafeInteger(pcs)) throw new Error('Qty harus menghasilkan pcs bulat, tidak negatif, dan dalam batas aman.');
  return pcs;
}
export function validateSku(input, products = []) {
  const errors = {};
  const value = {};
  for (const field of ['sku', 'name', 'size', 'color', 'notes']) value[field] = String(input[field] ?? '').trim();
  value.sku = value.sku.toUpperCase();
  for (const field of ['sku', 'name', 'size', 'color']) if (!value[field]) errors[field] = 'Wajib diisi.';
  if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(value.sku)) errors.sku = 'Gunakan 1–64 huruf, angka, titik, tanda - atau _.';
  if (products.some(p => p.sku.toUpperCase() === value.sku)) errors.sku = 'Kode SKU sudah digunakan.';
  for (const field of ['name', 'size', 'color', 'notes']) if (value[field].length > (field === 'notes' ? 500 : 120)) errors[field] = 'Teks terlalu panjang.';
  // Integer rupiah per pcs: no floating-point financial calculations in this demo.
  for (const field of ['purchasePrice', 'sellingPrice']) {
    const raw = String(input[field] ?? '').trim();
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) errors[field] = 'Isi rupiah bulat, minimal 0, dalam batas aman.';
    value[field] = Number(raw);
  }
  value.unit = input.unit;
  if (!WAREHOUSES.some(w => w.id === input.warehouseId)) errors.warehouseId = 'Pilih gudang.';
  try { value.quantityPcs = toPcs(input.qty, input.unit); } catch (e) { errors.qty = e.message; }
  value.warehouseId = input.warehouseId;
  return { value, errors };
}
export const totalPcs = (product, balances) => balances.filter(b => b.sku === product.sku).reduce((sum, b) => sum + b.quantityPcs, 0);
