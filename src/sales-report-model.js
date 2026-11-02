import {validAgingDate} from './ar-aging-model.js';
export function salesReport(store,user,start,end,filter=''){
 const identity=store.users.find(u=>u.id===user?.id&&u.active&&u.role===user.role);
 if(!identity||!['sales','superadmin'].includes(identity.role))throw Error('Laporan ini hanya untuk Sales dan Admin super.');
 if(!validAgingDate(start)||!validAgingDate(end)||start>end||Number(end.slice(0,4))-Number(start.slice(0,4))>5)throw Error('Pilih rentang tanggal valid, maksimal 5 tahun.');
 const months=[];let month=start.slice(0,7);while(month<=end.slice(0,7)){months.push({month,total:0n});const [y,m]=month.split('-').map(Number);month=m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;}
 const totals=new Map(),eligible=new Map();
 const add=(date,salesperson,value)=>{if(date<start||date>end)return;months.find(m=>m.month===date.slice(0,7)).total+=value;totals.set(salesperson,(totals.get(salesperson)??0n)+value);};
 for(const invoice of store.invoices){const order=store.orders.find(o=>o.id===invoice.orderId);const salesperson=invoice.salesperson??order?.salesperson??'Tanpa sales';if(identity.role==='sales'&&salesperson!==identity.name)continue;if(identity.role==='superadmin'&&filter&&salesperson!==filter)continue;eligible.set(invoice.id,salesperson);add(invoice.date,salesperson,BigInt(invoice.total));}
 for(const credit of store.credits??[])if(credit.type==='customer'&&eligible.has(credit.sourceId))add(credit.date,eligible.get(credit.sourceId),-BigInt(credit.total));
 const reps=[...totals].map(([name,total])=>({name,total})).sort((a,b)=>a.name.localeCompare(b.name));return {months,reps,total:months.reduce((sum,m)=>sum+m.total,0n),scope:identity.role==='sales'?identity.name:filter||'Semua sales'};
}
