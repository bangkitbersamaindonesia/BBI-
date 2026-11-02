export function bankMovement(store,accountId){
 const payments=(store.payments??[]).filter(p=>p.accountId===accountId).reduce((s,p)=>s+(p.type==='customer'?1n:-1n)*BigInt(p.amount),0n);
 const checks=(store.checks??[]).filter(c=>c.bankAccountId===accountId).reduce((s,c)=>s+BigInt(c.amount),0n);
 return payments-checks;
}
export function createCheck(store,input,role){
 if(role!=='admin3')throw Error('Hanya Admin 3 yang dapat membuat check pengeluaran.');
 const bank=store.accounts.find(a=>a.id===input.bankAccountId&&a.group==='cash_bank'&&a.active);if(!bank)throw Error('Pilih akun kas / bank aktif.');
 const expense=store.accounts.find(a=>a.id===input.expenseAccountId&&a.group==='expense'&&a.active);if(!expense)throw Error('Pilih akun / subakun expenses aktif.');
 if(store.accounts.some(a=>a.parentId===expense.id&&a.active))throw Error('Pilih subakun expenses yang paling rinci.');
 const raw=String(input.amount??'').trim();if(!/^\d+$/.test(raw)||BigInt(raw)<=0n)throw Error('Nominal check harus rupiah bulat positif.');
 const reference=String(input.reference??'').trim();if(!reference||reference.length>120)throw Error('Isi nomor check (maksimal 120 karakter).');if((store.checks??[]).some(c=>c.reference.toLowerCase()===reference.toLowerCase()))throw Error('Nomor check sudah tercatat.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date??'')||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw Error('Tanggal check tidak valid.');
 const payee=String(input.payee??'').trim(),notes=String(input.notes??'').trim();if(!payee||payee.length>200||notes.length>500)throw Error('Isi penerima (maksimal 200 karakter) dan keterangan maksimal 500 karakter.');
 const check={id:`CHECK-DEMO-${(store.checks?.length??0)+1}`,reference,date:input.date,bankAccountId:bank.id,expenseAccountId:expense.id,amount:BigInt(raw).toString(),payee,notes,createdBy:'Admin 3',at:new Date().toISOString()};
 (store.checks??=[]).push(check);return check;
}
