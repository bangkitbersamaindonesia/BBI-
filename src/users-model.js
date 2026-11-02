export function createInitialUsers(){
 return [
  {id:'USER-SALES-DONI',name:'Doni',role:'sales'},
  {id:'USER-SALES-LUTFI',name:'Lutfi',role:'sales'},
  {id:'USER-SALES-DIPA',name:'Dipa',role:'sales'},
  {id:'USER-ADMIN-1',name:'admin 1',role:'admin1'},
  {id:'USER-ADMIN-2',name:'admin 2',role:'admin2'},
  {id:'USER-ADMIN-3',name:'admin 3',role:'admin3'},
  {id:'USER-ADMIN-SUPER',name:'admin super',role:'superadmin'},
 ].map(user=>({...user,active:true}));
}
export const userRoleLabel={sales:'Sales',admin1:'Admin 1',admin2:'Admin 2',admin3:'Admin 3',superadmin:'Admin super'};
