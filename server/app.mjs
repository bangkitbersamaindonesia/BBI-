import http from 'node:http';
import {syncLedger} from './ledger.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {encode,hash,transaction,readState,appendAudit} from './database.mjs';
import {configuration,cloudflareValidator,failure,random,passwordMatches,passwordHash,sessionFor,publicUser} from './security.mjs';
import {applyCommand,projectState,permissions} from './commands.mjs';
import {financialReport,reportPeriod} from '../src/financial-reports-model.js';
import {arAgingSummary} from '../src/ar-aging-model.js';
import {apAgingSummary} from '../src/ap-aging-model.js';
import {averageDaysToPay} from '../src/average-pay-model.js';
import {salesReport} from '../src/sales-report-model.js';
import {documentBalance} from '../src/payments-model.js';
const assets=new Map([['/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']],['/app.css',['app.css','text/css; charset=utf-8']]]);
export async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>450000)throw failure('Unggahan / permintaan terlalu besar.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw failure('Format permintaan tidak valid.');}}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(encode(data));}
function requireSession(db,req,access){const row=sessionFor(db,req.headers.cookie);if(!row||access&&row.email?.toLowerCase()!==access.email)throw failure('Silakan login kembali.',401);return row;}
function canPhoto(state,user,type,id){if(type==='product')return state.products.some(p=>p.sku===id);if(type!=='customer')return false;return state.customers.some(c=>c.name===id&&(user.role!=='sales'||c.salesperson===user.name));}
export async function saveUser(db,input,actor,requireEmail=false,checkSession=()=>{}){
 if(!/^[a-z0-9._-]{3,64}$/.test(input.username??'')||!['sales','admin1','admin2','admin3','superadmin'].includes(input.role)||typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw failure('Isi username, nama dan peran yang valid.');
 if(input.role==='sales'&&!['Doni','Lutfi','Dipa'].includes(input.name))throw failure('Nama Sales harus Doni, Lutfi atau Dipa.');
 const email=String(input.email??'').trim().toLowerCase();if((requireEmail||email)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw failure('Isi email pribadi untuk Cloudflare Access.');
 const password=input.password?await passwordHash(input.password):null;
 return transaction(db,()=>{
  checkSession();
  const existing=db.prepare('SELECT * FROM users WHERE username=?').get(input.username);
  if(!existing&&!password)throw failure('User baru memerlukan password minimal 14 karakter.');
  if(existing&&(existing.role!==input.role||existing.name!==input.name))throw failure('Nama dan peran user tersimpan tidak dapat diganti; buat akun baru untuk pergantian tugas.');
  if(existing?.role==='superadmin'&&input.active===false&&db.prepare("SELECT count(*) n FROM users WHERE role='superadmin' AND active=1").get().n<=1)throw failure('Minimal satu Admin Super harus tetap aktif.');
  const id=existing?.id??'U-'+random();
  db.prepare('INSERT INTO users(id,username,name,role,password_hash,email,active) VALUES(?,?,?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,email=excluded.email,active=excluded.active,version=users.version+1').run(id,input.username,input.name,input.role,password??existing.password_hash,email||null,input.active===false?0:1);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  appendAudit(db,actor,'user.save',null,'',encode({id,username:input.username,name:input.name,role:input.role,email,active:input.active!==false}));
  return {id};
 });
}
export function createApp(db,config=configuration(),options={}){
 const validateAccess=cloudflareValidator(config,options.fetcher);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const url=new URL(req.url,config.origin),path=url.pathname;
   if(path==='/healthz'&&req.method==='GET'){send(res,200,{ok:db.prepare('SELECT 1 n').get().n===1});return;}
   const access=await validateAccess(req.headers['cf-access-jwt-assertion']);
   if(!['GET','POST','HEAD'].includes(req.method))throw failure('Metode tidak diizinkan.',405);
   if(req.method==='POST'&&req.headers.origin!==config.origin)throw failure('Asal permintaan tidak diizinkan.',403);
   if(req.method==='POST'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw failure('Format permintaan harus JSON.',415);
   if(req.method==='GET'&&assets.has(path)){
    const [name,type]=assets.get(path);const bytes=await readFile(new URL('./public/'+name,import.meta.url));res.writeHead(200,{'Content-Type':type});res.end(bytes);return;
   }
   if(path==='/api/login'&&req.method==='POST'){
    const input=await body(req);const username=String(input.username??'').slice(0,64).toLowerCase(),key=hash(username),now=Date.now();
    const bucket=db.prepare('SELECT * FROM attempts WHERE key=?').get(key);if(bucket?.reset_at>now&&bucket.failures>=5)throw failure('Terlalu banyak percobaan. Coba lagi dalam 15 menit.',429);
    // Global cap prevents arbitrary username floods; headers from clients are never trusted as IP identity.
    const global=db.prepare("SELECT * FROM attempts WHERE key='global'").get();if(global?.reset_at>now&&global.failures>=100)throw failure('Login sementara dibatasi. Coba lagi nanti.',429);
    for(const k of [key,'global'])db.prepare('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN reset_at<=? THEN 1 ELSE failures+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END').run(k,now+900000,now,now);
    const user=db.prepare('SELECT * FROM users WHERE username=?').get(username);const valid=await passwordMatches(input.password,user?.password_hash);
    if(!valid||!user?.active||access&&user.email!==access.email){appendAudit(db,'anonymous','login.failed',null);throw failure('Username atau password tidak sesuai.',401);}
    // Re-read after asynchronous password hashing so resets/deactivation cannot race login.
    const fresh=db.prepare('SELECT * FROM users WHERE id=? AND active=1 AND version=?').get(user.id,user.version);if(!fresh)throw failure('Akun berubah. Silakan login kembali.',401);
    const token=random(),csrf=random();db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(token),user.id,csrf,now+8*3600000,user.version);db.prepare('DELETE FROM attempts WHERE key=?').run(key);appendAudit(db,user.id,'login.success',null);
    res.setHeader('Set-Cookie',`bbi_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${config.production?'; Secure':''}`);send(res,200,{user:publicUser(user),csrf});return;
   }
   const session=requireSession(db,req,access),user=publicUser(session);
   if(req.method==='POST'&&req.headers['x-csrf-token']!==session.csrf)throw failure('Sesi formulir tidak valid. Muat ulang halaman.',403);
   if(path==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session.token_hash);appendAudit(db,user.id,'logout',null);res.setHeader('Set-Cookie',`bbi_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${config.production?'; Secure':''}`);send(res,200,{ok:true});return;}
   if(path==='/api/me'&&req.method==='GET'){send(res,200,{user,csrf:session.csrf,actions:Object.keys(permissions).filter(a=>permissions[a].includes(user.role)),production:config.production});return;}
   if(path==='/api/state'&&req.method==='GET'){
    const {revision,state}=readState(db);const users=db.prepare('SELECT id,name,role,active FROM users').all();state.users=users;
    const attachments=db.prepare('SELECT id,owner_type,owner_id,slot FROM attachments').all().filter(a=>canPhoto(state,user,a.owner_type,a.owner_id));
    send(res,200,{revision,state:projectState(state,user),attachments,salespeople:users.filter(u=>u.role==='sales'&&u.active).map(u=>u.name)});return;
   }
   if(path==='/api/command'&&req.method==='POST'){
    const input=await body(req);requireSession(db,req,access);if(!/^[a-zA-Z0-9_-]{16,100}$/.test(input.requestId??''))throw failure('Nomor permintaan tidak valid.');
    const result=transaction(db,()=>{
     const fingerprint=hash(encode({action:input.action,input:input.input}));const prior=db.prepare('SELECT * FROM requests WHERE user_id=? AND request_id=?').get(user.id,input.requestId);
     if(prior){if(prior.fingerprint!==fingerprint)throw failure('Nomor permintaan dipakai untuk transaksi berbeda.',409);return JSON.parse(prior.response);}
     const {state,revision}=readState(db);if(input.revision!==revision)throw failure('Data telah berubah oleh user lain. Muat ulang dan periksa kembali sebelum menyimpan.',409);
     state.users=db.prepare('SELECT id,name,role,active FROM users').all();const before=encode(state);
     applyCommand(state,user,input.action,input.input);syncLedger(db,state);const after=encode(state);
     db.prepare('UPDATE state SET body=?,revision=revision+1 WHERE id=1').run(after);appendAudit(db,user.id,input.action,revision+1,before,after);
     const response={ok:true,revision:revision+1};db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(user.id,input.requestId,fingerprint,encode(response));return response;
    });send(res,200,result);return;
   }
   if(path==='/api/users'&&user.role==='superadmin'){
    if(req.method==='GET'){send(res,200,db.prepare('SELECT id,username,name,role,email,active FROM users').all());return;}
    if(req.method==='POST'){send(res,200,await saveUser(db,await body(req),user.id,config.production,()=>requireSession(db,req,access)));return;}
   }
   if(/^\/api\/audit\/\d+$/.test(path)&&req.method==='GET'){if(user.role!=='superadmin')throw failure('Akses ditolak.',403);const row=db.prepare('SELECT * FROM audit WHERE seq=?').get(Number(path.split('/').pop()));if(!row)throw failure('Riwayat tidak ditemukan.',404);send(res,200,row);return;}
   if(path==='/api/journals'&&req.method==='GET'){if(user.role!=='superadmin')throw failure('Akses ditolak.',403);send(res,200,db.prepare('SELECT * FROM journals ORDER BY date,source').all().map(j=>({...j,lines:JSON.parse(j.body),body:undefined})));return;}
   if(path==='/api/audit'&&req.method==='GET'){if(user.role!=='superadmin')throw failure('Akses ditolak.',403);const after=Number(url.searchParams.get('after')??0);send(res,200,db.prepare('SELECT seq,at,actor,action,revision,before_hash,after_hash,previous_hash,hash FROM audit WHERE seq>? ORDER BY seq LIMIT 200').all(Number.isSafeInteger(after)?after:0));return;}
   if(path==='/api/report'&&req.method==='GET'){
    const {state}=readState(db);state.users=db.prepare('SELECT id,name,role,active FROM users').all();const kind=url.searchParams.get('kind'),asOf=url.searchParams.get('end')??new Date().toISOString().slice(0,10),start=url.searchParams.get('start')??asOf.slice(0,4)+'-01-01';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(asOf))||!Number.isFinite(Date.parse(start))||start>asOf)throw failure('Periode laporan tidak valid.');
    if(kind==='sales'&&['sales','superadmin'].includes(user.role)){send(res,200,salesReport(state,user,start,asOf));return;}
    if(user.role!=='superadmin')throw failure('Laporan ini hanya untuk Admin Super.',403);
    let report;
    if(kind==='financial'){const preset=url.searchParams.get('preset')??'custom',period=reportPeriod(preset,asOf,{start,end:asOf});report={period,current:financialReport(state,period.start,period.end),previous:financialReport(state,period.previousStart,period.previousEnd)};}
    else if(kind==='ar')report=arAgingSummary(state,asOf);else if(kind==='ap')report=apAgingSummary(state,asOf);else if(kind==='average-pay')report=averageDaysToPay(state);
    else if(kind==='balances')report={customers:state.invoices.map(i=>documentBalance(state,'customer',i.id)),vendors:state.bills.map(i=>documentBalance(state,'supplier',i.id))};else throw failure('Laporan tidak ditemukan.',404);
    send(res,200,report);return;
   }
   if(path==='/api/attachments'&&req.method==='POST'){
    const input=await body(req);requireSession(db,req,access);const {state}=readState(db);
    if(!canPhoto(state,user,input.type,input.owner))throw failure('Akses foto ditolak.',403);
    if(input.type==='product'&&user.role==='sales')throw failure('Hanya admin dapat mengunggah foto SKU.',403);
    if(input.type==='product'&&!/^[1-6]$/.test(input.slot)||input.type==='customer'&&!['ktp','npwp','storefront'].includes(input.slot))throw failure('Slot foto tidak valid.');
    if(typeof input.base64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64))throw failure('Foto tidak valid.');const bytes=Buffer.from(input.base64,'base64');
    if(bytes.length<33||bytes.length>307200||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(8)!==13)throw failure('Gunakan foto PNG maksimal 300 KB.');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(!width||!height||width>1200||height>1200)throw failure('Resolusi foto maksimal 1200 × 1200.');
    transaction(db,()=>{const old=db.prepare('SELECT id FROM attachments WHERE owner_type=? AND owner_id=? AND slot=?').get(input.type,input.owner,input.slot),id=old?.id??random();db.prepare('INSERT INTO attachments VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner_type,owner_id,slot) DO UPDATE SET body=excluded.body,created_by=excluded.created_by,created_at=excluded.created_at').run(id,input.type,input.owner,input.slot,'image/png',bytes,user.id,new Date().toISOString());appendAudit(db,user.id,'attachment.save',null,'',encode({id,type:input.type,owner:input.owner,slot:input.slot,digest:hash(bytes)}));});send(res,200,{ok:true});return;
   }
   if(path.startsWith('/api/attachments/')&&req.method==='GET'){
    const photo=db.prepare('SELECT * FROM attachments WHERE id=?').get(path.slice('/api/attachments/'.length));if(!photo||!canPhoto(readState(db).state,user,photo.owner_type,photo.owner_id))throw failure('Foto tidak tersedia.',404);
    res.writeHead(200,{'Content-Type':'image/png','Content-Disposition':'inline; filename="photo.png"'});res.end(photo.body);return;
   }
   throw failure('Halaman tidak tersedia.',404);
  }catch(error){if(!res.headersSent)send(res,error.status??(error.code?.startsWith('SQLITE')?409:400),{error:error.code?.startsWith('SQLITE')?'Data bertabrakan atau sedang digunakan. Periksa kembali isian.':error.message});else res.end();}
 });server.requestTimeout=15000;server.headersTimeout=10000;return server;
}
