import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialAccounts } from './accounts-model.js';
import { createCheck,bankMovement } from './checks-model.js';
const fresh=()=>({accounts:createInitialAccounts(),checks:[],payments:[{type:'customer',accountId:'CASH-009',amount:'1000000'},{type:'supplier',accountId:'CASH-009',amount:'200000'}]});
const input={reference:'CHK-001',date:'2026-11-02',bankAccountId:'CASH-009',expenseAccountId:'EXP-006-1',amount:'150000',payee:'SPBU',notes:'Bensin pengiriman'};
test('Admin 3 check reduces bank movement and records selected expense subaccount once',()=>{const s=fresh();const c=createCheck(s,input,'admin3');assert.equal(c.expenseAccountId,'EXP-006-1');assert.equal(c.bankAccountId,'CASH-009');assert.equal(c.amount,'150000');assert.equal(bankMovement(s,'CASH-009'),650000n);assert.equal(bankMovement(s,'CASH-010'),0n);assert.throws(()=>createCheck(s,input,'admin3'));assert.equal(s.checks.length,1);});
test('role, account, expense parent, date and amount validation are atomic',()=>{const s=fresh();const before=structuredClone(s);for(const role of ['admin1','admin2','sales'])assert.throws(()=>createCheck(s,input,role));for(const i of [{...input,amount:0},{...input,amount:'1.5'},{...input,expenseAccountId:'EXP-006'},{...input,expenseAccountId:'CASH-009'},{...input,bankAccountId:'missing'},{...input,date:'2026-02-30'},{...input,payee:''}])assert.throws(()=>createCheck(s,i,'admin3'));assert.deepEqual(s,before);});
test('large check amounts are exact and no opening balance is invented',()=>{const s=fresh();createCheck(s,{...input,bankAccountId:'CASH-010',amount:'900719925474099301'},'admin3');assert.equal(bankMovement(s,'CASH-010'),-900719925474099301n);});
