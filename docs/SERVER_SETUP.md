# BBI server: pemasangan, testing, dan Cloudflare

## Dua aplikasi yang berbeda

- `npm run dev` / port 5173: demo lama. Data di memori browser. **Jangan arahkan Tunnel production ke sini.**
- `npm start` / port 5181: portal server baru. Login pribadi, database SQLite permanen, validasi izin server, transaksi bersama, jurnal terposting, foto privat, dan audit.

Portal server baru mempunyai antarmuka operasional sendiri. Tata letak dan kelengkapan tampilan belum identik dengan dashboard demo lama. Tidak ada migrasi otomatis data dari tab browser demo. Jangan beranggapan `vite build` mengubah demo menjadi portal server.

## Teknologi dan batas penggunaan

Gunakan Node.js 24.x. Portal server hanya memakai modul bawaan Node; tidak memerlukan `npm install` atau build Vite untuk berjalan. Vite tetap dipakai untuk demo lama.

Database SQLite dengan WAL, `synchronous=FULL`, `BEGIN IMMEDIATE`, revisi global, dan nomor permintaan unik cocok untuk satu perusahaan BBI pada satu server lokal dengan jumlah user kecil. State bisnis tersimpan sebagai dokumen JSON dalam SQLite, bukan skema transaksi PostgreSQL terpisah. Data autentikasi, sesi, audit, foto, dan jurnal memiliki tabel tersendiri. Foto menjadi bagian backup database.

Jalankan satu instance server. Simpan database pada disk lokal, bukan folder jaringan/NAS/cloud-sync. Jangan memakai beberapa replika penulis. Pertumbuhan transaksi besar memerlukan migrasi ke database relasional dengan tabel per entitas, pagination dan pengujian beban. UI saat ini mengambil seluruh data operasional yang diizinkan pada satu snapshot; belum dioptimalkan untuk histori bertahun-tahun.

## Testing lokal

Dari folder proyek:

```sh
node server/manage.mjs seed-test
node server/manage.mjs user
node server/start.mjs
```

`seed-test` hanya untuk database baru kosong dan dilarang pada `NODE_ENV=production`. Tersedia 5 SKU, 3 customer dan 2 vendor; tidak ada password default. Buat user lewat terminal. Untuk Sales gunakan nama persis `Doni`, `Lutfi`, atau `Dipa`. Peran yang diterima: `sales`, `admin1`, `admin2`, `admin3`, `superadmin`.

Buka http://127.0.0.1:5181. Password minimal 14 karakter; tidak ditampilkan saat diketik. Admin Super dapat membuat akun lain di menu Users. Username, nama dan role akun tersimpan tidak dapat diganti agar pemilik histori tidak berubah; akun dapat dinonaktifkan, email diperbarui, password direset. Reset dan penonaktifan mencabut sesi lama. Sesi berakhir setelah 8 jam.

Jika memakai database testing khusus yang dibuat Codex:

```sh
BBI_DATABASE=data/testing.sqlite node server/start.mjs
```

Akun lokalnya ada dalam `data/testing-credentials.txt`. File ini privat, diabaikan Git, dan tidak disertakan dalam paket distribusi. Jangan memakai password testing untuk produksi.

Windows PowerShell untuk database khusus:

```powershell
$env:BBI_DATABASE = 'data/testing.sqlite'
node server/start.mjs
```

## Alur yang sudah memakai server

1. Sales memilih customer miliknya, membuat SO. Pemeriksaan dan reservasi stok mencakup tiga gudang. Draft PO hanya memuat kekurangan.
2. Admin 1 memilih vendor, gudang, diskon, term of payment, mengedit dan mengotorisasi PO. PO stok langsung juga tersedia.
3. Admin 1 mencocokkan draft bills dengan kiriman fisik; mengonfirmasi respons final. Barang yang kurang dicatat sebagai loss sales dan barang yang diterima menambah stok.
4. Admin 2 menerbitkan invoice, memilih price level/diskon. Opsi A/B mengikuti SO. Penerbitan mengurangi stok.
5. Retur customer diajukan Sales lalu disetujui Admin 1. Retur vendor oleh Admin 1. Persetujuan mengubah stok dan membuat credit yang mengurangi tagihan.
6. Admin 2 mencatat pembayaran/write-off dengan referensi unik. Admin 3 mencatat Write Checks.
7. Server menolak angka tidak valid, stok negatif, pemakaian reservasi berlebih dan jurnal tidak seimbang. Bills, invoice, pembayaran dan jurnal terposting tidak memiliki endpoint edit/hapus.
8. Server menolak penyimpanan dengan revisi lama (HTTP 409); user harus memuat ulang dan meninjau ulang form. Permintaan yang dikirim ulang dengan request ID dan isi sama tidak diproses dua kali.

