# Website Kasir TeKo — Desain

- **Tanggal:** 2026-10-06
- **Status:** Disetujui
- **Stack:** HTML + CSS + JavaScript (vanilla, tanpa build step, tanpa backend)

---

## 1. Ringkasan

Aplikasi kasir point-of-sale untuk kedai kopi **TeKo**. Kasir memilih menu, mengunci pesanan, menerima pembayaran, dan melihat rekap penjualan. Seluruh data disimpan di browser (`localStorage`) — tidak ada server, tidak ada akun, tidak ada jaringan.

## 2. Keputusan yang Dikunci

| Keputusan | Nilai | Alasan |
|---|---|---|
| Nama brand | TeKo | Kedai kopi bernama "TeKo" |
| Arah visual | Artisan Hangat | Krem `#FBF6EF`, coklat kopi `#3E2A20`, terakota `#A8622D`, aksen serif (Fraunces) |
| Backend | Tidak ada | Semua di `localStorage` |
| Arsitektur | SPA vanilla + ES modules | Keranjang tidak boleh hilang saat kasir pindah halaman |
| Perangkat | Desktop + tablet/HP (responsif) | Keranjang jadi slide-in panel di layar kecil |
| Perhitungan | Total polos | Tanpa pajak, tanpa service charge, tanpa diskon |
| Kategori | String di produk, bukan tabel terpisah | Chip filter diturunkan otomatis; tidak ada produk yatim |
| Keranjang | Di memori, tidak dipersistensi | Sisa pesanan shift kemarin lebih merepotkan daripada order hilang karena refresh |
| Uang | Integer rupiah | Tidak ada pecahan; pembulatan tidak mungkin terjadi |
| Testing | `tests/run.html` + checklist manual | Nol dependency, sesuai batasan stack |

## 3. Lingkup

**Termasuk:**
- Layar kasir: kategori, pencarian, grid produk, keranjang
- Checkout 3 langkah: metode bayar → input pembayaran (Tunai) → struk
- Hitung kembalian otomatis dengan tombol cepat untuk nominal uang
- Cetak struk via dialog cetak browser
- Kelola produk: tambah, edit, hapus, aktif/non-aktif
- Laporan: omzet, jumlah transaksi, rata-rata, produk terlaris, rincian per metode bayar, daftar transaksi
- Responsif desktop → HP
- Data menu awal (seed) yang bisa diubah

**Di luar lingkup (YAGNI):**
- Autentikasi, multi-kasir, multi-outlet
- Cetak langsung ke printer thermal (pakai dialog cetak browser)
- Metode pembayaran lain di luar Tunai/QRIS/Transfer (e-wallet, kartu kredit)
- Backend, database, sinkronisasi antar perangkat
- Manajemen kategori sebagai entitas tersendiri
- Diskon, pajak, service charge, tips
- Riwayat pembatalan / refund transaksi
- Ekspor ke Excel/PDF

---

## 4. Arsitektur

### 4.1 Arah dependency

Satu arah, tidak pernah bolak-balik:

```
app.js ──→ router.js ──→ views/* ──→ store.js
              │                       │
              ↓                       ↓
        components/* ──────→  format.js
        (modal/toast/struk)      seed.js
```

**Aturan:** `views/*` tidak pernah menyentuh `localStorage` langsung — hanya lewat `store.js`. Semua aturan bisnis (perhitungan harga, ke mana transaksi disimpan, apa yang terjadi saat data rusak) terkumpul di satu tempat.

**Aturan kedua:** komponen di `components/*` tidak boleh memanggil `views/*`.

### 4.2 Struktur file

```
apkmenukasir/
├── index.html                  Shell + titik mounting tiap view
├── css/
│   ├── base.css                Reset, token warna/tipografi, utilitas
│   ├── components.css          Kartu produk, chip, tombol, modal, input, tabel
│   └── views.css               Layout kasir, halaman menu, kartu laporan
├── js/
│   ├── app.js                  Bootstrap + registrasi router
│   ├── router.js               Routing berbasis hash
│   ├── store.js                State, persistensi, pub/sub
│   ├── format.js               formatRupiah, parseRupiah, formatTanggal, id
│   ├── seed.js                 Data menu awal TeKo
│   ├── components/
│   │   ├── modal.js            Dialog konfirmasi & form
│   │   ├── toast.js            Notifikasi singkat
│   │   └── struk.js            Render struk pembayaran
│   └── views/
│       ├── kasir.js            Layar jualan
│       ├── menu.js             Kelola produk
│       └── laporan.js          Rekap penjualan
├── tests/
│   └── run.html                Assertion browser, tanpa dependency
└── README.md                   Cara menjalankan, isi data awal, checklist manual
```

