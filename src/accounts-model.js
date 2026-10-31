const CASH_ACCOUNTS=[
 {id:'CASH-009',name:'PT 3636',kind:'bank'},
 {id:'CASH-010',name:'NP 222999',kind:'bank'},
 {id:'CASH-004',name:'PC Dan',kind:'petty_cash'},
 {id:'CASH-005',name:'PC Her',kind:'petty_cash'},
 {id:'CASH-006',name:'PC don',kind:'petty_cash'},
 {id:'CASH-008',name:'PC Dip',kind:'petty_cash'},
 {id:'CASH-007',name:'PC Lut',kind:'petty_cash'},
 {id:'CASH-003',name:'PC Mer',kind:'petty_cash'},
 {id:'CASH-001',name:'PC BN PAN',kind:'petty_cash'},
 {id:'CASH-011',name:'PC Bazar',kind:'petty_cash'},
];
const COGS_NAMES=['Dress Fashion','Bawahan','Blouse / Atasan','APD','Gamis Anak','Gamis Dewasa','Underwear','misc'];
const EXPENSE_NAMES=['R&D','Barang cacat/hilang','Komisi sales','Label Plastik Karung','Advertising & Promotion','Auto and Truck Expenses','Bank service charges','Business Licenses & Permits','Depreciation expenses','Insurance Expenses','Interest Expense','Meal Entertainment & Meetings','Office & Warehouse Supplies','Payroll expenses','misc expenses'];
const EXPENSE_CHILDREN={
 'Auto and Truck Expenses':['Bensin','Cicilan Mobil','Perbaikan/Asuransi','Service Rutin','Toll & Parkir'],
 'Insurance Expenses':['General Liability Insurance','Health Insurance/BPJS'],
};
function initialExpenses(){return EXPENSE_NAMES.flatMap((name,index)=>{const id=`EXP-${String(index+1).padStart(3,'0')}`;const account={id,name,kind:'expense',group:'expense',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]};return [account,...(EXPENSE_CHILDREN[name]??[]).map((child,childIndex)=>({...account,id:`${id}-${childIndex+1}`,name:child,parentId:id,history:[]}))];});}
function initialLiabilities(){
 const base={kind:'other_liability',group:'other_liability',accountType:'other_current_liability',currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true};
 const root={...base,id:'LIAB-001',name:'Loan Pinjaman',parentId:null,history:[]};
 const children=[['LIAB-001-1','FEMA rak Minus'],['LIAB-KKB-2','KKB N 1369 IC'],['LIAB-KKB-1','KKB L 1809 VZ'],['LIAB-001-3','Loan BN PAN'],['LIAB-001-4','Loan Dan'],['LIAB-001-5','Loan Her'],['LIAB-001-6','Lon Dav'],['LIAB-STAFF','Sundry Loan Staf Minus']].map(([id,name])=>({...base,id,name,parentId:root.id,history:[]}));
 const staff=['Don','Lut','Dip','Agu','Dwi','Her','Dan'].map((name,index)=>({...base,id:`LIAB-STAFF-${index+1}`,name,parentId:'LIAB-STAFF',history:[]}));
 return [root,...children,...staff];
}
function initialInventoryAssets(){
 const base={kind:'inventory_asset',group:'inventory_asset',accountType:'other_current_asset',currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true};
 const root={...base,id:'INV-ASSET-ROOT',name:'Inventory Assets',parentId:null,history:[]};
 const children=[['INV-ASSET-001','Dress Fashion'],['INV-ASSET-002','Bawahan'],['INV-ASSET-003','Blouse / Atasan'],['INV-ASSET-005','Gamis Anak'],['INV-ASSET-006','Gamis Dewasa'],['INV-ASSET-004','APD'],['INV-ASSET-007','Underwear'],['INV-ASSET-008','Misc']].map(([id,name])=>({...base,id,name,parentId:root.id,history:[]}));
 return [root,...children];
}
function initialIncome(){
 const base={kind:'income',group:'income',accountType:'income',currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true};
 const root={...base,id:'INCOME-ROOT',name:'Sales',parentId:null,history:[]};
 const children=['Dress Fashion','Bawahan','Blouse / Atasan','Gamis Anak','Gamis Dewasa','APD','Underwear','Misc'].map((name,index)=>({...base,id:`INCOME-${String(index+1).padStart(3,'0')}`,name,parentId:root.id,history:[]}));
 return [root,...children];
}
export function accountDepth(accounts,account){let depth=0;const seen=new Set([account.id]);let parentId=account.parentId;while(parentId){if(seen.has(parentId))throw Error('Hierarki akun tidak boleh melingkar.');seen.add(parentId);const parent=accounts.find(a=>a.id===parentId);if(!parent)throw Error('Akun induk tidak ditemukan.');depth++;parentId=parent.parentId;}return depth;}
function subtreeHeight(accounts,id,seen=new Set()){if(seen.has(id))throw Error('Hierarki akun tidak boleh melingkar.');const next=new Set(seen).add(id);const children=accounts.filter(a=>a.parentId===id);return children.length?1+Math.max(...children.map(a=>subtreeHeight(accounts,a.id,next))):0;}
function validateParent(store,group,parentId,id,active){
 const maxDepth=['expense','inventory_asset','income'].includes(group)?1:group==='other_liability'?2:0;
 if(!parentId)return;
 if(!maxDepth)throw Error('Kelompok akun ini tidak mendukung subakun.');
 const parent=store.accounts.find(a=>a.id===parentId);if(!parent||parent.group!==group)throw Error('Akun induk harus dari kelompok yang sama.');
 const visited=new Set(id?[id]:[]);let current=parent;
 while(current){if(visited.has(current.id))throw Error('Akun tidak boleh menjadi induk dirinya sendiri atau keturunannya.');visited.add(current.id);if(current.group!==group)throw Error('Kelompok akun induk tidak sesuai.');if(active&&!current.active)throw Error('Subakun aktif harus memiliki seluruh akun induk aktif.');current=current.parentId?store.accounts.find(a=>a.id===current.parentId):null;}
 const depth=accountDepth(store.accounts,parent)+1;const height=id?subtreeHeight(store.accounts,id):0;
 if(depth+height>maxDepth)throw Error(group==='other_liability'?'Other Current Liabilities mendukung dua tingkat subakun di bawah akun utama.':`${group==='income'?'Income':group==='inventory_asset'?'Inventory Assets':'Expenses'} mendukung satu tingkat subakun.`);
}
export function accountParentOptions(store,group,id=null,active=true){return store.accounts.filter(a=>{if(a.group!==group)return false;try{validateParent(store,group,a.id,id,active);return true;}catch{return false;}});}
export function createInitialAccounts(){
 return [...['Penyesuaian Stok Opname','Opening Balance Equity','Retained Earnings'].map((name,index)=>({id:`EQUITY-${String(index+1).padStart(3,'0')}`,name,kind:'equity',group:'equity',accountType:'equity',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]})),{id:'AP-001',name:'Accounts Payable',kind:'accounts_payable',group:'accounts_payable',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'Utang vendor / supplier',active:true,history:[]},{id:'AR-001',name:'Accounts Receiveable',kind:'accounts_receivable',group:'accounts_receivable',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'Piutang toko / client',active:true,history:[]},...CASH_ACCOUNTS.map(account=>({...account,group:'cash_bank',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]})),...initialInventoryAssets(),...initialIncome(),...['Mobil','Furniture dan perlengkapan','Laptop'].map((name,index)=>({id:`FIXED-ASSET-${String(index+1).padStart(3,'0')}`,name,kind:'fixed_asset',group:'fixed_asset',accountType:'fixed_asset',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]})),...initialExpenses(),...initialLiabilities(),...COGS_NAMES.map((name,index)=>({id:`COGS-${String(index+1).padStart(3,'0')}`,name,kind:'cogs',group:'cogs',parentId:null,currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]}))];
}
const clean=v=>String(v??'').trim();
const normalized=v=>clean(v).replace(/\s+/g,' ').toLocaleLowerCase('id-ID');
export function saveAccount(store,input,role,id=null){
 if(role!=='admin1')throw Error('Pengelolaan akun hanya untuk Admin 1 dalam demo.');
 const existing=id?store.accounts.find(a=>a.id===id):null;if(id&&!existing)throw Error('Akun tidak ditemukan.');
 const name=clean(input.name);const kind=input.kind;
 if(!name||name.length>120)throw Error('Nama akun wajib diisi, maksimal 120 karakter.');
 if(!['petty_cash','bank','inventory_asset','expense','other_liability','cogs','accounts_receivable','fixed_asset','accounts_payable','equity','income'].includes(kind))throw Error('Jenis akun tidak valid.');
 const group=kind==='income'?'income':kind==='equity'?'equity':kind==='accounts_payable'?'accounts_payable':kind==='fixed_asset'?'fixed_asset':kind==='accounts_receivable'?'accounts_receivable':kind==='cogs'?'cogs':kind==='other_liability'?'other_liability':kind==='expense'?'expense':kind==='inventory_asset'?'inventory_asset':'cash_bank';
 if(store.accounts.some(a=>a.id!==id&&a.group===group&&normalized(a.name)===normalized(name)))throw Error('Nama akun sudah digunakan dalam kelompok ini.');
 if(group==='accounts_payable'&&!existing&&store.accounts.some(a=>a.group===group))throw Error('Akun utang sudah tersedia; gunakan Ubah untuk memperbaruinya.');
 if(group==='accounts_receivable'&&!existing&&store.accounts.some(a=>a.group===group))throw Error('Akun piutang sudah tersedia; gunakan Ubah untuk memperbaruinya.');
 if(existing&&existing.group!==group)throw Error('Kelompok akun asal tidak dapat diubah.');
 const parentId=clean(input.parentId)||null;
 validateParent(store,group,parentId,id,input.active===true);
 if(id&&input.active!==true&&store.accounts.some(a=>a.parentId===id&&a.active))throw Error('Nonaktifkan subakun terlebih dahulu sebelum menonaktifkan akun induk.');
 const bankName=kind==='bank'?clean(input.bankName):'';const accountNumber=kind==='bank'?clean(input.accountNumber):'';const notes=clean(input.notes);
 if(bankName.length>120||accountNumber.length>64||notes.length>500)throw Error('Nama bank maksimal 120, nomor rekening 64, dan keterangan 500 karakter.');
 if(existing?.kind==='bank'&&kind!=='bank'&&(existing.bankName||existing.accountNumber))throw Error('Kosongkan data bank terlebih dahulu sebelum mengubah jenis akun.');
 const value={name,kind,group,accountType:group==='income'?'income':group==='equity'?'equity':group==='other_liability'?'other_current_liability':group==='fixed_asset'?'fixed_asset':group==='inventory_asset'?'other_current_asset':existing?.accountType??null,parentId,currency:'IDR',bankName,accountNumber,notes,active:input.active===true};
 const at=new Date().toISOString();
 if(existing){const before={name:existing.name,kind:existing.kind,accountType:existing.accountType??null,parentId:existing.parentId??null,bankName:existing.bankName,accountNumber:existing.accountNumber,notes:existing.notes,active:existing.active};Object.assign(existing,value);existing.history.push({action:'Akun diperbarui',before,after:{...value},at});return existing;}
 const account={id:`ACCOUNT-DEMO-${String(store.accounts.length+1).padStart(3,'0')}`,...value,history:[{action:'Akun ditambahkan',after:{...value},at}]};store.accounts.push(account);return account;
}
