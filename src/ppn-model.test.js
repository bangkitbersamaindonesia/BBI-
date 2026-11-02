import test from 'node:test';
import assert from 'node:assert/strict';
import { ppnSummary } from './ppn-model.js';
import { createInitialAccounts } from './accounts-model.js';
import { createCheck,bankMovement } from './checks-model.js';
import { documentBalance } from './payments-model.js';
const fresh=()=>({accounts:createInitialAccounts(),bills:[{id:'B1',date:'2026-11-02',total:1000,ppnAmount:'110'}],invoices:[{id:'I1',date:'2026-11-02',total:600,letterhead:'A'},{id:'I2',total:1000,letterhead:'B'}],credits:[],checks:[],payments:[]});
test('PPN asset increases from bills and decreases from A invoice and PPN checks only',()=>{const s=fresh();const a=s.accounts.find(a=>a.id==='ASSET-PPN');assert.equal(a.accountType,'other_current_asset');assert.equal(ppnSummary(s).net,44n);createCheck(s,{date:'2026-11-02',reference:'C1',bankAccountId:'CASH-009',expenseAccountId:'ASSET-PPN',amount:20,payee:'Setoran PPN'},'admin3');assert.equal(ppnSummary(s).net,24n);assert.equal(bankMovement(s,'CASH-009'),-20n);createCheck(s,{date:'2026-11-02',reference:'C2',bankAccountId:'CASH-009',expenseAccountId:'EXP-001',amount:10,payee:'R&D'},'admin3');assert.equal(ppnSummary(s).net,24n);assert.equal(documentBalance(s,'supplier','B1').remaining,1110n);});
test('approved returns reverse associated PPN without duplicate postings or rounding drift',()=>{const s=fresh();s.credits.push({id:'CR1',type:'supplier',sourceId:'B1',total:500},{id:'CR2',type:'customer',sourceId:'I1',total:300});assert.equal(ppnSummary(s).net,22n);s.credits.push({id:'CR3',type:'supplier',sourceId:'B1',total:500},{id:'CR4',type:'customer',sourceId:'I1',total:300});assert.equal(ppnSummary(s).net,0n);assert.equal(ppnSummary(s).net,0n);});
