import {documentBalance} from './payments-model.js';
import {customerKey} from './customer-center-model.js';
import {validAgingDate} from './ar-aging-model.js';
export function averageDaysToPay(store){
 const customers=new Map();
 for(const invoice of store.invoices){
  if(!validAgingDate(invoice.date))continue;
  const payments=(store.payments??[]).filter(p=>p.type==='customer'&&p.sourceId===invoice.id&&BigInt(p.amount)>0n&&validAgingDate(p.date)&&p.date>=invoice.date).sort((a,b)=>a.date.localeCompare(b.date));
  // Only actual payments can qualify an invoice; no write-off is treated as payment.
  if(!payments.length||(store.writeOffs??[]).some(w=>w.type==='customer'&&w.sourceId===invoice.id&&BigInt(w.amount)>0n))continue;
  let paidDate=null;
  for(const payment of payments){const date=payment.date;const snapshot={...store,payments:payments.filter(p=>p.date<=date),writeOffs:[],credits:(store.credits??[]).filter(c=>c.date<=date)};const balance=documentBalance(snapshot,'customer',invoice.id);if(balance.remaining===0n&&balance.due>0n){paidDate=date;break;}}
  if(!paidDate)continue;
  const days=Math.round((Date.parse(paidDate+'T00:00:00Z')-Date.parse(invoice.date+'T00:00:00Z'))/86400000),key=customerKey(invoice.customer);
  if(!customers.has(key))customers.set(key,{name:invoice.customer,totalDays:0,count:0,documents:[]});
  const row=customers.get(key);row.totalDays+=days;row.count++;row.documents.push({id:invoice.id,date:invoice.date,paidDate,days});
 }
 return [...customers.values()].map(row=>({...row,averageDays:row.totalDays/row.count})).sort((a,b)=>a.name.localeCompare(b.name,'id'));
}
