import test from 'node:test';
import assert from 'node:assert/strict';
import {submitOrder,reviewOrder,createPurchaseOrder,readyPurchaseOrder,availablePcs} from '../src/sales-model.js';
const setup=()=>({products:[{sku:'A',name:'Kaos',size:'M',color:'Hitam',purchasePrice:35000},{sku:'B',name:'Kemeja',size:'L',color:'Putih',purchasePrice:80000}],balances:[{sku:'A',warehouseId:'lebak',quantityPcs:12},{sku:'A',warehouseId:'kediri',quantityPcs:6},{sku:'B',warehouseId:'besar',quantityPcs:20}],orders:[],purchaseOrders:[],reservations:[]});
const input=(qty='2')=>({customer:'Toko Baru',salesperson:'Sales A',address:'Alamat toko',deliveryDate:'2026-11-01',lines:[{sku:'A',qty,unit:'lusin',price:'50000'}]});
test('sales submits canonical pcs and exact integer totals without changing physical stock',()=>{
 const s=setup();const o=submitOrder(s,input(),'sales');assert.equal(o.lines[0].quantityPcs,24);assert.equal(o.total,1200000);assert.equal(o.status,'Menunggu Admin 1');assert.equal(s.reservations.length,0);assert.equal(s.balances[0].quantityPcs,12);
});
test('admin reviews all three warehouses, reserves available stock, PO contains shortage only',()=>{
 const s=setup();const o=submitOrder(s,input(),'sales');reviewOrder(s,o.id,'admin1');assert.equal(o.review[0].warehouses.length,3);assert.deepEqual(o.review[0].warehouses.map(w=>w.allocated),[12,6,0]);assert.equal(o.review[0].shortage,6);assert.equal(availablePcs(s,'A','lebak'),0);
 const po=createPurchaseOrder(s,o.id,{supplier:'Supplier A',warehouseId:'besar'},'admin1');assert.equal(po.lines.length,1);assert.equal(po.lines[0].quantityPcs,6);assert.equal(po.total,210000);assert.equal(po.orderId,o.id);assert.equal(po.status,'Draft');readyPurchaseOrder(s,po.id,'admin1');assert.equal(po.status,'Siap dikirim');assert.equal(s.balances[0].quantityPcs,12);
 assert.throws(()=>createPurchaseOrder(s,o.id,{supplier:'X',warehouseId:'besar'},'admin1'));assert.throws(()=>reviewOrder(s,o.id,'admin1'));assert.throws(()=>readyPurchaseOrder(s,po.id,'admin1'));
});
test('later SO cannot reuse reservations and a fully supplied SO cannot generate PO',()=>{
 const s=setup();const first=submitOrder(s,input('1'),'sales');reviewOrder(s,first.id,'admin1');assert.equal(first.status,'Stok dialokasikan');assert.throws(()=>createPurchaseOrder(s,first.id,{supplier:'X',warehouseId:'lebak'},'admin1'));
 const second=submitOrder(s,input('1'),'sales');reviewOrder(s,second.id,'admin1');assert.equal(second.review[0].shortage,6);assert.equal(second.review[0].warehouses[0].allocated,0);
});
test('validation and role guards reject invalid transitions without partial mutations',()=>{
 const s=setup();assert.throws(()=>submitOrder(s,input(),'admin1'));assert.throws(()=>submitOrder(s,{...input(),customer:''},'sales'));assert.throws(()=>submitOrder(s,{...input(),lines:[]},'sales'));
 for(const line of [{sku:'unknown',qty:1,unit:'pcs',price:1},{sku:'A',qty:0,unit:'pcs',price:1},{sku:'A',qty:.5,unit:'pcs',price:1},{sku:'A',qty:1,unit:'pcs',price:'1.5'},{sku:'A',qty:2,unit:'pcs',price:String(Number.MAX_SAFE_INTEGER)}]) assert.throws(()=>submitOrder(s,{...input(),lines:[line]},'sales'));
 assert.throws(()=>submitOrder(s,{...input(),lines:[...input().lines,...input().lines]},'sales'));assert.throws(()=>submitOrder(s,{...input(),deliveryDate:'2026-02-30'},'sales'));assert.equal(s.orders.length,0);
 const o=submitOrder(s,input(),'sales');assert.throws(()=>reviewOrder(s,o.id,'sales'));assert.equal(s.reservations.length,0);reviewOrder(s,o.id,'admin1');assert.throws(()=>createPurchaseOrder(s,o.id,{supplier:'',warehouseId:'besar'},'admin1'));assert.throws(()=>createPurchaseOrder(s,o.id,{supplier:'X',warehouseId:'invalid'},'admin1'));assert.equal(s.purchaseOrders.length,0);
});
test('PO excludes available lines, snapshots prices, and accepts a new catalog SKU',()=>{
 const s=setup();s.products.push({sku:'NEW',name:'Baru',size:'M',color:'Biru',purchasePrice:10000});
 const o=submitOrder(s,{...input(),lines:[{sku:'B',qty:20,unit:'pcs',price:100000},{sku:'NEW',qty:5,unit:'pcs',price:20000}]},'sales');reviewOrder(s,o.id,'admin1');const po=createPurchaseOrder(s,o.id,{supplier:'Vendor',warehouseId:'kediri'},'admin1');assert.deepEqual(po.lines.map(l=>l.sku),['NEW']);assert.equal(po.total,50000);s.products[2].purchasePrice=90000;assert.equal(po.lines[0].price,10000);
});
