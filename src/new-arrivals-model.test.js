import test from 'node:test';
import assert from 'node:assert/strict';
import {selectNewArrival} from './new-arrivals-model.js';

test('Only an active known superadmin can select and remove arrivals without duplicates', () => {
  const admin = {id:'super',role:'superadmin',active:true};
  const sales = {id:'sales',role:'sales',active:true};
  const store = {users:[admin,sales],products:[{sku:'A'},{sku:'B'}]};
  selectNewArrival(store,'A',true,admin);
  selectNewArrival(store,'A',true,admin);
  assert.deepEqual(store.newArrivalSkus,['A']);
  const before = structuredClone(store);
  assert.throws(()=>selectNewArrival(store,'B',true,sales));
  assert.throws(()=>selectNewArrival(store,'B',true,{id:'unknown',role:'superadmin'}));
  assert.throws(()=>selectNewArrival(store,'missing',true,admin));
  assert.deepEqual(store,before);
  selectNewArrival(store,'A',false,admin);
  assert.deepEqual(store.newArrivalSkus,[]);
});