**Aturan ukuran:** view yang tumbuh melewati ~250 baris harus dipecah, bukan dibiarkan membesar.

### 4.3 Menjalankan

Karena memakai ES modules, aplikasi **harus** dibuka lewat `http://`, bukan klik-ganda file (`file://` ditolak browser karena CORS). Contoh:

```bash
python -m http.server 8000
```

lalu buka `http://localhost:8000`. Alternatif: ekstensi Live Server di VS Code.

---

## 5. Model Data

### 5.1 Bentuk data

Satu key `localStorage: "teko:v1"`:

```js
state = {
  products: [
    { id, name, price, category, active }
  ],
  transactions: [
    {
      id,
      code,        // "#TRX-0001"
      items: [
        { productId, name, price, qty }
      ],
      subtotal,    // integer = jumlah(price * qty)
      payment: { method, received, change },  // received/change = 0 untuk non-tunai
      createdAt    // ISO string
    }
  ]
}
```

Kedua koleksi disimpan sebagai array, bukan object ber-key-id. Alasannya urutan produk yang tampil harus sama persis seperti saat disimpan, dan isi `localStorage` jauh lebih mudah dibaca di devtools.

### 5.2 Aturan domain

- **`price`, `subtotal`, `received`, `change`:** integer rupiah. Tidak pernah string.
- **`category`:** string bebas. Daftar chip filter diturunkan dari `products` yang `active === true`, diurutkan alfabetis.
- **`active`:** boolean. Produk nonaktif disembunyikan dari grid kasir, tetapi **tetap tampil** di halaman Kelola Menu.
- **`payment.method`:** `'tunai'` | `'qris'` | `'transfer'`.
- **`items` menyimpan snapshot `name` dan `price`.** Kalau produk di-rename atau dihapus, transaksi lama dan laporan lama **tidak ikut berubah**.
- **`code`:** nomor urut, format `#TRX-0001`, ditentukan dari `transactions.length + 1` saat transaksi disimpan. Karena transaksi tidak pernah dihapus satu per satu (satu-satunya cara menghapus adalah `Reset Semua Data`), nomor ini tidak pernah bentrok.

### 5.3 ID

Helper `id()` di `format.js` menghasilkan ID acak pendek:

```js
`${Date.now().toString(36)}${(++counter).toString(36)}${Math.random().toString(36).slice(2, 6)}`
```

Tidak memakai `crypto.randomUUID()` agar tidak bergantung pada secure context.

---

## 6. Alur Layar

### 6.1 Shell

Header persisten di semua halaman: logo **TeKo** (serif) · tanggal dan jam berjalan · tab navigasi `Kasir | Kelola Menu | Laporan`. Konten tiap view di-mount ke `<main>`.

Routing berbasis hash: `#/kasir`, `#/menu`, `#/laporan`. Hash `#/` membuka halaman kasir.

### 6.2 Halaman Kasir

Dua kolom pada layar lebar: area produk di kiri, panel keranjang fixed di kanan.

- Deretan chip filter kategori + input pencarian (menyaring berdasarkan nama, case-insensitive).
- Grid produk: `repeat(auto-fill, minmax(150px, 1fr))`.
- **Klik kartu produk langsung menambah ke keranjang** — tidak ada tombol tambah terpisah.
- Chip hanya memuat kategori yang punya produk aktif.
- Panel keranjang: tiap baris punya `−`, jumlah, `+`, dan ikon hapus. Header panel punya tombol "Kosongkan".
- Tombol **Bayar** nonaktif saat keranjang kosong.

### 6.3 Checkout (3 langkah, satu modal)

**Langkah 1 — pilih metode.** Tiga tombol besar: `Tunai`, `QRIS`, `Transfer`.

**Langkah 2 — hanya Tunai.** Input uang diterima + tombol cepat (`Uang Pas`, `Rp 20.000`, `Rp 50.000`, `Rp 100.000`). Baris **Kembalian** dihitung live. Tombol "Selesaikan" tetap nonaktif selama uang diterima < total.

