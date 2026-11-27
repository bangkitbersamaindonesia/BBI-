import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,sign} from 'node:crypto';
import {openDatabase,initialState,readState,encode,verifyAudit,backupDatabase} from './database.mjs';
import {createApp,saveUser} from './app.mjs';
import {configuration,cloudflareValidator,passwordHash,passwordMatches} from './security.mjs';
import {syncLedger} from './ledger.mjs';
const config={production:false,origin:'http://127.0.0.1:5181',issuer:'',audience:''};
const password='Testing-only-long-password-2026';let sequence=0;
async function request(app,path,{method='GET',input,headers={}}={}){
 const req=Readable.from(input===undefined?[]:[Buffer.from(JSON.stringify(input))]);Object.assign(req,{method,url:path,headers:{...(method==='POST'?{'content-type':'application/json',origin:config.origin}:{}),...headers}});
 return new Promise(resolve=>{const responseHeaders={};const res={headersSent:false,setHeader(k,v){responseHeaders[k.toLowerCase()]=v;},writeHead(status,h={}){this.status=status;this.headersSent=true;for(const[k,v]of Object.entries(h))responseHeaders[k.toLowerCase()]=v;},end(bytes){let body;try{body=JSON.parse(bytes?.toString()??'null');}catch{body=bytes;}resolve({status:this.status,headers:responseHeaders,body});}};app.emit('request',req,res);});
}
async function fixture(file=':memory:'){
 const db=openDatabase(file);db.prepare('UPDATE state SET body=? WHERE id=1').run(encode(initialState(true)));syncLedger(db,readState(db).state);
 for(const [username,name,role]of [['doni','Doni','sales'],['lutfi','Lutfi','sales'],['admin1','Admin 1','admin1'],['admin2','Admin 2','admin2'],['admin3','Admin 3','admin3'],['super','Admin Super','superadmin']])await saveUser(db,{username,name,role,password,email:username+'@example.com'},'test');
 const app=createApp(db,config);
 const login=async username=>{const r=await request(app,'/api/login',{method:'POST',input:{username,password}});assert.equal(r.status,200,encode(r.body));return {cookie:r.headers['set-cookie'].split(';')[0],'x-csrf-token':r.body.csrf};};
 const command=async(headers,action,input,extra={})=>request(app,'/api/command',{method:'POST',headers,input:{revision:readState(db).revision,requestId:'request-'+String(++sequence).padStart(16,'0'),action,input,...extra}});
 return {db,app,login,command};
}
test('password hashing and production configuration fail closed',async()=>{
 const h=await passwordHash(password);assert(!h.includes(password));assert(await passwordMatches(password,h));assert(!await passwordMatches('incorrect',h));await assert.rejects(passwordHash('short'));
 assert.throws(()=>configuration({NODE_ENV:'production'}));assert.throws(()=>configuration({APP_ORIGIN:'http://example.com'}));assert.throws(()=>configuration({NODE_ENV:'production',APP_ORIGIN:'https://erp.example.com',CF_ACCESS_ISSUER:'https://attacker.example',CF_ACCESS_AUD:'aud'}));
});
test('login, CSRF, private origin, logout and revoked sessions',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const h=await f.login('doni');assert.match(h.cookie,/bbi_session=/);assert.equal((await request(f.app,'/api/state')).status,401);
 assert.equal((await f.command({...h,origin:'https://bad.example'},'so.create',{})).status,403);assert.equal((await f.command({...h,'x-csrf-token':'forged'},'so.create',{})).status,403);
 assert.equal((await request(f.app,'/api/logout',{method:'POST',headers:h,input:{}})).status,200);assert.equal((await request(f.app,'/api/state',{headers:h})).status,401);
});
test('sales projection hides other customers, orders, costs, suppliers and financial reports',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const doni=await f.login('doni'),lutfi=await f.login('lutfi');
 assert.equal((await f.command(doni,'so.create',{customer:'Toko Demo Lebak',deliveryDate:'2026-11-26',letterhead:'A',lines:[{sku:'OXF-BLK-XL',qty:1}]})).status,200);
 const r=await request(f.app,'/api/state',{headers:lutfi});assert.equal(r.body.state.orders.length,0);assert.equal(r.body.state.customers.length,1);assert.equal(r.body.state.customers[0].salesperson,'Lutfi');for(const key of ['accounts','vendors','costPools','bills','users'])assert.equal(r.body.state[key],undefined);assert.equal(r.body.state.products[0].purchasePrice,undefined);
 assert.equal((await f.command(lutfi,'so.create',{customer:'Toko Demo Lebak',salesOwner:'Doni',salesperson:'Doni',deliveryDate:'2026-11-26',lines:[{sku:'OXF-BLK-XL',qty:1}]})).status,403);
 for(const path of ['/api/users','/api/audit','/api/journals','/api/report?kind=financial'])assert.notEqual((await request(f.app,path,{headers:lutfi})).status,200);assert.equal((await f.command(doni,'product.save',{})).status,403);
 const order=readState(f.db).state.orders[0];assert.notEqual((await f.command(lutfi,'so.delete',{id:order.id})).status,200);
});
test('idempotency and stale revision protection prevent duplicate writes; errors roll back',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const h=await f.login('doni'),revision=readState(f.db).revision;const input={customer:'Toko Demo Lebak',deliveryDate:'2026-11-26',lines:[{sku:'OXF-BLK-XL',qty:100}]},extra={revision,requestId:'same-request-1234567890'};
 assert.equal((await f.command(h,'so.create',input,extra)).status,200);assert.equal((await f.command(h,'so.create',input,extra)).status,200);assert.equal(readState(f.db).state.orders.length,1);
 assert.equal((await f.command(h,'so.create',{...input,letterhead:'A'},extra)).status,409);assert.equal((await f.command(h,'so.create',input,{revision})).status,409);
 const before=encode(readState(f.db));assert.notEqual((await f.command(h,'so.create',{...input,lines:[{sku:'bad',qty:1}]})).status,200);assert.equal(encode(readState(f.db)),before);
});
test('SO → shortage PO → approval → partial bills → invoice → payment → return posts balanced immutable journals',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const sales=await f.login('doni'),a1=await f.login('admin1'),a2=await f.login('admin2');
 const run=async(h,a,i)=>{const r=await f.command(h,a,i);assert.equal(r.status,200,encode(r.body));};
 await run(sales,'so.create',{customer:'Toko Demo Lebak',deliveryDate:'2026-11-26',letterhead:'A',lines:[{sku:'OXF-BLK-XL',qty:200}]});let s=readState(f.db).state;const order=s.orders[0],po=s.purchaseOrders[0];assert.equal(po.lines[0].quantityPcs,56);
 await run(a1,'po.edit',{id:po.id,supplier:'Vendor Demo Sandang',warehouseId:'lebak',discountPercent:'0',paymentTerms:'Net 30',lines:po.lines});await run(a1,'po.approve',{id:po.id});
 const input={id:po.id,billReference:'BILL-VENDOR-1',responseDate:'2026-11-26',ppnAmount:'374000',final:true,lines:[{sku:'OXF-BLK-XL',quantityPcs:40,price:85000}]};await run(a1,'bill.finalize',input);s=readState(f.db).state;assert.equal(s.lossSales[0].quantityPcs,16);assert.equal(s.balances.find(b=>b.sku==='OXF-BLK-XL'&&b.warehouseId==='lebak').quantityPcs,160);
 const before=encode(readState(f.db));assert.notEqual((await f.command(a1,'bill.finalize',input)).status,200);assert.equal(encode(readState(f.db)),before);
 await run(a2,'invoice.issue',{id:order.id,date:'2026-11-26',priceLevel:'R',discountPercent:'0',final:true,lines:[{sku:'OXF-BLK-XL',quantityPcs:184}]});s=readState(f.db).state;const invoice=s.invoices[0];assert(s.balances.every(b=>b.quantityPcs>=0));assert.equal(s.reservations.length,0);
 await run(a2,'payment.record',{type:'customer',id:invoice.id,date:'2026-11-26',amount:String(invoice.amountDue),accountId:s.accounts.find(a=>a.group==='cash_bank').id,reference:'PAYMENT-1'});
 await run(sales,'return.request',{type:'customer',id:invoice.id,date:'2026-11-26',reason:'Ukuran tidak sesuai',lines:[{lineIndex:0,quantityPcs:1}]});s=readState(f.db).state;await run(a1,'return.decide',{id:s.returns[0].id,decision:'approve',physicalConfirmed:true,warehouseId:'kediri',note:'Barang diterima'});
 const journals=f.db.prepare('SELECT * FROM journals').all();assert(journals.length>=6);for(const j of journals)assert.equal(JSON.parse(j.body).reduce((v,l)=>v+BigInt(l.debit)-BigInt(l.credit),0n),0n);assert.throws(()=>f.db.exec("UPDATE journals SET date='2000-01-01'"));assert.throws(()=>f.db.exec('DELETE FROM audit'));verifyAudit(f.db);
});
test('database and sessions survive restart, backups include private attachments and restore',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'bbi-server-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const file=join(dir,'live.sqlite'),copy=join(dir,'backup.sqlite');const f=await fixture(file);const h=await f.login('doni');await f.command(h,'so.create',{customer:'Toko Demo Lebak',deliveryDate:'2026-11-26',lines:[{sku:'OXF-BLK-XL',qty:1}]});
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
 assert.equal((await request(f.app,'/api/attachments',{method:'POST',headers:h,input:{type:'customer',owner:'Toko Demo Lebak',slot:'ktp',base64:png}})).status,200);
 const photo=f.db.prepare('SELECT id FROM attachments').get().id;const lutfi=await f.login('lutfi');assert.equal((await request(f.app,'/api/attachments/'+photo,{headers:lutfi})).status,404);await backupDatabase(f.db,copy);const revision=readState(f.db).revision;f.db.close();
 const restored=openDatabase(copy);assert.equal(readState(restored).revision,revision);assert.equal(restored.prepare('SELECT count(*) n FROM attachments').get().n,1);verifyAudit(restored);restored.close();const reopened=openDatabase(file),app=createApp(reopened,config);assert.equal((await request(app,'/api/state',{headers:h})).body.state.orders.length,1);reopened.close();
});
test('Cloudflare validates signature, issuer, audience, expiry; invalid assertions fail closed',async()=>{
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'test-key'};let calls=0;const cfg={issuer:'https://bbi.cloudflareaccess.com',audience:'bbi-aud'},validate=cloudflareValidator(cfg,async()=>{calls++;return {ok:true,json:async()=>({keys:[jwk]})};});
 const token=(patch={})=>{const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:cfg.issuer,aud:[cfg.audience],email:'Doni@example.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+100,...patch})).toString('base64url');return h+'.'+p+'.'+sign('RSA-SHA256',Buffer.from(h+'.'+p),privateKey).toString('base64url');};
 assert.equal((await validate(token())).email,'doni@example.com');assert.equal(calls,1);for(const patch of [{iss:'https://attacker.example'},{aud:['wrong']},{exp:0},{nbf:Date.now()},{email:undefined}])await assert.rejects(validate(token(patch)));await assert.rejects(validate(token().slice(0,-8)+'aaaaaaaa'));await assert.rejects(validate(undefined));
});
test('roles cannot be forged, reset revokes sessions, last superadmin cannot be disabled',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const h=await f.login('admin3');assert.equal((await f.command(h,'invoice.issue',{role:'admin2'})).status,403);const s=(await request(f.app,'/api/state',{headers:h})).body.state;assert.equal(s.bills,undefined);assert.equal(s.orders,undefined);await saveUser(f.db,{username:'admin3',name:'Admin 3',role:'admin3',password:password+'changed'},'test');assert.equal((await request(f.app,'/api/state',{headers:h})).status,401);await assert.rejects(saveUser(f.db,{username:'super',name:'Admin Super',role:'superadmin',active:false},'test'));
});
test('bad passwords are rate limited, cookies are HttpOnly and direct static assets use strict CSP',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 const good=await request(f.app,'/api/login',{method:'POST',input:{username:'doni',password}});assert.match(good.headers['set-cookie'],/HttpOnly; SameSite=Strict/);
 for(let i=0;i<5;i++)assert.equal((await request(f.app,'/api/login',{method:'POST',input:{username:'doni',password:'incorrect'}})).status,401);
 assert.equal((await request(f.app,'/api/login',{method:'POST',input:{username:'doni',password}})).status,429);
 const page=await request(f.app,'/');assert.equal(page.status,200);assert.match(page.headers['content-security-policy'],/frame-ancestors 'none'/);assert.equal((await request(f.app,'/server/database.mjs')).status,401);
});
test('unit conversion stays canonical, cannot override catalogue price, invoice access is role-bound',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const sales=await f.login('doni');
 const r=await f.command(sales,'so.create',{customer:'Toko Demo Lebak',deliveryDate:'2026-11-27',letterhead:'B',lines:[{sku:'OXF-BLK-XL',qty:2,unit:'lusin',price:1}]});assert.equal(r.status,200,encode(r.body));const order=readState(f.db).state.orders[0];assert.equal(order.lines[0].quantityPcs,24);assert.equal(order.total,24*125000);
 const report=await request(f.app,'/api/report?kind=sales&start=2026-01-01&end=2026-12-31',{headers:sales});assert.equal(report.status,200,encode(report.body));assert.equal(report.body.scope,'Doni');
});
