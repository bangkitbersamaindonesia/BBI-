export const SALES_PAGES=['Sales','Sales Tools'];
export function canAccessPage(user,page){return Boolean(user?.active)&&(user.role!=='sales'||SALES_PAGES.includes(page));}
export function salesCatalog(products,query=''){const text=query.trim().toLocaleLowerCase('id-ID');return products.filter(p=>[p.sku,p.name,p.size,p.color].some(v=>String(v).toLocaleLowerCase('id-ID').includes(text))).map(p=>({sku:p.sku,name:p.name,size:p.size,color:p.color,sellingPrice:p.sellingPrice,photos:(p.photos??[]).map(photo=>({...photo}))}));}
