import { documentTax } from './ppn-model.js';
import { documentBalance } from './payments-model.js';
export const vendorKey=name=>String(name??'').trim().toLocaleLowerCase('id-ID');
export function vendorDirectory(store){
 const entries=new Map((store.vendors??[]).map(c=>[vendorKey(c.name),{...c,balance:0n}]));
 for(const doc of [...store.purchaseOrders,...store.bills]){const key=vendorKey(doc.supplier);if(!key)continue;if(!entries.has(key))entries.set(key,{name:doc.supplier,active:true,address:doc.address??'',terms:doc.paymentTerms??'',balance:0n});else if(!entries.get(key).address&&doc.address)entries.get(key).address=doc.address;}
 for(const invoice of store.bills){const balance=documentBalance(store,'supplier',invoice.id);entries.get(vendorKey(invoice.supplier)).balance+=balance.remaining-balance.creditBalance;}
 return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));
}
export function saveVendor(store,input,originalName=null){
 const name=String(input.name??'').trim();if(!name||name.length>200)throw Error('Nama vendor / supplier wajib diisi (maksimal 200 karakter).');
 if(originalName&&name!==originalName)throw Error('Nama vendor yang tersimpan tidak dapat diubah agar tautan transaksi tetap konsisten.');
 const fields=['contact','mobile','email','terms','address','notes'];const row={name,active:input.active!==false};
 for(const field of fields){row[field]=String(input[field]??'').trim();if(row[field].length>1000)throw Error('Isian maksimal 1.000 karakter.');}
 if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))throw Error('Format email tidak valid.');
 const key=vendorKey(name);store.vendors??=[];const index=store.vendors.findIndex(c=>vendorKey(c.name)===key);
 if(!originalName&&vendorDirectory(store).some(c=>vendorKey(c.name)===key))throw Error('Vendor sudah ada. Pilih vendor lalu edit informasinya.');
 if(index>=0)store.vendors[index]=row;else store.vendors.push(row);return row;
}
export function vendorTransactions(store,name){
 const key=vendorKey(name),rows=[],invoices=store.bills.filter(i=>vendorKey(i.supplier)===key),ids=new Set(invoices.map(i=>i.id));
 for(const o of store.purchaseOrders.filter(o=>vendorKey(o.supplier)===key))rows.push({type:'Purchase Order',id:o.id,date:o.date??o.history?.[0]?.at?.slice(0,10)??'',account:'Purchase Orders',amount:BigInt(o.total),status:o.status??'',open:false});
 for(const i of invoices){const b=documentBalance(store,'supplier',i.id);rows.push({type:'Bill',id:i.id,date:i.date,account:'Accounts Payable',amount:b.total,status:b.status,open:b.remaining>0n});}
 // Credits include the PPN reversal implied by the original bill, matching AP.
 for(const i of invoices){const credits=store.credits.filter(c=>c.type==='supplier'&&c.sourceId===i.id).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));let returned=0n;for(const c of credits){const before=BigInt(i.total)-returned;returned+=BigInt(c.total);const after=BigInt(i.total)-returned;const amount=BigInt(c.total)+documentTax('supplier',i,before)-documentTax('supplier',i,after);rows.push({type:'Retur Vendor / Credit',id:c.id,date:c.date,account:'Accounts Payable',amount:-amount,status:'Disetujui',open:false});}}
 for(const [source,type]of [[store.payments??[],'Payment'],[store.writeOffs??[],'Write-off']])for(const p of source.filter(p=>p.type==='supplier'&&ids.has(p.sourceId)))rows.push({type,id:p.id,date:p.date,account:store.accounts.find(a=>a.id===p.accountId)?.name??p.accountId,amount:-BigInt(p.amount),status:p.reference??'',open:false});
 return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.id.localeCompare(b.id));
}