**Langkah 3 — struk.** Nomor transaksi, daftar item, subtotal, metode, pembayaran, kembalian. Tombol `Transaksi Baru` (kosongkan keranjang, kembali ke langkah 1) dan `Cetak`.

QRIS dan Transfer lompat dari langkah 1 langsung ke langkah 3.

**Transaksi hanya tersimpan saat tombol "Selesaikan" ditekan.** Menutup atau me-refresh tab di tengah checkout tidak menghasilkan transaksi setengah jadi.

**Cetak:** `window.print()` dengan `@media print` yang menyembunyikan seluruh aplikasi kecuali area struk. Menghasilkan struk 58mm untuk printer thermal tanpa integrasi printer.

### 6.4 Halaman Kelola Menu

Tabel di desktop, kartu di bawah 720px. Kolom: nama, harga, kategori, status, aksi.

- **Toolbar:** pencarian, filter kategori, tombol `+ Tambah Produk`.
- **Form produk** dalam modal: nama, harga, kategori (`input` + `datalist` — boleh pilih yang ada atau mengetik yang baru), toggle aktif.
- **Hapus produk** lewat tombol ikon di baris, dengan dialog konfirmasi yang menyebutkan bahwa transaksi lama tetap utuh.
- Non-aktif lebih sering dipakai daripada hapus, jadi tidak ada confirm dialog saat toggle.

### 6.5 Halaman Laporan

Empat kartu angka: **Omzet**, **Jumlah Transaksi**, **Rata-rata per Transaksi**, **Produk Terlaris** (berdasarkan total qty).

- Filter rentang: `Hari Ini` (default), `7 Hari`, `Semua`.
- **Rincian omzet per metode bayar** (Tunai / QRIS / Transfer).
- **Rata-rata per Transaksi:** `omzet / jumlahTransaksi`. Saat jumlah transaksi 0, tampilkan `Rp 0` — bukan `NaN` atau `-`.
- **Tabel transaksi:** nomor, jam, jumlah item, metode, total. Mengklik baris membukanya.
- **Area berbahaya** di paling bawah: `Reset Semua Data`, dengan dialog konfirmasi yang mewajibkan mengetik kata `HAPUS`.

**Pengelompokan tanggal transaksi** memakai **waktu lokal** (`getFullYear/getMonth/getDate`), bukan potong string ISO — supaya transaksi jam 23:59 tetap masuk laporan "Hari Ini".

**"7 Hari"** = 7 hari kalender termasuk hari ini, dihitung dari tengah malam lokal.

---

## 7. Format Uang

```js
formatRupiah(22000)      // "Rp 22.000"
parseRupiah("22.000")    // 22000
parseRupiah("abc")       // 0
```

Input harga dan uang diterima menggunakan `<input type="text" inputmode="numeric">` — bukan `type="number"` — dengan parser yang membuang semua karakter selain digit. Jadi "22000" dan "22.000" menghasilkan nilai yang sama.

Parsing format rupiah: hapus semua karakter non-digit, lalu `parseInt`.

---

## 8. Penanganan Error

Prinsip: **dicegah, bukan dilaporkan.** Hampir semua kesalahan kasir dicegah di validasi sebelum menjadi data rusak.

| Situasi | Penanganan |
|---|---|
| `localStorage` diblokir (private mode / `file://`) | `try/catch` saat inisialisasi → aplikasi jalan di memori, banner: "Penyimpanan tidak tersedia — data tidak akan tersimpan setelah tab ditutup." |
| `localStorage` penuh | `try/catch` saat simpan → transaksi **tidak** dianggap berhasil, pesan "Gagal menyimpan — penyimpanan penuh." |
| Data rusak / `JSON.parse` gagal | Muat data awal, **jangan menimpa diam-diam**. Banner dengan tombol **Unduh Data Lama** untuk mengunduh konten mentah yang gagal di-parse. |
| Produk tidak valid di data lama | Diabaikan saat load, sisanya tetap dipakai, banner yang menginformasikan jumlah yang dilewati |
| Nama produk kosong / harga ≤ 0 | Tombol Simpan nonaktif |
| Harga berisi huruf | Parser membuang karakter non-digit |
| Qty turun dari 1 | Baris hilang dari keranjang |
| Qty lewat 99 | Dibatasi di 99 per item |
| Produk di-rename/hapus saat ada di keranjang | Keranjang tidak berubah (snapshot) |
| Produk di-nonaktifkan saat ada di keranjang | Tetap di keranjang; hilang dari grid untuk pesanan berikutnya |
| Uang diterima < total | Tombol "Selesaikan" nonaktif — transaksi negatif tidak mungkin tercatat |

