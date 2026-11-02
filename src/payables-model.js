import { documentBalance } from './payments-model.js';
// Session bill/return projection only; PO commitments are not a payable posting.
export function payableSummary(store){
 const suppliers=new Map();let total=0n,credits=0n,net=0n;
 const bills=store.bills.map(bill=>{
  const balance=documentBalance(store,'supplier',bill.id);const returned=balance.credits;const original=balance.total;const remaining=balance.remaining;const supplier=bill.supplier;
  if(!suppliers.has(supplier))suppliers.set(supplier,{supplier,billCount:0,total:0n,credits:0n,net:0n});
  const row=suppliers.get(supplier);row.billCount++;row.total+=original;row.credits+=returned;row.net+=remaining;
  total+=original;credits+=returned;net+=remaining;
  return {id:bill.id,reference:bill.reference,poId:bill.poId,date:bill.date,supplier,total:original,credits:returned,net:remaining};
 });return {total,credits,net,suppliers:[...suppliers.values()],bills};
}
