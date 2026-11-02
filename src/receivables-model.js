import { documentBalance } from './payments-model.js';
// Read-only projection of session invoices, not a posted AR ledger or payment balance.
export function receivableSummary(store){
 const customers=new Map();let total=0n,credits=0n,net=0n;
 const invoices=store.invoices.map(invoice=>{
  const balance=documentBalance(store,'customer',invoice.id);const returned=balance.credits;const original=balance.total;const remaining=balance.remaining;
  const customer=invoice.customer; // Exact labels only; no customer-master IDs exist yet.
  if(!customers.has(customer))customers.set(customer,{customer,invoiceCount:0,total:0n,credits:0n,net:0n});
  const row=customers.get(customer);row.invoiceCount++;row.total+=original;row.credits+=returned;row.net+=remaining;
  total+=original;credits+=returned;net+=remaining;
  return {id:invoice.id,orderId:invoice.orderId,date:invoice.date,customer,total:original,credits:returned,net:remaining};
 });
 return {total,credits,net,customers:[...customers.values()],invoices};
}
