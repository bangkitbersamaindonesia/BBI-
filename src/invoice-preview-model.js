export function invoiceTaxAmounts(net) {
 const dpp = (net * 11n + 6n) / 12n;
 const ppn = (dpp * 12n + 50n) / 100n;
 return {dpp, ppn, amountDue:net + ppn};
}

// Preview-only calculations; source invoice and credit records stay immutable.
export function previewInvoiceAmounts(invoice,credits,percent='0'){
 const raw=String(percent).trim();
 if(!/^\d{1,3}(\.\d{1,2})?$/.test(raw))throw Error('Diskon harus 0–100%, maksimal 2 angka desimal.');
 const [whole,fraction='']=raw.split('.');const rate=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(rate>10000n)throw Error('Diskon harus 0–100%.');
 const lines=invoice.lines.map(l=>{const price=(BigInt(l.price)*(10000n-rate)+5000n)/10000n;return {...l,discountedPrice:price,discountedSubtotal:price*BigInt(l.quantityPcs)};});
 const total=lines.reduce((s,l)=>s+l.discountedSubtotal,0n);
 const returned=new Map();let creditTotal=0n;
 for(const credit of credits){for(const line of credit.lines){const source=lines[line.lineIndex];if(!source)throw Error('Baris retur tidak ditemukan pada invoice.');const qty=(returned.get(line.lineIndex)||0n)+BigInt(line.quantityPcs);if(qty>BigInt(source.quantityPcs))throw Error('Qty retur melebihi invoice.');returned.set(line.lineIndex,qty);creditTotal+=source.discountedPrice*BigInt(line.quantityPcs);}}
 const net=total-creditTotal;
 return {percent:String(Number(rate)/100),lines,total,credits:creditTotal,net,...invoiceTaxAmounts(net)};
}
export function setPreviewDiscount(settings,id,percent,role){
 if(role!=='admin2')throw Error('Hanya Admin 2 yang dapat mengisi diskon.');
 // Reuse range/precision validation before changing session settings.
 const validated=previewInvoiceAmounts({lines:[]},[],percent).percent;
 settings.set(id,validated);return validated;
}
