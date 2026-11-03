import {priceForLevel} from './price-level.js';
import { dispatchCustomerOrder } from './fulfillment-model.js';
import { previewInvoiceAmounts } from './invoice-preview-model.js';
export function issueCustomerInvoice(store,orderId,input,role){
 if(role!=='admin2')throw Error('Hanya Admin 2 yang dapat menerbitkan invoice customer.');
 if(!['A','B'].includes(input.letterhead))throw Error('Pilih opsi invoice A atau B.');
 if(!input.lines?.length)throw Error('Invoice harus memiliki minimal satu SKU.');
 const copy=structuredClone(store);const order=copy.orders.find(o=>o.id===orderId);if(!order)throw Error('SO tidak ditemukan.');
 const seen=new Set();const grossLines=input.lines.map(raw=>{const p=copy.products.find(p=>p.sku===raw.sku);if(!p||seen.has(raw.sku))throw Error('Pilih SKU valid tanpa duplikat.');seen.add(raw.sku);const qty=String(raw.quantityPcs);const price=String(input.priceLevel === undefined ? raw.price : priceForLevel(p.purchasePrice, input.priceLevel));if(!/^\d+$/.test(qty)||!Number.isSafeInteger(Number(qty))||Number(qty)<=0||!/^\d+$/.test(price)||!Number.isSafeInteger(Number(price)))throw Error('Qty harus pcs bulat positif dan harga rupiah bulat tidak negatif.');return {sku:p.sku,price:Number(price),quantityPcs:Number(qty)};});
 const calculated=previewInvoiceAmounts({lines:grossLines},[],input.discountPercent||'0');
 const sourceLines=structuredClone(order.lines);
 const lines=order.lines.map(sale=>{const chosen=calculated.lines.find(l=>l.sku===sale.sku);if(chosen){sale.price=Number(chosen.discountedPrice);sale.subtotal=sale.quantityPcs*sale.price;}return {sku:sale.sku,originalPcs:chosen?.quantityPcs??0,substitutePcs:0,reason:chosen?.quantityPcs===sale.quantityPcs?'':'Disesuaikan Admin 2 pada draft invoice'};});
 const additionalLines=calculated.lines.filter(l=>!order.lines.some(s=>s.sku===l.sku)).map(l=>({sku:l.sku,quantityPcs:l.quantityPcs,price:Number(l.discountedPrice)}));
 const result=dispatchCustomerOrder(copy,orderId,{date:input.date,final:input.final===true,customerApproved:input.customerApproved===true,lines,additionalLines},'admin1');
 if(!result.invoice)throw Error('Tidak ada barang untuk invoice.');
 order.lines=sourceLines;
 const invoice=result.invoice;invoice.lines=invoice.lines.map(l=>({...l,grossPrice:grossLines.find(g=>g.sku===l.sku).price}));
 if(input.priceLevel!==undefined)invoice.priceLevel=input.priceLevel;
 invoice.discountPercent=calculated.percent;invoice.letterhead=input.letterhead;invoice.issuedBy='Admin 2';invoice.status='Diterbitkan · demo';invoice.dpp=input.letterhead==='A'?Number(calculated.dpp):0;invoice.ppn=input.letterhead==='A'?Number(calculated.ppn):0;const payable=calculated.total+BigInt(invoice.ppn);if(payable>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Jumlah invoice melebihi batas aman.');invoice.amountDue=Number(payable);
 order.history.push({action:`Invoice diterbitkan Admin 2, opsi ${input.letterhead}, diskon ${calculated.percent}%`,at:new Date().toISOString()});Object.assign(store,copy);return result;
}
