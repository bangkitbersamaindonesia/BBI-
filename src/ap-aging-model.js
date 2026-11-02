import {documentBalance} from './payments-model.js';
import {vendorKey} from './vendor-center-model.js';
import {validAgingDate,agingBucket} from './ar-aging-model.js';
export {AGING_BUCKETS} from './ar-aging-model.js';
export function apAgingSummary(store,asOf){
 if(!validAgingDate(asOf))throw Error('Pilih tanggal As of yang valid.');
 const snapshot={...store,credits:(store.credits??[]).filter(r=>r.date<=asOf),payments:(store.payments??[]).filter(r=>r.date<=asOf),writeOffs:(store.writeOffs??[]).filter(r=>r.date<=asOf)};
 const customers=new Map();let missingDueDates=0;
 for(const invoice of store.bills){
  if(!validAgingDate(invoice.date))throw Error('Tanggal bills '+invoice.id+' tidak valid.');
  if(invoice.date>asOf)continue;
  const balance=documentBalance(snapshot,'supplier',invoice.id),net=balance.remaining-balance.creditBalance;if(net===0n)continue;
  const hasDue=validAgingDate(invoice.dueDate);const baseDate=hasDue?invoice.dueDate:invoice.date;if(!hasDue)missingDueDates++;
  const days=Math.round((Date.parse(asOf+'T00:00:00Z')-Date.parse(baseDate+'T00:00:00Z'))/86400000),bucket=agingBucket(days),key=vendorKey(invoice.supplier);
  if(!customers.has(key))customers.set(key,{name:invoice.supplier,buckets:[0n,0n,0n,0n,0n],total:0n,documents:[]});
  const row=customers.get(key);row.buckets[bucket]+=net;row.total+=net;row.documents.push({id:invoice.id,date:invoice.date,baseDate,hasDue,days,amount:net,bucket});
 }
 const rows=[...customers.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));const totals=[0n,0n,0n,0n,0n];for(const row of rows)row.buckets.forEach((amount,i)=>totals[i]+=amount);
 return {asOf,rows,totals,total:totals.reduce((a,b)=>a+b,0n),missingDueDates};
}
