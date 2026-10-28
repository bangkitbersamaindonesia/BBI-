export const demoStore = {
  products: [
    { sku:'OXF-BLK-XL', name:'Kemeja Oxford', size:'XL', color:'Hitam', purchasePrice:85000, sellingPrice:125000, unit:'lusin', notes:'Contoh produk garment' },
    { sku:'TSH-WHT-M', name:'Kaos Basic', size:'M', color:'Putih', purchasePrice:35000, sellingPrice:59000, unit:'kodi', notes:'' },
  ],
  balances: [{sku:'OXF-BLK-XL',warehouseId:'lebak',quantityPcs:120},{sku:'OXF-BLK-XL',warehouseId:'kediri',quantityPcs:24},{sku:'TSH-WHT-M',warehouseId:'lebak',quantityPcs:200}],
  orders: [], purchaseOrders: [], reservations: [], responses: [], bills: [], lossSales: [], receipts: [], shipments: [], invoices: [], recoveries: [], movements: [], returns: [], credits: [],
};
const listeners = new Set();
export function subscribeDemo(listener) { listeners.add(listener); }
export function notifyDemo() { listeners.forEach(listener => listener()); }
