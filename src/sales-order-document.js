import {invoiceTaxAmounts} from './invoice-preview-model.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => (
  {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]
));
const money = value => 'Rp ' + new Intl.NumberFormat('id-ID').format(value);

export function salesOrderDocument(order) {
  const tax = order.letterhead === 'A' ? invoiceTaxAmounts(BigInt(order.total)) : null;
  return `<article class="so-document">
    <header><p>Bangkit Bersama Indonesia</p><h2>Sales Order</h2></header>
    <dl>
      <dt>S.O No.</dt><dd>${escape(order.id)}</dd>
      <dt>Tanggal SO</dt><dd>${escape(order.date || '—')}</dd>
      <dt>Nama toko / customer</dt><dd>${escape(order.customer)}</dd>
      <dt>Sales</dt><dd>${escape(order.salesperson)}</dd>
      <dt>Tanggal kebutuhan</dt><dd>${escape(order.deliveryDate)}</dd>
      <dt>Alamat kirim</dt><dd>${escape(order.address || '—')}</dd>
      <dt>Alamat ekspedisi</dt><dd>${escape(order.expeditionAddress || '—')}</dd>
    </dl>
    <div class="table-scroll"><table>
      <thead><tr><th>SKU</th><th>Deskripsi barang</th><th>Jumlah</th><th>Satuan</th><th>Harga jual</th><th>Subtotal</th></tr></thead>
      <tbody>${order.lines.map(line => {
        // Older orders stored the rate per pcs even when ordered by pack.
        const rate = line.unitPrice ?? line.subtotal / Number(line.qty);
        return `<tr><td>${escape(line.sku)}</td><td>${escape([line.name,line.size,line.color].filter(Boolean).join(' · '))}</td>
          <td>${escape(line.qty)}</td><td>${escape(line.unit)}</td><td>${money(rate)}</td><td>${money(line.subtotal)}</td></tr>`;
      }).join('')}</tbody>
      <tfoot>
        ${tax ? `<tr><th colspan="5">Sub total barang</th><td>${money(order.total)}</td></tr>
        <tr><th colspan="5">DPP nilai lain2</th><td>${money(tax.dpp)}</td></tr>
        <tr><th colspan="5">PPN 12%</th><td>${money(tax.ppn)}</td></tr>` : ''}
        <tr><th colspan="5">Jumlah yang harus dibayar</th><td>${money(tax?.amountDue ?? order.total)}</td></tr>
      </tfoot>
    </table></div>
    <p class="so-document-notes">Catatan<br>${escape(order.notes || '—')}</p>
  </article>`;
}

export function printSalesOrder(order) {
  const sheet = document.createElement('div');
  sheet.className = 'so-print-sheet';
  sheet.innerHTML = salesOrderDocument(order);
  document.body.append(sheet);
  document.body.classList.add('so-printing');
  const title = document.title;
  document.title = 'Sales Order ' + order.id;
  function cleanup() {
    sheet.remove();
    document.body.classList.remove('so-printing');
    document.title = title;
  }
  window.addEventListener('afterprint', cleanup, {once:true});
  try { window.print(); }
  catch (error) {
    window.removeEventListener('afterprint', cleanup);
    cleanup();
    throw error;
  }
}
