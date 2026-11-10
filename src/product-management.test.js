import test from 'node:test';
import assert from 'node:assert/strict';
import {canManageProducts, editProduct, deleteProduct} from './product-management.js';
import {demoStore} from './demo-store.js';

test('Only known active admins manage products, Sales is denied',()=>{
 const store=structuredClone(demoStore);
 for(const user of store.users){
  assert.equal(canManageProducts(store,user),user.role!=='sales');
  if(user.role==='sales') {
   assert.throws(()=>editProduct(store,store.products[0].sku,{},user));
   assert.throws(()=>deleteProduct(store,store.products[0].sku,user));
  }
 }
 assert.equal(canManageProducts(store,{id:'unknown',role:'superadmin',active:true}),false);
});
test('Admin metadata edit preserves stock and deletion rejects referenced or stocked SKU',()=>{
 const store=structuredClone(demoStore),user=store.users.find(u=>u.role==='admin1');
 const product=store.products[0],balances=structuredClone(store.balances);
 editProduct(store,product.sku,{...product,name:'Nama baru'},user);
 assert.equal(product.name,'Nama baru');
 assert.deepEqual(store.balances,balances);
 assert.throws(()=>deleteProduct(store,product.sku,user));
 const empty=store.products.find(p=>p.sku==='CLN-GRY-L');
 store.orders.push({lines:[{sku:empty.sku}]});
 assert.throws(()=>deleteProduct(store,empty.sku,user));
 store.orders=[];
 store.newArrivalSkus=[empty.sku];
 deleteProduct(store,empty.sku,user);
 assert.equal(store.products.some(p=>p.sku===empty.sku),false);
 assert.deepEqual(store.newArrivalSkus,[]);
});
