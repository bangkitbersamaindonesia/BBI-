import test from 'node:test';
import assert from 'node:assert/strict';
import {submitOrder,reviewOrder,createPurchaseOrder,readyPurchaseOrder} from '../src/sales-model.js';
import {recordSupplierResponse,filterLossSales,summarizeLossSales,lossSalesCsv} from '../src/supplier-model.js';
function setup(){
 const s={products:[{sku:'A',name:'Kaos',size:'M',color:'Putih',purchasePrice:30},{sku:'B',name:'Kemeja',size:'L',color:'Hitam',purchasePrice:80}],balances:[{sku:'A',warehouseId:'lebak',quantityPcs:2}],orders:[],purchaseOrders:[],reservations:[],responses:[],bills:[],lossSales:[]};
 const o=submitOrder(s,{customer:'Toko',salesperson:'Sales',address:'Alamat',deliveryDate:'2026-11-01',lines:[{sku:'A',qty:12,unit:'pcs',price:50},{sku:'B',qty:5,unit:'pcs',price:100}]},'sales');
 reviewOrder(s,o.id,'admin1');const po=createPurchaseOrder(s,o.id,{supplier:'Vendor',warehouseId:'besar'},'admin1');readyPurchaseOrder(s,po.id,'admin1');return {s,o,po};
}
const response=(a=6,b=0)=>({responseDate:'2026-10-28',billReference:'INV-001',final:true,lines:[{sku:'A',fulfilledPcs:String(a),price:'35',reason:a<10?'Stok supplier habis':''},{sku:'B',fulfilledPcs:String(b),price:'80',reason:b<5?'Size tidak tersedia':''}]});
test('partial fulfillment bills only supplied qty and records linked, price-snapshotted lost demand',()=>{
 const {s,o,po}=setup();assert.equal(s.lossSales.length,0);assert.equal(s.bills.length,0);
 const r=recordSupplierResponse(s,po.id,response(),'admin1');assert.equal(r.bill.total,210);assert.deepEqual(r.bill.lines.map(l=>[l.sku,l.quantityPcs]),[['A',6]]);assert.deepEqual(r.losses.map(l=>[l.sku,l.quantityPcs,l.potentialRevenue]),[['A',4,200],['B',5,500]]);
 assert.equal(r.losses[0].orderId,o.id);assert.equal(r.losses[0].supplier,'Vendor');assert.equal(r.losses[0].customer,'Toko');assert.equal(r.losses[0].responseId,r.response.id);assert.equal(po.status,'Respons sebagian · ada loss sales');assert.equal(o.status,'Ada loss sales');assert.equal(s.balances[0].quantityPcs,2);assert.equal(s.reservations[0].quantityPcs,2);
 o.lines[0].price=999;s.products[0].purchasePrice=999;assert.equal(r.losses[0].sellingPrice,50);assert.equal(r.bill.lines[0].price,35);
 assert.throws(()=>recordSupplierResponse(s,po.id,response(),'admin1'));assert.equal(s.bills.length,1);assert.equal(s.lossSales.length,2);
});
test('fully supplied response has no loss; total rejection has no zero-value bill',()=>{
 const a=setup();recordSupplierResponse(a.s,a.po.id,response(10,5),'admin1');assert.equal(a.s.lossSales.length,0);assert.equal(a.s.bills[0].total,750);assert.equal(a.o.status,'Menunggu barang supplier');
 const b=setup();const data=response(0,0);data.billReference='';const r=recordSupplierResponse(b.s,b.po.id,data,'admin1');assert.equal(r.bill,null);assert.equal(b.s.bills.length,0);assert.equal(b.s.lossSales.length,2);assert.equal(b.po.status,'Tidak tersedia · loss sales');
});
test('invalid responses cannot partially write bills, losses or state',()=>{
 const cases=[d=>({...d,final:false}),d=>({...d,responseDate:'2026-02-30'}),d=>({...d,billReference:''}),d=>({...d,lines:d.lines.slice(1)}),d=>({...d,lines:[d.lines[0],d.lines[0]]}),d=>({...d,lines:[{...d.lines[0],fulfilledPcs:'11'},d.lines[1]]}),d=>({...d,lines:[{...d.lines[0],fulfilledPcs:'1.5'},d.lines[1]]}),d=>({...d,lines:[{...d.lines[0],fulfilledPcs:'-1'},d.lines[1]]}),d=>({...d,lines:[{...d.lines[0],reason:''},d.lines[1]]}),d=>({...d,lines:[{...d.lines[0],price:'1.5'},d.lines[1]]}),d=>({...d,lines:[{...d.lines[0],price:String(Number.MAX_SAFE_INTEGER)},d.lines[1]]})];
 for(const mutate of cases){const {s,po}=setup();assert.throws(()=>recordSupplierResponse(s,po.id,mutate(response()),'admin1'));assert.equal(s.bills.length,0);assert.equal(s.responses.length,0);assert.equal(s.lossSales.length,0);assert.equal(po.response,undefined);assert.equal(po.status,'Siap dikirim');}
 const {s,po}=setup();assert.throws(()=>recordSupplierResponse(s,po.id,response(),'sales'));po.status='Draft';assert.throws(()=>recordSupplierResponse(s,po.id,response(),'admin1'));
});
test('duplicate supplier bill reference is rejected without touching PO',()=>{
 const {s,po}=setup();s.bills.push({supplier:'vendor',reference:'inv-001'});assert.throws(()=>recordSupplierResponse(s,po.id,response(),'admin1'));assert.equal(s.responses.length,0);assert.equal(s.lossSales.length,0);assert.equal(po.response,undefined);
});
test('report filters, aggregates and CSV use only confirmed losses, never pending demand',()=>{
 const {s,po}=setup();assert.equal(summarizeLossSales(s.lossSales).quantityPcs,0n);recordSupplierResponse(s,po.id,response(),'admin1');
 const filtered=filterLossSales(s.lossSales,{start:'2026-10-28',end:'2026-10-28',supplier:'VEN',customer:'tok',sku:'A'});assert.equal(filtered.length,1);assert.equal(filterLossSales(s.lossSales,{start:'2026-10-29'}).length,0);
 const sum=summarizeLossSales(s.lossSales);assert.equal(sum.quantityPcs,9n);assert.equal(sum.potentialRevenue,700n);assert.equal(sum.orderCount,1);assert.equal(sum.skuCount,2);assert.equal(sum.groups[0].sku,'B');
 const csv=lossSalesCsv([{...filtered[0],customer:'=SUM(1,2)',reason:'Tidak ada, "habis"\nkonfirmasi'}]);assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"Tidak ada, ""habis""\nkonfirmasi"'));assert.ok(csv.includes('SO-DEMO-0001'));assert.ok(csv.includes('Gudang Besar'));
});
