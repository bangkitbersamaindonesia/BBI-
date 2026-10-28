import test from 'node:test';
import assert from 'node:assert/strict';
import {toPcs, validateSku, totalPcs} from '../src/sku-model.js';
const valid = {sku:' abc-m ',name:'Kaos',size:'M',color:'Putih',purchasePrice:'35000',sellingPrice:'59000',qty:'2',unit:'lusin',warehouseId:'lebak',notes:''};
test('all units normalize to canonical pcs, including exact fractional packs',()=>{
  for(const [unit,factor] of Object.entries({pcs:1,lusin:12,kodi:20,gros:144})) assert.equal(toPcs('2',unit),2*factor);
  assert.equal(toPcs('0.5','lusin'),6);
  for(const [qty,unit] of [['','pcs'],[-1,'pcs'],['0.5','pcs'],['Infinity','pcs'],[2,'unknown'],[Number.MAX_SAFE_INTEGER,'gros']]) assert.throws(()=>toPcs(qty,unit));
});
test('required fields, duplicates, prices and warehouses validate before insertion',()=>{
  const {value,errors}=validateSku(valid); assert.deepEqual(errors,{}); assert.equal(value.sku,'ABC-M'); assert.equal(value.quantityPcs,24);
  assert.ok(validateSku(valid,[{sku:'ABC-M'}]).errors.sku);
  for(const field of ['sku','name','size','color','purchasePrice','sellingPrice','qty','warehouseId']) assert.ok(validateSku({...valid,[field]:''}).errors[field]);
  for(const price of ['-1','1.5','NaN','9007199254740992']) assert.ok(validateSku({...valid,purchasePrice:price}).errors.purchasePrice);
});
test('warehouse balances remain separate and totals are derived',()=>{
  const balances=[{sku:'A',warehouseId:'lebak',quantityPcs:24},{sku:'A',warehouseId:'kediri',quantityPcs:12},{sku:'B',warehouseId:'lebak',quantityPcs:200}];
  assert.equal(totalPcs({sku:'A'},balances),36); assert.equal(totalPcs({sku:'C'},balances),0);
});
