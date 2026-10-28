// Inventory values use integer millionths of IDR; serialize as strings for demo state.
export const COST_SCALE=1000000n;
export function roundRatio(value,divisor){if(divisor<=0n)throw Error('Pembagi biaya tidak valid.');return value>=0n?(value+divisor/2n)/divisor:-((-value+divisor/2n)/divisor);}
function safeNumber(value){const n=Number(value);if(!Number.isSafeInteger(n))throw Error('Nilai HPP melebihi batas aman.');return n;}
export function costPool(store,sku){
 const quantityPcs=store.balances.filter(b=>b.sku===sku).reduce((sum,b)=>sum+b.quantityPcs,0);if(!Number.isSafeInteger(quantityPcs))throw Error('Qty gabungan SKU melebihi batas aman.');
 const saved=store.costPools?.[sku];if(saved){if(saved.quantityPcs!==quantityPcs)throw Error('Qty valuasi SKU tidak cocok dengan stok fisik.');return {...saved};}
 const price=store.products.find(p=>p.sku===sku)?.purchasePrice;
 if(!Number.isSafeInteger(price)||price<0)throw Error('Harga dasar stok awal SKU belum tersedia.');
 return {quantityPcs,valueMicros:(BigInt(quantityPcs)*BigInt(price)*COST_SCALE).toString()};
}
export function planReceiptCosts(store,lines){
 const pools={};for(const line of lines){const pool=pools[line.sku]??costPool(store,line.sku);const qty=pool.quantityPcs+line.quantityPcs;if(!Number.isSafeInteger(qty))throw Error('Qty valuasi melebihi batas aman.');pools[line.sku]={quantityPcs:qty,valueMicros:(BigInt(pool.valueMicros)+BigInt(line.quantityPcs)*BigInt(line.price)*COST_SCALE).toString()};}return pools;
}
export function planInvoiceCosts(store,lines){
 const pools={};let costTotal=0;
 const snapshots=lines.map(line=>{const pool=pools[line.sku]??costPool(store,line.sku);if(pool.quantityPcs<line.quantityPcs||pool.quantityPcs<=0)throw Error('Qty stok valuasi tidak cukup.');const value=BigInt(pool.valueMicros);const costMicros=roundRatio(value*BigInt(line.quantityPcs),BigInt(pool.quantityPcs));const averageCostMicros=roundRatio(value,BigInt(pool.quantityPcs));const cost=safeNumber(roundRatio(costMicros,COST_SCALE));costTotal+=cost;if(!Number.isSafeInteger(costTotal))throw Error('Total HPP invoice melebihi batas aman.');pools[line.sku]={quantityPcs:pool.quantityPcs-line.quantityPcs,valueMicros:(value-costMicros).toString()};return {...line,averageCostMicros:averageCostMicros.toString(),costMicros:costMicros.toString(),costTotal:cost};});
 return {lines:snapshots,pools,costTotal};
}
export function planReturnCosts(store,record,source){
 const pools={};let costReversal=0;
 const lines=record.lines.map(line=>{
  const pool=pools[line.sku]??costPool(store,line.sku);let micros;let reversal=0;
  if(record.type==='customer'){
   const original=source.lines[line.lineIndex];
   if(original.costMicros===undefined||original.costTotal===undefined)throw Error('Snapshot HPP invoice asal belum tersedia untuk retur.');
   const prior=store.returns.filter(r=>r.id!==record.id&&r.status==='Disetujui'&&r.type==='customer'&&r.sourceId===source.id).flatMap(r=>r.lines).filter(l=>l.lineIndex===line.lineIndex).reduce((sum,l)=>sum+l.quantityPcs,0);
   const denom=BigInt(original.quantityPcs),qty=BigInt(line.quantityPcs),previous=BigInt(prior);
   micros=roundRatio(BigInt(original.costMicros)*(previous+qty),denom)-roundRatio(BigInt(original.costMicros)*previous,denom);
   reversal=safeNumber(roundRatio(BigInt(original.costTotal)*(previous+qty),denom)-roundRatio(BigInt(original.costTotal)*previous,denom));
   pools[line.sku]={quantityPcs:pool.quantityPcs+line.quantityPcs,valueMicros:(BigInt(pool.valueMicros)+micros).toString()};costReversal+=reversal;
  }else{
   if(pool.quantityPcs<line.quantityPcs||pool.quantityPcs===0)throw Error('Qty valuasi tidak cukup untuk retur supplier.');
   micros=roundRatio(BigInt(pool.valueMicros)*BigInt(line.quantityPcs),BigInt(pool.quantityPcs));pools[line.sku]={quantityPcs:pool.quantityPcs-line.quantityPcs,valueMicros:(BigInt(pool.valueMicros)-micros).toString()};
  }
  if(!Number.isSafeInteger(pools[line.sku].quantityPcs)||!Number.isSafeInteger(costReversal))throw Error('Nilai retur HPP melebihi batas aman.');
  return {...line,costMicros:micros.toString(),costReversal:reversal};
 });return {pools,lines,costReversal};
}
export function commitCostPools(store,pools){store.costPools={...(store.costPools??{}),...pools};}
export function marginPercent(revenue,grossProfit){if(revenue===0)return null;return Number(roundRatio(BigInt(grossProfit)*10000n,BigInt(revenue)))/100;}
export function invoiceMargin(store,invoice){
 if(!Number.isSafeInteger(invoice.costTotal))return null;
 const credits=(store.credits??[]).filter(c=>c.type==='customer'&&c.sourceId===invoice.id);const returnValue=credits.reduce((sum,c)=>sum+c.total,0);const costReversal=credits.reduce((sum,c)=>sum+(c.costReversal??0),0);
 const revenue=invoice.total-returnValue;const cost=invoice.costTotal-costReversal;const grossProfit=revenue-cost;
 return {originalRevenue:invoice.total,originalCost:invoice.costTotal,originalGrossProfit:invoice.total-invoice.costTotal,revenue,cost,grossProfit,percent:marginPercent(revenue,grossProfit),returnValue,costReversal};
}
