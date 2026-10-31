// Session bill/return projection only; PO commitments are not a payable posting.
export function payableSummary(store){
 const suppliers=new Map();let total=0n,credits=0n,net=0n;
 const bills=store.bills.map(bill=>{
  const returned=store.credits.filter(c=>c.type==='supplier'&&c.sourceId===bill.id).reduce((sum,c)=>sum+BigInt(c.total),0n);
  const original=BigInt(bill.total);if(returned>original)throw Error('Retur supplier melebihi tagihan asal.');
  const remaining=original-returned;const supplier=bill.supplier;
  if(!suppliers.has(supplier))suppliers.set(supplier,{supplier,billCount:0,total:0n,credits:0n,net:0n});
  const row=suppliers.get(supplier);row.billCount++;row.total+=original;row.credits+=returned;row.net+=remaining;
  total+=original;credits+=returned;net+=remaining;
  return {id:bill.id,reference:bill.reference,poId:bill.poId,date:bill.date,supplier,total:original,credits:returned,net:remaining};
 });return {total,credits,net,suppliers:[...suppliers.values()],bills};
}
