import { demoStore as workspaceStore, clearDemoSubscriptions } from './demo-store.js';
import { canAccessPage } from './workspace-access.js';
import { mountSalesTools } from './sales-tools.js';
import { mountFinancialReports } from './financial-reports.js';
import { mountChecks } from './checks.js';
import { mountUsers } from './users.js';
import { mountPayments } from './payments.js';
import { mountInvoicePreview } from './invoice-preview.js';
import { mountAccounts } from "./accounts.js";
import { mountMarginReport } from "./margin.js";
import { mountLossSales } from "./loss-sales.js";
import "./style.css";
import { mountSales } from "./sales.js";
import { mountSku } from "./sku.js";
import { mountDashboardAnalytics } from "./dashboard-analytics.js";

function renderWorkspace(){
clearDemoSubscriptions();
const selectedUser=workspaceStore.users.find(u=>u.id===sessionStorage.getItem('bbi-demo-user')&&u.active);
const nav = [
  { icon:"▦", label:"Dashboard" },
  { icon:"◫", label:"Inventory" },
  { icon:"◈", label:"Purchasing" },
  { icon:"◉", label:"Sales" },
  { icon:"▦", label:"Sales Tools" },
  { icon:"↔", label:"Payments" },
  { icon:"▤", label:"Accounting" },
  { icon:"▥", label:"Reports" },
  { icon:"♙", label:"Users" },
];
const orders = [
  {id:"SO-2026-0048",customer:"PT Nusantara Fashion",category:"Kemeja Oxford · 420 pcs",value:"Rp 52.500.000",status:"Diproses",tone:"blue"},
  {id:"SO-2026-0047",customer:"CV Sinar Garment",category:"Kaos Basic · 650 pcs",value:"Rp 38.750.000",status:"Dikirim",tone:"green"},
  {id:"SO-2026-0046",customer:"PT Mandiri Textile",category:"Jaket Casual · 180 pcs",value:"Rp 45.000.000",status:"Menunggu",tone:"amber"},
  {id:"SO-2026-0045",customer:"UD Cahaya Busana",category:"Celana Chino · 300 pcs",value:"Rp 33.000.000",status:"Selesai",tone:"neutral"},
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
      <div id="dashboard-content">
      <section class="filter-panel" aria-label="Filter tanggal laporan"><div class="filter-main"><label for="date-preset">Periode laporan</label><select id="date-preset"><option value="week">This week</option><option value="month" selected>This month</option><option value="quarter">This quarter</option><option value="semester">This semester</option><option value="fiscal">This fiscal year</option><option value="custom">Custom dates</option></select><div class="custom-dates" id="custom-dates" hidden><label>Dari <input type="date" id="start-date" /></label><label>Sampai <input type="date" id="end-date" /></label></div><label class="compare-checkbox"><input id="compare-previous" type="checkbox" /> Compare dengan tahun lalu</label></div><p id="selected-range" class="selected-range" aria-live="polite"></p></section>
      <div class="demo-banner"><strong>Mode demonstrasi</strong><span>Angka berikut adalah contoh tampilan, bukan transaksi atau laporan keuangan perusahaan.</span></div>
      <section class="stats" aria-label="Ringkasan indikator bisnis">
        <article class="stat"><div class="stat-top"><span>Total Penjualan</span><span class="stat-icon blue">↗</span></div><strong>Rp 284,5 jt</strong><div class="stat-foot"><span class="trend up">↗ 12,8%</span><span>vs. periode lalu</span></div></article>
        <article class="stat"><div class="stat-top"><span>Purchase Order</span><span class="stat-icon purple">▣</span></div><strong>Rp 142,8 jt</strong><div class="stat-foot"><span class="trend up">↗ 6,2%</span><span>vs. periode lalu</span></div></article>
        <article class="stat"><div class="stat-top"><span>Nilai Persediaan</span><span class="stat-icon amber">◫</span></div><strong>Rp 386,2 jt</strong><div class="stat-foot"><span class="muted">3 gudang aktif</span></div></article>
        <article class="stat"><div class="stat-top"><span>Estimasi Laba Kotor</span><span class="stat-icon green">◎</span></div><strong>Rp 96,4 jt</strong><div class="stat-foot"><span class="trend up">↗ 8,4%</span><span>vs. periode lalu</span></div></article>
      </section>
      <section class="panel profit-panel"><div class="panel-head"><div><h2>Grafik Laba Bersih</h2><p>Laba setelah HPP dan seluruh beban · data ilustrasi</p></div><span id="net-profit-total" class="profit-amount">—</span></div><div class="profit-legend"><span><i class="dot blue-dot"></i>Periode dipilih</span><span id="last-year-legend" hidden><i class="dot gray-dot"></i>Tahun lalu</span></div><div id="net-profit-chart" class="profit-chart" role="img" aria-label="Grafik laba bersih ilustratif"></div></section>
      <section class="overview-grid">
        <article class="panel chart-panel"><div class="panel-head"><div><h2>Performa Penjualan</h2><p>Tren nilai penjualan dan pembelian</p></div><span class="period-pill">6 bulan terakhir⌄</span></div><div class="legend"><span><i class="dot blue-dot"></i>Penjualan</span><span><i class="dot gray-dot"></i>Pembelian</span></div>
          <div class="chart-wrap" role="img" aria-label="Grafik ilustrasi penjualan dan pembelian enam bulan"><div class="y-labels"><span>300 jt</span><span>225 jt</span><span>150 jt</span><span>75 jt</span><span>0</span></div><div class="plot"><div class="grid-lines"><span></span><span></span><span></span><span></span><span></span></div><svg viewBox="0 0 720 225" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2f66df" stop-opacity=".16"/><stop offset="1" stop-color="#2f66df" stop-opacity="0"/></linearGradient></defs><path d="M0 170 L144 132 L288 150 L432 75 L576 98 L720 22 L720 225 L0 225 Z" fill="url(#area)"/><polyline points="0,170 144,132 288,150 432,75 576,98 720,22" stroke="#3769de" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><polyline points="0,200 144,185 288,168 432,142 576,155 720,113" stroke="#a8b4c7" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 7" fill="none"/></svg><div class="x-labels"><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span><span>Sep</span><span>Okt</span></div></div></div>
        </article>
        <article class="panel activities"><div class="panel-head"><div><h2>Aktivitas Terbaru</h2><p>Pembaruan transaksi</p></div><span class="linkish">Contoh</span></div><div class="activity-list"><div class="activity"><span class="activity-icon green">✓</span><div><strong>Invoice dibayar</strong><p>INV-2026-0072 · PT Nusantara Fashion</p><small>10 menit lalu</small></div></div><div class="activity"><span class="activity-icon blue">◫</span><div><strong>Barang diterima</strong><p>GR-2026-0031 · Gudang Lebak</p><small>45 menit lalu</small></div></div><div class="activity"><span class="activity-icon purple">▣</span><div><strong>Sales order baru</strong><p>SO-2026-0048 · 420 pcs</p><small>2 jam lalu</small></div></div><div class="activity"><span class="activity-icon amber">!</span><div><strong>Stok hampir habis</strong><p>OXF-BLK-XL · Gudang Kediri</p><small>5 jam lalu</small></div></div></div></article>
      </section>
      <section class="panel table-panel"><div class="panel-head"><div><h2>Sales Order Terbaru</h2><p>Pantau pemesanan grosir pelanggan</p></div><span class="period-pill">4 transaksi contoh</span></div><div class="table-scroll"><table><thead><tr><th>NO. ORDER</th><th>PELANGGAN</th><th>PRODUK</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>${orders.map(order=>'<tr><td class="order-id">'+order.id+'</td><td class="customer-name">'+order.customer+'</td><td>'+order.category+'</td><td class="total">'+order.value+'</td><td><span class="status '+order.tone+'"><i></i>'+order.status+'</span></td></tr>').join("")}</tbody></table></div></section>
      </div>
      <section id="sku-content" hidden></section>
      <section id="sales-content" hidden></section>
      <section id="purchasing-content" hidden></section>
      <section id="reports-content" hidden></section>
      <section id="accounting-content" hidden></section><section id="payments-content" hidden></section><section id="users-content" hidden></section><section id="sales-tools-content" hidden></section>
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
  if(!canAccessPage(selectedUser,page))page=selectedUser?.role==='sales'?'Sales Tools':'Dashboard';
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
  pageSubtitle.textContent=isSalesTools?"Katalog produk dan harga jual untuk sales.":isDashboard?"Selamat datang di BBI ERP. Berikut ringkasan operasional bisnis Anda.":isSku?"Kelola varian garment dan stok awal per gudang.":isSales?"Sales Order, draft PO otomatis, dan penerbitan invoice customer oleh Admin 2.":isPurchasing?"PO, respons supplier, dan tagihan barang yang dipenuhi.":isReports?"Balance Sheet, Profit & Loss, margin dan loss sales.":isUsers?"Daftar sales dan admin BBI.":isPayments?"Pembayaran customer/supplier oleh Admin 2 dan check pengeluaran oleh Admin 3.":isAccounting?"Master akun kas/bank, piutang, utang supplier, aset, HPP, pendapatan, biaya, kewajiban, dan ekuitas.":"Halaman "+page+" sedang disiapkan.";
  dashboard.hidden=!isDashboard;
  placeholder.hidden=isDashboard || isSku || isSales || isPurchasing || isReports || isAccounting || isPayments || isUsers || isSalesTools;
  if(!isDashboard) document.querySelector("#placeholder-title").textContent=page;
  sidebar.classList.remove("open");mobileToggle.setAttribute("aria-expanded","false");
}
buttons.forEach(button=>button.addEventListener("click",()=>setPage(button.dataset.page)));
mobileToggle.addEventListener("click",()=>{const open=sidebar.classList.toggle("open");mobileToggle.setAttribute("aria-expanded",String(open));});
document.querySelector("#back-dashboard").addEventListener("click",()=>setPage("Dashboard"));
document.querySelector("#report-button").addEventListener("click",()=>setPage("Reports"));

if(selectedUser){
 if(selectedUser.role!=='sales'){
mountDashboardAnalytics();


mountSku(document.querySelector("#sku-content"));

mountSales(document.querySelector("#sales-content"), document.querySelector("#purchasing-content"));

mountLossSales(document.querySelector("#reports-content"));

mountMarginReport(document.querySelector("#reports-content"));

mountAccounts(document.querySelector("#accounting-content"));

mountInvoicePreview();

const settlementsRoot=document.createElement("div");document.querySelector("#payments-content").append(settlementsRoot);mountPayments(settlementsRoot);

mountUsers(document.querySelector("#users-content"));

const checksRoot=document.createElement("div");document.querySelector("#payments-content").append(checksRoot);mountChecks(checksRoot);

mountFinancialReports(document.querySelector("#reports-content"));

 }
 if(selectedUser.role==='sales')mountSales(document.querySelector('#sales-content'),document.querySelector('#purchasing-content'),selectedUser);
 mountSalesTools(document.querySelector('#sales-tools-content'));
 document.querySelector('#report-button').hidden=selectedUser.role==='sales';
 document.querySelector('#workspace-signout').onclick=()=>{sessionStorage.removeItem('bbi-demo-user');renderWorkspace();};
 setPage(selectedUser.role==='sales'?'Sales Tools':'Dashboard');
}else{
 document.querySelector('.shell').hidden=true;
 const chooser=document.createElement('section');chooser.className='panel workspace-user-chooser';chooser.innerHTML='<h1>BBI Workspace</h1><p>Pilih user untuk simulasi akses. Ini belum merupakan login terautentikasi.</p><label>User demo<select id="workspace-user">'+workspaceStore.users.map(u=>'<option value="'+u.id+'">'+u.name+' · '+u.role+'</option>').join('')+'</select></label><button type="button" class="primary-button">Buka workspace demo</button>';app.append(chooser);chooser.querySelector('button').onclick=()=>{sessionStorage.setItem('bbi-demo-user',chooser.querySelector('select').value);renderWorkspace();};
}

}
renderWorkspace();
