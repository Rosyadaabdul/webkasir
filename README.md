# Kasir TeKo

Aplikasi kasir point-of-sale untuk kedai kopi TeKo. Berjalan sepenuhnya di browser —
tanpa server aplikasi, tanpa akun, tanpa jaringan. Data disimpan di `localStorage` browser itu saja.

## Menjalankan

Aplikasi memakai ES modules, jadi **harus** dibuka lewat `http://`, bukan klik-ganda file.

```bash
python -m http.server 8000
```

Buka `http://localhost:8000`.

Alternatif: ekstensi **Live Server** di VS Code, klik kanan `index.html` lalu *Open with Live Server*.

Butuh Node.js 18+ hanya untuk menjalankan test. Menjalankan aplikasi **tidak** butuh Node.

## Halaman

| Halaman | Alamat | Isi |
|---|---|---|
| Kasir | `#/kasir` | Pilih menu, keranjang, checkout |
| Kelola Menu | `#/menu` | Tambah, ubah, hapus, aktif/nonaktif produk |
| Laporan | `#/laporan` | Omzet, transaksi, produk terlaris, reset data |

## Menu Awal

Saat dibuka pertama kali, 13 produk dimuat:

| Kategori | Produk |
|---|---|
| Kopi | Kopi Susu Gula Aren 22.000 · Americano 18.000 · Cappuccino 24.000 · Kopi Susu Sirup 20.000 · Manual Brew 25.000 |
| Non-Kopi | Matcha Latte 26.000 · Matcha Aren 28.000 · Chocolate 24.000 · Teh 8.000 |
| Snack | Roti Bakar 15.000 · Croissant 18.000 · Cookies 12.000 · Kentang Goreng 20.000 |

Ubah dari halaman **Kelola Menu**. Kembalikan ke keadaan ini kapan saja lewat
**Laporan → Reset Semua Data**.

## Aturan Penting

- **Harga dan uang selalu bilangan bulat rupiah.** Tidak ada pecahan, tidak ada pajak, tidak ada service charge.
- **Metode pembayaran:** Tunai, QRIS, Transfer.
- **Uang diterima yang kurang dari total tidak bisa diselesaikan.** Tombolnya nonaktif, bukan menampilkan error.
- **Transaksi baru hanya tersimpan setelah menekan "Selesaikan".** Menutup atau me-refresh tab di tengah checkout tidak menghasilkan transaksi setengah jadi.
- **Keranjang tidak disimpan.** Refresh halaman mengosongkan keranjang. Ini disengaja supaya pesanan sisa shift kemarin tidak muncul lagi besok.
- **Nama dan harga tersalin ke dalam setiap transaksi.** Mengubah atau menghapus produk tidak mengubah riwayat penjualan yang sudah terjadi.
- **Batas 99 per item** di keranjang.

## Data dan Penyimpanan

Semua data ada di `localStorage` dengan key `teko:v1`.

- Kalau browser memblokir penyimpanan (mode privat), aplikasi tetap jalan di memori dan menampilkan banner peringatan. Data tidak bertahan setelah tab ditutup.
- Kalau penyimpanan penuh, transaksi gagal disimpan dan aplikasi memberi tahu.
- Kalau data tersimpan rusak, aplikasi memuat menu awal **tanpa menimpa** data lama, dan menyediakan tombol untuk mengunduh data lama tersebut.

Mencadangkan: DevTools → Application → Local Storage → salin isi key `teko:v1`.

## Test

Dijalankan di terminal:

```bash
node --test
```

Dijalankan di browser sebagai daftar merah/hijau:

```
http://localhost:8000/tests/run.html
```

Keduanya memakai berkas kasus uji yang sama (`tests/cases.js`), jadi hasilnya selalu sama.

## Checklist Manual

Yang tidak bisa diuji otomatis:

- [ ] Buka di HP (<=900px): keranjang jadi panel slide-in, bar sticky di bawah menampilkan jumlah item dan total dengan benar
- [ ] Buka di <=720px: halaman Kelola Menu berubah dari tabel menjadi kartu
- [ ] Klik "Cetak" di struk: dialog print hanya menampilkan struk, bukan tampilan aplikasi
- [ ] Tambah produk berkategori baru lalu jual produk itu: chip kategorinya muncul otomatis di layar Kasir
- [ ] Tekan `Esc` di tengah checkout: modal tertutup, tidak ada transaksi tersimpan
- [ ] Nonaktifkan satu produk: produk hilang dari layar Kasir, tetap ada di Kelola Menu
- [ ] Ubah harga produk yang pernah terjual: angka pada Laporan tidak berubah
- [ ] Jalankan di mode privat: banner "Penyimpanan tidak tersedia" muncul, aplikasi tetap bisa dipakai
- [ ] Tekan `Tab` berulang di dalam modal: fokus tidak pernah keluar dari modal
- [ ] Semua input punya label yang terlihat saat diklik

## Struktur Berkas

```
index.html            Shell dan titik mounting
css/base.css          Token, reset, aturan cetak
css/components.css    Kartu, chip, tombol, modal, toast, struk
css/views.css         Layout kasir, menu, laporan
js/format.js          Format rupiah dan tanggal, id, batas rentang
js/catalog.js         Fungsi murni produk dan kategori
js/cart.js            Fungsi murni keranjang
js/reports.js         Agregasi transaksi
js/store.js           State tunggal, persistensi, pub/sub
js/seed.js            Data menu awal
js/router.js          Routing berbasis hash
js/app.js             Bootstrap
js/components/        modal, toast, struk, checkout
js/views/             kasir, menu, laporan
tests/                harness, cases, app.test.js, run.html
```

Aturan main: `js/views/` dan `js/components/` tidak pernah menyentuh `localStorage`
secara langsung. Semuanya lewat `store.js`.
