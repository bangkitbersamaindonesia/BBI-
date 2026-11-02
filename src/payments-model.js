const sum=items=>items.reduce((s,r)=>s+BigInt(r.amount),0n);
export function documentBalance(store,type,id){
 if(!['customer','supplier'].includes(type))throw Error('Jenis pembayaran tidak valid.');
 const doc=(type==='customer'?store.invoices:store.bills).find(d=>d.id===id);if(!doc)throw Error('Dokumen tidak ditemukan.');
 const original=BigInt(doc.total);const returns=store.credits.filter(c=>c.type===type&&c.sourceId===id).reduce((s,c)=>s+BigInt(c.total),0n);if(returns>original)throw Error('Retur melebihi dokumen asal.');
 const tax=v=>type==='customer'&&doc.letterhead==='A'?(((v*11n+6n)/12n)*12n+50n)/100n:0n;
 const total=original+tax(original),due=original-returns+tax(original-returns);
 const paid=sum((store.payments??[]).filter(p=>p.type===type&&p.sourceId===id));const writtenOff=sum((store.writeOffs??[]).filter(p=>p.type===type&&p.sourceId===id));
 const signed=due-paid-writtenOff;const remaining=signed>0n?signed:0n;
 return {doc,total,credits:total-due,due,paid,writtenOff,remaining,creditBalance:signed<0n?-signed:0n,status:remaining===0n?(writtenOff>0n?'SELESAI · WRITE-OFF':'LUNAS'):paid>0n?'DIBAYAR SEBAGIAN':'BELUM LUNAS'};
}
export function recordPayment(store,type,id,input,role){
 if(role!=='admin2')throw Error('Hanya Admin 2 yang dapat mencatat pembayaran / write-off.');
 const balance=documentBalance(store,type,id);if(balance.remaining===0n)throw Error('Dokumen sudah diselesaikan.');
 const raw=String(input.amount??'').trim();if(!/^\d+$/.test(raw))throw Error('Nominal harus rupiah bulat tidak negatif.');const amount=BigInt(raw);if(amount>balance.remaining)throw Error('Pembayaran melebihi sisa tagihan.');
 const writeOff=input.writeOff===true;const gap=balance.remaining-amount;if(amount===0n&&!writeOff)throw Error('Isi nominal pembayaran lebih dari 0.');if(writeOff&&gap===0n)throw Error('Tidak ada selisih untuk write-off.');
 const reference=String(input.reference??'').trim();if(!reference||reference.length>120)throw Error('Isi referensi pembayaran unik (maksimal 120 karakter).');
 if((store.payments??[]).concat(store.writeOffs??[]).some(p=>p.type===type&&p.sourceId===id&&p.reference.toLowerCase()===reference.toLowerCase()))throw Error('Referensi pembayaran sudah tercatat.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date??'')||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date||input.date<balance.doc.date)throw Error('Tanggal pembayaran harus valid dan tidak mendahului dokumen.');
 const cash=store.accounts.find(a=>a.id===input.accountId&&a.group==='cash_bank'&&a.active);if(amount>0n&&!cash)throw Error('Pilih akun kas / bank aktif.');
 const reason=String(input.reason??'').trim();if(reason.length>500||(writeOff&&!reason))throw Error('Isi alasan write-off (maksimal 500 karakter).');
 const accountId=type==='customer'?'EXP-BAD-DEBT':'INCOME-AP-WRITEOFF';const account=store.accounts.find(a=>a.id===accountId&&a.active);if(writeOff&&!account)throw Error('Akun write-off tidak tersedia / tidak aktif.');
 const at=new Date().toISOString();const payments=store.payments??[];const writeOffs=store.writeOffs??[];
 const payment=amount>0n?{id:`PAY-DEMO-${payments.length+1}`,type,sourceId:id,date:input.date,reference,amount:amount.toString(),accountId:cash.id,recordedBy:'Admin 2',at}:null;
 const adjustment=writeOff?{id:`WO-DEMO-${writeOffs.length+1}`,type,sourceId:id,date:input.date,reference,amount:gap.toString(),accountId,reason,recordedBy:'Admin 2',at}:null;
 // All validations precede append-only settlement records; stock is never changed.
 store.payments=payments;store.writeOffs=writeOffs;if(payment)payments.push(payment);if(adjustment)writeOffs.push(adjustment);
 const after=documentBalance(store,type,id);balance.doc.status=after.status;(balance.doc.history??=[]).push({action:`Pembayaran ${payment?.id??'—'}; write-off ${adjustment?.id??'—'}; ${after.status}`,at});return after;
}