Status dokumen dan ID pada model lama masih dapat memuat kata `DEMO`; status otoritatifnya adalah transaksi dan jurnal yang tersimpan di server. Penomoran selain SO belum dimigrasi ke format final BBI.

## Hak akses

Izin diperiksa ulang di setiap endpoint; browser tidak menentukan role. Server menyaring data sebelum mengirim ke browser.

- Sales: katalog tanpa harga beli, customer milik Sales itu, SO sendiri, invoice/retur terkait dan laporan Sales sendiri.
- Admin 1: pengadaan/bills/retur dan master operasional. Tidak boleh endpoint laporan keuangan, users, audit atau jurnal.
- Admin 2: invoice/pembayaran dan master operasional; tidak boleh endpoint khusus Admin Super.
- Admin 3: checks, master SKU/customer; tidak menerima seluruh SO/bills/invoice.
- Admin Super: semua tindakan, users, laporan keuangan dan audit.

Admin Super bertindak dengan identitasnya sendiri, meskipun fungsi bisnis yang dijalankan adalah tugas admin lain. Audit menyimpan actor sebenarnya. Log audit hanya dapat ditambah, disertai hash berantai dan snapshot sebelum/sesudah untuk peristiwa baru. Pemilik penuh file database masih dapat mengganti seluruh database; ini bukan bukti antiubah terhadap administrator mesin. Simpan backup/audit di lokasi terpisah.

## Foto

Foto produk maksimal enam slot; customer memiliki slot KTP, NPWP dan tampak toko. Browser mengubah foto menjadi PNG, memperkecil sampai maksimal 1200 px dan 300 KB; server memeriksa signature PNG, dimensi dan ukuran. File disimpan sebagai BLOB privat dan disajikan setelah otorisasi sesi, tanpa direktori publik. Implementasi ini belum melakukan decode/re-encode gambar atau pemindaian antivirus pada server; tambahkan pemroses gambar server sebelum menerima unggahan dari pihak yang tidak dipercaya.

## Cloudflare production

Diperlukan domain yang dikelola Cloudflare, team domain Access, AUD aplikasi, email individual pengguna, dan server yang selalu aktif. Jangan masukkan token Tunnel atau password ke GitHub.

1. Siapkan mesin Linux dengan Node 24.x, akun OS khusus `bbi`, source di `/opt/bbi`, direktori privat `/var/lib/bbi` dan `/var/backups/bbi` milik `bbi`. Sesuaikan path Node bila bukan `/usr/bin/node`.
2. Salin `deploy/bbi.env.example` ke `/etc/bbi/bbi.env`, dengan izin hanya operator dan service BBI yang perlu. Isi hostname HTTPS, issuer team dan AUD yang sebenarnya. Set database ke `/var/lib/bbi/bbi.sqlite`.
3. Buat database **kosong** untuk produksi. Jangan menjalankan `seed-test`. Buat Admin Super lewat CLI dengan environment yang sama dan email pribadi yang akan dipakai di Cloudflare. Lalu buat user lain.
4. Buat aplikasi Cloudflare Access untuk seluruh hostname ERP (termasuk `/api/*` dan foto). Batasi Allow ke email user yang berwenang, aktifkan MFA melalui penyedia identitas yang dipilih. Jangan menambahkan Bypass atau `Everyone`.
5. Buat named Tunnel permanen, petakan hostname ke `http://127.0.0.1:5181`. Contoh konfigurasi ada di `deploy/cloudflared.example.yml`. Issuer/AUD pada server harus sama dengan aplikasi Access.
6. Server memverifikasi signature RS256 token `Cf-Access-Jwt-Assertion`, issuer, audience, masa berlaku serta email. Identitas Cloudflare harus cocok dengan email akun BBI; email header biasa tidak dipercaya. Token tidak valid ditolak. Semua resource portal selain healthcheck memerlukan token dalam mode production. Jangan mengubah ke mode lokal untuk menghindari kegagalan login.
7. Jalankan `bbi.service` dan layanan cloudflared melalui systemd agar mulai otomatis setelah restart. Server BBI mengikat localhost saja. Jangan membuka port BBI/database langsung ke internet.
8. Aktifkan `bbi-backup.timer` dan `bbi-backup.service` setelah memeriksa path/folder. Backup harian pukul 02:00 Asia/Jakarta; simpan salinan terenkripsi di lokasi terpisah. Atur retensi dan pemberitahuan kegagalan pada sistem backup operator.

