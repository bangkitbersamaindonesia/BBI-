import {mountWorkflowHome} from './workflow-home.js';
import { mountSalesReport } from './sales-report.js';
import { mountReports } from './reports.js';
import { mountVendorCenter } from './vendor-center.js';
import { mountCustomerCenter } from './customer-center.js';
import { demoStore as workspaceStore, clearDemoSubscriptions } from './demo-store.js';
import { canAccessPage, defaultWorkspacePage } from './workspace-access.js';
import { mountSalesTools } from './sales-tools.js';
import { mountChecks } from './checks.js';
import { mountUsers } from './users.js';
import { mountPayments } from './payments.js';
import { mountInvoicePreview } from './invoice-preview.js';
import { mountAccounts } from "./accounts.js";
import "./style.css";
import { mountSales } from "./sales.js";
import { mountSku } from "./sku.js";
import { mountDashboardAnalytics } from "./dashboard-analytics.js";

function renderWorkspace(){
clearDemoSubscriptions();
const selectedUser=workspaceStore.users.find(u=>u.id===sessionStorage.getItem('bbi-demo-user')&&u.active);
const nav = [
  { icon:"▦", label:"Dashboard" },
  { icon:"⇢", label:"Workflow BBI" },
  { icon:"◫", label:"Inventory" },
  { icon:"◈", label:"Purchasing" },
  { icon:"◉", label:"Sales" },
  { icon:"♧", label:"Customer Center" },
  { icon:"◇", label:"Vendor Center" },
  { icon:"▦", label:"Sales Tools" },
  { icon:"↔", label:"Payments" },
  { icon:"▤", label:"Accounting" },
  { icon:"▥", label:"Reports" },
  { icon:"▥", label:"Sales Report" },
  { icon:"♙", label:"Users" },
];
const format = new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Jakarta"});
const app = document.querySelector("#app");document.querySelector("#invoice-preview")?.remove();document.body.classList.remove("invoice-preview-open");
function icon(name){return '<span class="icon" aria-hidden="true">'+name+'</span>';}
function menuItem(item,index){return '<button class="nav-item '+(index===0?'active':'')+'" type="button" data-page="'+item.label+'">'+icon(item.icon)+'<span>'+(item.label==='Sales'?'Sales Order':item.label)+'</span>'+'</button>';}
app.innerHTML = `
<div class="shell">
  <aside class="sidebar" id="sidebar">
    <a href="#" class="logo" aria-label="BBI ERP beranda"><span class="logo-mark">B</span><span><strong>BBI ERP</strong><small>Business management</small></span></a>
    <p class="sidebar-label">WORKSPACE</p>
    <nav aria-label="Navigasi utama">${nav.filter(item=>selectedUser&&canAccessPage(selectedUser,item.label)).map(menuItem).join("")}</nav>
    <div class="sidebar-bottom"><div class="help-symbol">?</div><div><strong>Butuh bantuan?</strong><small>Sistem dalam pengembangan</small></div></div>
    <div class="profile"><span class="avatar">AD</span><div><strong>${selectedUser?.name??'Pilih user'}</strong><small>${selectedUser?.role??'Demo akses workspace'}</small></div><button type="button" class="secondary-button" id="workspace-signout">Keluar</button></div>
  </aside>
  <div class="main-area">
    <header class="topbar">
      <div class="top-left"><button type="button" class="menu-toggle" id="menu-toggle" aria-label="Buka atau tutup menu" aria-expanded="false">☰</button><span class="breadcrumb">Workspace <span>/</span> <strong id="breadcrumb-active">Dashboard</strong></span></div>
      <div class="top-actions"><span class="demo-indicator">● Demo data</span><button type="button" class="icon-button" title="Notifikasi" aria-label="Notifikasi">♧</button><span class="avatar top-avatar">AD</span></div>
    </header>
    <main class="content">
      <div class="heading"><div><span class="eyebrow">OVERVIEW</span><h1 id="page-title">Dashboard</h1><p id="page-subtitle">Selamat datang di BBI ERP. Berikut ringkasan operasional bisnis Anda.</p></div><div class="heading-actions"><span class="date-chip">▦ ${format.format(new Date())}</span><button class="primary-button" id="report-button" type="button">↗ <span>Lihat Laporan</span></button></div></div>
      <div id="dashboard-content"></div>
      <section id="sku-content" hidden></section>
      <section id="sales-content" hidden></section>
      <section id="purchasing-content" hidden></section>
      <section id="reports-content" hidden></section><section id="sales-report-content" hidden></section>
      <section id="accounting-content" hidden></section><section id="payments-content" hidden></section><section id="users-content" hidden></section><section id="sales-tools-content" hidden></section><section id="customer-center-content" hidden></section><section id="vendor-center-content" hidden></section>
      <section id="workflow-home" hidden></section>
      <section id="placeholder" hidden class="panel placeholder"><div class="placeholder-icon">◈</div><h2 id="placeholder-title"></h2><p>Modul ini akan dikembangkan pada tahap berikutnya. Dashboard saat ini hanya menampilkan data contoh.</p><button class="secondary-button" id="back-dashboard" type="button">Kembali ke Dashboard</button></section>
      <footer class="footer"><span>© 2026 BBI ERP · Garment Trading Management</span><span>Prototype v0.1 · Tanpa database</span></footer>
    </main>
  </div>
</div>`;
const buttons = [...document.querySelectorAll("[data-page]")];
const dashboard = document.querySelector("#dashboard-content");
const placeholder = document.querySelector("#placeholder");
const pageTitle = document.querySelector("#page-title");
const pageSubtitle = document.querySelector("#page-subtitle");
const mobileToggle = document.querySelector("#menu-toggle");
const sidebar = document.querySelector("#sidebar");
function setPage(page){
  if(!canAccessPage(selectedUser,page))page=defaultWorkspacePage(selectedUser);
  const isWorkflow=page==='Workflow BBI';
  document.querySelector('#workflow-home').hidden=!isWorkflow;
  const isSalesReport=page==='Sales Report';document.querySelector('#sales-report-content').hidden=!isSalesReport;
  const isVendorCenter=page==='Vendor Center';document.querySelector('#vendor-center-content').hidden=!isVendorCenter;
  const isCustomerCenter=page==='Customer Center';document.querySelector('#customer-center-content').hidden=!isCustomerCenter;
  const isSalesTools=page==='Sales Tools';document.querySelector("#sales-tools-content").hidden=!isSalesTools;
  const isDashboard=page==="Dashboard";
  const isUsers=page==="Users";
  document.querySelector("#users-content").hidden=!isUsers;
  const isPayments=page==="Payments";
  document.querySelector("#payments-content").hidden=!isPayments;
  const isAccounting=page==="Accounting";
  document.querySelector("#accounting-content").hidden=!isAccounting;
  const isSku=page==="Inventory";
  const isSales=page==="Sales", isPurchasing=page==="Purchasing", isReports=page==="Reports";
  document.querySelector("#reports-content").hidden=!isReports;
  document.querySelector("#sales-content").hidden=!isSales;
  document.querySelector("#purchasing-content").hidden=!isPurchasing;
  document.querySelector("#sku-content").hidden=!isSku;
  buttons.forEach(button=>{button.classList.toggle("active",button.dataset.page===page);button.setAttribute("aria-current",button.dataset.page===page?"page":"false");});
  pageTitle.textContent=isSku?"Master SKU":page==='Sales'?'Sales Order':page;
  document.querySelector("#breadcrumb-active").textContent=page;
  pageSubtitle.textContent=isWorkflow?"Peta proses dan pintasan kerja BBI.":isSalesReport?"Grafik penjualan bulanan sesuai akses sales.":isVendorCenter?"Informasi vendor / supplier, saldo hutang dan riwayat transaksi.":isCustomerCenter?"Informasi customer, saldo piutang dan riwayat transaksi.":isSalesTools?"Katalog produk dan harga jual untuk sales.":isDashboard?"Selamat datang di BBI ERP. Berikut ringkasan operasional bisnis Anda.":isSku?"Kelola varian garment dan stok awal per gudang.":isSales?"Sales Order, draft PO otomatis, dan penerbitan invoice customer oleh Admin 2.":isPurchasing?"PO, respons supplier, dan tagihan barang yang dipenuhi.":isReports?"Balance Sheet, Profit & Loss, margin dan loss sales.":isUsers?"Daftar sales dan admin BBI.":isPayments?"Pembayaran customer/supplier oleh Admin 2 dan check pengeluaran oleh Admin 3.":isAccounting?"Master akun kas/bank, piutang, utang supplier, aset, HPP, pendapatan, biaya, kewajiban, dan ekuitas.":"Halaman "+page+" sedang disiapkan.";
  dashboard.hidden=!isDashboard;
  placeholder.hidden=isWorkflow || isDashboard || isSku || isSales || isPurchasing || isReports || isAccounting || isPayments || isUsers || isSalesTools || isCustomerCenter || isVendorCenter || isSalesReport;
  if(!isDashboard) document.querySelector("#placeholder-title").textContent=page;
  sidebar.classList.remove("open");mobileToggle.setAttribute("aria-expanded","false");
}
buttons.forEach(button=>button.addEventListener("click",()=>setPage(button.dataset.page)));
mobileToggle.addEventListener("click",()=>{const open=sidebar.classList.toggle("open");mobileToggle.setAttribute("aria-expanded",String(open));});
document.querySelector("#back-dashboard").addEventListener("click",()=>setPage("Dashboard"));
document.querySelector("#report-button").addEventListener("click",()=>setPage("Reports"));

if(selectedUser){
 mountWorkflowHome(document.querySelector('#workflow-home'),selectedUser,(page,target)=>{
  setPage(page);
  if(target)document.querySelector(target)?.scrollIntoView({block:'start'});
 });
 if(canAccessPage(selectedUser,'Sales Report'))mountSalesReport(document.querySelector('#sales-report-content'),selectedUser);
 if(selectedUser.role!=='sales'){
if(canAccessPage(selectedUser,'Vendor Center'))mountVendorCenter(document.querySelector('#vendor-center-content'));
if(canAccessPage(selectedUser,'Customer Center'))mountCustomerCenter(document.querySelector('#customer-center-content'));
if(canAccessPage(selectedUser,'Dashboard'))mountDashboardAnalytics(dashboard);
else dashboard.replaceChildren();


mountSku(document.querySelector("#sku-content"));

mountSales(document.querySelector("#sales-content"), document.querySelector("#purchasing-content"));

if(canAccessPage(selectedUser,'Reports'))mountReports(document.querySelector('#reports-content'),selectedUser);

if(canAccessPage(selectedUser,'Accounting'))mountAccounts(document.querySelector("#accounting-content"));

mountInvoicePreview();

const settlementsRoot=document.createElement("div");document.querySelector("#payments-content").append(settlementsRoot);mountPayments(settlementsRoot);

if(canAccessPage(selectedUser,'Users'))mountUsers(document.querySelector("#users-content"));

const checksRoot=document.createElement("div");document.querySelector("#payments-content").append(checksRoot);mountChecks(checksRoot);

 }
 if(selectedUser.role==='sales')mountSales(document.querySelector('#sales-content'),document.querySelector('#purchasing-content'),selectedUser);
 mountSalesTools(document.querySelector('#sales-tools-content'));
 document.querySelector('#report-button').hidden=!canAccessPage(selectedUser,'Reports');
 document.querySelector('#workspace-signout').onclick=()=>{sessionStorage.removeItem('bbi-demo-user');renderWorkspace();};
 setPage(defaultWorkspacePage(selectedUser));
}else{
 document.querySelector('.shell').hidden=true;
 const chooser=document.createElement('section');chooser.className='panel workspace-user-chooser';chooser.innerHTML='<h1>BBI Workspace</h1><p>Pilih user untuk simulasi akses. Ini belum merupakan login terautentikasi.</p><label>User demo<select id="workspace-user">'+workspaceStore.users.map(u=>'<option value="'+u.id+'">'+u.name+' · '+u.role+'</option>').join('')+'</select></label><button type="button" class="primary-button">Buka workspace demo</button>';app.append(chooser);chooser.querySelector('button').onclick=()=>{sessionStorage.setItem('bbi-demo-user',chooser.querySelector('select').value);renderWorkspace();};
}

}
renderWorkspace();