---

## 9. Aksesibilitas

- `Esc` menutup modal, fokus kembali ke elemen pemicu.
- Modal memakai `aria-modal="true"` + focus trap sederhana.
- Semua input punya `<label>`, bukan hanya placeholder.
- Target sentuh minimal 44px.
- `#keranjang-status` memakai `aria-live="polite"` untuk mengumumkan perubahan jumlah item.
- Saat modal dibuka, fokus otomatis pindah ke elemen interaktif pertama di dalamnya.

---

## 10. Strategi Testing

Nol dependency, nol build step.

### 10.1 Otomatis — `tests/run.html`

Assertion JS murni. Fungsi yang diuji sengaja dibuat bebas-DOM agar bisa diuji tanpa browser.

| Target | Kasus uji |
|---|---|
| Format & parse rupiah | `formatRupiah(22000)` → `"Rp 22.000"`; `parseRupiah("22.000")` → `22000`; `parseRupiah("abc")` → `0`; round-trip |
| Keranjang | Produk sama diklik 2× → qty 2 (bukan 2 baris); total benar; qty turun dari 1 menghapus baris |
| Kembalian | `50000 − 62000` → tidak valid; `100000 − 62000` → `38000` |
| Snapshot | Produk di-rename setelah transaksi → laporan tidak berubah |
| Agregasi laporan | Omzet "Hari Ini" vs "7 Hari"; transaksi tengah malam masuk hari yang benar |
| Ketahanan store | JSON rusak → fallback data awal, tidak crash; produk tidak valid diabaikan |
| Batas qty | `setQty(item, 100)` → quantity tersimpan 99, bukan error |

Format hasil assertion: setiap kasus menampilkan **hijau (lolos)** atau **merah (gagal)**, sekaligus nilai yang diharapkan vs aktual, dengan ringkasan total di bawah.

### 10.2 Manual — checklist di `README.md`

Alur yang butuh mata dan jari:
1. Kasir di HP — keranjang slide-in bisa dibuka, bar sticky menampilkan total benar
2. Cetak struk — yang keluar hanya struk, bukan tampilan aplikasi
3. Tambah produk berkategori baru → jual produk itu → chip kategorinya muncul otomatis
4. Refresh saat checkout di langkah 2 → tidak ada transaksi tercatat
5. Tutup tab dengan localStorage terblokir → banner muncul, aplikasi tetap jalan

---

## 11. Data Awal (Seed)

Dimuat saat `localStorage` masih kosong. 13 produk, 3 kategori:

| Kategori | Produk |
|---|---|
| **Kopi** | Kopi Susu Gula Aren 22.000 · Americano 18.000 · Cappuccino 24.000 · Kopi Susu Sirup 20.000 · Manual Brew 25.000 |
| **Non-Kopi** | Matcha Latte 26.000 · Matcha Aren 28.000 · Chocolate 24.000 · Teh 8.000 |
| **Snack** | Roti Bakar 15.000 · Croissant 18.000 · Cookies 12.000 · Kentang Goreng 20.000 |

Tersedia juga `Reset Semua Data` di halaman Laporan untuk mengembalikan keadaan awal ini kapan saja.

---

## 12. Palet Warna

| Token | Nilai | Pakai untuk |
|---|---|---|
| `--c-bg` | `#FBF6EF` | Latar aplikasi |
| `--c-surface` | `#FFFFFF` | Kartu produk, modal |
| `--c-ink` | `#3E2A20` | Teks utama, header |
| `--c-ink-soft` | `#7A5C46` | Teks sekunder |
| `--c-accent` | `#A8622D` | Harga, aksen |
| `--c-line` | `#E7D8C6` | Garis pemisah |
| `--c-tint` | `#EFE0CE` | Chip tidak aktif |
| `--c-panel` | `#F3E7D8` | Panel keranjang |
| `--c-success` | `#3F7D4E` | Konfirmasi |
| `--c-danger` | `#B3402F` | Hapus, error |

Tipografi: **Fraunces** untuk logo dan judul, sans-serif sistem untuk teks antarmuka (agar cepat dibaca pada angka).