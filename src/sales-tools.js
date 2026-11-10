import {demoStore as store, subscribeDemo, notifyDemo} from './demo-store.js';
import {salesCatalog} from './workspace-access.js';
import {selectNewArrival} from './new-arrivals-model.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => (
  {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]
));
const money = value => 'Rp ' + new Intl.NumberFormat('id-ID').format(value);

export function mountSalesTools(root, user) {
  let page = 'catalog';
  const canSelect = user?.role === 'superadmin' &&
    store.users.some(row => row.id === user.id && row.active && row.role === 'superadmin');

  root.innerHTML = `<section class="panel">
    <nav class="cc-tabs" aria-label="Halaman Sales Tools">
      <button type="button" data-catalog-page="catalog">Katalog Produk</button>
      <button type="button" data-catalog-page="arrivals">Barang Baru Datang</button>
    </nav>
    <div class="panel-head"><div>
      <h2 class="catalog-title">Sales Tools · Katalog Produk</h2>
      <p>Foto produk, nama / kode SKU, size, warna dan harga jual per pcs.</p>
      ${canSelect ? '<p>Pilih checkbox SKU untuk menampilkannya di Barang Baru Datang.</p>' : ''}
    </div><label>Cari produk<input type="search" id="catalog-search" placeholder="Nama, SKU, size, warna…"></label></div>
    <p id="catalog-count"></p><p class="catalog-message" role="status"></p>
    <div id="sales-catalog" class="sales-catalog"></div>
  </section>`;
  const search = root.querySelector('#catalog-search');
  function render() {
    const selected = new Set(store.newArrivalSkus ?? []);
    const products = salesCatalog(store.products, search.value)
      .filter(product => page !== 'arrivals' || selected.has(product.sku));
    root.querySelector('.catalog-title').textContent =
      page === 'arrivals' ? 'Sales Tools · Barang Baru Datang' : 'Sales Tools · Katalog Produk';
    root.querySelectorAll('[data-catalog-page]').forEach(button => {
      const active = button.dataset.catalogPage === page;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    root.querySelector('#catalog-count').textContent = `${products.length} produk`;
    root.querySelector('#sales-catalog').innerHTML = products.map(product => `
      <article class="catalog-card">
        <div class="catalog-image">${product.photos[0]
          ? `<img src="${esc(product.photos[0].src)}" alt="${esc(product.name)}" loading="lazy" width="240" height="240">`
          : '<span>Belum ada foto produk</span>'}</div>
        <div class="catalog-body">
          <h3>${esc(product.name)}</h3><p>${esc(product.sku)}</p>
          <p>${esc(product.size)} · ${esc(product.color)}</p>
          <strong>${money(product.sellingPrice)} / pcs</strong>
          ${canSelect ? `<label class="new-arrival-choice"><input type="checkbox"
            data-arrival-sku="${esc(product.sku)}" ${selected.has(product.sku) ? 'checked' : ''}>
            Barang Baru Datang · ${esc(product.sku)}</label>` : ''}
          ${product.photos.length > 1 ? `<div class="catalog-thumbnails">${product.photos.map((photo,index) => `
            <button type="button" data-catalog-photo="${esc(photo.src)}" aria-label="Foto ${index+1} ${esc(product.sku)}">
              <img src="${esc(photo.src)}" alt="Foto ${index+1}" loading="lazy" width="48" height="48">
            </button>`).join('')}</div>` : ''}
        </div>
      </article>`).join('') || `<p>${page === 'arrivals'
        ? 'Belum ada barang baru datang yang dipilih Admin super atau sesuai pencarian.'
        : 'Tidak ada produk yang sesuai.'}</p>`;
  }
  search.addEventListener('input', render);
  root.addEventListener('click', event => {
    const tab = event.target.closest('[data-catalog-page]');
    if (tab) {
      page = tab.dataset.catalogPage;
      render();
    }
    const photo = event.target.closest('[data-catalog-photo]');
    if (photo) photo.closest('.catalog-card').querySelector('.catalog-image img').src = photo.dataset.catalogPhoto;
  });
  root.addEventListener('change', event => {
    const checkbox = event.target.closest('[data-arrival-sku]');
    if (!checkbox) return;
    try {
      selectNewArrival(store, checkbox.dataset.arrivalSku, checkbox.checked, user);
      root.querySelector('.catalog-message').textContent = 'Pilihan barang baru datang tersimpan pada sesi demo.';
      notifyDemo();
    } catch (error) {
      root.querySelector('.catalog-message').textContent = error.message;
      render();
    }
  });
  subscribeDemo(render);
  render();
}
