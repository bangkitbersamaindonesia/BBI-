import { documentTax } from './ppn-model.js';
const iso=d=>d.toISOString().slice(0,10);
const day=s=>new Date(s+'T00:00:00Z');
export function reportPeriod(preset,today,custom={}){
 const now=day(today);if(!Number.isFinite(+now))throw Error('Tanggal tidak valid.');const y=now.getUTCFullYear(),m=now.getUTCMonth();
 if(preset==='custom'){
  const start=day(custom.start),end=day(custom.end);if(!Number.isFinite(+start)||!Number.isFinite(+end)||iso(start)!==custom.start||iso(end)!==custom.end||start>end)throw Error('Isi rentang tanggal custom yang valid.');const days=(end-start)/86400000+1;return {start:iso(start),end:iso(end),previousStart:iso(new Date(+start-days*86400000)),previousEnd:iso(new Date(+start-86400000)),label:'Custom dates',previousLabel:'Periode sebelumnya (durasi sama)'};
 }
 const span={month:1,quarter:3,semester:6,fiscal:12}[preset];if(!span)throw Error('Periode tidak valid.');const month=Math.floor(m/span)*span;return {start:iso(new Date(Date.UTC(y,month,1))),end:iso(new Date(Date.UTC(y,month+span,0))),previousStart:iso(new Date(Date.UTC(y,month-span,1))),previousEnd:iso(new Date(Date.UTC(y,month,0))),label:{month:'This month',quarter:'This quarter',semester:'This semester',fiscal:'This fiscal year'}[preset],previousLabel:{month:'Last month',quarter:'Last quarter',semester:'Last semester',fiscal:'Last fiscal year'}[preset]};
}
export function financialEntries(store){
 const entries=[];const add=(date,source,values)=>{entries.push({date,source,values});};
 for(const o of store.financialOpenings??[])add(o.date,o.id,{inventory:BigInt(o.amount),openingEquity:BigInt(o.amount)});
 for(const b of store.bills){const total=BigInt(b.total),tax=documentTax('supplier',b,total);add(b.date,b.id,{inventory:total,ppn:tax,ap:total+tax});}
 for(const i of store.invoices){const total=BigInt(i.total),tax=documentTax('customer',i,total),cost=BigInt(i.costTotal??0);add(i.date,i.id,{ar:total+tax,ppn:-tax,revenue:total,inventory:-cost,cogs:cost});}
 const credited=new Map();
 for(const c of store.credits){const customer=c.type==='customer',doc=(customer?store.invoices:store.bills).find(d=>d.id===c.sourceId);if(!doc)continue;const total=BigInt(doc.total),key=c.type+':'+c.sourceId,previous=credited.get(key)??0n,value=BigInt(c.total),cost=BigInt(c.costReversal??0);const tax=documentTax(c.type,doc,total-previous)-documentTax(c.type,doc,total-previous-value);credited.set(key,previous+value);add(c.date,c.id,customer?{ar:-(value+tax),ppn:tax,revenue:-value,inventory:cost,cogs:-cost}:{ap:-(value+tax),ppn:-tax,inventory:-cost,otherIncome:value-cost});}
 for(const p of store.payments??[]){const amount=BigInt(p.amount);add(p.date,p.id,p.type==='customer'?{['bank:'+p.accountId]:amount,ar:-amount}:{['bank:'+p.accountId]:-amount,ap:-amount});}
 for(const w of store.writeOffs??[]){const amount=BigInt(w.amount);add(w.date,w.id,w.type==='customer'?{ar:-amount,['expense:'+w.accountId]:amount}:{ap:-amount,['income:'+w.accountId]:amount});}
 for(const c of store.checks??[]){const amount=BigInt(c.amount);add(c.date,c.id,{['bank:'+c.bankAccountId]:-amount,...(c.expenseAccountId==='ASSET-PPN'?{ppn:-amount}:{['expense:'+c.expenseAccountId]:amount})});}
 if(store.accounts?.find(a=>a.id==='ASSET-PPN')?.nonPosting){for(const entry of entries){delete entry.values.ppn;}}
 return entries;
}
export function financialReport(store,start,end){
 const entries=financialEntries(store),balances={},period={};
 for(const entry of entries){if(!entry.date||entry.date>end)continue;for(const [key,value]of Object.entries(entry.values)){balances[key]=(balances[key]??0n)+value;if(entry.date>=start)period[key]=(period[key]??0n)+value;}}
 const sum=(obj,prefix)=>Object.entries(obj).filter(([k])=>k.startsWith(prefix)).reduce((s,[,v])=>s+v,0n);
 const profit=obj=>(obj.revenue??0n)+(obj.otherIncome??0n)+sum(obj,'income:')-(obj.cogs??0n)-sum(obj,'expense:');
 const bank=sum(balances,'bank:'),assets=bank+(balances.inventory??0n)+(balances.ar??0n)+(balances.ppn??0n),liabilities=balances.ap??0n,equity=(balances.openingEquity??0n)+profit(balances);
 return {balances,period,revenue:period.revenue??0n,cogs:period.cogs??0n,grossProfit:(period.revenue??0n)-(period.cogs??0n),otherIncome:(period.otherIncome??0n)+sum(period,'income:'),expenses:sum(period,'expense:'),netProfit:profit(period),bank,assets,liabilities,equity,accumulatedProfit:profit(balances),difference:assets-liabilities-equity};
}