Contoh perintah operator setelah file service, folder dan environment sudah disiapkan (memerlukan hak administrator mesin):

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now bbi.service
sudo systemctl enable --now bbi-backup.timer
sudo systemctl status bbi.service
```

Source di repo tidak otomatis memasang service atau mengubah akun Cloudflare. Template harus disesuaikan dan diuji pada mesin tujuan.

Referensi resmi:
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- https://developers.cloudflare.com/tunnel/reference/origin-parameters/
- https://nodejs.org/api/sqlite.html

## Backup dan pemulihan

```sh
node server/manage.mjs backup /lokasi/backup/bbi-YYYYMMDD.sqlite
node server/manage.mjs verify /lokasi/backup/bbi-YYYYMMDD.sqlite
```

Backup memakai SQLite online backup (bukan menyalin file database hidup tanpa WAL). Verifikasi memeriksa integritas SQLite, hash audit dan keseimbangan jurnal. Backup berisi data pelanggan, dokumen dan hash password: batasi akses dan enkripsi media/backup. Database sendiri belum dienkripsi oleh aplikasi.

Uji pemulihan ke **file berbeda**, hentikan instance testing yang akan dipakai, lalu jalankan dengan `BBI_DATABASE` menunjuk salinan backup. Login, periksa transaksi dan foto, kemudian jalankan `verify`. Jangan menimpa database aktif. Untuk pemulihan produksi, hentikan layanan terlebih dahulu, simpan salinan database bermasalah beserta WAL, periksa backup, gunakan file pulihan pada path baru, ubah environment, lalu mulai layanan dan evaluasi. Jangan menggunakan file cadangan yang integritasnya gagal.

## Pemeriksaan sebelum operasional nyata

- Uji user acceptance seluruh alur dengan data fiktif dan dua browser berbeda.
- Pastikan tidak ada account superadmin testing, seluruh email/password produksi individual, dan akun pegawai keluar dinonaktifkan.
- Uji blokir login Cloudflare email tidak terdaftar, role palsu, URL/API langsung dan akses foto customer Sales lain pada domain nyata.
- Persiapkan saldo awal bank, piutang, hutang dan stok melalui proses migrasi yang direkonsiliasi; portal belum memiliki importer saldo awal lengkap.
- Minta akuntan memeriksa pemetaan kategori SKU ke akun inventory/COGS/Sales dan saldo awal. Jurnal server saat ini memakai bucket internal inventory/revenue/COGS dan subakun untuk bank/expense/PPN; laporan per kategori SKU dan seluruh akun Fixed Assets/Loans belum menjadi ledger lengkap.
- Cetak/PDF portal dan dashboard baru belum identik dengan seluruh revisi tampilan demo. Uji dan setujui dokumen sebelum dipakai sebagai dokumen resmi.
- Atur monitoring, backup terpisah, uji pemulihan, dan perlindungan disk mesin.

Perubahan ini menyediakan fondasi server dan alur transaksi permanen yang dapat diuji. Ini **belum persetujuan go-live**; konfigurasi domain nyata, kesetaraan seluruh tampilan/report, migrasi saldo awal, dan pemeriksaan akuntansi masih perlu diselesaikan.
