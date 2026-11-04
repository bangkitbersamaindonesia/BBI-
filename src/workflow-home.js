import {canAccessPage} from './workspace-access.js';

const lanes = [
  {title:'Customer', tone:'blue', steps:[
    ['▤','Sales Order','Sales','Sales · pilih customer dan opsi invoice'],
    ['◫','Alokasi stok','Sales','Otomatis · cek tiga gudang dan buat draft PO jika kurang'],
    ['▧','Invoice & pengiriman','Sales','Admin 2 · price level, diskon, dan pengeluaran stok','admin2'],
    ['↙','Terima pembayaran','Payments','Admin 2 · catat pembayaran piutang'],
  ], shortcuts:[
    ['♧','Customer Center','Customer Center','Profil dan riwayat customer'],
    ['↶','Retur customer','Sales','Admin 1 · setujui retur dan kembalikan stok','admin1'],
  ]},
  {title:'Vendor', tone:'green', steps:[
    ['▤','Purchase Order','Purchasing','Admin 1 · otorisasi PO kekurangan atau pengisian stok','admin1'],
    ['▣','Penerimaan & Bills','Purchasing','Admin 1 · cocokkan kiriman, tambah stok, catat loss sales','admin1'],
    ['↗','Bayar bills','Payments','Admin 2 · catat pembayaran utang'],
  ], shortcuts:[
    ['◇','Vendor Center','Vendor Center','Profil dan riwayat supplier'],
    ['↶','Retur vendor','Purchasing','Admin 1 · kurangi stok dan tagihan','admin1'],
  ]},
  {title:'Persediaan & perusahaan', tone:'gold', shortcuts:[
    ['◫','Master SKU','Inventory','Produk, foto, dan stok tiga gudang'],
    ['▤','Chart of Accounts','Accounting','Daftar akun dan pelacakan PPN'],
    ['▥','Reports','Reports','Keuangan, umur piutang/utang, valuasi, dan stok opname'],
  ]},
  {title:'Kas & bank', tone:'blue', shortcuts:[
    ['↔','Pembayaran','Payments','Pelunasan customer dan supplier'],
    ['✎','Write Checks','Payments','Admin 3 · catat pengeluaran','admin3','#check-form'],
  ]},
];

export function mountWorkflowHome(root, user, openPage) {
  const salesOnly = user.role === 'sales';
  const available = ([, , page, , operationRole]) =>
    canAccessPage(user, page) && (!salesOnly || !operationRole);
  const actions = [];
  function card(step) {
    const [icon, title, page, detail, , target] = step;
    const index = actions.push({page, target}) - 1;
    return `<button type="button" class="workflow-tile" data-workflow-action="${index}">
      <span class="workflow-tile-icon" aria-hidden="true">${icon}</span>
      <strong>${title}</strong><small>${detail}</small>
    </button>`;
  }

  root.innerHTML = `<div class="workflow-board">${lanes.map(lane => {
    const steps = (lane.steps ?? []).filter(available);
    const shortcuts = lane.shortcuts.filter(available);
    if (!steps.length && !shortcuts.length) return '';
    return `<section class="panel workflow-lane workflow-lane-${lane.tone}">
      <h2>${lane.title}</h2>
      ${steps.length ? `<div class="workflow-path">${steps.map(card).join('<span class="workflow-arrow" aria-hidden="true">→</span>')}</div>` : ''}
      ${lane.title === 'Customer' && !salesOnly ? '<p class="workflow-branch">Jika stok kurang, lanjutkan ke Purchase Order. Setelah barang diterima, proses invoice dan pengiriman di Sales Order.</p>' : ''}
      ${shortcuts.length ? `<div class="workflow-shortcuts">${shortcuts.map(card).join('')}</div>` : ''}
    </section>`;
  }).join('')}</div>`;

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-workflow-action]');
    if (!button) return;
    const {page, target} = actions[Number(button.dataset.workflowAction)];
    if (canAccessPage(user, page)) openPage(page, target);
  });
}
