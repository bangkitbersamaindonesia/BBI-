export const SALES_PAGES=['Sales','Sales Tools','Sales Report'];
export const ADMIN_RESTRICTED_PAGES=['Dashboard','Accounting','Users','Reports','Sales Report'];
export function canAccessPage(user,page){
 if(!user?.active)return false;
 if(user.role==='sales')return page==='Workflow BBI'||SALES_PAGES.includes(page);
 if(['admin1','admin2','admin3'].includes(user.role))return !ADMIN_RESTRICTED_PAGES.includes(page);
 return user.role==='superadmin';
}
export function defaultWorkspacePage(user){return user?.role==='sales'?'Sales Tools':canAccessPage(user,'Dashboard')?'Dashboard':'Sales';}
export function salesCatalog(products,query=''){const text=query.trim().toLocaleLowerCase('id-ID');return products.filter(p=>[p.sku,p.name,p.size,p.color].some(v=>String(v).toLocaleLowerCase('id-ID').includes(text))).map(p=>({sku:p.sku,name:p.name,size:p.size,color:p.color,sellingPrice:p.sellingPrice,photos:(p.photos??[]).map(photo=>({...photo}))}));}
