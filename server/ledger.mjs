import {financialEntries} from '../src/financial-reports-model.js';
import {encode} from './database.mjs';
export function postingLines(entry){
 const debitPrefixes=['inventory','ar','bank:','vat:','cogs','expense:'];
 const creditPrefixes=['openingEquity','ap','revenue','otherIncome','income:'];
 const lines=[];
 for(const [account,value]of Object.entries(entry.values)){
  if(value===0n)continue;const debit=debitPrefixes.some(p=>account===p||p.endsWith(':')&&account.startsWith(p));
  if(!debit&&!creditPrefixes.some(p=>account===p||p.endsWith(':')&&account.startsWith(p)))throw Error('Akun jurnal belum dipetakan: '+account);
  const signed=debit?value:-value;lines.push({account,debit:signed>0n?signed.toString():'0',credit:signed<0n?(-signed).toString():'0'});
 }
 if(lines.reduce((s,l)=>s+BigInt(l.debit)-BigInt(l.credit),0n)!==0n)throw Error('Jurnal tidak seimbang: '+entry.source);
 return lines;
}
export function syncLedger(db,state){
 const seen=new Set();
 for(const entry of financialEntries(state)){
  if(seen.has(entry.source))throw Error('Sumber jurnal duplikat.');seen.add(entry.source);
  const body=encode(postingLines(entry)),existing=db.prepare('SELECT * FROM journals WHERE source=?').get(entry.source);
  if(existing){if(existing.body!==body||existing.date!==entry.date)throw Error('Jurnal terposting tidak boleh diubah. Gunakan transaksi pembalik.');}
  else db.prepare('INSERT INTO journals VALUES(?,?,?)').run(entry.source,entry.date,body);
 }
 for(const entry of db.prepare('SELECT source FROM journals').all())if(!seen.has(entry.source))throw Error('Jurnal terposting tidak boleh dihapus.');
}
