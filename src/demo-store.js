import { createInitialUsers } from './users-model.js';
import { createInitialAccounts } from "./accounts-model.js";
export const demoStore = {
  accounts: createInitialAccounts(),
  users: createInitialUsers(),
  products: [
    { sku:'OXF-BLK-XL', name:'Kemeja Oxford', size:'XL', color:'Hitam', purchasePrice:85000, sellingPrice:125000, unit:'lusin', notes:'Contoh produk garment', preferredVendor:'Vendor Demo Sandang' },
    { sku:'TSH-WHT-M', name:'Kaos Basic', size:'M', color:'Putih', purchasePrice:35000, sellingPrice:59000, unit:'kodi', notes:'', preferredVendor:'Vendor Demo Tekstil' },
    { sku:'DRS-NVY-L', name:'Dress Navy', size:'L', color:'Navy', purchasePrice:120000, sellingPrice:156000, unit:'pcs', preferredVendor:'Vendor Demo Sandang' },
    { sku:'BLS-CRM-M', name:'Blouse Krem', size:'M', color:'Krem', purchasePrice:65000, sellingPrice:85000, unit:'lusin', preferredVendor:'Vendor Demo Sandang' },
    { sku:'CLN-GRY-L', name:'Celana Abu', size:'L', color:'Abu-abu', purchasePrice:95000, sellingPrice:124000, unit:'pcs', preferredVendor:'Vendor Demo Tekstil' },
  ],
  balances: [{sku:'OXF-BLK-XL',warehouseId:'lebak',quantityPcs:120},{sku:'OXF-BLK-XL',warehouseId:'kediri',quantityPcs:24},{sku:'TSH-WHT-M',warehouseId:'lebak',quantityPcs:200},
    {sku:'DRS-NVY-L',warehouseId:'besar',quantityPcs:36},
    {sku:'BLS-CRM-M',warehouseId:'kediri',quantityPcs:48},
  ],
  customers: [
    {name:'Toko Demo Lebak',salesperson:'Doni',terms:'Cash',geography:'Jawa',billingAddress:'Alamat tagihan contoh, Lebak',shippingAddress:'Alamat kirim contoh, Lebak',expeditionAddress:'Agen ekspedisi contoh, Lebak',active:true},
    {name:'Toko Demo Kediri',salesperson:'Lutfi',terms:'Net 14',geography:'Jawa',billingAddress:'Alamat tagihan contoh, Kediri',shippingAddress:'Alamat kirim contoh, Kediri',expeditionAddress:'Agen ekspedisi contoh, Kediri',active:true},
    {name:'Toko Demo Makassar',salesperson:'Dipa',terms:'Net 30',geography:'Luar Pulau',billingAddress:'Alamat tagihan contoh, Makassar',shippingAddress:'Alamat kirim contoh, Makassar',expeditionAddress:'Agen ekspedisi contoh, Surabaya',active:true},
  ],
  vendors: [
    {name:'Vendor Demo Sandang',terms:'Net 30',address:'Alamat vendor contoh, Bandung',active:true},
    {name:'Vendor Demo Tekstil',terms:'Net 14',address:'Alamat vendor contoh, Surabaya',active:true},
  ],
  newArrivalSkus: [],
  payments: [], writeOffs: [], checks: [],
  orders: [], purchaseOrders: [], reservations: [], responses: [], bills: [], lossSales: [], receipts: [], shipments: [], invoices: [], recoveries: [], movements: [], returns: [], credits: [], costPools: {},
};
demoStore.financialOpenings=demoStore.balances.map((b,i)=>({id:'OPEN-DEMO-'+i,date:'1900-01-01',amount:(BigInt(b.quantityPcs)*BigInt(demoStore.products.find(p=>p.sku===b.sku).purchasePrice)).toString()}));
const listeners = new Set();
export function subscribeDemo(listener) { listeners.add(listener); }
export function notifyDemo() { listeners.forEach(listener => listener()); }

export function clearDemoSubscriptions(){listeners.clear();}
