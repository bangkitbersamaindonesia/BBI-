import test from 'node:test';
import assert from 'node:assert/strict';
import {receivableSummary} from '../src/receivables-model.js';
test('receivables reconcile invoices and approved customer credits, separately by exact client name',()=>{
 const s={invoices:[{id:'I1',customer:'Toko A',total:1000},{id:'I2',customer:'Toko A',total:500},{id:'I3',customer:'Toko B',total:300}],credits:[{type:'customer',sourceId:'I1',total:200},{type:'customer',sourceId:'I3',total:300},{type:'supplier',sourceId:'I1',total:900}],returns:[{sourceId:'I2',status:'Menunggu Admin 2',total:500}]};
 const before=JSON.stringify(s);const r=receivableSummary(s);assert.equal(r.total,1800n);assert.equal(r.credits,500n);assert.equal(r.net,1300n);assert.equal(r.customers[0].net,1300n);assert.equal(r.customers[0].invoiceCount,2);assert.equal(r.customers[1].net,0n);assert.equal(r.invoices.length,3);assert.equal(JSON.stringify(s),before);
});
test('large combined amounts remain exact; missing invoices do not create debt and excess credit fails',()=>{
 assert.equal(receivableSummary({invoices:[],credits:[]}).net,0n);const s={invoices:[{id:'A',customer:'A',total:Number.MAX_SAFE_INTEGER},{id:'B',customer:'B',total:Number.MAX_SAFE_INTEGER}],credits:[]};assert.equal(receivableSummary(s).net,BigInt(Number.MAX_SAFE_INTEGER)*2n);assert.throws(()=>receivableSummary({invoices:[{id:'A',customer:'A',total:1}],credits:[{type:'customer',sourceId:'A',total:2}]}));
});
