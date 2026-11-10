import { documentTax } from './ppn-model.js';
import { documentBalance } from './payments-model.js';
export const customerKey=name=>String(name??'').trim().toLocaleLowerCase('id-ID');
function customerOwner(store, user) {
 if (!user) return null;
 const identity = store.users?.find(row => row.id === user.id && row.active && row.role === user.role);
 if (!identity) throw Error('User tidak aktif atau tidak dikenal.');
 return identity.role === 'sales' ? identity.name : null;
}
function canViewCustomer(store, name, owner) {
 return !owner || store.customers?.some(customer =>
  customerKey(customer.name) === customerKey(name) && customer.salesperson === owner);
}
export function customerDirectory(store,user=null){
 const owner=customerOwner(store,user);
 const entries=new Map((store.customers??[]).filter(c=>!owner||c.salesperson===owner).map(c=>[customerKey(c.name),{...c,balance:0n}]));
 for(const doc of [...store.orders,...store.invoices]){if(!canViewCustomer(store,doc.customer,owner))continue;const key=customerKey(doc.customer);if(!key)continue;if(!entries.has(key))entries.set(key,{name:doc.customer,active:true,address:doc.address??'',balance:0n});else if(!entries.get(key).address&&doc.address)entries.get(key).address=doc.address;}
 for(const invoice of store.invoices){if(!canViewCustomer(store,invoice.customer,owner))continue;const balance=documentBalance(store,'customer',invoice.id);entries.get(customerKey(invoice.customer)).balance+=balance.remaining-balance.creditBalance;}
 return [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name,'id'));
}
export function saveCustomer(store,input,originalName=null,user=null){
 const owner=customerOwner(store,user);
 if(owner){
  if(originalName && !canViewCustomer(store,originalName,owner))throw Error('Customer ini bukan milik Sales yang sedang login.');
  input={...input,salesperson:owner};
 }

 const name=String(input.name??'').trim();if(!name||name.length>200)throw Error('Nama toko / customer wajib diisi (maksimal 200 karakter).');
 if(originalName&&name!==originalName)throw Error('Nama customer yang tersimpan tidak dapat diubah agar tautan transaksi tetap konsisten.');
 const fields=['contact','mobile','salesperson','email','terms','billingAddress','shippingAddress','expeditionAddress','geography','notes'];const row={name,active:input.active!==false};
 for(const field of fields){row[field]=String(input[field] ?? (field === 'shippingAddress' ? input.address : '') ?? '').trim();if(row[field].length>1000)throw Error('Isian maksimal 1.000 karakter.');}
 if(row.salesperson && !['Doni','Lutfi','Dipa'].includes(row.salesperson))throw Error('Pilih Sales Doni, Lutfi, atau Dipa.');
 if(row.geography && !['Jawa','Luar Pulau'].includes(row.geography))throw Error('Pilih Geografi Jawa atau Luar Pulau.');
 if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))throw Error('Format email tidak valid.');
 const key=customerKey(name);store.customers??=[];const index=store.customers.findIndex(c=>customerKey(c.name)===key);
 if(!originalName&&customerDirectory(store).some(c=>customerKey(c.name)===key))throw Error('Customer sudah ada. Pilih customer lalu edit informasinya.');
 if(input.documentPhotos!==undefined){
  row.documentPhotos={};
  for(const key of ['ktp','npwp','storefront']){
   const photo=input.documentPhotos?.[key];
   if(photo){
    if(typeof photo.src!=='string'||!photo.src.startsWith('blob:')||!Number.isInteger(photo.bytes)||photo.bytes<=0||photo.bytes>300*1024||photo.width>1200||photo.height>1200)throw Error('Foto customer tidak valid atau melebihi batas ukuran.');
    row.documentPhotos[key]={...photo};
   }
  }
 }else if(index>=0)row.documentPhotos=store.customers[index].documentPhotos;
 if(index>=0){
  if(input.email === undefined)row.email=store.customers[index].email ?? '';
  store.customers[index]=row;
 }else store.customers.push(row);return row;
}
export function customerTransactions(store,name,user=null){
 const owner=customerOwner(store,user);
 if(!canViewCustomer(store,name,owner))throw Error('Customer ini bukan milik Sales yang sedang login.');

 const key=customerKey(name),rows=[],invoices=store.invoices.filter(i=>customerKey(i.customer)===key),ids=new Set(invoices.map(i=>i.id));
 for(const o of store.orders.filter(o=>customerKey(o.customer)===key))rows.push({type:'Sales Order',id:o.id,date:o.date??o.history?.[0]?.at?.slice(0,10)??'',account:'Sales Orders',amount:BigInt(o.total),status:o.status??'',open:false});
 for(const i of invoices){const b=documentBalance(store,'customer',i.id);rows.push({type:'Invoice',id:i.id,date:i.date,account:'Accounts Receivable',amount:b.total,status:b.status,open:b.remaining>0n});}
 // Credits include the PPN reversal implied by the original invoice, matching AR.
 for(const i of invoices){const credits=store.credits.filter(c=>c.type==='customer'&&c.sourceId===i.id).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));let returned=0n;for(const c of credits){const before=BigInt(i.total)-returned;returned+=BigInt(c.total);const after=BigInt(i.total)-returned;const amount=BigInt(c.total)+documentTax('customer',i,before)-documentTax('customer',i,after);rows.push({type:'Retur / Credit',id:c.id,date:c.date,account:'Accounts Receivable',amount:-amount,status:'Disetujui',open:false});}}
 for(const [source,type]of [[store.payments??[],'Payment'],[store.writeOffs??[],'Write-off']])for(const p of source.filter(p=>p.type==='customer'&&ids.has(p.sourceId)))rows.push({type,id:p.id,date:p.date,account:store.accounts.find(a=>a.id===p.accountId)?.name??p.accountId,amount:-BigInt(p.amount),status:p.reference??'',open:false});
 return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.id.localeCompare(b.id));
}
