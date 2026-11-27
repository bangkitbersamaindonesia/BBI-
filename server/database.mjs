import {DatabaseSync, backup} from 'node:sqlite';
import {mkdirSync,readFileSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {demoStore} from '../src/demo-store.js';
export const encode=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v);
export const hash=value=>createHash('sha256').update(value).digest('hex');
export function initialState(demo=false){
 const state=structuredClone(demoStore);state.users=[];
 if(!demo){for(const key of Object.keys(state)){if(Array.isArray(state[key])&&key!=='accounts')state[key]=[];}state.costPools={};}
 return state;
}
export function openDatabase(file){
 if(file!==':memory:'){mkdirSync(dirname(resolve(file)),{recursive:true,mode:0o700});}
 const db=new DatabaseSync(file);if(file!==':memory:')chmodSync(file,0o600);
 db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
 db.exec('BEGIN IMMEDIATE');
 try{db.exec(readFileSync(new URL('./migrations/001.sql',import.meta.url),'utf8'));db.prepare('INSERT OR IGNORE INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());if(!db.prepare('SELECT version FROM schema_migrations WHERE version=2').get()){db.exec(readFileSync(new URL('./migrations/002.sql',import.meta.url),'utf8'));db.prepare('INSERT INTO schema_migrations VALUES(2,?)').run(new Date().toISOString());}
 db.prepare('INSERT OR IGNORE INTO state VALUES(1,0,?)').run(encode(initialState()));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');db.close();throw e;}
 return db;
}
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
export function readState(db){const row=db.prepare('SELECT * FROM state WHERE id=1').get();return {revision:row.revision,state:JSON.parse(row.body)};}
export function appendAudit(db,actor,action,revision,before='',after=''){
 const previous=db.prepare('SELECT hash FROM audit ORDER BY seq DESC LIMIT 1').get()?.hash??'';
 const fields=[new Date().toISOString(),actor,action,revision,hash(before),hash(after),previous];
 db.prepare('INSERT INTO audit(at,actor,action,revision,before_hash,after_hash,previous_hash,hash,before_value,after_value) VALUES(?,?,?,?,?,?,?,?,?,?)').run(...fields,hash(encode(fields)),before,after);
}
export function verifyAudit(db){let previous='';for(const row of db.prepare('SELECT * FROM audit ORDER BY seq').all()){if((row.before_value!=null&&row.before_hash!==hash(row.before_value))||(row.after_value!=null&&row.after_hash!==hash(row.after_value))||row.previous_hash!==previous||row.hash!==hash(encode([row.at,row.actor,row.action,row.revision,row.before_hash,row.after_hash,row.previous_hash])))throw Error('Audit rusak pada urutan '+row.seq);previous=row.hash;}return previous;}
export async function backupDatabase(db,destination){await backup(db,destination);chmodSync(destination,0o600);const copy=new DatabaseSync(destination,{readOnly:true});try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup gagal pemeriksaan integritas.');verifyAudit(copy);}finally{copy.close();}}
