import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase,backupDatabase,verifyAudit,initialState,readState,transaction,encode,appendAudit} from './database.mjs';
import {saveUser} from './app.mjs';
import {syncLedger} from './ledger.mjs';
import {resolve} from 'node:path';
process.umask(0o077);
const [command,arg]=process.argv.slice(2),file=process.env.BBI_DATABASE??'./data/bbi.sqlite';
if(command==='verify'){
 const db=new DatabaseSync(resolve(arg??file),{readOnly:true});try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Database rusak.');verifyAudit(db);const state=readState(db).state;let count=0;for(const entry of db.prepare('SELECT body FROM journals').all()){const lines=JSON.parse(entry.body);if(lines.reduce((s,l)=>s+BigInt(l.debit)-BigInt(l.credit),0n)!==0n)throw Error('Jurnal tidak seimbang.');count++;}console.log('Integritas database, rantai audit, dan '+count+' jurnal: OK. Revisi '+readState(db).revision+'. Foto '+db.prepare('SELECT count(*) n FROM attachments').get().n+'.');}finally{db.close();}
}else{
 const db=openDatabase(file);
 try{
  if(command==='user'){
   if(!process.stdin.isTTY)throw Error('Jalankan perintah user di terminal interaktif.');
   let muted=false;const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk);callback();}});
   const rl=createInterface({input:process.stdin,output,terminal:true});
   try{const username=await rl.question('Username: '),name=await rl.question('Nama (Sales: Doni/Lutfi/Dipa): '),role=await rl.question('Peran (sales/admin1/admin2/admin3/superadmin): '),email=await rl.question('Email pribadi Cloudflare: ');process.stdout.write('Password baru (minimal 14 karakter, tidak ditampilkan): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');await saveUser(db,{username,name,role,email,password,active:true},'server-operator',process.env.NODE_ENV==='production');console.log('User disimpan. Sesi lama user tersebut telah dicabut.');}finally{rl.close();}
  }else if(command==='backup'){
   if(!arg)throw Error('Isi tujuan backup: node server/manage.mjs backup /lokasi/backup.sqlite');
   if(resolve(arg)===resolve(file))throw Error('Tujuan backup harus berbeda dari database aktif.');await backupDatabase(db,resolve(arg));console.log('Backup tersimpan dan integritasnya terverifikasi.');
  }else if(command==='seed-test'){
   if(process.env.NODE_ENV==='production')throw Error('Data testing tidak boleh dipasang di production.');
   transaction(db,()=>{const {state,revision}=readState(db);if(revision!==0||state.products.length||state.orders.length||db.prepare('SELECT count(*) n FROM attachments').get().n)throw Error('Seed hanya boleh ke database baru kosong.');const seeded=initialState(true);syncLedger(db,seeded);db.prepare('UPDATE state SET body=?,revision=1 WHERE id=1').run(encode(seeded));appendAudit(db,'server-operator','seed.test',1,encode(state),encode(seeded));});console.log('Data testing diisi: 5 SKU, 3 customer, 2 vendor. Tidak membuat password default.');
  }else throw Error('Perintah: user | seed-test | backup <file> | verify [file]');
 }finally{db.close();}
}
