// Read-only projection of session invoices, not a posted AR ledger or payment balance.
export function receivableSummary(store){
 const customers=new Map();let total=0n,credits=0n,net=0n;
 const invoices=store.invoices.map(invoice=>{
  const returned=store.credits.filter(c=>c.type==='customer'&&c.sourceId===invoice.id).reduce((sum,c)=>sum+BigInt(c.total),0n);
  const original=BigInt(invoice.total);if(returned>original)throw Error('Retur melebihi invoice asal.');
  const remaining=original-returned;
  const customer=invoice.customer; // Exact labels only; no customer-master IDs exist yet.
  if(!customers.has(customer))customers.set(customer,{customer,invoiceCount:0,total:0n,credits:0n,net:0n});
  const row=customers.get(customer);row.invoiceCount++;row.total+=original;row.credits+=returned;row.net+=remaining;
  total+=original;credits+=returned;net+=remaining;
  return {id:invoice.id,orderId:invoice.orderId,date:invoice.date,customer,total:original,credits:returned,net:remaining};
 });
 return {total,credits,net,customers:[...customers.values()],invoices};
}
