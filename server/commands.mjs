import {submitSalesWorkflow,editSalesWorkflow,deleteSalesWorkflow,editPurchaseOrder,createStockPurchaseOrder} from '../src/workflow-model.js';
import {readyPurchaseOrder} from '../src/sales-model.js';
import {finalizeBillDraft} from '../src/bill-draft-model.js';
import {issueCustomerInvoice} from '../src/customer-invoice-model.js';
import {requestReturn,decideReturn} from '../src/returns-model.js';
import {recordPayment} from '../src/payments-model.js';
import {createCheck} from '../src/checks-model.js';
import {saveCustomer} from '../src/customer-center-model.js';
import {saveVendor} from '../src/vendor-center-model.js';
import {priceForLevel} from '../src/price-level.js';
import {validateSku,UNITS} from '../src/sku-model.js';
import {editProduct,deleteProduct} from '../src/product-management.js';
import {selectNewArrival} from '../src/new-arrivals-model.js';
import {financialReport} from '../src/financial-reports-model.js';
import {failure} from './security.mjs';
export const permissions={
 'customer.save':['sales','admin1','admin2','admin3','superadmin'],
 'product.save':['admin1','admin2','admin3','superadmin'],'product.delete':['admin1','admin2','admin3','superadmin'],
 'arrival.set':['superadmin'],'vendor.save':['admin1','admin2','superadmin'],
 'so.create':['sales','superadmin'],'so.edit':['sales','superadmin'],'so.delete':['sales','superadmin'],
 'po.create':['admin1','superadmin'],'po.edit':['admin1','superadmin'],'po.approve':['admin1','superadmin'],
 'bill.finalize':['admin1','superadmin'],'invoice.issue':['admin2','superadmin'],
 'return.request':['sales','admin1','superadmin'],'return.decide':['admin1','superadmin'],
 'payment.record':['admin2','superadmin'],'check.create':['admin3','superadmin']
};
function permit(user,action){if(!permissions[action]?.includes(user.role))throw failure('Anda tidak memiliki akses untuk tindakan ini.',403);}
export function applyCommand(state,user,action,input){
 permit(user,action);if(!input||typeof input!=='object'||Array.isArray(input))throw failure('Isian tidak valid.');
 if(input.documentPhotos!==undefined||input.photos!==undefined)throw failure('Gunakan unggah foto privat.');
 const actor={...user,active:true};state.users=state.users.filter(u=>u.id!==actor.id).concat(actor);
 const ownDocument=(type,id)=>{if(user.role!=='sales')return;const doc=(type==='customer'?state.invoices:state.bills).find(d=>d.id===id);if(type!=='customer'||!state.orders.some(o=>o.id===doc?.orderId&&o.salesperson===user.name))throw failure('Dokumen bukan milik Sales ini.',403);};
 let result;
 switch(action){
 case 'customer.save': {
  if(user.role==='sales'&&input.originalName&&state.orders.some(o=>o.customer===input.originalName)&&input.active===false)throw failure('Customer dengan transaksi tidak dapat dinonaktifkan oleh Sales.');
  if(!state.users.some(u=>u.role==='sales'&&u.active&&u.name===(user.role==='sales'?user.name:input.salesperson)))throw failure('Pilih Sales aktif.');
  if(!['Cash','Net 14','Net 30','Net 60'].includes(input.terms))throw failure('Pilih term of payment yang valid.');
  const existing=state.customers.find(c=>c.name===input.originalName);
  if(existing&&existing.salesperson!==(user.role==='sales'?user.name:input.salesperson)&&state.orders.some(o=>o.customer===existing.name))throw failure('Customer dengan transaksi tidak dapat dipindahkan Sales tanpa proses serah terima.');
  result=saveCustomer(state,{...input,documentPhotos:undefined},input.originalName??null,actor);break;
 }
 case 'vendor.save':result=saveVendor(state,input,input.originalName??null);break;
 case 'product.save':{
  input={...input,sellingPrice:priceForLevel(Number(input.purchasePrice),'R')};
  if(input.originalSku){result=editProduct(state,input.originalSku,input,actor);break;}
  const {value,errors}=validateSku({...input,qty:'0',warehouseId:'lebak'},state.products);if(Object.keys(errors).length)throw failure(Object.values(errors)[0]);
  const {quantityPcs,warehouseId,...product}=value;state.products.push(product);result=product;break;
 }
 case 'product.delete':deleteProduct(state,input.sku,actor);break;
 case 'arrival.set':selectNewArrival(state,input.sku,input.selected===true,actor);break;
 case 'so.create':case 'so.edit':{
  const customer=state.customers.find(c=>c.name===input.customer&&c.active!==false);if(!customer)throw failure('Pilih customer aktif.');
  const owner=user.role==='sales'?user.name:customer.salesperson;if(!owner||customer.salesperson!==owner)throw failure('Customer bukan milik Sales ini.',403);
  const data={...input,customerFromCenter:true,salesOwner:owner,salesperson:owner,pricePerUnit:true};
  // Sales prices come from the catalogue. Invoice price level/discount remains Admin 2's responsibility.
  data.lines=(input.lines??[]).map(l=>{const unit=l.unit??'pcs';if(!Object.hasOwn(UNITS,unit))throw failure('Satuan tidak valid.');const product=state.products.find(p=>p.sku===l.sku);return {...l,unit,price:product?String(BigInt(product.sellingPrice)*BigInt(UNITS[unit])):''};});
  if(action==='so.edit'&&!state.orders.some(o=>o.id===input.id&&o.salesperson===owner))throw failure('SO bukan milik Sales ini.',403);
  result=action==='so.create'?submitSalesWorkflow(state,data,'sales'):editSalesWorkflow(state,input.id,data,'sales');break;
 }
 case 'so.delete':deleteSalesWorkflow(state,input.id,'sales',user.role==='sales'?user.name:null);break;
 case 'po.create':case 'po.edit':{
  if(!state.vendors.some(v=>v.name===input.supplier&&v.active!==false))throw failure('Pilih vendor aktif.');
  result=action==='po.create'?createStockPurchaseOrder(state,input,'admin1'):editPurchaseOrder(state,input.id,input,'admin1');break;
 }
 case 'po.approve':{
  const po=state.purchaseOrders.find(p=>p.id===input.id);if(!state.vendors.some(v=>v.name===po?.supplier&&v.active!==false)||!po?.paymentTerms||!po.lines.length)throw failure('Lengkapi vendor, barang dan term of payment sebelum otorisasi.');
  result=readyPurchaseOrder(state,input.id,'admin1');break;
 }
 case 'bill.finalize':result=finalizeBillDraft(state,input.id,input,'admin1');break;
 case 'invoice.issue':{
  if(!['R','P','HK'].includes(input.priceLevel))throw failure('Pilih price level R, P atau HK.');
  result=issueCustomerInvoice(state,input.id,input,'admin2');break;
 }
 case 'return.request':{
  if(!['customer','supplier'].includes(input.type)||(user.role==='sales'&&input.type!=='customer')||(user.role==='admin1'&&input.type!=='supplier'))throw failure('Jenis retur tidak diizinkan.',403);
  ownDocument(input.type,input.id);result=requestReturn(state,input.type,input.id,{...input,requestedBy:user.name},input.type==='customer'?'sales':'admin1');break;
 }
 case 'return.decide':result=decideReturn(state,input.id,input,'admin1');break;
 case 'payment.record':result=recordPayment(state,input.type,input.id,input,'admin2');break;
 case 'check.create':result=createCheck(state,input,'admin3');break;
 default:throw failure('Tindakan tidak dikenal.',404);
 }
 validateState(state);
 return result;
}
export function validateState(state){
 for(const b of state.balances){if(!Number.isSafeInteger(b.quantityPcs)||b.quantityPcs<0)throw failure('Stok tidak boleh negatif atau melebihi batas.');const reserved=state.reservations.filter(r=>r.sku===b.sku&&r.warehouseId===b.warehouseId).reduce((s,r)=>s+r.quantityPcs,0);if(reserved>b.quantityPcs)throw failure('Alokasi stok melebihi persediaan.');}
 const inspect=value=>{if(typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER))throw failure('Angka transaksi melebihi batas aman.');if(value&&typeof value==='object')Object.values(value).forEach(inspect);};inspect(state);
 if(financialReport(state,'0001-01-01','9999-12-31').difference!==0n)throw failure('Transaksi ditolak karena neraca tidak seimbang.');
}
function safeInvoice(i){return {id:i.id,orderId:i.orderId,customer:i.customer,date:i.date,dueDate:i.dueDate,total:i.total,amountDue:i.amountDue,ppn:i.ppn,letterhead:i.letterhead,status:i.status,discountPercent:i.discountPercent,lines:i.lines.map(l=>({sku:l.sku,name:l.name,quantityPcs:l.quantityPcs,price:l.price,grossPrice:l.grossPrice,subtotal:l.subtotal}))};}
export function projectState(state,user){
 const result=structuredClone(state);delete result.users;
 if(user.role==='superadmin')return result;
 // Accounting chart is only sent as operational bank/expense selectors to admins.
 result.accounts=result.accounts.filter(a=>['cash_bank','expense'].includes(a.group)||a.id==='PPN-OUT');
 if(user.role==='sales'){
  const orders=state.orders.filter(o=>o.salesperson===user.name),orderIds=new Set(orders.map(o=>o.id));
  const invoices=state.invoices.filter(i=>orderIds.has(i.orderId)).map(safeInvoice),invoiceIds=new Set(invoices.map(i=>i.id));
  return {products:state.products.map(p=>({sku:p.sku,name:p.name,size:p.size,color:p.color,sellingPrice:p.sellingPrice,unit:p.unit})),newArrivalSkus:state.newArrivalSkus,
   customers:state.customers.filter(c=>c.salesperson===user.name).map(({documentPhotos,...c})=>c),orders,invoices,
   returns:state.returns.filter(r=>r.type==='customer'&&invoiceIds.has(r.sourceId)),payments:state.payments.filter(p=>p.type==='customer'&&invoiceIds.has(p.sourceId)).map(({accountId,...p})=>p),credits:state.credits.filter(c=>c.type==='customer'&&invoiceIds.has(c.sourceId)).map(({costReversal,lines,...c})=>c)};
 }
 if(user.role==='admin3')return {products:state.products,customers:state.customers,checks:state.checks,accounts:result.accounts,balances:state.balances,newArrivalSkus:state.newArrivalSkus};
 delete result.financialOpenings;delete result.costPools;
 return result;
}
