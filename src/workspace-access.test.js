import test from 'node:test';
import assert from 'node:assert/strict';
import {canAccessPage,salesCatalog,defaultWorkspacePage} from './workspace-access.js';
test('Sales has only SO and Sales Tools; inactive and anonymous sessions are denied',()=>{const sales={role:'sales',active:true};for(const page of ['Sales','Sales Tools'])assert.equal(canAccessPage(sales,page),true);for(const page of ['Dashboard','Inventory','Purchasing','Payments','Accounting','Reports','Users'])assert.equal(canAccessPage(sales,page),false);assert.equal(canAccessPage(null,'Sales'),false);assert.equal(canAccessPage({role:'sales',active:false},'Sales'),false);assert.equal(canAccessPage({role:'admin1',active:true},'Purchasing'),true);});
test('Sales catalog returns photos and sale price without purchase costs, balances or notes',()=>{const rows=salesCatalog([{sku:'A',name:'Dress',size:'M',color:'Biru',sellingPrice:125000,purchasePrice:85000,notes:'internal',photos:[{src:'blob:test',bytes:100}]}],'dress');assert.equal(rows.length,1);assert.equal(rows[0].sellingPrice,125000);assert.equal('purchasePrice' in rows[0],false);assert.equal('notes' in rows[0],false);assert.equal(salesCatalog(rows,'tidak ada').length,0);});

test('Admin 1/2/3 cannot access dashboard, accounting, users or reports; superadmin retains access',()=>{
 for(const role of ['admin1','admin2','admin3']){const user={role,active:true};
  for(const page of ['Dashboard','Accounting','Users','Reports'])assert.equal(canAccessPage(user,page),false,role+': '+page);
  for(const page of ['Inventory','Purchasing','Sales','Sales Tools','Payments'])assert.equal(canAccessPage(user,page),true);
  assert.equal(defaultWorkspacePage(user),'Sales');assert.equal(canAccessPage(user,defaultWorkspacePage(user)),true);
 }
 const superadmin={role:'superadmin',active:true};
 for(const page of ['Dashboard','Accounting','Users','Reports','Inventory','Purchasing','Sales','Sales Tools','Payments'])assert.equal(canAccessPage(superadmin,page),true);
 assert.equal(defaultWorkspacePage(superadmin),'Dashboard');assert.equal(defaultWorkspacePage({role:'sales',active:true}),'Sales Tools');assert.equal(canAccessPage({role:'unknown',active:true},'Dashboard'),false);
});
