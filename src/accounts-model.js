const CASH_NAMES=['petty cash BN PAN','petty cash DP','PC Merry','PC DAN','PC Herry','PC Doni','PC Lutfi','PC Dipa','PT 3636','NP 222999'];
const INVENTORY_NAMES=['Dress Fashion','Bawahan','Blouse / Atasan','APD','Gamis Anak','Gamis Dewasa','Underwear','misc'];
export function createInitialAccounts(){
 return [...CASH_NAMES.map((name,index)=>({id:`CASH-${String(index+1).padStart(3,'0')}`,name,kind:index<8?'petty_cash':'bank',group:'cash_bank',currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]})),...INVENTORY_NAMES.map((name,index)=>({id:`INV-ASSET-${String(index+1).padStart(3,'0')}`,name,kind:'inventory_asset',group:'inventory_asset',currency:'IDR',bankName:'',accountNumber:'',notes:'',active:true,history:[]}))];
}
const clean=v=>String(v??'').trim();
const normalized=v=>clean(v).replace(/\s+/g,' ').toLocaleLowerCase('id-ID');
export function saveAccount(store,input,role,id=null){
 if(role!=='admin1')throw Error('Pengelolaan akun hanya untuk Admin 1 dalam demo.');
 const existing=id?store.accounts.find(a=>a.id===id):null;if(id&&!existing)throw Error('Akun tidak ditemukan.');
 const name=clean(input.name);const kind=input.kind;
 if(!name||name.length>120)throw Error('Nama akun wajib diisi, maksimal 120 karakter.');
 if(store.accounts.some(a=>a.id!==id&&normalized(a.name)===normalized(name)))throw Error('Nama akun sudah digunakan.');
 if(!['petty_cash','bank','inventory_asset'].includes(kind))throw Error('Jenis akun tidak valid.');
 const group=kind==='inventory_asset'?'inventory_asset':'cash_bank';
 if(existing&&existing.group!==group)throw Error('Kelompok akun asal tidak dapat diubah.');
 const bankName=kind==='bank'?clean(input.bankName):'';const accountNumber=kind==='bank'?clean(input.accountNumber):'';const notes=clean(input.notes);
 if(bankName.length>120||accountNumber.length>64||notes.length>500)throw Error('Nama bank maksimal 120, nomor rekening 64, dan keterangan 500 karakter.');
 if(existing?.kind==='bank'&&kind!=='bank'&&(existing.bankName||existing.accountNumber))throw Error('Kosongkan data bank terlebih dahulu sebelum mengubah jenis akun.');
 const value={name,kind,group,currency:'IDR',bankName,accountNumber,notes,active:input.active===true};
 const at=new Date().toISOString();
 if(existing){const before={name:existing.name,kind:existing.kind,bankName:existing.bankName,accountNumber:existing.accountNumber,notes:existing.notes,active:existing.active};Object.assign(existing,value);existing.history.push({action:'Akun diperbarui',before,after:{...value},at});return existing;}
 const account={id:`ACCOUNT-DEMO-${String(store.accounts.length+1).padStart(3,'0')}`,...value,history:[{action:'Akun ditambahkan',after:{...value},at}]};store.accounts.push(account);return account;
}
