import test from 'node:test';
import assert from 'node:assert/strict';
import {payableSummary} from '../src/payables-model.js';
test('supplier bills less approved supplier returns reconcile per vendor and source bill',()=>{
 const s={bills:[{id:'B1',reference:'TAG-1',poId:'PO1',supplier:'Vendor A',total:1000},{id:'B2',supplier:'Vendor A',total:500},{id:'B3',supplier:'Vendor B',total:300}],credits:[{type:'supplier',sourceId:'B1',total:200},{type:'supplier',sourceId:'B3',total:300},{type:'customer',sourceId:'B1',total:1000}],returns:[{sourceId:'B2',status:'Menunggu Admin 1',total:500}],purchaseOrders:[{total:999999}]};
 const before=JSON.stringify(s);const result=payableSummary(s);assert.equal(result.total,1800n);assert.equal(result.credits,500n);assert.equal(result.net,1300n);assert.equal(result.suppliers[0].billCount,2);assert.equal(result.suppliers[0].net,1300n);assert.equal(result.suppliers[1].net,0n);assert.equal(result.bills[0].reference,'TAG-1');assert.equal(result.bills[0].poId,'PO1');assert.equal(JSON.stringify(s),before);
});
test('PO alone creates no payable; large totals remain exact and excess credit fails',()=>{
 assert.equal(payableSummary({bills:[],credits:[],purchaseOrders:[{total:10000}]}).net,0n);const s={bills:[{id:'A',supplier:'A',total:Number.MAX_SAFE_INTEGER},{id:'B',supplier:'B',total:Number.MAX_SAFE_INTEGER}],credits:[]};assert.equal(payableSummary(s).net,BigInt(Number.MAX_SAFE_INTEGER)*2n);assert.throws(()=>payableSummary({bills:[{id:'A',supplier:'A',total:1}],credits:[{type:'supplier',sourceId:'A',total:2}]}));
});
