export const PPN_ACCOUNT_ID='ASSET-PPN';
export function documentTax(type,doc,net){
 if(net<0n)throw Error('Dasar pajak tidak boleh negatif.');
 if(type==='customer')return doc.letterhead==='A'?(((net*11n+6n)/12n)*12n+50n)/100n:0n;
 const original=BigInt(doc.total),ppn=BigInt(doc.ppnAmount??0);
 return original>0n?(ppn*net+original/2n)/original:0n;
}
export function ppnSummary(store){
 const entries=[];
 for(const type of ['supplier','customer'])for(const doc of (type==='supplier'?store.bills:store.invoices)){
  const total=BigInt(doc.total);let remaining=total;let tax=documentTax(type,doc,total);const sign=type==='supplier'?1n:-1n;
  if(tax)entries.push({sourceId:doc.id,date:doc.date,accountId:type==='supplier'?'PPN-IN':'PPN-OUT',description:type==='supplier'?'PPN bills supplier':'PPN invoice customer',delta:sign*tax});
  for(const credit of store.credits.filter(c=>c.type===type&&c.sourceId===doc.id)){
   remaining-=BigInt(credit.total);if(remaining<0n)throw Error('Retur melebihi dokumen asal.');const after=documentTax(type,doc,remaining);const reversal=tax-after;
   if(reversal)entries.push({sourceId:credit.id??doc.id,date:credit.date,accountId:type==='supplier'?'PPN-IN':'PPN-OUT',description:type==='supplier'?'Koreksi PPN retur supplier':'Koreksi PPN retur customer',delta:-sign*reversal});tax=after;
  }
 }
 for(const c of store.checks??[])if(c.expenseAccountId==='PPN-OUT')entries.push({sourceId:c.reference,date:c.date,accountId:'PPN-OUT',description:'Setoran PPN dari bank',delta:BigInt(c.amount)});
 const increases=entries.filter(e=>e.delta>0n).reduce((s,e)=>s+e.delta,0n),decreases=entries.filter(e=>e.delta<0n).reduce((s,e)=>s-e.delta,0n);
 const input=entries.filter(e=>e.accountId==='PPN-IN').reduce((s,e)=>s+e.delta,0n),output=entries.filter(e=>e.accountId==='PPN-OUT').reduce((s,e)=>s+e.delta,0n);const paid=(store.checks??[]).filter(c=>c.expenseAccountId==='PPN-OUT').reduce((s,c)=>s+BigInt(c.amount),0n);const net=input+output;return {entries,increases,decreases,input,output,outputBeforePayments:output-paid,paid,net,payable:net<0n?-net:0n,overpaid:net>0n?net:0n};
}
