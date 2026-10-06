# Website Kasir TeKo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi kasir point-of-sale untuk kedai kopi TeKo — layar jualan, checkout tiga langkah, kelola produk, dan laporan penjualan — sepenuhnya di browser tanpa backend.

**Architecture:** Single-page application vanilla JS berbasis ES modules, routing lewat hash. Seluruh aturan bisnis adalah fungsi murni yang bebas-DOM (dipisah dari lapisan render), sehingga bisa diuji headless dengan `node --test`. State tunggal hidup di `store.js` yang memusatkan semua akses `localStorage`; modul katalog, keranjang, dan laporan dijdependensikan sebagai fungsi murni atas state.

**Tech Stack:** HTML + CSS + JavaScript (ES modules, tanpa build step, tanpa dependency runtime). Node.js 24+ hanya untuk menjalankan test (`node --test`). Test memakai `node:test` + `node:assert` bawaan Node.

**Spec:** `docs/superpowers/specs/2026-10-06-kasir-teko-design.md`

**Catatan penyimpangan dari spec:** Spec hanya menulis `tests/run.html` sebagai satu-satunya cara menjalankan test. Plan ini menambah `tests/app.test.js` yang berjalan via `node --test` supaya siklus TDD bisa dijalankan berulang tanpa mata manusia. Keduanya meng-*import* `tests/cases.js` yang sama, jadi tidak ada duplikasi kasus uji.

## Global Constraints

- **Tanpa dependency.** Tidak ada `package.json`, tidak ada `node_modules`, tidak ada build step. Hanya `node:test` dan `node:assert/strict` yang sudah bawaan Node.
- **Tanpa backend.** Semua data di `localStorage` dengan key persis `teko:v1`.
- **Semua uang adalah integer rupiah.** Tidak pernah pecahan, tidak pernah string. Tidak ada pajak, service charge, atau diskon.
- **Hanya metode pembayaran:** `'tunai'`, `'qris'`, `'transfer'`. Tidak ada metode lain.
- **`items` pada transaksi dan keranjang selalu menyimpan snapshot `name` dan `price`** — perubahan produk tidak boleh mengubahnya.
- **Batas qty per item: 99.** Melebihi itu diam-diam dipotong ke 99, bukan error.
- **Kategori adalah string bebas pada produk**, bukan entitas tersendiri.
- **Keranjang hanya di memori**, tidak pernah ditulis ke `localStorage`.
- **Arah dependency satu arah:** `app → router → views → store → {catalog, cart, reports}` dan `components → format`. `views/*` dan `components/*` tidak boleh menyentuh `localStorage` secara langsung.
- **Penamaan fungsi:** Bahasa Indonesia, format `kataKerja` (contoh: `tambahProduk`, `totalKeranjang`, `hitungKembalian`). Konstanta `KAPITAL_SNACK`. File named `kebab-case`.
- **Semua label antarmuka berbahasa Indonesia.**
- **Arah visual:** Artisan Hangat — token warna dan font persis seperti tabel di spec bagian 12.
- **Target browser:** Chrome/Edge/Firefox versi terbaru. Dibuka lewat `http://localhost`, bukan `file://`.

---

## Peta File

Setiap file satu tanggung jawab. Kolom "Peran" adalah alasan file ini ada.

| File | Peran |
|---|---|
| `index.html` | Shell: header, titik mounting view, pemanggilan `app.js` |
| `css/base.css` | Reset, token warna/font/ukuran, utilitas, aturan `@media print` |
| `css/components.css` | Kartu produk, chip, tombol, input, tabel, modal, toast, banner |
| `css/views.css` | Layout kasir 2 kolom, panel keranjang, halaman menu, halaman laporan |
| `js/format.js` | Semua format & parse uang/tanggal, generator id, batas rentang tanggal |
| `js/catalog.js` | Fungsi murni atas produk: validasi, CRUD, turunan kategori, saringan |
| `js/cart.js` | Fungsi murni atas keranjang: tambah, set qty, hapus, total, kembalian |
| `js/reports.js` | Agregasi transaksi: penyaringan rentang, omzet, rata-rata, terlaris, per metode |
| `js/store.js` | State tunggal, persistensi `localStorage`, pub/sub, ketahanan error, resilient |
| `js/seed.js` | Data menu awal TeKo (13 produk, 3 kategori) |
| `js/router.js` | Routing berbasis hash, mendaftarkan dan memount view |
| `js/app.js` | Bootstrap: buat store, pasang router, render header, render banner peringatan |
| `js/components/modal.js` | Dialog: buka/tutup, focus trap, Esc, konfirmasi, minta ketik kata |
| `js/components/toast.js` | Notifikasi singkat yang hilang sendiri |
| `js/components/struk.js` | Render elemen struk pembayaran |
| `js/components/checkout.js` | Alur checkout 3 langkah (pilih metode → bayar → struk) |
| `js/views/kasir.js` | Layar jualan: chip kategori, cari, grid produk, panel keranjang |
| `js/views/menu.js` | Kelola produk: tabel/kartu, form modal, hapus, toggle aktif |
| `js/views/laporan.js` | Kartu statistik, rincian metode, tabel transaksi, reset data |
| `tests/harness.js` | Assertion helper yang dipakai bersama Node dan browser |
| `tests/cases.js` | Seluruh kasus uji, diekspor sebagai `daftarKasus()` |
| `tests/app.test.js` | Entry point test Node (`node --test`) |
| `tests/run.html` | Tampilan merah/hijau yang sama untuk manusia |
| `README.md` | Cara menjalankan, isi data awal, checklist manual |

---

### Task 1: Fondasi — repo, harness test, dan `format.js`

**Files:**
- Create: `.gitignore`
- Create: `tests/harness.js`
- Create: `js/format.js`
- Test: `tests/cases.js` (hanya bagian `format` di Task 1), `tests/app.test.js`

**Interfaces:**
- Consumes: tidak ada
- Produces:
  - `formatRupiah(n: number): string` → `"Rp 22.000"`
  - `parseRupiah(value: string | number): number` → integer, `0` bila tidak ada digit
  - `formatTanggal(date?: Date): string` → `"Sab, 6 Okt 2026"`
  - `formatTanggalPendek(date: Date): string` → `"06/10/2026"`
  - `formatJam(date: Date): string` → `"10:24"`
  - `id(): string` → id unik, misal `"m8x1k2-1-a7f3q"`
  - `tengahMalam(date: Date): Date` → salinan date dengan jam 00:00:00.000
  - `awalTujuhHari(date: Date): Date` → tengah malam tanggal 6 hari sebelum `date`

- [ ] **Step 1: Inisialisasi git dan `.gitignore`**

```bash
git init
```

`.gitignore`:

```
node_modules/
.superpowers/
*.log
```

- [ ] **Step 2: Tulis assertion helper — `tests/harness.js`**

```js
export function eq(actual, expected, pesan = "") {
  return {
    ok: Object.is(actual, expected),
    pesan: pesan || `harapan: ${tampil(expected)} · faktanya: ${tampil(actual)}`,
  };
}

export function deepEq(actual, expected, pesan = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  return { ok: a === b, pesan: pesan || `harapan: ${b} · faktanya: ${a}` };
}

export function benar(nilai, pesan = "") {
  return { ok: nilai === true, pesan: pesan || `harapan: true · faktanya: ${tampil(nilai)}` };
}

function tampil(nilai) {
  if (typeof nilai === "string") return JSON.stringify(nilai);
  return String(nilai);
}
```

- [ ] **Step 3: Tulis kasus uji format — `tests/cases.js`**

```js
import { eq, deepEq, benar } from "./harness.js";
import {
  formatRupiah, parseRupiah, formatTanggal, formatTanggalPendek,
  formatJam, id, tengahMalam, awalTujuhHari,
} from "../js/format.js";

export function daftarKasus({ test }) {
  // ---- format rupiah ----
  test("formatRupiah memformat ribuan dengan titik", () =>
    eq(formatRupiah(22000), "Rp 22.000"));

  test("formatRupiah menangani angka besar", () =>
    eq(formatRupiah(1234567), "Rp 1.234.567"));

  test("formatRupiah mengubah 0 menjadi Rp 0", () =>
    eq(formatRupiah(0), "Rp 0"));

  test("formatRupiah aman untuk input bukan angka", () =>
    eq(formatRupiah(NaN), "Rp 0"));

  test("formatRupiah membulatkan pecahan ke bawahnya", () =>
    eq(formatRupiah(22000.6), "Rp 22.001"));

  // ---- parse rupiah ----
  test("parseRupiah membaca titik sebagai pemisah ribuan", () =>
    eq(parseRupiah("22.000"), 22000));

  test("parseRupiah membaca angka polos", () =>
    eq(parseRupiah("22000"), 22000));

  test("parseRupiah membuang prefix Rp", () =>
    eq(parseRupiah("Rp 22.000"), 22000));

  test("parseRupiah mengembalikan 0 untuk teks", () =>
    eq(parseRupiah("abc"), 0));

  test("parseRupiah mengembalikan 0 untuk string kosong", () =>
    eq(parseRupiah(""), 0));

  test("parseRupiah menangani null dan undefined", () =>
    eq(parseRupiah(null) + parseRupiah(undefined), 0));

  test("parseRupiah menerima angka langsung", () =>
    eq(parseRupiah(22000), 22000));

  test("format dan parse rupiah bolak-balik konsisten", () =>
    eq(parseRupiah(formatRupiah(88000)), 88000));

  // ---- tanggal ----
  test("formatTanggal menghasilkan nama hari dan tanggal", () =>
    eq(formatTanggal(new Date(2026, 9, 6)), "Sab, 6 Okt 2026"));

  test("formatTanggalPendek memakai format dd/mm/yyyy", () =>
    eq(formatTanggalPendek(new Date(2026, 9, 6)), "06/10/2026"));

  test("formatJam memakai 24 jam dengan nol di depan", () =>
    eq(formatJam(new Date(2026, 9, 6, 10, 4)), "10:04"));

  test("formatJam menangani tengah malam sebagai 00:00", () =>
    eq(formatJam(new Date(2026, 9, 6, 0, 0)), "00:00"));

  // ---- rentang tanggal ----
  test("tengahMalam menganapkan jam tanpa mengubah tanggal", () =>
    deepEq(tengahMalam(new Date(2026, 9, 6, 23, 59)), new Date(2026, 9, 6)));

  test("tengahMalam tidak mengubah objek aslinya", () =>
    benar(new Date(2026, 9, 6, 23, 59) !== tengahMalam(new Date(2026, 9, 6, 23, 59))));

  test("awalTujuhHari mundur 6 hari sehingga totalnya 7 hari termasuk hari ini", () =>
    deepEq(awalTujuhHari(new Date(2026, 9, 6)), new Date(2026, 8, 30)));

  // ---- id ----
  test("id menghasilkan nilai yang selalu berbeda", () =>
    benar(new Set([id(), id(), id(), id(), id()]).size === 5));

  test("id mengembalikan string", () =>
    benar(typeof id() === "string"));
}
```

> Catatan: nama-nama fungsi yang diuji **wajib** persis: `formatRupiah`, `parseRupiah`, `formatTanggal`, `formatTanggalPendek`, `formatJam`, `id`, `tengahMalam`, `awalTujuhHari`.

- [ ] **Step 4: Tulis entry point test — `tests/app.test.js`**

```js
import test from "node:test";
import { daftarKasus } from "./cases.js";

daftarKasus({ test });
```

- [ ] **Step 5: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL dengan pesan `Cannot find module 'D:\\...\\js\\format.js'`

- [ ] **Step 6: Implementasikan `js/format.js`**

```js
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const pemisahRibuan = new Intl.NumberFormat("id-ID");

export function formatRupiah(n) {
  const angka = Number.isFinite(n) ? Math.round(n) : 0;
  return "Rp " + pemisahRibuan.format(angka);
}

export function parseRupiah(nilai) {
  if (typeof nilai === "number") return Number.isFinite(nilai) ? Math.round(nilai) : 0;
  const digit = String(nilai ?? "").replace(/\D/g, "");
  return digit ? parseInt(digit, 10) : 0;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatTanggal(d = new Date()) {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalPendek(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatJam(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function tengahMalam(d) {
  const salinan = new Date(d);
  salinan.setHours(0, 0, 0, 0);
  return salinan;
}

export function awalTujuhHari(d) {
  const salinan = tengahMalam(d);
  salinan.setDate(salinan.getDate() - 6);
  return salinan;
}

let urut = 0;
export function id() {
  urut += 1;
  return `${Date.now().toString(36)}-${urut.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
```

- [ ] **Step 7: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 22`, `# fail 0`

- [ ] **Step 8: Commit**

```bash
git add .gitignore tests/harness.js tests/cases.js tests/app.test.js js/format.js
git commit -m "feat: fondasi test harness dan format rupiah/tanggal"
```

---

### Task 2: `catalog.js` — fungsi murni produk & kategori

**Files:**
- Create: `js/catalog.js`
- Modify: `tests/cases.js` (tambah `import` dan blok kasus katalog)

**Interfaces:**
- Consumes: `format.js` — tidak ada. Modul ini murni, tanpa import.
- Produces:
  - `produkValid(p: unknown): boolean`
  - `normalisasiProduk(p: object): { id, name, price, category, active }`
  - `kategoriDari(products: object[]): string[]` — kategori unik dari produk **aktif**, terurut
  - `tambahProduk(products: object[], data: { name, price, category }): object[]`
  - `ubahProduk(products: object[], id: string, patch: object): object[]`
  - `hapusProduk(products: object[], id: string): object[]`
  - `alihkanAktif(products: object[], id: string): object[]`
  - `saringProduk(products: object[], { category, query, hanyaAktif }): object[]`

- [ ] **Step 1: Tambahkan kasus uji katalog yang gagal — `tests/cases.js`**

Tambahkan baris import di bagian atas:

```js
import {
  produkValid, normalisasiProduk, kategoriDari, tambahProduk,
  ubahProduk, hapusProduk, alihkanAktif, saringProduk,
} from "../js/catalog.js";
```

Tambahkan blok ini di akhir `daftarKasus`:

```js
  // ---- catalog ----
  const KOPI = { id: "p1", name: "Americano", price: 18000, category: "Kopi", active: true };
  const TEH = { id: "p2", name: "Teh", price: 8000, category: "Non-Kopi", active: true };
  const MATI = { id: "p3", name: "Kopi Susu Lama", price: 20000, category: "Kopi", active: false };

  test("produkValid menerima produk yang benar", () => benar(produkValid(KOPI)));

  test("produkValid menolak produk tanpa nama", () => benar(!produkValid({ ...KOPI, name: "  " })));
  test("produkValid menolak harga nol", () => benar(!produkValid({ ...KOPI, price: 0 })));
  test("produkValid menolak harga negatif", () => benar(!produkValid({ ...KOPI, price: -1 })));
  test("produkValid menolak harga pecahan", () => benar(!produkValid({ ...KOPI, price: 100.5 })));
  test("produkValid menolak objek null", () => benar(!produkValid(null)));
  test("produkValid menolak nilai primitif", () => benar(!produkValid("Americano")));

  test("normalisasiProduk memangkas spasi nama dan kategori", () =>
    deepEq(normalisasiProduk({ id: "p1", name: "  Americano ", price: 18000, category: " Kopi ", active: true }),
      { id: "p1", name: "Americano", price: 18000, category: "Kopi", active: true }));

  test("normalisasiProduk menganulkan active yang tidak boolean", () =>
    benar(normalisasiProduk({ id: "p1", name: "A", price: 1, category: "B", active: "ya" }).active === false));

  test("kategoriDari hanya menghitung produk aktif", () =>
    deepEq(kategoriDari([KOPI, TEH, MATI]), ["Kopi", "Non-Kopi"]));

  test("kategoriDari tidak menghasilkan duplikat", () =>
    deepEq(kategoriDari([KOPI, { ...KOPI, id: "p9" }, TEH]), ["Kopi", "Non-Kopi"]));

  test("kategoriDari mengurutkan secara alfabetis", () =>
    deepEq(kategoriDari([{ ...TEH, category: "Snack" }, KOPI]), ["Kopi", "Snack"]));

  test("kategoriDari mengembalikan array kosong bila tidak ada produk", () =>
    deepEq(kategoriDari([]), []));

  test("tambahProduk menambah produk baru tanpa mengubah array lama", () => {
    const lama = [KOPI];
    const baru = tambahProduk(lama, { name: "Matcha Latte", price: 26000, category: "Non-Kopi" });
    return deepEq([baru.length, lama.length], [2, 1]);
  });

  test("tambahProduk memberi id dan active default", () =>
    benar(typeof tambahProduk([], { name: "Teh", price: 8000, category: "Non-Kopi" })[0].id === "string"
      && tambahProduk([], { name: "Teh", price: 8000, category: "Non-Kopi" })[0].active === true));

  test("tambahProduk memberi id berbeda pada setiap panggilan", () => {
    const a = tambahProduk([], { name: "Teh", price: 8000, category: "Non-Kopi" })[0].id;
    const b = tambahProduk([], { name: "Teh", price: 8000, category: "Non-Kopi" })[0].id;
    return benar(a !== b);
  });

  test("ubahProduk hanya mengganti field yang diberikan", () =>
    deepEq(ubahProduk([KOPI], "p1", { price: 20000 })[0],
      { id: "p1", name: "Americano", price: 20000, category: "Kopi", active: true }));

  test("ubahProduk tidak menemukan id => array tidak berubah", () => {
    const lama = [KOPI];
    return deepEq([ubahProduk(lama, "tidak-ada", { price: 1 }).length, lama.length], [1, 1]);
  });

  test("hapusProduk membuang produk yang cocok", () =>
    deepEq(hapusProduk([KOPI, TEH], "p1"), [TEH]));

  test("hapusProduk dengan id yang tidak ada mengembalikan array kosong", () =>
    deepEq(hapusProduk([], "p1"), []));

  test("alihkanAktif membalik nilai active", () =>
    deepEq(alihkanAktif([KOPI], "p1")[0].active, false));

  test("alihkanAktif tidak menyentuh produk lain", () =>
    deepEq(alihkanAktif([KOPI, TEH], "p1"), [{ ...KOPI, active: false }, TEH]));

  test("saringProduk menyembunyikan produk nonaktif secara default", () =>
    deepEq(saringProduk([KOPI, TEH, MATI], { category: "Semua", query: "" }), [KOPI, TEH]));

  test("saringProduk menyaring berdasarkan kategori", () =>
    deepEq(saringProduk([KOPI, TEH], { category: "Non-Kopi", query: "" }), [TEH]));

  test("saringProduk menyaring berdasarkan nama tanpa regard case", () =>
    deepEq(saringProduk([KOPI, TEH], { category: "Semua", query: "amer" }), [KOPI]));

  test("saringProduk menyaring kategori dan nama sekaligus", () =>
    deepEq(saringProduk([KOPI, TEH, { ...KOPI, id: "p4", name: "Americano Dingin" }],
      { category: "Kopi", query: "dingin" }),
      [{ ...KOPI, id: "p4", name: "Americano Dingin" }]));

  test("saringProduk menyertakan produk nonaktif bila diminta", () =>
    deepEq(saringProduk([KOPI, MATI], { category: "Kopi", query: "", hanyaAktif: false }), [KOPI, MATI]));

  test("saringProduk mengembalikan array kosong bila tidak ada yang cocok", () =>
    deepEq(saringProduk([KOPI], { category: "Semua", query: "zzzz" }), []));
```

> Catatan: baris `"formatJam Handles..."` di Task 1 harus ditulis sebagai `"formatJam menangani tengah malam sebagai 00:00"`. Pastikan juga tidak ada karakter non-ASCII yang tersisip di dalam string pengujian lain.

- [ ] **Step 2: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL — `Cannot find module 'js/catalog.js'`. 26 test lama tetap lolos.

- [ ] **Step 3: Implementasikan `js/catalog.js`**

```js
import { id } from "./format.js";

export function produkValid(p) {
  if (!p || typeof p !== "object") return false;
  if (typeof p.id !== "string" || p.id === "") return false;
  if (typeof p.name !== "string" || p.name.trim() === "") return false;
  if (!Number.isInteger(p.price) || p.price <= 0) return false;
  if (typeof p.category !== "string" || p.category.trim() === "") return false;
  return true;
}

export function normalisasiProduk(p) {
  return {
    id: String(p.id),
    name: String(p.name).trim(),
    price: Math.round(Number(p.price)) || 0,
    category: String(p.category).trim(),
    active: p.active === true,
  };
}

export function kategoriDari(products) {
  const set = new Set();
  for (const p of products) if (p && p.active === true && typeof p.category === "string") set.add(p.category);
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

export function tambahProduk(products, data) {
  return [...products, normalisasiProduk({
    id: id(),
    name: data.name,
    price: data.price,
    category: data.category,
    active: true,
  })];
}

export function ubahProduk(products, idProduk, patch) {
  return products.map((p) => (p.id === idProduk ? normalisasiProduk({ ...p, ...patch, id: p.id }) : p));
}

export function hapusProduk(products, idProduk) {
  return products.filter((p) => p.id !== idProduk);
}

export function alihkanAktif(products, idProduk) {
  return products.map((p) => (p.id === idProduk ? { ...p, active: p.active !== true } : p));
}

export function saringProduk(products, { category = "Semua", query = "", hanyaAktif = true } = {}) {
  const cari = String(query ?? "").trim().toLowerCase();
  return products.filter((p) => {
    if (hanyaAktif && p.active !== true) return false;
    if (category && category !== "Semua" && p.category !== category) return false;
    if (cari && !p.name.toLowerCase().includes(cari)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 50`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/catalog.js tests/cases.js
git commit -m "feat: katalog produk - validasi, CRUD, turunan kategori, saringan"
```

---

### Task 3: `cart.js` — fungsi murni keranjang

**Files:**
- Create: `js/cart.js`
- Modify: `tests/cases.js`

**Interfaces:**
- Consumes: `format.js` — tidak ada. Modul ini murni.
- Produces:
  - `BATAS_QTY = 99`
  - `tambahKeKeranjang(cart: object[], produk: object): object[]`
  - `setQtyKeranjang(cart: object[], productId: string, qty: number): object[]`
  - `hapusDariKeranjang(cart: object[], productId: string): object[]`
  - `kosongkanKeranjang(): object[]`
  - `totalKeranjang(cart: object[]): number`
  - `jumlahItemKeranjang(cart: object[]): number`
  - `hitungKembalian(subtotal: number, received: number): number | null`
  - `kodeBerikutnya(transactions: object[]): string`

- [ ] **Step 1: Tambahkan kasus uji keranjang yang gagal — `tests/cases.js`**

Tambahkan import:

```js
import {
  BATAS_QTY, tambahKeKeranjang, setQtyKeranjang, hapusDariKeranjang,
  kosongkanKeranjang, totalKeranjang, jumlahItemKeranjang, hitungKembalian,
  kodeBerikutnya,
} from "../js/cart.js";
```

Tambahkan blok di akhir `daftarKasus`:

```js
  // ---- cart ----
  const P = { id: "p1", name: "Americano", price: 18000, category: "Kopi", active: true };

  test("tambahKeKeranjang membuat baris baru dengan qty 1", () =>
    deepEq(tambahKeKeranjang([], P), [{ productId: "p1", name: "Americano", price: 18000, qty: 1 }]));

  test("tambahKeKeranjang menggabungkan produk yang sama, bukan menambah baris", () =>
    deepEq(tambahKeKeranjang(tambahKeKeranjang([], P), P),
      [{ productId: "p1", name: "Americano", price: 18000, qty: 2 }]));

  test("tambahKeKeranjang menyimpan snapshot nama dan harga", () => {
    const isi = tambahKeKeranjang([], P);
    return deepEq(isi, [{ productId: "p1", name: "Americano", price: 18000, qty: 1 }]);
  });

  test("tambahKeKeranjang tidak mengubah array asal", () => {
    const lama = [];
    tambahKeKeranjang(lama, P);
    return benar(lama.length === 0);
  });

  test("tambahKeKeranjang tidak mengubah qty yang sudah ada saat produk berbeda", () => {
    const isi = tambahKeKeranjang([], P);
    const dua = tambahKeKeranjang(isi, { ...P, id: "p2", name: "Teh", price: 8000 });
    return deepEq(dua.map((i) => [i.productId, i.qty]), [["p1", 1], ["p2", 1]]);
  });

  test("setQtyKeranjang mengubah qty sesuai nilai", () =>
    deepEq(setQtyKeranjang(tambahKeKeranjang([], P), "p1", 5)[0].qty, 5));

  test("setQtyKeranjang membatasi qty di 99", () =>
    deepEq(setQtyKeranjang(tambahKeKeranjang([], P), "p1", 100)[0].qty, BATAS_QTY));

  test("setQtyKeranjang memotong qty pecahan", () =>
    deepEq(setQtyKeranjang(tambahKeKeranjang([], P), "p1", 3.9)[0].qty, 3));

  test("setQtyKeranjang dengan qty di bawah 1 menghapus baris", () =>
    deepEq(setQtyKeranjang(tambahKeKeranjang([], P), "p1", 0), []));

  test("setQtyKeranjang dengan qty negatif menghapus baris", () =>
    deepEq(setQtyKeranjang(tambahKeKeranjang([], P), "p1", -5), []));

  test("setQtyKeranjang dengan id yang tidak ada tidak mengubah apa pun", () => {
    const isi = tambahKeKeranjang([], P);
    return deepEq(setQtyKeranjang(isi, "tidak-ada", 9), isi);
  });

  test("hapusDariKeranjang membuang baris yang cocok", () => {
    const isi = tambahKeKeranjang(tambahKeKeranjang([], P), { ...P, id: "p2" });
    return deepEq(hapusDariKeranjang(isi, "p1").map((i) => i.productId), ["p2"]);
  });

  test("hapusDariKeranjang dengan id yang tidak ada mengembalikan array kosong", () =>
    deepEq(hapusDariKeranjang([], "p1"), []));

  test("kosongkanKeranjang selalu mengembalikan array kosong", () =>
    deepEq(kosongkanKeranjang(), []));

  test("totalKeranjang menjumlahkan harga kali qty", () => {
    const isi = setQtyKeranjang(tambahKeKeranjang([], P), "p1", 2);
    return eq(totalKeranjang(isi), 36000);
  });

  test("totalKeranjang menjumlahkan beberapa baris", () => {
    let isi = setQtyKeranjang(tambahKeKeranjang([], P), "p1", 2);
    isi = setQtyKeranjang(tambahKeKeranjang(isi, { ...P, id: "p2", name: "Teh", price: 8000 }), "p2", 1);
    return eq(totalKeranjang(isi), 44000);
  });

  test("totalKeranjang keranjang kosong adalah 0", () => eq(totalKeranjang([]), 0));

  test("jumlahItemKeranjang menjumlahkan qty semua baris", () => {
    let isi = setQtyKeranjang(tambahKeKeranjang([], P), "p1", 2);
    isi = setQtyKeranjang(tambahKeKeranjang(isi, { ...P, id: "p2", price: 8000 }), "p2", 3);
    return eq(jumlahItemKeranjang(isi), 5);
  });

  test("hitungKembalian menghitung selisih uang diterima", () =>
    eq(hitungKembalian(62000, 100000), 38000));

  test("hitungKembalian mengembalikan 0 saat uang pas", () =>
    eq(hitungKembalian(62000, 62000), 0));

  test("hitungKembalian mengembalikan null saat uang kurang", () =>
    eq(hitungKembalian(62000, 50000), null));

  test("hitungKembalian mengembalikan null untuk uang diterima bukan integer", () =>
    eq(hitungKembalian(62000, 100000.5), null));

  test("kodeBerikuttee mulai dari nomor 1", () =>
    eq(kodeBerikutnya([]), "#TRX-0001"));

  test("kodeBerikutnya bertambah sesuai jumlah transaksi", () =>
    eq(kodeBerikutnya([{}, {}, {}]), "#TRX-0004"));

  test("kodeBerikutnya memakai empat digit", () =>
    eq(kodeBerikutnya(new Array(9999).fill({})), "#TRX-10000"));
```

> Catatan: nama fungsi yang diuji wajib persis `kodeBerikutnya`.

- [ ] **Step 2: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL — `Cannot find module 'js/cart.js'`

- [ ] **Step 3: Implementasikan `js/cart.js`**

```js
export const BATAS_QTY = 99;

export function tambahKeKeranjang(cart, produk) {
  const ada = cart.find((i) => i.productId === produk.id);
  if (ada) {
    return cart.map((i) =>
      i.productId === produk.id ? { ...i, qty: Math.min(BATAS_QTY, i.qty + 1) } : i);
  }
  return [...cart, { productId: produk.id, name: produk.name, price: produk.price, qty: 1 }];
}

export function setQtyKeranjang(cart, productId, qty) {
  const angka = Math.trunc(Number(qty) || 0);
  if (angka < 1) return hapusDariKeranjang(cart, productId);
  return cart.map((i) => (i.productId === productId ? { ...i, qty: Math.min(BATAS_QTY, angka) } : i));
}

export function hapusDariKeranjang(cart, productId) {
  return cart.filter((i) => i.productId !== productId);
}

export function kosongkanKeranjang() {
  return [];
}

export function totalKeranjang(cart) {
  return cart.reduce((jumlah, i) => jumlah + i.price * i.qty, 0);
}

export function jumlahItemKeranjang(cart) {
  return cart.reduce((jumlah, i) => jumlah + i.qty, 0);
}

export function hitungKembalian(subtotal, received) {
  if (!Number.isInteger(received) || received < subtotal) return null;
  return received - subtotal;
}

export function kodeBerikutnya(transactions) {
  return `#TRX-${String(transactions.length + 1).padStart(4, "0")}`;
}
```

- [ ] **Step 4: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 75`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/cart.js tests/cases.js
git commit -m "feat: keranjang - tambah, batas qty, total, hitung kembalian"
```

---

### Task 4: `reports.js` — agregasi transaksi

**Files:**
- Create: `js/reports.js`
- Modify: `tests/cases.js`

**Interfaces:**
- Consumes: `format.js` → `tengahMalam`, `awalTujuhHari`. `cart.js` → tidak.
- Produces:
  - `RENTANG = { HARI_INI: "hari-ini", TUJUH_HARI: "tujuh-hari", SEMUA: "semua" }`
  - `transaksiDalamRentang(transactions: object[], rentang: string, sekarang?: Date): object[]`
  - `ringkasan(transactions: object[]): { omzet, jumlah, rataRata, terlaris, perMetode }`
    - `terlaris` = `{ productId, name, qty }` atau `null`
    - `perMetode` = `{ tunai, qris, transfer }`

- [ ] **Step 1: Tambahkan kasus uji laporan yang gagal — `tests/cases.js`**

Tambahkan import:

```js
import { RENTANG, transaksiDalamRentang, ringkasan } from "../js/reports.js";
```

Tambahkan helper dan blok di akhir `daftarKasus`:

```js
  // ---- reports ----
  function trx(jam, subtotal, items = [], method = "tunai") {
    return {
      id: `t${jam}-${subtotal}`,
      code: "#TRX",
      items,
      subtotal,
      payment: { method, received: subtotal, change: 0 },
      createdAt: new Date(2026, 9, 6, jam).toISOString(),
    };
  }

  const KEMARIN = trx(10, 50000, [{ productId: "p1", name: "Americano", price: 18000, qty: 2 }]);
  KEMARIN.createdAt = new Date(2026, 9, 5, 10).toISOString();

  const SIANG = trx(12, 62000, [{ productId: "p1", name: "Americano", price: 18000, qty: 1 }]);
  const MALAM = trx(23, 8000, [{ productId: "p2", name: "Teh", price: 8000, qty: 1 }]);

  test("transaksiDalamRentang dengan SEMUA mengembalikan semua transaksi", () =>
    eq(transaksiDalamRentang([KEMARIN, SIANG], RENTANG.SEMUA).length, 2));

  test("transaksiDalamRentang HARI_INI hanya mengambil hari ini", () =>
    eq(transaksiDalamRentang([KEMARIN, SIANG], RENTANG.HARI_INI).length, 1));

  test("transaksiDalamRentang TUJUH_HARI mengambil 7 hari kalender termasuk hari ini", () =>
    eq(transaksiDalamRentang([KEMARIN, SIANG], RENTANG.TUJUH_HARI).length, 2));

  test("transaksiDalamRentang memasukkan transaksi tepat tengah malam", () =>
    eq(transaksiDalamRentang([trx(0, 1000)], RENTANG.HARI_INI, new Date(2026, 9, 6)).length, 1));

  test("transaksiDalamRentang memasukkan transaksi jam 2359 sebagai hari yang sama", () =>
    eq(transaksiDalamRentang([trx(23, 1000)], RENTANG.HARI_INI, new Date(2026, 9, 6)).length, 1));

  test("transaksiDalamRentang tidak memasukkan transaksi besok", () => {
    const besok = trx(10, 1000);
    besok.createdAt = new Date(2026, 9, 7, 10).toISOString();
    return eq(transaksiDalamRentang([besok], RENTANG.HARI_INI, new Date(2026, 9, 6)).length, 0);
  });

  test("transaksiDalamRentang tidak mengubah array asal", () => {
    const asli = [KEMARIN, SIANG];
    transaksiDalamRentang(asli, RENTANG.HARI_INI);
    return eq(asli.length, 2);
  });

  test("ringkasan menghitung omzet dari seluruh subtotal", () =>
    eq(ringkasan([SIANG, MALAM]).omzet, 70000));

  test("ringkasan menghitung jumlah transaksi", () =>
    eq(ringkasan([SIANG, MALAM]).jumlah, 2));

  test("ringkasan menghitung rata-rata transaksi", () =>
    eq(ringkasan([SIANG, MALAM]).rataRata, 35000));

  test("ringkasan dari array kosong menghasilkan omzet 0", () =>
    eq(ringkasan([]).omzet, 0));

  test("ringkasan dari array kosong menghasilkan jumlah 0", () =>
    eq(ringkasan([]).jumlah, 0));

  test("ringkasan dari array kosong menghasilkan rata-rata 0, bukan NaN", () =>
    eq(ringkasan([]).rataRata, 0));

  test("ringkasan dari array kosong menghasilkan terlaris null", () =>
    eq(ringkasan([]).terlaris, null));

  test("ringkasan menemukan produk dengan qty terbanyak", () => {
    const a = trx(10, 100, [{ productId: "p1", name: "Teh", price: 8000, qty: 1 }]);
    const b = trx(11, 100, [{ productId: "p2", name: "Americano", price: 18000, qty: 3 }]);
    return deepEq(ringkasan([a, b]).terlaris, { productId: "p2", name: "Americano", qty: 3 });
  });

  test("ringkasan menjumlahkan qty produk yang sama dari beberapa transaksi", () => {
    const a = trx(10, 100, [{ productId: "p1", name: "Teh", price: 8000, qty: 2 }]);
    const b = trx(11, 100, [{ productId: "p1", name: "Teh", price: 8000, qty: 3 }]);
    return eq(ringkasan([a, b]).terlaris.qty, 5);
  });

  test("ringkasan mengelompokkan produk berdasarkan productId, bukan nama", () => {
    const a = trx(10, 100, [{ productId: "p1", name: "Teh Lama", price: 8000, qty: 2 }]);
    const b = trx(11, 100, [{ productId: "p1", name: "Teh Baru", price: 8000, qty: 2 }]);
    const hasil = ringkasan([a, b]).terlaris;
    return eq(hasil.qty, 4);
  });

  test("ringkasan memecah omzet per metode pembayaran", () => {
    const a = trx(10, 20000, [], "tunai");
    const b = trx(11, 15000, [], "qris");
    const c = trx(12, 7000, [], "transfer");
    return deepEq(ringkasan([a, b, c]).perMetode, { tunai: 20000, qris: 15000, transfer: 7000 });
  });

  test("ringkasan mengabaikan metode pembayaran yang tidak dikenal", () => {
    const a = trx(10, 20000, [], "kripto");
    return deepEq(ringkasan([a]).perMetode, { tunai: 0, qris: 0, transfer: 0 });
  });

  test("ringkasan tidak melempar error untuk transaksi tanpa items", () =>
    eq(ringkasan([trx(10, 1000, [])]).omzet, 1000));

  test("ringkasan menggabungkan transaksi dari rentang berbeda", () =>
    eq(ringkasan([KEMARIN, SIANG, MALAM]).jumlah, 3));
```

> Catatan: penamaan test di atas memakai huruf besar-kecil yang konsisten dengan gaya penamaan fungsi proyek.

- [ ] **Step 2: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL — `Cannot find module 'js/reports.js'`

- [ ] **Step 3: Implementasikan `js/reports.js`**

```js
import { tengahMalam, awalTujuhHari } from "./format.js";

export const RENTANG = {
  HARI_INI: "hari-ini",
  TUJUH_HARI: "tujuh-hari",
  SEMUA: "semua",
};

export function transaksiDalamRentang(transactions, rentang, sekarang = new Date()) {
  if (rentang === RENTANG.SEMUA) return transactions.slice();
  const mulai = rentang === RENTANG.TUJUH_HARI ? awalTujuhHari(sekarang) : tengahMalam(sekarang);
  return transactions.filter((t) => new Date(t.createdAt).getTime() >= mulai.getTime());
}

export function ringkasan(transactions) {
  const perMetode = { tunai: 0, qris: 0, transfer: 0 };
  const kuantitas = new Map();

  for (const t of transactions) {
    const metode = t.payment ? t.payment.method : null;
    if (metode && Object.hasOwn(perMetode, metode)) perMetode[metode] += t.subtotal;
    for (const item of t.items || []) {
      const lama = kuantitas.get(item.productId);
      kuantitas.set(item.productId, { name: item.name, qty: (lama ? lama.qty : 0) + item.qty });
    }
  }

  let terlaris = null;
  for (const [productId, data] of kuantitas) {
    if (!terlaris || data.qty > terlaris.qty) terlaris = { productId, name: data.name, qty: data.qty };
  }

  const omzet = transactions.reduce((jumlah, t) => jumlah + t.subtotal, 0);

  return {
    omzet,
    jumlah: transactions.length,
    rataRata: transactions.length ? Math.round(omzet / transactions.length) : 0,
    terlaris,
    perMetode,
  };
}
```

- [ ] **Step 4: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 96`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/reports.js tests/cases.js
git commit -m "feat: laporan - penyaringan rentang tanggal, omzet, terlaris, per metode"
```

---

### Task 5: `seed.js` — data menu awal TeKo

**Files:**
- Create: `js/seed.js`
- Modify: `tests/cases.js`

**Interfaces:**
- Consumes: `catalog.js` → `produkValid` (dipakai oleh test, bukan oleh `seed.js` itu sendiri)
- Produces: `SEED_PRODUK: object[]` — 13 produk, 3 kategori, semua `active: true`

- [ ] **Step 1: Tambahkan kasus uji seed yang gagal — `tests/cases.js`**

Tambahkan import:

```js
import { SEED_PRODUK } from "../js/seed.js";
```

Tambahkan blok di akhir `daftarKasus`:

```js
  // ---- seed ----
  test("seed berisi 13 produk", () => eq(SEED_PRODUK.length, 13));

  test("semua produk seed lolos validasi", () =>
    benar(SEED_PRODUK.every((p) => produkValid(p))));

  test("seed memuat tepat 3 kategori", () =>
    deepEq(kategoriDari(SEED_PRODUK), ["Kopi", "Non-Kopi", "Snack"]));

  test("seed memuat kategori Kopi dengan 5 produk", () =>
    eq(SEED_PRODUK.filter((p) => p.category === "Kopi").length, 5));

  test("seed memuat kategori Non-Kopi dengan 4 produk", () =>
    eq(SEED_PRODUK.filter((p) => p.category === "Non-Kopi").length, 4));

  test("seed memuat kategori Snack dengan 4 produk", () =>
    eq(SEED_PRODUK.filter((p) => p.category === "Snack").length, 4));

  test("semua produk seed aktif", () =>
    benar(SEED_PRODUK.every((p) => p.active === true)));

  test("id produk seed unik", () =>
    benar(new Set(SEED_PRODUK.map((p) => p.id)).size === SEED_PRODUK.length));

  test("semua harga seed adalah integer positif", () =>
    benar(SEED_PRODUK.every((p) => Number.isInteger(p.price) && p.price > 0)));

  test("harga seed termurah adalah Teh 8000", () =>
    eq(Math.min(...SEED_PRODUK.map((p) => p.price)), 8000));

  test("harga seed termahal adalah Matcha Aren 28000", () =>
    eq(Math.max(...SEED_PRODUK.map((p) => p.price)), 28000));
```

- [ ] **Step 2: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL — `Cannot find module 'js/seed.js'`

- [ ] **Step 3: Implementasikan `js/seed.js`**

```js
export const SEED_PRODUK = [
  { id: "seed-01", name: "Kopi Susu Gula Aren", price: 22000, category: "Kopi", active: true },
  { id: "seed-02", name: "Americano", price: 18000, category: "Kopi", active: true },
  { id: "seed-03", name: "Cappuccino", price: 24000, category: "Kopi", active: true },
  { id: "seed-04", name: "Kopi Susu Sirup", price: 20000, category: "Kopi", active: true },
  { id: "seed-05", name: "Manual Brew", price: 25000, category: "Kopi", active: true },
  { id: "seed-06", name: "Matcha Latte", price: 26000, category: "Non-Kopi", active: true },
  { id: "seed-07", name: "Matcha Aren", price: 28000, category: "Non-Kopi", active: true },
  { id: "seed-08", name: "Chocolate", price: 24000, category: "Non-Kopi", active: true },
  { id: "seed-09", name: "Teh", price: 8000, category: "Non-Kopi", active: true },
  { id: "seed-10", name: "Roti Bakar", price: 15000, category: "Snack", active: true },
  { id: "seed-11", name: "Croissant", price: 18000, category: "Snack", active: true },
  { id: "seed-12", name: "Cookies", price: 12000, category: "Snack", active: true },
  { id: "seed-13", name: "Kentang Goreng", price: 20000, category: "Snack", active: true },
];
```

- [ ] **Step 4: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 107`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/seed.js tests/cases.js
git commit -m "feat: data menu awal TeKo (13 produk, 3 kategori)"
```

---

### Task 6: `store.js` — state tunggal, persistensi, ketahanan error

Ini task terpenting di seluruh plan. Semua akses `localStorage` terkumpul di sini.

**Files:**
- Create: `js/store.js`
- Modify: `tests/cases.js`

**Interfaces:**
- Consumes:
  - `format.js` → `id`
  - `catalog.js` → `produkValid`, `kategoriDari`, `tambahProduk`, `ubahProduk`, `hapusProduk`, `alihkanAktif`, `saringProduk`
  - `cart.js` → `tambahKeKeranjang`, `setQtyKeranjang`, `hapusDariKeranjang`, `kosongkanKeranjang`, `totalKeranjang`, `jumlahItemKeranjang`, `hitungKembalian`, `kodeBerikutnya`
  - `reports.js` → `transaksiDalamRentang`, `ringkasan`
  - `seed.js` → `SEED_PRODUK`
- Produces:
  - `STORAGE_KEY = "teko:v1"`
  - `buatStore({ storage, seed, sekarang } = {})` → objek store
  - Bentuk state:
    ```text
    {
      products: object[],
      transactions: object[],
      cart: object[],
      peringatan: string[],        // "data-rusak" | "produk-dilewati" | "transaksi-dilewati"
      dataMentah: string | null,   // isi storage yang gagal di-parse
      storageTersedia: boolean,
      storagePenuh: boolean,
    }
    ```
  - API store:
    ```text
    getState(), subscribe(fn) -> unsubscribe,
    kategori(), saringProduk(filter),
    tambahProduk({name, price, category}), ubahProduk(id, patch),
    hapusProduk(id), alihkanAktif(id),
    tambahKeKeranjang(productId), setQty(productId, qty),
    hapusItem(productId), kosongkanKeranjang(),
    selesaikanTransaksi({ method, received }) -> { ok: true, transaksi } | { ok: false, alasan },
    laporan(rentang), transaksiRentang(rentang),
    resetSemua()
    ```
  - Nilai `alasan` yang mungkin: `"keranjang-kosong"`, `"metode-tidak-valid"`, `"uang-kurang"`, `"gagal-simpan"`, `"ditutup"` (hanya dari `checkout.js`, bukan dari `store.js`)

**Catatan desain penting:** `storage` di-inject, bukan diakses lewat `globalThis.localStorage`. Itulah yang membuat kasus "localStorage diblokir" dan "penyimpanan penuh" bisa diuji tanpa memalsukan browser.

- [ ] **Step 1: Tambahkan kasus uji store yang gagal — `tests/cases.js`**

Tambahkan import:

```js
import { STORAGE_KEY, buatStore } from "../js/store.js";
```

Tambahkan helper di dalam `daftarKasus` (sebelum blok store):

```js
  function penyimpananPalsu(isiAwal) {
    const isi = new Map(isiAwal ? [[STORAGE_KEY, isiAwal]] : []);
    return {
      getItem: (k) => (isi.has(k) ? isi.get(k) : null),
      setItem: (k, v) => { isi.set(k, v); },
      removeItem: (k) => { isi.delete(k); },
      peek: () => isi.get(STORAGE_KEY),
    };
  }

  function penyimpananDiblokir() {
    return {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    };
  }

  function penyimpananPenuh(isiAwal) {
    const isi = new Map(isiAwal ? [[STORAGE_KEY, isiAwal]] : []);
    return {
      getItem: (k) => (isi.has(k) ? isi.get(k) : null),
      setItem() { throw new Error("QuotaExceededError"); },
      removeItem: (k) => { isi.delete(k); },
    };
  }

  function storeDengan(penyimpanan, seed = [{ id: "a", name: "Teh", price: 8000, category: "Non-Kopi", active: true }]) {
    return buatStore({ storage: penyimpanan, seed, sekarang: () => new Date(2026, 9, 6, 10, 0) });
  }
```

Tambahkan blok di akhir `daftarKasus`:

```js
  // ---- store ----
  test("store tanpa storage berjalan di memori", () => {
    const s = buatStore({ storage: null, seed: [] });
    return eq(s.getState().storageTersedia, false);
  });

  test("store memuat seed saat storage kosong", () =>
    eq(storeDengan(penyimpananPalsu()).getState().products.length, 1));

  test("store menulis seed ke storage pada inisialisasi", () => {
    const p = penyimpananPalsu();
    storeDengan(p);
    return benar(typeof p.peek() === "string" && JSON.parse(p.peek()).products.length === 1);
  });

  test("store membaca produk yang sudah tersimpan sebelumnya", () => {
    const p = penyimpananPalsu(JSON.stringify({
      products: [{ id: "z", name: "Tersimpan", price: 1000, category: "Kopi", active: true }],
      transactions: [],
    }));
    return eq(storeDengan(p).getState().products[0].name, "Tersimpan");
  });

  test("store menandai storageTersedia false saat getItem melempar error", () =>
    eq(storeDengan(penyimpananDiblokir()).getState().storageTersedia, false));

  test("store memakai seed saat storage diblokir", () =>
    eq(storeDengan(penyimpananDiblokir()).getState().products.length, 1));

  test("store memakai seed saat JSON rusak, tanpa melempar error", () => {
    const s = storeDengan(penyimpananPalsu("{ ini bukan json"));
    return eq(s.getState().products.length, 1);
  });

  test("store menandai peringatan data-rusak saat JSON gagal di-parse", () =>
    benar(storeDengan(penyimpananPalsu("{ rusak")).getState().peringatan.includes("data-rusak")));

  test("store menyimpan isi mentah yang rusak untuk diunduh", () =>
    eq(storeDengan(penyimpananPalsu("{ rusak")).getState().dataMentah, "{ rusak"));

  test("store membuang produk tidak valid dan memberi peringatan", () => {
    const p = penyimpananPalsu(JSON.stringify({
      products: [{ id: "a", name: "Baik", price: 1000, category: "Kopi", active: true },
                 { id: "b", name: "Buruk", price: -5, category: "Kopi", active: true }],
      transactions: [],
    }));
    const s = storeDengan(p);
    return deepEq([s.getState().products.length, s.getState().peringatan.includes("produk-dilewati")], [1, true]);
  });

  test("keranjang dimulai kosong", () => eq(storeDengan(penyimpananPalsu()).getState().cart.length, 0));

  test("keranjang tidak pernah ditulis ke storage", () => {
    const p = penyimpananPalsu();
    const s = storeDengan(p);
    s.tambahKeKeranjang("a");
    return benar(JSON.parse(p.peek()).cart === undefined);
  });

  test("tambahKeKeranjang menambahkan produk ke keranjang", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.getState().cart.length, 1);
  });

  test("tambahKeKeranjang bekerja pada store", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.tambahKeKeranjang("a");
    return eq(s.getState().cart[0].qty, 2);
  });

  test("tambahKeKeranjang mengabaikan produk yang tidak ada", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("tidak-ada");
    return eq(s.getState().cart.length, 0);
  });

  test("tambahKeKeranjang menggabungkan produk yang sama", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.tambahKeKeranjang("a");
    return eq(s.getState().cart[0].qty, 2);
  });

  test("setQty mengubah qty di store", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.setQty("a", 4);
    return eq(s.getState().cart[0].qty, 4);
  });

  test("setQty dengan qty 0 menghapus baris", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.setQty("a", 0);
    return eq(s.getState().cart.length, 0);
  });

  test("hapusItem menghapus baris", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.hapusItem("a");
    return eq(s.getState().cart.length, 0);
  });

  test("kosongkanKeranjang mengosongkan seluruh isi", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.kosongkanKeranjang();
    return eq(s.getState().cart.length, 0);
  });

  test("tambahProduk menambah produk dan langsung tersimpan", () => {
    const p = penyimpananPalsu();
    const s = storeDengan(p);
    s.tambahProduk({ name: "Croissant", price: 18000, category: "Snack" });
    return deepEq([s.getState().products.length, JSON.parse(p.peek()).products.length], [2, 2]);
  });

  test("tambahProduk memangkas spasi pada nama", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahProduk({ name: "  Matcha  ", price: 26000, category: "Non-Kopi" });
    return eq(s.getState().products[1].name, "Matcha");
  });

  test("hapusProduk menghapus dari state dan dari storage", () => {
    const p = penyimpananPalsu();
    const s = storeDengan(p);
    s.hapusProduk("a");
    return deepEq([s.getState().products.length, JSON.parse(p.peek()).products.length], [0, 0]);
  });

  test("alihkanAktif membalik status di state", () => {
    const s = storeDengan(penyimpananPalsu());
    s.alihkanAktif("a");
    return eq(s.getState().products[0].active, false);
  });

  test("kategori hanya memuat kategori produk aktif", () => {
    const s = storeDengan(penyimpananPalsu());
    s.alihkanAktif("a");
    return deepEq(s.kategori(), []);
  });

  test("saringProduk memakai saringan katalog", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahProduk({ name: "Matcha Latte", price: 26000, category: "Non-Kopi" });
    return eq(s.saringProduk({ category: "Non-Kopi", query: "" }).length, 1);
  });

  test("subscribe memberi tahu saat produk berubah", () => {
    const s = storeDengan(penyimpananPalsu());
    let dipanggil = 0;
    s.subscribe(() => { dipanggil += 1; });
    s.tambahProduk({ name: "X", price: 1000, category: "Y" });
    return benar(dipanggil > 0);
  });

  test("subscribe tidak dipanggil tanpa perubahan", () => {
    const s = storeDengan(penyimpananPalsu());
    let dipanggil = 0;
    s.subscribe(() => { dipanggil += 1; });
    s.getState();
    return eq(dipanggil, 0);
  });

  test("unsubscribe menghentikan notifikasi", () => {
    const s = storeDengan(penyimpananPalsu());
    let dipanggil = 0;
    const off = s.subscribe(() => { dipanggil += 1; });
    off();
    s.tambahProduk({ name: "X", price: 1000, category: "Y" });
    return eq(dipanggil, 0);
  });

  test("selesaikanTransaksi menolak keranjang kosong", () =>
    deepEq(storeDengan(penyimpananPalsu()).selesaikanTransaksi({ method: "tunai", received: 10000 }).alasan,
      "keranjang-kosong"));

  test("selesaikanTransaksi menolak metode yang tidak dikenal", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "kripto", received: 8000 }).alasan, "metode-tidak-valid");
  });

  test("selesaikanTransaksi menolak uang kurang untuk metode tunai", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "tunai", received: 5000 }).alasan, "uang-kurang");
  });

  test("selesaikanTransaksi tunai menghitung kembalian", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "tunai", received: 20000 }).transaksi.payment.change, 12000);
  });

  test("selesaikanTransaksi tunai mencatat received apa adanya", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "tunai", received: 20000 }).transaksi.payment.received, 20000);
  });

  test("selesaikanTransaksi QRIS mengisi received dengan subtotal", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    const hasil = s.selesaikanTransaksi({ method: "qris", received: 0 });
    return deepEq([hasil.transaksi.payment.received, hasil.transaksi.payment.change], [8000, 0]);
  });

  test("selesaikanTransaksi memberi kode berurutan", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "qris", received: 0 }).transaksi.code, "#TRX-0001");
  });

  test("selesaikanTransaksi menyimpan snapshot nama dan harga", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.ubahProduk("a", { name: "Teh Ganti Nama", price: 9999 });
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "qris", received: 0 }).transaksi.items[0].name, "Teh");
  });

  test("selesaikanTransaksi mengosongkan keranjang", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.selesaikanTransaksi({ method: "qris", received: 0 });
    return eq(s.getState().cart.length, 0);
  });

  test("selesaikanTransaksi menambah transaksi ke state", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.selesaikanTransaksi({ method: "qris", received: 0 });
    return eq(s.getState().transactions.length, 1);
  });

  test("selesaikanTransaksi memakai waktu dari injeksi sekarang", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "qris", received: 0 }).transaksi.createdAt,
      new Date(2026, 9, 6, 10, 0).toISOString());
  });

  test("selesaikanTransaksi gagal saat storage penuh dan transaksi tidak tercatat", () => {
    const s = storeDengan(penyimpananPenuh());
    s.tambahKeKeranjang("a");
    const hasil = s.selesaikanTransaksi({ method: "qris", received: 0 });
    return deepEq([hasil.ok, hasil.alasan, s.getState().transactions.length], [false, "gagal-simpan", 0]);
  });

  test("store menandai storagePenuh saat setItem melempar error", () => {
    const s = storeDengan(penyimpananPenuh());
    s.tambahProduk({ name: "X", price: 1000, category: "Y" });
    return eq(s.getState().storagePenuh, true);
  });

  test("store tetap bisa dipakai di memori saat storage diblokir", () => {
    const s = storeDengan(penyimpananDiblokir());
    s.tambahKeKeranjang("a");
    return eq(s.selesaikanTransaksi({ method: "qris", received: 0 }).ok, true);
  });

  test("transaksi di memori hilang saat store dibuat ulang dari storage diblokir", () =>
    eq(storeDengan(penyimpananDiblokir()).getState().transactions.length, 0));

  test("laporan menghitung omzet dari transaksi store", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.selesaikanTransaksi({ method: "qris", received: 0 });
    return eq(s.laporan("semua").omzet, 8000);
  });

  test("transaksiRentang memakai rentang yang diminta", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.selesaikanTransaksi({ method: "qris", received: 0 });
    return eq(s.transaksiRentang("hari-ini").length, 1);
  });

  test("resetSemua mengembalikan produk ke seed dan transaksi kosong", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.selesaikanTransaksi({ method: "qris", received: 0 });
    s.hapusProduk("a");
    s.resetSemua();
    return deepEq([s.getState().products.length, s.getState().transactions.length], [1, 0]);
  });

  test("resetSemua mengosongkan keranjang", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahKeKeranjang("a");
    s.resetSemua();
    return eq(s.getState().cart.length, 0);
  });

  test("resetSemua menghapus peringatan data-rusak", () => {
    const s = storeDengan(penyimpananPalsu("{ rusak"));
    s.resetSemua();
    return benar(!s.getState().peringatan.includes("data-rusak"));
  });
```

- [ ] **Step 2: Jalankan test — harus GAGAL**

Run: `node --test`
Expected: FAIL — `Cannot find module 'js/store.js'`

- [ ] **Step 3: Implementasikan `js/store.js`**

```js
import { id } from "./format.js";
import {
  produkValid, kategoriDari, tambahProduk, ubahProduk,
  hapusProduk, alihkanAktif, saringProduk,
} from "./catalog.js";
import {
  tambahKeKeranjang, setQtyKeranjang, hapusDariKeranjang, kosongkanKeranjang,
  totalKeranjang, hitungKembalian, kodeBerikutnya,
} from "./cart.js";
import { transaksiDalamRentang, ringkasan } from "./reports.js";
import { SEED_PRODUK } from "./seed.js";

export const STORAGE_KEY = "teko:v1";

const METODE = ["tunai", "qris", "transfer"];

function transaksiValid(t) {
  if (!t || typeof t !== "object") return false;
  if (typeof t.id !== "string" || typeof t.code !== "string") return false;
  if (!Number.isInteger(t.subtotal) || t.subtotal < 0) return false;
  if (!Array.isArray(t.items)) return false;
  if (!t.payment || !METODE.includes(t.payment.method)) return false;
  if (typeof t.createdAt !== "string" || Number.isNaN(Date.parse(t.createdAt))) return false;
  return true;
}

export function buatStore({ storage = globalThis.localStorage, seed = SEED_PRODUK, sekarang = () => new Date() } = {}) {
  const state = {
    products: [],
    transactions: [],
    cart: [],
    peringatan: [],
    dataMentah: null,
    storageTersedia: true,
    storagePenuh: false,
  };

  const pendengar = new Set();

  function kabari() {
    for (const fn of pendengar) fn(state);
  }

  function salin(next) {
    state.products = next.products;
    state.transactions = next.transactions;
    state.cart = next.cart;
    simpan();
    kabari();
  }

  function simpan() {
    if (!storage) return true;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        products: state.products,
        transactions: state.transactions,
      }));
      return true;
    } catch {
      state.storagePenuh = true;
      return false;
    }
  }

  function seedAwal() {
    return seed.map((p) => ({ ...p }));
  }

  function muat() {
    if (!storage) {
      state.storageTersedia = false;
      return seedAwal();
    }
    let mentah = null;
    try {
      mentah = storage.getItem(STORAGE_KEY);
    } catch {
      state.storageTersedia = false;
      return seedAwal();
    }
    if (mentah === null || mentah === "") {
      const awal = seedAwal();
      state.products = awal;
      simpan();
      return awal;
    }
    let parsed;
    try {
      parsed = JSON.parse(mentah);
    } catch {
      state.peringatan.push("data-rusak");
      state.dataMentah = mentah;
      return seedAwal();
    }
    const products = Array.isArray(parsed && parsed.products) ? parsed.products : [];
    const transactions = Array.isArray(parsed && parsed.transactions) ? parsed.transactions : [];
    const produkValidSemua = products.filter((p) => produkValid(p));
    const transaksiValidSemua = transactions.filter((t) => transaksiValid(t));
    if (produkValidSemua.length !== products.length) state.peringatan.push("produk-dilewati");
    if (transaksiValidSemua.length !== transactions.length) state.peringatan.push("transaksi-dilewati");
    return { products: produkValidSemua, transactions: transaksiValidSemua };
  }

  const hasil = muat();
  state.products = hasil.products;
  state.transactions = hasil.transactions;

  const api = {
    getState: () => state,

    subscribe(fn) {
      pendengar.add(fn);
      return () => pendengar.delete(fn);
    },

    kategori: () => kategoriDari(state.products),
    saringProduk: (filter) => saringProduk(state.products, filter),

    tambahProduk(data) {
      salin({ ...state, products: tambahProduk(state.products, data) });
    },
    ubahProduk(id, patch) {
      salin({ ...state, products: ubahProduk(state.products, id, patch) });
    },
    hapusProduk(id) {
      salin({ ...state, products: hapusProduk(state.products, id) });
    },
    alihkanAktif(id) {
      salin({ ...state, products: alihkanAktif(state.products, id) });
    },

    tambahKeKeranjang(productId) {
      const produk = state.products.find((p) => p.id === productId);
      if (!produk) return;
      salin({ ...state, cart: tambahKeKeranjang(state.cart, produk) });
    },
    setQty(productId, qty) {
      salin({ ...state, cart: setQtyKeranjang(state.cart, productId, qty) });
    },
    hapusItem(productId) {
      salin({ ...state, cart: hapusDariKeranjang(state.cart, productId) });
    },
    kosongkanKeranjang() {
      salin({ ...state, cart: kosongkanKeranjang() });
    },

    selesaikanTransaksi({ method, received }) {
      if (state.cart.length === 0) return { ok: false, alasan: "keranjang-kosong" };
      if (!METODE.includes(method)) return { ok: false, alasan: "metode-tidak-valid" };
      const subtotal = totalKeranjang(state.cart);
      const diterima = method === "tunai" ? received : subtotal;
      if (method === "tunai" && hitungKembalian(subtotal, diterima) === null) {
        return { ok: false, alasan: "uang-kurang" };
      }
      const transaksi = {
        id: id(),
        code: kodeBerikutnya(state.transactions),
        items: state.cart.map((i) => ({
          productId: i.productId, name: i.name, price: i.price, qty: i.qty,
        })),
        subtotal,
        payment: { method, received: diterima, change: diterima - subtotal },
        createdAt: sekarang().toISOString(),
      };
      const sebelumnya = state.transactions;
      state.transactions = [...sebelumnya, transaksi];
      if (!simpan()) {
        state.transactions = sebelumnya;
        return { ok: false, alasan: "gagal-simpan" };
      }
      state.cart = kosongkanKeranjang();
      kabari();
      return { ok: true, transaksi };
    },

    laporan: (rentang) => ringkasan(api.transaksiRentang(rentang)),
    transaksiRentang: (rentang) => transaksiDalamRentang(state.transactions, rentang, sekarang()),

    resetSemua() {
      state.transactions = [];
      state.cart = [];
      state.peringatan = [];
      state.dataMentah = null;
      state.products = seedAwal();
      simpan();
      kabari();
    },
  };

  return api;
}
```

- [ ] **Step 4: Jalankan test — harus LOLOS**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/cases.js
git commit -m "feat: store - persistensi, pub/sub, ketahanan error localStorage"
```

---

### Task 7: Shell — `index.html`, `base.css`, `router.js`, `app.js`

**Files:**
- Create: `index.html`
- Create: `css/base.css`
- Create: `js/router.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `store.js` → `buatStore`, `STORAGE_KEY`; `format.js` → `formatTanggal`, `formatJam`
- Produces (kontrak yang dipakai semua view):
  - `router.js`: `daftarRute(path, view)`, `mulaiRouter({ mount, ctx })`, `ke(path)`, `ruteSaatIni()`
    - `view` adalah fungsi `mount(el, ctx) -> fungsi unmount()`
    - `ctx` = `{ store, navigate, toast }`
  - `app.js` tidak mengekspor apa pun ke `window`. `toast` hanya hidup di dalam `ctx`.

> Catatan: `ctx.toast` diisi oleh `app.js` dari `components/toast.js` (Task 8). Sampai Task 8 dikerjakan, `app.js` meng-stub `ctx.toast` sebagai fungsi no-op agar aplikasi tetap jalan.

**Kontrak ctx final (dipakai semua view):**

```js
const ctx = {
  store,     // objek dari buatStore()
  navigate,  // (path: string) => void
  toast,     // (pesan: string, tone?: "info"|"sukses"|"galat") => void
};
```

- [ ] **Step 1: Tulis `css/base.css`**

```css
/* ===== Token ===== */
:root {
  --c-bg: #FBF6EF;
  --c-surface: #FFFFFF;
  --c-ink: #3E2A20;
  --c-ink-soft: #7A5C46;
  --c-accent: #A8622D;
  --c-line: #E7D8C6;
  --c-tint: #EFE0CE;
  --c-panel: #F3E7D8;
  --c-success: #3F7D4E;
  --c-danger: #B3402F;

  --f-serif: "Fraunces", Georgia, "Times New Roman", serif;
  --f-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;

  --r-kartu: 12px;
  --r-kecil: 8px;
  --s-sentuh: 44px;
  --bayang-modal: 0 24px 60px rgba(62, 42, 32, .28);
}

/* ===== Reset ===== */
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--f-sans);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { margin: 0; font-weight: 600; }
button { font: inherit; color: inherit; }
input, select, textarea { font: inherit; color: inherit; }
img { max-width: 100%; display: block; }

/* ===== Utilitas ===== */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.sembunyi { display: none !important; }

/* ===== Fokus ===== */
:focus-visible {
  outline: 3px solid var(--c-accent);
  outline-offset: 2px;
}

/* ===== Cetak struk ===== */
@media print {
  body > * { display: none !important; }
  #cetak-struk, #cetak-struk * { display: block !important; }
  #cetak-struk {
    position: static !important;
    width: 58mm !important;
    padding: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    font-family: ui-monospace, "Courier New", monospace !important;
    font-size: 11px !important;
    color: #000 !important;
    background: #fff !important;
  }
  @page { size: 58mm auto; margin: 4mm; }
}
```

- [ ] **Step 2: Tulis `js/router.js`**

```js
const rute = new Map();
let elemenMount = null;
let ctxRouter = null;
let ruteAktif = null;
let lepasAktif = null;

function pathDariHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash === "" || hash === "/" ? "/kasir" : hash;
}

export function daftarRute(path, view) {
  rute.set(path, view);
}

export function ke(path) {
  if (path === ruteAktif) return;
  window.location.hash = `#${path}`;
}

export function ruteSaatIni() {
  return ruteAktif;
}

function pasang(path) {
  const view = rute.get(path);
  if (!view) return;

  if (lepasAktif) {
    lepasAktif();
    lepasAktif = null;
  }

  elemenMount.replaceChildren();
  ruteAktif = path;
  lepasAktif = view(elemenMount, ctxRouter) || null;
}

export function mulaiRouter({ mount, ctx }) {
  elemenMount = mount;
  ctxRouter = ctx;

  daftarRute("/kasir", ctxRouter.__views.kasir);
  daftarRute("/menu", ctxRouter.__views.menu);
  daftarRute("/laporan", ctxRouter.__views.laporan);

  window.addEventListener("hashchange", () => pasang(pathDariHash()));

  const awal = pathDariHash();
  if (window.location.hash === "" || window.location.hash === "#") {
    window.history.replaceState(null, "", "#/kasir");
  }
  pasang(awal);
}
```

- [ ] **Step 3: Tulis `js/app.js`**

```js
import { buatStore } from "./store.js";
import { daftarRute, mulaiRouter, ke } from "./router.js";
import { formatTanggal, formatJam } from "./format.js";
import { mount as mountKasir } from "./views/kasir.js";
import { mount as mountMenu } from "./views/menu.js";
import { mount as mountLaporan } from "./views/laporan.js";

const store = buatStore();

const nav = [
  { path: "/kasir", label: "Kasir" },
  { path: "/menu", label: "Kelola Menu" },
  { path: "/laporan", label: "Laporan" },
];

const jam = document.getElementById("jam");
const daftarNav = document.getElementById("nav");
const banner = document.getElementById("banner");
const mount = document.getElementById("mount");

function gambarJam() {
  const sekarang = new Date();
  jam.textContent = `${formatTanggal(sekarang)} · ${formatJam(sekarang)}`;
}

function gambarNav() {
  daftarNav.replaceChildren(
    ...nav.map(({ path, label }) => {
      const a = document.createElement("a");
      a.href = `#${path}`;
      a.className = "nav-item";
      a.textContent = label;
      return a;
    })
  );
}

function tandaiNavAktif() {
  const sekarang = window.location.hash.replace(/^#/, "") || "/kasir";
  for (const a of daftarNav.querySelectorAll(".nav-item")) {
    const cocok = a.getAttribute("href") === `#${sekarang}`;
    a.classList.toggle("aktif", cocok);
    if (cocok) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

function gambarBanner() {
  const s = store.getState();
  const pesan = [];

  if (!s.storageTersedia) {
    pesan.push("Penyimpanan tidak tersedia di browser ini — data tidak akan tersimpan setelah tab ditutup. Aplikasi tetap bisa dipakai.");
  }
  if (s.storagePenuh) {
    pesan.push("Penyimpanan penuh — transaksi terbaru gagal disimpan.");
  }
  if (s.peringatan.includes("data-rusak")) {
    pesan.push("Data yang tersimpan tidak bisa dibaca. Data menu awal dimuat. Data lama Anda belum dihapus — unduh dulu bila masih diperlukan.");
  }
  if (s.peringatan.includes("produk-dilewati")) {
    pesan.push("Sebagian produk tidak valid dan dilewati saat memuat data.");
  }

  banner.replaceChildren(
    ...pesan.map((teks) => {
      const div = document.createElement("div");
      div.className = "banner";
      div.setAttribute("role", "status");
      const p = document.createElement("span");
      p.textContent = teks;
      div.append(p);
      if (s.peringatan.includes("data-rusak") && s.dataMentah !== null) {
        const unduh = document.createElement("button");
        unduh.type = "button";
        unduh.className = "tombol tombol-kecil";
        unduh.textContent = "Unduh Data Lama";
        unduh.addEventListener("click", () => {
          const blob = new Blob([s.dataMentah], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "teko-data-rusak.json";
          a.click();
          URL.revokeObjectURL(url);
        });
        div.append(unduh);
      }
      return div;
    })
  );

  banner.classList.toggle("sembunyi", pesan.length === 0);
}

gambarJam();
setInterval(gambarJam, 30000);
gambarNav();
tandaiNavAktif();
gambarBanner();

window.addEventListener("hashchange", tandaiNavAktif);
store.subscribe(gambarBanner);

mulaiRouter({
  mount,
  ctx: {
    store,
    navigate: ke,
    toast: () => {},
    __views: { kasir: mountKasir, menu: mountMenu, laporan: mountLaporan },
  },
});
```

- [ ] **Step 4: Tulis `index.html`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kasir TeKo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/views.css">
</head>
<body>
  <header class="app-header">
    <div class="brand">
      <span class="brand-logo">TeKo</span>
      <span class="brand-sub">Kasir</span>
    </div>
    <nav id="nav" class="nav" aria-label="Navigasi utama"></nav>
    <span id="jam" class="jam"></span>
  </header>

  <div id="banner" class="banner-wrap sembunyi"></div>

  <main id="mount" class="mount"></main>

  <div id="lapisan-modal" class="lapisan-modal sembunyi"></div>
  <div id="lapisan-toast" class="lapisan-toast" aria-live="polite"></div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

> Catatan: `index.html` merujuk `css/components.css` dan `css/views.css` yang dibuat di Task 8 dan Task 9. Buat kedua file kosong dengan satu komentar agar halaman tidak 404 di tengah pengerjaan.

- [ ] **Step 5: Buat file CSS sementara agar tidak ada 404**

`css/components.css`:

```css
/* diisi di Task 8 */
```

`css/views.css`:

```css
/* diisi di Task 9 */
```

Buat `js/views/kasir.js`, `js/views/menu.js`, `js/views/laporan.js` sementara:

```js
// js/views/kasir.js
export function mount(el) {
  el.textContent = "Layar Kasir — diisi di Task 9.";
  return () => {};
}
```

```js
// js/views/menu.js
export function mount(el) {
  el.textContent = "Kelola Menu — diisi di Task 11.";
  return () => {};
}
```

```js
// js/views/laporan.js
export function mount(el) {
  el.textContent = "Laporan — diisi di Task 12.";
  return () => {};
}
```

- [ ] **Step 6: Jalankan test — harus tetap LOLOS**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`. Task ini tidak menambah test karena hanya perakitan; verifikasi dilakukan manual pada langkah 7.

- [ ] **Step 7: Verifikasi manual di browser**

```bash
python -m http.server 8000
```

Buka `http://localhost:8000`. Yang harus terlihat:
- Header "TeKo · Kasir", nav berisi tiga item, jam dan tanggal tampil
- Konten memuat "Layar Kasir — diisi di Task 9."
- Mengklik nav "Kelola Menu" mengganti konten tanpa reload halaman
- Mengetik `#/laporan` di address bar langsung membuka halaman laporan
- Navigasi lewat nav tetap mengganti konten tanpa error di console
- Tidak ada error di DevTools console

- [ ] **Step 8: Commit**

```bash
git add index.html css/base.css js/router.js js/app.js css/components.css css/views.css js/views/
git commit -m "feat: shell aplikasi - header, routing hash, banner peringatan"
```

---

### Task 8: Komponen dasar — `modal.js`, `toast.js`, `components.css`

**Files:**
- Create: `css/components.css` (timpa placeholder)
- Create: `js/components/modal.js`
- Create: `js/components/toast.js`
- Modify: `js/app.js` (pasang `toast` asli ke ctx)

**Interfaces:**
- Consumes: `format.js` — tidak ada. Komponen ini tidak butuh format.
- Produces:
  - `modal.js`: `bukaModal({ judul, render, aksi, onTutup })` → `{ el, tutup }`; `konfirmasi({ judul, pesan, labelYa })` → `Promise<boolean>`; `mintaKata({ judul, pesan, kata })` → `Promise<boolean>`
  - `toast.js`: `toast(pesan, tone)` dengan `tone` ∈ `"info" | "sukses" | "galat"`
- Melayani: `layer-modal` dan `lapisan-toast` di `index.html`

- [ ] **Step 1: Tulis `js/components/toast.js`**

```js
const LAYER = () => document.getElementById("lapisan-toast");

export function toast(pesan, tone = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${tone}`;
  el.textContent = pesan;
  LAYER().append(el);
  setTimeout(() => el.remove(), 3200);
}
```

- [ ] **Step 2: Tulis `js/components/modal.js`**

```js
const LAYER = () => document.getElementById("lapisan-modal");

let yangSedangBuka = null;

export function bukaModal({ judul, render, aksi, onTutup }) {
  const sebelumnyaFokus = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const kotak = document.createElement("div");
  kotak.className = "modal";
  kotak.setAttribute("role", "dialog");
  kotak.setAttribute("aria-modal", "true");
  kotak.setAttribute("aria-label", judul);

  const kepala = document.createElement("header");
  kepala.className = "modal-kepala";
  const judulEl = document.createElement("h2");
  judulEl.textContent = judul;
  const tutupEl = document.createElement("button");
  tutupEl.type = "button";
  tutupEl.className = "tombol tombol-hantu modal-tutup";
  tutupEl.setAttribute("aria-label", "Tutup");
  tutupEl.textContent = "×";
  kepala.append(judulEl, tutupEl);

  const isi = document.createElement("div");
  isi.className = "modal-isi";

  const kaki = document.createElement("footer");
  kaki.className = "modal-kaki";

  kotak.append(kepala, isi, kaki);
  overlay.append(kotak);

  const tutup = () => {
    if (yangSedangBuka !== kendali) return;
    document.removeEventListener("keydown", padaTombol);
    LAYER().classList.add("sembunyi");
    LAYER().replaceChildren();
    yangSedangBuka = null;
    if (sebelumnyaFokus && sebelumnyaFokus.focus) sebelumnyaFokus.focus();
    if (onTutup) onTutup();
  };

  const padaTombol = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      tutup();
      return;
    }
    if (e.key !== "Tab") return;
    const bisaFokus = kotak.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (bisaFokus.length === 0) return;
    const pertama = bisaFokus[0];
    const terakhir = bisaFokus[bisaFokus.length - 1];
    if (e.shiftKey && document.activeElement === pertama) {
      e.preventDefault();
      terakhir.focus();
    } else if (!e.shiftKey && document.activeElement === terakhir) {
      e.preventDefault();
      pertama.focus();
    }
  };

  const kendali = { el: isi, tutup };

  isi.append(render(kendali));
  if (aksi) kaki.append(...aksi(kendali));

  tutupEl.addEventListener("click", tutup);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) tutup();
  });
  document.addEventListener("keydown", padaTombol);

  LAYER().classList.remove("sembunyi");
  LAYER().replaceChildren(overlay);

  yangSedangBuka = kendali;

  const fokusPertama = kotak.querySelector(
    'input:not([type="hidden"]), button:not(.modal-tutup), select, textarea'
  );
  if (fokusPertama) fokusPertama.focus();

  return kendali;
}

export function konfirmasi({ judul, pesan, labelYa = "Ya, lanjutkan" }) {
  return new Promise((selesai) => {
    let sudahDijawab = false;
    const jawab = (nilai) => {
      sudahDijawab = true;
      m.tutup();
      selesai(nilai);
    };

    const m = bukaModal({
      judul,
      render: () => {
        const p = document.createElement("p");
        p.className = "modal-pesan";
        p.textContent = pesan;
        return p;
      },
      aksi: (k) => [
        tombolAksi("Batal", "tombol-hantu", () => jawab(false), k),
        tombolAksi(labelYa, "tombol-utama", () => jawab(true), k),
      ],
      onTutup: () => { if (!sudahDijawab) selesai(false); },
    });
  });
}

export function mintaKata({ judul, pesan, kata = "HAPUS" }) {
  return new Promise((selesai) => {
    let sudahDijawab = false;
    const jawab = (nilai) => {
      sudahDijawab = true;
      m.tutup();
      selesai(nilai);
    };

    const m = bukaModal({
      judul,
      render: () => {
        const wrap = document.createElement("div");
        const p = document.createElement("p");
        p.className = "modal-pesan";
        p.textContent = `${pesan} Ketik ${kata} untuk melanjutkan.`;

        const label = document.createElement("label");
        label.className = "label";
        label.textContent = `Ketik ${kata}`;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "isian";
        input.autocomplete = "off";
        input.dataset.kunciBatal = "true";

        const galat = document.createElement("p");
        galat.className = "galat-teks sembunyi";

        input.addEventListener("input", () => {
          galat.classList.toggle("sembunyi", input.value.trim() === kata);
        });

        wrap.append(p, label, input, galat);
        return wrap;
      },
      aksi: (k) => {
        const input = k.el.querySelector("input");
        const galat = k.el.querySelector(".galat-teks");
        const ya = tombolAksi("Ya, hapus semua", "tombol-bahaya", () => {
          if (input.value.trim() !== kata) {
            galat.textContent = `Teks tidak cocok. Ketik ${kata}.`;
            galat.classList.remove("sembunyi");
            return;
          }
          jawab(true);
        }, k);
        return [tombolAksi("Batal", "tombol-hantu", () => jawab(false), k), ya];
      },
      onTutup: () => { if (!sudahDijawab) selesai(false); },
    });
  });
}

function tombolAksi(label, kelas, onClick, kendali) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `tombol ${kelas}`;
  b.textContent = label;
  b.dataset.kunciBatal = "true";
  b.addEventListener("click", onClick);
  return b;
}
```

- [ ] **Step 3: Tulis `css/components.css`**

```css
/* ===== Tombol ===== */
.tombol {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; min-height: var(--s-sentuh); padding: 0 18px;
  border: 1px solid transparent; border-radius: var(--r-kecil);
  background: var(--c-tint); color: var(--c-ink);
  font-weight: 600; cursor: pointer;
  transition: filter .12s ease, background .12s ease;
}
.tombol:hover:not(:disabled) { filter: brightness(1.04); }
.tombol:disabled { opacity: .45; cursor: not-allowed; }
.tombol-utama { background: var(--c-ink); color: var(--c-bg); }
.tombol-utama:hover:not(:disabled) { background: #33231A; }
.tombol-aksen { background: var(--c-accent); color: #fff; }
.tombol-bahaya { background: var(--c-danger); color: #fff; }
.tombol-hantu { background: transparent; border-color: var(--c-line); color: var(--c-ink-soft); }
.tombol-kecil { min-height: 32px; padding: 0 10px; font-size: 13px; }
.tombol-ikon {
  min-height: 36px; width: 36px; padding: 0; border-radius: var(--r-kecil);
  background: transparent; border: 1px solid var(--c-line); cursor: pointer;
}

/* ===== Isian ===== */
.label {
  display: block; margin-bottom: 6px;
  font-size: 12px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--c-ink-soft);
}
.isian {
  width: 100%; min-height: var(--s-sentuh); padding: 0 12px;
  border: 1px solid var(--c-line); border-radius: var(--r-kecil);
  background: var(--c-surface);
}
.isian:focus-visible { outline: 3px solid var(--c-accent); outline-offset: 1px; }
.baris-isian { margin-bottom: 16px; }
.galat-teks { margin: 6px 0 0; color: var(--c-danger); font-size: 13px; }

/* ===== Chip ===== */
.chip {
  display: inline-flex; align-items: center; min-height: 38px;
  padding: 0 16px; border: 1px solid var(--c-line); border-radius: 999px;
  background: var(--c-tint); color: var(--c-ink-soft);
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.chip.aktif { background: var(--c-ink); border-color: var(--c-ink); color: var(--c-bg); }
.daftar-chip { display: flex; gap: 8px; flex-wrap: wrap; }

/* ===== Kartu produk ===== */
.kartu-produk { display: grid; gap: 12px; }
.daftar-produk {
  display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}
.kartu-produk-item {
  display: flex; flex-direction: column; justify-content: space-between; gap: 10px;
  min-height: 104px; padding: 14px;
  border: 1px solid var(--c-line); border-radius: var(--r-kartu);
  background: var(--c-surface); text-align: left; cursor: pointer;
  transition: transform .1s ease, border-color .1s ease;
}
.kartu-produk-item:hover { transform: translateY(-2px); border-color: var(--c-accent); }
.kartu-produk-item:active { transform: translateY(0); }
.kartu-produk-nama { font-weight: 600; line-height: 1.3; }
.kartu-produk-harga { color: var(--c-accent); font-weight: 700; }
.kosong-state {
  padding: 48px 16px; text-align: center; color: var(--c-ink-soft);
  border: 1px dashed var(--c-line); border-radius: var(--r-kartu);
}

/* ===== Banner ===== */
.banner-wrap { padding: 12px 20px; display: grid; gap: 8px; }
.banner {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px; border-radius: var(--r-kecil);
  background: #FFF4D6; border: 1px solid #E8C97A; color: #6B4E13;
}

/* ===== Modal ===== */
.lapisan-modal { position: fixed; inset: 0; z-index: 60; }
.modal-overlay {
  position: absolute; inset: 0; display: grid; place-items: center;
  padding: 20px; background: rgba(62, 42, 32, .45); overflow-y: auto;
}
.modal {
  width: min(520px, 100%); max-height: 90vh; display: flex; flex-direction: column;
  border-radius: 16px; background: var(--c-surface); box-shadow: var(--bayang-modal);
}
.modal-kepala {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 18px 20px 12px;
}
.modal-kepala h2 { font-family: var(--f-serif); font-size: 20px; }
.modal-tutup { font-size: 26px; line-height: 1; }
.modal-isi { padding: 4px 20px 12px; overflow-y: auto; }
.modal-pesan { margin: 0 0 8px; color: var(--c-ink-soft); }
.modal-kaki {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 12px 20px 18px; border-top: 1px solid var(--c-line);
}

/* ===== Toast ===== */
.lapisan-toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 80; display: grid; gap: 8px; justify-items: center;
  pointer-events: none;
}
.toast {
  padding: 12px 18px; border-radius: var(--r-kecil);
  background: var(--c-ink); color: var(--c-bg);
  box-shadow: var(--bayang-modal); font-weight: 600;
}
.toast-sukses { background: var(--c-success); }
.toast-galat { background: var(--c-danger); }

/* ===== Tabel ===== */
.tabel { width: 100%; border-collapse: collapse; }
.tabel th, .tabel td {
  padding: 12px 10px; text-align: left; border-bottom: 1px solid var(--c-line);
}
.tabel th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--c-ink-soft); }
.tabel tbody tr:hover { background: var(--c-panel); }
.tabel-angka { text-align: right; font-variant-numeric: tabular-nums; }
.lencana-aktif {
  display: inline-block; padding: 2px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
  background: #E4F1E6; color: var(--c-success);
}
.lencana-nonaktif {
  display: inline-block; padding: 2px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600;
  background: #EFE9E4; color: var(--c-ink-soft);
}
```

- [ ] **Step 4: Pasang toast asli ke `ctx` — `js/app.js`**

Ganti import dan baris ctx:

```js
import { toast } from "./components/toast.js";
```

```text
    toast,
```

- [ ] **Step 5: Jalankan test — harus tetap LOLOS**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 6: Verifikasi manual di browser**

Reload `http://localhost:8000`. Yang harus benar:
- Tidak ada error di console
- Header dan nav tetap tampil

(Komponen modal dan toast belum punya pemicu pada tahap ini — pemanggilnya datang di Task 9 dan 11.)

- [ ] **Step 7: Commit**

```bash
git add css/components.css js/components/modal.js js/components/toast.js js/app.js
git commit -m "feat: komponen modal dan toast beserta gaya dasar"
```

---

### Task 9: `views/kasir.js` — layar jualan + `views.css`

**Files:**
- Create: `css/views.css` (timpa placeholder)
- Create: `js/views/kasir.js` (timpa stub)

**Interfaces:**
- Consumes: `format.js` → `formatRupiah`; `cart.js` → `BATAS_QTY`, `totalKeranjang`, `jumlahItemKeranjang`; `catalog.js` → `saringProduk`; `components/checkout.js` → `bukaCheckout` (Task 10)
- Produces: `mount(el, ctx)` untuk rute `/kasir`
- Melayani elemen di `index.html`: tidak ada — seluruh DOM dibangun di JS

**Perilaku yang harus ada di akhir task:**
- Chip kategori berisi `Semua` + kategori produk aktif
- Grid produk menampilkan produk aktif hasil saringan kategori + pencarian
- Klik kartu produk menambah ke keranjang dan memunculkan toast singkat
- Panel keranjang menampilkan baris dengan `−`/qty/`+`/hapus, subtotal, tombol Bayar
- Tombol "Kosongkan" ada di header panel
- **Desktop:** panel keranjang fixed di kanan
- **Mobile (<=900px):** bar sticky di bawah berisi `N item · Rp X · Lihat`; panel jadi slide-in dari bawah
- `aria-live="polite"` pada elemen status keranjang

- [ ] **Step 1: Tulis `css/views.css`**

```css
/* ===== Kerangka halaman ===== */
.mount { padding: 20px; }
.app-header {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  padding: 14px 20px; border-bottom: 1px solid var(--c-line);
  background: var(--c-ink); color: var(--c-bg);
  position: sticky; top: 0; z-index: 20;
}
.brand { display: flex; align-items: baseline; gap: 8px; }
.brand-logo { font-family: var(--f-serif); font-size: 26px; font-weight: 700; }
.brand-sub { font-size: 13px; opacity: .7; }
.nav { display: flex; gap: 4px; margin-left: auto; }
.nav-item {
  padding: 8px 14px; border-radius: var(--r-kecil);
  color: var(--c-bg); text-decoration: none; font-weight: 600; opacity: .75;
}
.nav-item:hover { opacity: 1; background: rgba(255, 255, 255, .1); }
.nav-item.aktif { opacity: 1; background: var(--c-accent); }
.jam { font-size: 13px; opacity: .8; font-variant-numeric: tabular-nums; }

/* ===== Halaman kasir ===== */
.kasir {
  display: grid; gap: 20px;
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
}
.kasir-alat {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  margin-bottom: 16px;
}
.kasir-alat .isian { max-width: 260px; }

/* ===== Panel keranjang ===== */
.keranjang {
  position: sticky; top: 84px;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 104px);
  border: 1px solid var(--c-line); border-radius: var(--r-kartu);
  background: var(--c-panel); overflow: hidden;
}
.keranjang-kepala {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--c-line);
}
.keranjang-kepala h2 { font-family: var(--f-serif); font-size: 18px; }
.keranjang-daftar { flex: 1; overflow-y: auto; padding: 8px; }
.keranjang-item {
  display: grid; grid-template-columns: 1fr auto; gap: 4px 10px;
  padding: 10px 12px; margin-bottom: 6px;
  border-radius: var(--r-kecil); background: var(--c-surface);
}
.keranjang-nama { font-weight: 600; line-height: 1.3; }
.keranjang-harga { font-variant-numeric: tabular-nums; color: var(--c-ink-soft); font-size: 14px; }
.keranjang-totalnya { font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.keranjang-kontrol { display: flex; align-items: center; gap: 4px; }
.keranjang-kontrol button {
  min-width: 34px; height: 34px; border-radius: var(--r-kecil);
  border: 1px solid var(--c-line); background: var(--c-surface);
  cursor: pointer; font-weight: 700;
}
.keranjang-qty { min-width: 30px; text-align: center; font-variant-numeric: tabular-nums; }
.keranjang-kaki {
  padding: 14px 16px; border-top: 1px solid var(--c-line); background: var(--c-surface);
}
.keranjang-subtotal {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 12px; font-size: 17px; font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.keranjang-bayar { width: 100%; min-height: 54px; font-size: 17px; }
.keranjang-kosong { padding: 32px 12px; text-align: center; color: var(--c-ink-soft); }

/* Bar sticky mobile */
.bar-sticky {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  display: none; align-items: center; gap: 12px;
  padding: 10px 16px; border-top: 1px solid var(--c-line);
  background: var(--c-surface);
}
.bar-sticky-teks { flex: 1; text-align: left; line-height: 1.25; }
.bar-sticky-teks strong { display: block; font-variant-numeric: tabular-nums; }

@media (max-width: 900px) {
  .mount { padding: 16px 16px 96px; }
  .kasir { grid-template-columns: minmax(0, 1fr); }
  .keranjang {
    position: fixed; inset: auto 0 0 0; top: auto; z-index: 50;
    max-height: 82vh; border-radius: 16px 16px 0 0;
    transform: translateY(105%); transition: transform .22s ease;
    box-shadow: var(--bayang-modal);
  }
  .keranjang.terbuka { transform: translateY(0); }
  .bar-sticky { display: flex; }
}

/* ===== Halaman menu ===== */
.halaman-kepala {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
}
.halaman-kepala h1 { font-family: var(--f-serif); font-size: 24px; }
.halaman-alat { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.daftar-kartu { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.kartu-menu {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 14px; border: 1px solid var(--c-line);
  border-radius: var(--r-kartu); background: var(--c-surface);
}
.kartu-menu-aksi { display: flex; gap: 6px; align-items: flex-start; }

/* ===== Halaman laporan ===== */
.kartu-statistik {
  display: grid; gap: 12px; margin-bottom: 20px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.kartu-statistik-item {
  padding: 16px; border: 1px solid var(--c-line);
  border-radius: var(--r-kartu); background: var(--c-surface);
}
.kartu-statistik-label {
  font-size: 12px; text-transform: uppercase; letter-spacing: .04em;
  color: var(--c-ink-soft); margin-bottom: 6px;
}
.kartu-statistik-nilai { font-family: var(--f-serif); font-size: 24px; font-weight: 700; }
.kartu-statistik-ket { font-size: 13px; color: var(--c-ink-soft); }
.panel {
  padding: 18px; border: 1px solid var(--c-line); border-radius: var(--r-kartu);
  background: var(--c-surface); margin-bottom: 20px;
}
.panel h2 { font-family: var(--f-serif); font-size: 18px; margin-bottom: 12px; }
.baris-metode {
  display: flex; justify-content: space-between; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--c-line);
  font-variant-numeric: tabular-nums;
}
.baris-metode:last-child { border-bottom: 0; }
.area-bahaya {
  padding: 18px; border: 1px solid var(--c-danger); border-radius: var(--r-kartu);
  background: #FBEDEA;
}
.area-bahaya h2 { font-family: var(--f-serif); font-size: 18px; margin-bottom: 6px; color: var(--c-danger); }
.bilah-rincian { padding: 10px 0 10px 16px; border-left: 2px solid var(--c-line); margin-top: 6px; }
```

- [ ] **Step 2: Tulis `js/views/kasir.js`**

```js
import { formatRupiah } from "../format.js";
import { BATAS_QTY, totalKeranjang, jumlahItemKeranjang } from "../cart.js";
import { bukaCheckout } from "../components/checkout.js";

const SEMUA = "Semua";

export function mount(el, ctx) {
  const { store, toast } = ctx;

  let kategori = SEMUA;
  let cari = "";
  let panelTerbuka = false;

  const alat = document.createElement("div");
  alat.className = "kasir-alat";

  const daftarChip = document.createElement("div");
  daftarChip.className = "daftar-chip";

  const cariLabel = document.createElement("label");
  cariLabel.className = "sr-only";
  cariLabel.textContent = "Cari menu";
  cariLabel.htmlFor = "cari-menu";

  const cariInput = document.createElement("input");
  cariInput.id = "cari-menu";
  cariInput.type = "search";
  cariInput.className = "isian";
  cariInput.placeholder = "Cari menu…";
  cariInput.addEventListener("input", () => {
    cari = cariInput.value;
    gambar();
  });

  cariLabel.append(cariInput);

  const areaProduk = document.createElement("div");
  areaProduk.className = "kartu-produk";

  const panel = document.createElement("aside");
  panel.className = "keranjang";
  panel.setAttribute("aria-label", "Pesanan berjalan");

  const sticky = document.createElement("button");
  sticky.type = "button";
  sticky.className = "bar-sticky";
  sticky.addEventListener("click", () => {
    panelTerbuka = !panelTerbuka;
    panel.classList.toggle("terbuka", panelTerbuka);
    gambar();
  });

  const status = document.createElement("p");
  status.id = "keranjang-status";
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");

  alat.append(daftarChip, cariLabel);

  const layout = document.createElement("div");
  layout.className = "kasir";
  layout.append(areaProduk, panel);

  el.append(alat, layout, sticky, status);

  function gambarChip() {
    daftarChip.replaceChildren(
      ...[SEMUA, ...store.kategori()].map((nama) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = nama;
        b.classList.toggle("aktif", nama === kategori);
        b.addEventListener("click", () => {
          kategori = nama;
          gambar();
        });
        return b;
      })
    );
  }

  function gambarProduk() {
    const daftar = store.saringProduk({ category: kategori, query: cari });

    if (daftar.length === 0) {
      areaProduk.replaceChildren();
      const kosong = document.createElement("div");
      kosong.className = "kosong-state";
      kosong.textContent = "Tidak ada menu yang cocok. Ubah kata kunci atau pilih kategori lain.";
      areaProduk.append(kosong);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "daftar-produk";
    for (const produk of daftar) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kartu-produk-item";
      b.innerHTML =
        `<span class="kartu-produk-nama"></span><span class="kartu-produk-harga"></span>`;
      b.querySelector(".kartu-produk-nama").textContent = produk.name;
      b.querySelector(".kartu-produk-harga").textContent = formatRupiah(produk.price);
      b.addEventListener("click", () => {
        store.tambahKeKeranjang(produk.id);
        toast(`${produk.name} ditambahkan`, "sukses");
      });
      grid.append(b);
    }
    areaProduk.replaceChildren(grid);
  }

  function barisItem(item) {
    const baris = document.createElement("div");
    baris.className = "keranjang-item";

    const kiri = document.createElement("div");
    const nama = document.createElement("div");
    nama.className = "keranjang-nama";
    nama.textContent = item.name;
    const harga = document.createElement("div");
    harga.className = "keranjang-harga";
    harga.textContent = formatRupiah(item.price);
    kiri.append(nama, harga);

    const kanan = document.createElement("div");
    kanan.className = "keranjang-kontrol";

    const kurang = document.createElement("button");
    kurang.type = "button";
    kurang.textContent = "−";
    kurang.setAttribute("aria-label", `Kurangi ${item.name}`);
    kurang.addEventListener("click", () => store.setQty(item.productId, item.qty - 1));

    const qty = document.createElement("span");
    qty.className = "keranjang-qty";
    qty.textContent = String(item.qty);

    const tambah = document.createElement("button");
    tambah.type = "button";
    tambah.textContent = "+";
    tambah.setAttribute("aria-label", `Tambah ${item.name}`);
    tambah.disabled = item.qty >= BATAS_QTY;
    tambah.addEventListener("click", () => store.setQty(item.productId, item.qty + 1));

    const buang = document.createElement("button");
    buang.type = "button";
    buang.textContent = "×";
    buang.setAttribute("aria-label", `Hapus ${item.name}`);
    buang.addEventListener("click", () => store.hapusItem(item.productId));

    kanan.append(kurang, qty, tambah, buang);
    baris.append(kiri, kanan);
    return baris;
  }

  function gambarKeranjang() {
    const { cart } = store.getState();
    const total = totalKeranjang(cart);

    panel.replaceChildren();

    const kepala = document.createElement("div");
    kepala.className = "keranjang-kepala";
    const judul = document.createElement("h2");
    judul.textContent = "Pesanan";
    const kosongkan = document.createElement("button");
    kosongkan.type = "button";
    kosongkan.className = "tombol tombol-kecil tombol-hantu";
    kosongkan.textContent = "Kosongkan";
    kosongkan.disabled = cart.length === 0;
    kosongkan.addEventListener("click", () => store.kosongkanKeranjang());
    kepala.append(judul, kosongkan);

    const daftar = document.createElement("div");
    daftar.className = "keranjang-daftar";

    if (cart.length === 0) {
      const kosong = document.createElement("p");
      kosong.className = "keranjang-kosong";
      kosong.textContent = "Keranjang masih kosong. Klik menu untuk menambahkan.";
      daftar.append(kosong);
    } else {
      for (const item of cart) daftar.append(barisItem(item));
    }

    const kaki = document.createElement("div");
    kaki.className = "keranjang-kaki";
    const subtotal = document.createElement("div");
    subtotal.className = "keranjang-subtotal";
    const label = document.createElement("span");
    label.textContent = "Total";
    const nilai = document.createElement("span");
    nilai.textContent = formatRupiah(total);
    subtotal.append(label, nilai);

    const bayar = document.createElement("button");
    bayar.type = "button";
    bayar.className = "tombol tombol-utama keranjang-bayar";
    bayar.textContent = "Bayar";
    bayar.disabled = cart.length === 0;
    bayar.addEventListener("click", () => {
      bukaCheckout({
        cart,
        onSelesai: (hasil) => {
          if (!hasil.ok) ctx.toast(pesanAlasan(hasil.alasan), "galat");
          else ctx.toast(`${hasil.transaksi.code} tersimpan`, "sukses");
        },
      });
    });

    kaki.append(subtotal, bayar);
    panel.append(kepala, daftar, kaki);

    sticky.replaceChildren();
    const teks = document.createElement("span");
    teks.className = "bar-sticky-teks";
    const jumlah = document.createElement("strong");
    jumlah.textContent = `${jumlahItemKeranjang(cart)} item · ${formatRupiah(total)}`;
    const lihat = document.createElement("span");
    lihat.textContent = panelTerbuka ? "Tutup" : "Lihat";
    teks.append(jumlah, lihat);
    sticky.append(teks);

    panel.classList.toggle("terbuka", panelTerbuka);

    status.textContent = cart.length === 0
      ? "Keranjang kosong"
      : `Keranjang berisi ${jumlahItemKeranjang(cart)} item, total ${formatRupiah(total)}`;
  }

  function pesanAlasan(alasan) {
    return {
      "keranjang-kosong": "Keranjang kosong.",
      "metode-tidak-valid": "Metode pembayaran tidak dikenal.",
      "uang-kurang": "Uang yang diterima kurang dari total.",
      "gagal-simpan": "Gagal menyimpan: penyimpanan browser penuh.",
    }[alasan] ?? "Transaksi gagal.";
  }

  function gambar() {
    gambarChip();
    gambarProduk();
    gambarKeranjang();
  }

  gambar();

  const lepas = store.subscribe(() => gambar());

  return () => {
    lepas();
    panel.classList.remove("terbuka");
  };
}
```

- [ ] **Step 3: Jalankan test — harus tetap LOLOS**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 4: Verifikasi manual di browser**

Reload `http://localhost:8000`, buka tab **Kasir**. Yang harus benar:
- Chip: `Semua`, `Kopi`, `Non-Kopi`, `Snack`
- Grid menampilkan 13 kartu produk dengan harga terformat `Rp 22.000`
- Klik `Americano` → muncul di panel kanan, toast "Americano ditambahkan", subtotal jadi `Rp 18.000`
- Klik `Americano` lagi → qty jadi 2, subtotal `Rp 36.000`
- Tombol `+` berfungsi; `−` dari qty 1 menghapus baris
- Tombol "Kosongkan" mengosongkan keranjang
- Tombol "Bayar" nonaktif saat keranjang kosong
- Mengetik "amer" di kolom cari → hanya Americano yang tampil
- Memilih chip "Snack" → hanya 4 produk Snack
- Mengubah lebar browser ke <=900px → panel jadi tersembunyi, bar sticky di bawah tampil dengan benar
- Mengklik bar sticky → panel naik dari bawah

> Tombol "Bayar" belum membuka apa-apa — `bukaCheckout` datang di Task 10. Kegagalan itu normal pada tahap ini.

- [ ] **Step 5: Commit**

```bash
git add css/views.css js/views/kasir.js
git commit -m "feat: layar kasir - chip kategori, cari, grid produk, panel keranjang responsif"
```

---

### Task 10: `components/checkout.js` dan `components/struk.js`

**Files:**
- Create: `js/components/struk.js`
- Create: `js/components/checkout.js`
- Modify: `js/views/kasir.js` — teruskan `store` ke `bukaCheckout`, tambah entri `pesanAlasan`
- Modify: `css/components.css` — gaya checkout dan struk

**Interfaces:**
- Consumes:
  - `format.js` → `formatRupiah`, `formatJam`, `formatTanggal`, `parseRupiah`
  - `cart.js` → `totalKeranjang`, `hitungKembalian`
  - `components/modal.js` → `bukaModal`
- Produces:
  - `struk.js` → `renderStruk(transaksi, { namaToko })` mengembalikan `HTMLElement` dengan `id="cetak-struk"`
  - `checkout.js` → `bukaCheckout({ cart, store, onSelesai })`
- `onSelesai` menerima `{ ok: true, transaksi }` setelah transaksi tersimpan, atau `{ ok: false, alasan }` dengan `alasan` ∈ `"ditutup"`, `"keranjang-kosong"`, `"gagal-simpan"`

**Perilaku yang harus ada di akhir task:**
- Langkah 1 menampilkan total dan tiga pilihan metode
- Tunai menampilkan input uang diterima, tombol cepat, dan kembalian live; tombol "Selesaikan" nonaktif selama uang kurang
- QRIS dan Transfer langsung ke struk pratinjau, tanpa langkah uang diterima
- Setelah "Selesaikan", struk final menampilkan kode transaksi asli
- `Esc` atau tombol tutup **tidak** menyimpan transaksi

- [ ] **Step 1: Perbarui pemanggilan di `js/views/kasir.js`**

Ganti blok pemanggilan `bukaCheckout` agar meneruskan `store`:

```js
      bukaCheckout({
        cart,
        store,
        onSelesai: (hasil) => {
          if (!hasil.ok) ctx.toast(pesanAlasan(hasil.alasan), "galat");
          else ctx.toast(`${hasil.transaksi.code} tersimpan`, "sukses");
        },
      });
```

Dan tambahkan entri ini ke objek `pesanAlalan` di `js/views/kasir.js`:

```text
      "ditutup": "Pembayaran dibatalkan.",
```

- [ ] **Step 2: Tulis `js/components/struk.js`**

```js
import { formatRupiah, formatTanggal, formatJam } from "../format.js";

const LABEL_METODE = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer" };

export function renderStruk(transaksi, { namaToko = "TeKo" } = {}) {
  const waktu = new Date(transaksi.createdAt);
  const root = document.createElement("div");
  root.id = "cetak-struk";

  root.innerHTML = `
    <div class="struk-bangko">
      <div class="struk-nama"></div>
      <div>Kasir TeKo</div>
      <div class="struk-kode"></div>
      <div class="struk-waktu"></div>
    </div>
    <table class="struk-tabel"><tbody></tbody></table>
    <div class="struk-total"></div>
    <div class="struk-total"></div>
    <div class="struk-total"></div>
    <div class="struk-kaki">Terima kasih sudah minum di TeKo</div>
  `;

  root.querySelector(".struk-nama").textContent = namaToko;
  root.querySelector(".struk-kode").textContent = transaksi.code;
  root.querySelector(".struk-waktu").textContent =
    `${formatTanggal(waktu)} ${formatJam(waktu)}`;

  const tbody = root.querySelector("tbody");
  for (const item of transaksi.items) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td class="struk-nama-item"></td><td class="struk-qty"></td><td class="struk-jumlah"></td>`;
    tr.querySelector(".struk-nama-item").textContent = item.name;
    tr.querySelector(".struk-qty").textContent = `${item.qty}x`;
    tr.querySelector(".struk-jumlah").textContent = formatRupiah(item.price * item.qty);
    tbody.append(tr);
  }

  const baris = [
    ["TOTAL", formatRupiah(transaksi.subtotal)],
    [LABEL_METODE[transaksi.payment.method] ?? transaksi.payment.method,
      formatRupiah(transaksi.payment.received)],
    ["KEMBALI", formatRupiah(transaksi.payment.change)],
  ];
  root.querySelectorAll(".struk-total").forEach((el, i) => {
    el.textContent = `${baris[i][0]} : ${baris[i][1]}`;
  });

  return root;
}
```

- [ ] **Step 3: Tulis `js/components/checkout.js`**

```js
import { formatRupiah, parseRupiah } from "../format.js";
import { totalKeranjang, hitungKembalian } from "../cart.js";
import { bukaModal } from "./modal.js";
import { renderStruk } from "./struk.js";

const METODE = [
  { id: "tunai", label: "Tunai", ket: "Uang tunai di tangan" },
  { id: "qris", label: "QRIS", ket: "Scan QR di meja" },
  { id: "transfer", label: "Transfer", ket: "Transfer bank" },
];

const CEPAT = [20000, 50000, 100000];

export function bukaCheckout({ cart, store, onSelesai }) {
  const subtotal = totalKeranjang(cart);
  let metode = null;
  let diterima = 0;
  let selesaiDitutup = false;

  function kunci(teks, kelas, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tombol ${kelas}`;
    b.textContent = teks;
    b.dataset.kunciBatal = "true";
    b.addEventListener("click", onClick);
    return b;
  }

  const badan = () => document.querySelector("#lapisan-modal .modal-isi");
  const kaki = () => document.querySelector("#lapisan-modal .modal-kaki");

  function keLangkahMetode() {
    metode = null;
    diterima = 0;

    const wrap = document.createElement("div");
    wrap.className = "checkout";

    const total = document.createElement("p");
    total.className = "checkout-total";
    total.textContent = `Total ${formatRupiah(subtotal)}`;
    wrap.append(total);

    const grid = document.createElement("div");
    grid.className = "checkout-pilihan";

    for (const opsi of METODE) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "checkout-pilihan-item";
      b.innerHTML = `<strong></strong><span></span>`;
      b.querySelector("strong").textContent = opsi.label;
      b.querySelector("span").textContent = opsi.ket;
      b.addEventListener("click", () => {
        metode = opsi.id;
        if (metode === "tunai") keLangkahTunai();
        else keLangkahKonfirmasi();
      });
      grid.append(b);
    }

    wrap.append(grid);
    badan().replaceChildren(wrap);
    kaki().replaceChildren();
  }

  function keLangkahTunai() {
    const wrap = document.createElement("div");
    wrap.className = "checkout";

    const total = document.createElement("p");
    total.className = "checkout-total";
    total.textContent = `Total ${formatRupiah(subtotal)}`;
    wrap.append(total);

    const label = document.createElement("label");
    label.className = "label";
    label.textContent = "Uang diterima";
    label.htmlFor = "uang-diterima";

    const input = document.createElement("input");
    input.id = "uang-diterima";
    input.type = "text";
    input.inputMode = "numeric";
    input.className = "isian";
    input.placeholder = "0";

    const cepat = document.createElement("div");
    cepat.className = "checkout-cepat";

    const tombolCepat = (teks, nilai) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = teks;
      b.addEventListener("click", () => {
        input.value = String(nilai);
        perbarui();
      });
      return b;
    };

    cepat.append(tombolCepat("Uang Pas", subtotal));
    for (const n of CEPAT) cepat.append(tombolCepat(formatRupiah(n), n));

    const statusKembalian = document.createElement("p");
    statusKembalian.className = "checkout-kembalian";

    wrap.append(label, input, cepat, statusKembalian);

    const tombolSelesaikan = kunci("Selesaikan", "tombol-utama", () => selesaikan());

    function perbarui() {
      diterima = parseRupiah(input.value);
      const change = hitungKembalian(subtotal, diterima);
      statusKembalian.textContent = change === null
        ? "Uang diterima kurang dari total."
        : `Kembalian ${formatRupiah(change)}`;
      statusKembalian.classList.toggle("kurang", change === null);
      tombolSelesaikan.disabled = change === null;
    }

    input.addEventListener("input", perbarui);
    perbarui();

    badan().replaceChildren(wrap);
    kaki().replaceChildren(kunci("Kembali", "tombol-hantu", keLangkahMetode), tombolSelesaikan);
    input.focus();
  }

  function keLangkahKonfirmasi() {
    const pratinjau = {
      code: "pratinjau",
      createdAt: new Date().toISOString(),
      items: cart,
      subtotal,
      payment: { method: metode, received: subtotal, change: 0 },
    };

    const wrap = document.createElement("div");
    wrap.className = "checkout";
    const area = document.createElement("div");
    area.className = "checkout-struk";
    area.append(renderStruk(pratinjau));
    wrap.append(area);

    badan().replaceChildren(wrap);
    kaki().replaceChildren(
      kunci("Kembali", "tombol-hantu", keLangkahMetode),
      kunci("Selesaikan", "tombol-utama", () => selesaikan())
    );
  }

  function selesaikan() {
    const hasil = store.selesaikanTransaksi({
      method: metode,
      received: metode === "tunai" ? diterima : 0,
    });

    if (!hasil.ok) {
      const wrap = document.createElement("div");
      wrap.className = "galat-panel";
      const p = document.createElement("p");
      p.textContent =
        "Transaksi gagal disimpan: penyimpanan browser penuh. Kosongkan ruang penyimpanan, atau buka aplikasi di browser lain.";
      wrap.append(p);
      badan().replaceChildren(wrap);
      kaki().replaceChildren(kunci("Kembali", "tombol-hantu", keLangkahMetode));
      return;
    }

    const area = document.createElement("div");
    area.className = "checkout-struk";
    area.append(renderStruk(hasil.transaksi));
    badan().replaceChildren(area);
    kaki().replaceChildren(
      kunci("Cetak", "tombol-hantu", () => window.print()),
      kunci("Transaksi Baru", "tombol-utama", () => {
        selesaiDitutup = true;
        onSelesai(hasil);
        m.tutup();
      })
    );
  }

  const m = bukaModal({
    judul: "Pembayaran",
    render: () => document.createElement("div"),
    aksi: () => [],
    onTutup: () => {
      if (!selesaiDitutup) onSelesai({ ok: false, alasan: "ditutup" });
    },
  });

  keLangkahMetode();

  return m;
}
```

- [ ] **Step 4: Tambahkan gaya checkout dan struk ke `css/components.css`**

```css
/* ===== Checkout ===== */
.checkout { display: grid; gap: 12px; }
.checkout-total {
  margin: 0; font-family: var(--f-serif); font-size: 26px; font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.checkout-pilihan { display: grid; gap: 10px; }
.checkout-pilihan-item {
  display: grid; gap: 2px; padding: 14px 16px; text-align: left;
  min-height: var(--s-sentuh); cursor: pointer;
  border: 1px solid var(--c-line); border-radius: var(--r-kecil);
  background: var(--c-surface);
}
.checkout-pilihan-item:hover { border-color: var(--c-accent); }
.checkout-pilihan-item strong { font-size: 16px; }
.checkout-pilihan-item span { font-size: 13px; color: var(--c-ink-soft); }
.checkout-cepat { display: flex; gap: 8px; flex-wrap: wrap; }
.checkout-kembalian {
  margin: 0; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--c-success);
}
.checkout-kembalian.kurang { color: var(--c-danger); }
.checkout-struk { display: grid; place-items: center; }
.galat-panel {
  padding: 14px 16px; border-radius: var(--r-kecil);
  background: #FBEDEA; border: 1px solid var(--c-danger); color: var(--c-danger);
}
.galat-panel p { margin: 0; }

/* ===== Struk ===== */
.struk-bangko { text-align: center; margin-bottom: 12px; }
.struk-nama { font-family: var(--f-serif); font-size: 20px; font-weight: 700; }
.struk-kode, .struk-waktu { font-size: 12px; }
.struk-tabel { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.struk-tabel td { padding: 3px 0; vertical-align: top; }
.struk-qty { text-align: center; width: 34px; }
.struk-jumlah { text-align: right; width: 90px; font-variant-numeric: tabular-nums; }
.struk-total {
  display: flex; justify-content: space-between; gap: 12px;
  font-variant-numeric: tabular-nums;
}
.struk-total:nth-of-type(2) { font-weight: 700; }
.struk-kaki { margin-top: 14px; text-align: center; font-size: 12px; }
```

- [ ] **Step 5: Jalankan test**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 6: Verifikasi manual di browser**

Tambah dua produk ke keranjang, klik **Bayar**. Periksa:
- Langkah 1 menampilkan total dan tiga pilihan metode
- Pilih **QRIS** → langsung ke struk pratinjau; "Selesaikan" menyimpan transaksi; struk final menampilkan kode `#TRX-0001`; toast muncul
- Pilih **Tunai** → input uang diterima; "Selesaikan" **nonaktif**; ketik `50000` saat total `Rp 62.000` → tetap nonaktif dengan teks "Uang diterima kurang dari total."
- Klik "Uang Pas" → kembalian `Rp 0`, tombol aktif
- Ketik `100000` → "Kembalian Rp 38.000"
- Klik "Kembali" → kembali ke pilihan metode tanpa kehilangan keranjang
- Klik "Transaksi Baru" → modal tertutup, keranjang kosong
- Buka Laporan → transaksi tercatat, omzet benar
- Tekan `Esc` saat di langkah uang diterima → modal tertutup, **tidak ada transaksi tersimpan**, toast "Pembayaran dibatalkan."
- Klik "Cetak" → dialog print terbuka, hanya area struk yang terlihat

- [ ] **Step 7: Commit**

```bash
git add js/components/struk.js js/components/checkout.js js/views/kasir.js css/components.css
git commit -m "feat: checkout 3 langkah, hitung kembalian, render struk"
```
---

### Task 11: `views/menu.js` — Kelola produk

**Files:**
- Create: `js/views/menu.js` (timpa stub dari Task 7)

**Interfaces:**
- Consumes: `format.js` → `formatRupiah`, `parseRupiah`; `catalog.js` → `produkValid`; `components/modal.js` → `bukaModal`, `konfirmasi`; toast lewat `ctx.toast`
- Produces: `mount(el, ctx)` untuk rute `/menu`

**Perilaku yang harus ada di akhir task:**
- Tabel desktop dengan kolom nama, kategori, harga, status, aksi
- Pencarian + filter kategori yang **menyertakan produk nonaktif**
- `+ Tambah Produk` membuka form modal
- Form berisi nama, harga (`inputmode="numeric"`), kategori (`input` + `datalist`), checkbox aktif
- Tombol simpan **nonaktif** selama nama kosong, harga ≤ 0, atau kategori kosong
- Ikon status bolak-balik aktif tanpa dialog konfirmasi
- Ikon hapus membuka `konfirmasi` yang menyebut transaksi lama tetap utuh

- [ ] **Step 1: Tulis `js/views/menu.js`**

```js
import { formatRupiah, parseRupiah } from "../format.js";
import { produkValid } from "../catalog.js";
import { bukaModal, konfirmasi } from "../components/modal.js";

const SEMUA = "Semua";

export function mount(el, ctx) {
  const { store, toast } = ctx;

  let kategori = SEMUA;
  let cari = "";

  const kepala = document.createElement("div");
  kepala.className = "halaman-kepala";
  const judul = document.createElement("h1");
  judul.textContent = "Kelola Menu";
  const tambah = document.createElement("button");
  tambah.type = "button";
  tambah.className = "tombol tombol-utama";
  tambah.textContent = "+ Tambah Produk";
  tambah.addEventListener("click", () => formProduk(null));
  kepala.append(judul, tambah);

  const alat = document.createElement("div");
  alat.className = "halaman-alat";

  const cariLabel = document.createElement("label");
  cariLabel.className = "sr-only";
  cariLabel.textContent = "Cari produk";
  cariLabel.htmlFor = "cari-produk";

  const cariInput = document.createElement("input");
  cariInput.id = "cari-produk";
  cariInput.type = "search";
  cariInput.className = "isian";
  cariInput.placeholder = "Cari produk…";
  cariInput.addEventListener("input", () => {
    cari = cariInput.value;
    gambar();
  });
  cariLabel.append(cariInput);

  const chipWrap = document.createElement("div");
  chipWrap.className = "daftar-chip";

  const isi = document.createElement("div");
  alat.append(cariLabel, chipWrap);
  el.append(kepala, alat, isi);

  function gambarChip() {
    const semua = [...new Set(store.getState().products.map((p) => p.category))].sort();
    chipWrap.replaceChildren(
      ...[SEMUA, ...semua].map((nama) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = nama;
        b.classList.toggle("aktif", nama === kategori);
        b.addEventListener("click", () => {
          kategori = nama;
          gambar();
        });
        return b;
      })
    );
  }

  function lencanaAktif(status) {
    const s = document.createElement("span");
    s.className = status === true ? "lencana-aktif" : "lencana-nonaktif";
    s.textContent = status ? "Aktif" : "Nonaktif";
    return s;
  }

  function tombolIkon(teks, aria, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tombol-ikon";
    b.textContent = teks;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  }

  function selAksi(p) {
    return tombolIkon(
      p.active ? "Matikan" : "Aktifkan",
      `${p.active ? "Matikan" : "Aktifkan"} ${p.name}`,
      () => {
        store.alihkanAktif(p.id);
        toast(`${p.name} ${p.active ? "dimatikan" : "diaktifkan"}`, "sukses");
      }
    );
  }

  async function hapus(p) {
    const ya = await konfirmasi({
      judul: "Hapus produk",
      pesan: `Hapus "${p.name}" dari daftar menu? Transaksi yang sudah pernah terjadi tetap utuh, karena nama dan harga tiap transaksi tersimpan sendiri di dalam struknya.`,
      labelYa: "Ya, hapus",
    });
    if (!ya) return;
    store.hapusProduk(p.id);
    toast(`${p.name} dihapus`, "sukses");
  }

  function formProduk(produk) {
    bukaModal({
      judul: produk ? "Ubah Produk" : "Tambah Produk",
      render: () => {
        const form = document.createElement("div");

        const namaBaris = document.createElement("div");
        namaBaris.className = "baris-isian";
        const namaLabel = document.createElement("label");
        namaLabel.className = "label";
        namaLabel.textContent = "Nama produk";
        namaLabel.htmlFor = "f-nama";
        const namaInput = document.createElement("input");
        namaInput.id = "f-nama";
        namaInput.type = "text";
        namaInput.className = "isian";
        namaInput.value = produk ? produk.name : "";
        namaBaris.append(namaLabel, namaInput);

        const hargaBaris = document.createElement("div");
        hargaBaris.className = "baris-isian";
        const hargaLabel = document.createElement("label");
        hargaLabel.className = "label";
        hargaLabel.textContent = "Harga";
        hargaLabel.htmlFor = "f-harga";
        const hargaInput = document.createElement("input");
        hargaInput.id = "f-harga";
        hargaInput.type = "text";
        hargaInput.inputMode = "numeric";
        hargaInput.className = "isian";
        hargaInput.value = produk ? String(produk.price) : "";
        hargaBaris.append(hargaLabel, hargaInput);

        const kategoriBaris = document.createElement("div");
        kategoriBaris.className = "baris-isian";
        const kategoriLabel = document.createElement("label");
        kategoriLabel.className = "label";
        kategoriLabel.textContent = "Kategori";
        kategoriLabel.htmlFor = "f-kategori";
        const kategoriInput = document.createElement("input");
        kategoriInput.id = "f-kategori";
        kategoriInput.type = "text";
        kategoriInput.className = "isian";
        kategoriInput.value = produk ? produk.category : "";
        const datalist = document.createElement("datalist");
        datalist.id = "daftar-kategori";
        for (const namaKtg of new Set(store.getState().products.map((p) => p.category))) {
          const opt = document.createElement("option");
          opt.value = namaKtg;
          datalist.append(opt);
        }
        kategoriInput.setAttribute("list", "daftar-kategori");
        kategoriBaris.append(kategoriLabel, kategoriInput, datalist);

        const aktifBaris = document.createElement("div");
        aktifBaris.className = "baris-isian";
        const aktifLabel = document.createElement("label");
        aktifLabel.className = "label";
        aktifLabel.textContent = "Tampilkan di layar kasir";
        aktifLabel.htmlFor = "f-aktif";
        const aktifInput = document.createElement("input");
        aktifInput.id = "f-aktif";
        aktifInput.type = "checkbox";
        aktifInput.checked = produk ? produk.active === true : true;
        aktifBaris.append(aktifLabel, aktifInput);

        form.append(namaBaris, hargaBaris, kategoriBaris, aktifBaris);
        return form;
      },
      aksi: (kendali) => {
        const namaInput = kendali.el.querySelector("#f-nama");
        const hargaInput = kendali.el.querySelector("#f-harga");
        const kategoriInput = kendali.el.querySelector("#f-kategori");
        const aktifInput = kendali.el.querySelector("#f-aktif");

        const simpan = document.createElement("button");
        simpan.type = "button";
        simpan.className = "tombol tombol-utama";
        simpan.textContent = produk ? "Simpan perubahan" : "Tambah produk";
        simpan.dataset.kunciBatal = "true";

        const data = () => ({
          name: namaInput.value.trim(),
          price: parseRupiah(hargaInput.value),
          category: kategoriInput.value.trim(),
          active: aktifInput.checked,
        });

        const perbarui = () => {
          simpan.disabled = !produkValid({ id: "x", ...data() });
        };

        simpan.addEventListener("click", () => {
          const nilai = data();
          if (produk) {
            store.ubahProduk(produk.id, nilai);
            toast(`${nilai.name} diperbarui`, "sukses");
          } else {
            store.tambahProduk(nilai);
            toast(`${nilai.name} ditambahkan`, "sukses");
          }
          kendali.tutup();
        });

        for (const input of [namaInput, hargaInput, kategoriInput, aktifInput]) {
          input.addEventListener("input", perbarui);
          input.addEventListener("change", perbarui);
        }
        perbarui();

        const batal = document.createElement("button");
        batal.type = "button";
        batal.className = "tombol tombol-hantu";
        batal.textContent = "Batal";
        batal.dataset.kunciBatal = "true";
        batal.addEventListener("click", kendali.tutup);

        return [batal, simpan];
      },
    });
  }

  function gambar() {
    gambarChip();
    const daftar = store.saringProduk({ category: kategori, query: cari, hanyaAktif: false });

    if (daftar.length === 0) {
      isi.replaceChildren();
      const kosong = document.createElement("div");
      kosong.className = "kosong-state";
      kosong.textContent = "Tidak ada produk yang cocok.";
      isi.append(kosong);
      return;
    }

    const tabel = document.createElement("table");
    tabel.className = "tabel tabel-menu";
    tabel.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Produk</th>
          <th scope="col">Kategori</th>
          <th scope="col" class="tabel-angka">Harga</th>
          <th scope="col">Status</th>
          <th scope="col"><span class="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tabel.querySelector("tbody");

    for (const p of daftar) {
      const tr = document.createElement("tr");

      const tdNama = document.createElement("td");
      const nama = document.createElement("div");
      nama.className = "kartu-menu-nama";
      nama.textContent = p.name;
      const meta = document.createElement("div");
      meta.className = "kartu-menu-meta";
      meta.textContent = p.category;
      tdNama.append(nama, meta);

      const tdKategori = document.createElement("td");
      tdKategori.textContent = p.category;

      const tdHarga = document.createElement("td");
      tdHarga.className = "tabel-angka";
      tdHarga.textContent = formatRupiah(p.price);

      const tdStatus = document.createElement("td");
      tdStatus.append(lencanaAktif(p.active));

      const tdAksi = document.createElement("td");
      tdAksi.append(
        tombolIkon("Ubah", `Ubah ${p.name}`, () => formProduk(p)),
        selAksi(p),
        tombolIkon("Hapus", `Hapus ${p.name}`, () => hapus(p))
      );

      tr.append(tdNama, tdKategori, tdHarga, tdStatus, tdAksi);
      tbody.append(tr);
    }

    isi.replaceChildren(tabel);
  }

  gambar();
  const lepas = store.subscribe(() => gambar());
  return () => lepas();
}
```

- [ ] **Step 2: Tambahkan gaya responsif tabel menu ke `css/views.css`**

```css
.tabel-menu .kartu-menu-nama { font-weight: 600; }
.tabel-menu .kartu-menu-meta { font-size: 13px; color: var(--c-ink-soft); }

@media (max-width: 720px) {
  .tabel-menu thead { display: none; }
  .tabel-menu, .tabel-menu tbody, .tabel-menu tr, .tabel-menu td { display: block; width: 100%; }
  .tabel-menu tr {
    position: relative; margin-bottom: 12px; padding: 12px 96px 12px 12px;
    border: 1px solid var(--c-line); border-radius: var(--r-kartu);
    background: var(--c-surface);
  }
  .tabel-menu tr:hover { background: var(--c-surface); }
  .tabel-menu td { border: 0; padding: 2px 0; }
  .tabel-menu td:nth-child(2) { display: none; }
  .tabel-menu td:nth-child(3) { font-weight: 700; color: var(--c-accent); }
  .tabel-menu td:last-child { position: absolute; top: 10px; right: 10px; }
}
```

- [ ] **Step 3: Jalankan test**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 4: Verifikasi manual di browser**

Buka tab **Kelola Menu**. Yang harus benar:
- 13 baris tampil dengan harga terformat
- Kolom status menampilkan lencana "Aktif"
- Klik "Matikan" pada satu produk → lencana jadi "Nonaktif", toast muncul, tanpa dialog konfirmasi
- Produk nonaktif **tidak muncul** di tab Kasir, tapi **tetap ada** di tab Kelola Menu
- Klik "Ubah" → modal terisi data lama; ubah harga jadi `25.000` → tersimpan; baris menampilkan `Rp 25.000`
- Klik "+ Tambah Produk" → modal kosong terbuka
- Kosongkan nama → tombol "Tambah produk" nonaktif
- Ketik `1.234` di harga → tidak error, tombol aktif
- Ketik kategori baru `Croissant` → tersimpan
- Pindah ke tab Kasir → chip "Croissant" muncul otomatis
- Klik "Hapus" → dialog konfirmasi; "Ya, hapus" → baris hilang
- Perkecil ke <=720px → tabel berubah menjadi kartu bertumpuk

- [ ] **Step 5: Commit**

```bash
git add js/views/menu.js css/views.css
git commit -m "feat: halaman kelola produk - CRUD, status aktif, konfirmasi hapus"
```

---

### Task 12: `views/laporan.js` — rekap penjualan

**Files:**
- Create: `js/views/laporan.js` (timpa stub dari Task 7)

**Interfaces:**
- Consumes: `format.js` → `formatRupiah`, `formatJam`; `reports.js` → `RENTANG`; `components/modal.js` → `mintaKata`; toast lewat `ctx.toast`
- Produces: `mount(el, ctx)` untuk rute `/laporan`
- Memakai `store.laporan(rentang)` dan `store.transaksiRentang(rentang)` — **tidak** menghitung ulang sendiri

**Perilaku yang harus ada di akhir task:**
- Empat kartu statistik: Omzet, Jumlah Transaksi, Rata-rata per Transaksi, Produk Terlaris
- Filter rentang `Hari Ini` / `7 Hari` / `Semua`, default Hari Ini
- Rincian omzet per metode bayar beserta persentasenya
- Tabel transaksi; klik baris membuka rincian item
- Area berbahaya dengan `Reset Semua Data` yang mewajibkan mengetik `HAPUS`

- [ ] **Step 1: Tulis `js/views/laporan.js`**

```js
import { formatRupiah, formatJam } from "../format.js";
import { RENTANG } from "../reports.js";
import { mintaKata } from "../components/modal.js";

const LABEL_METODE = { tunai: "Tunai", qris: "QRIS", transfer: "Transfer" };

const PILIHAN_RENTANG = [
  { id: RENTANG.HARI_INI, label: "Hari Ini" },
  { id: RENTANG.TUJUH_HARI, label: "7 Hari" },
  { id: RENTANG.SEMUA, label: "Semua" },
];

export function mount(el, ctx) {
  const { store, toast } = ctx;

  let rentang = RENTANG.HARI_INI;
  const barisTerbuka = new Set();

  const kepala = document.createElement("div");
  kepala.className = "halaman-kepala";
  const judul = document.createElement("h1");
  judul.textContent = "Laporan Penjualan";

  const chipWrap = document.createElement("div");
  chipWrap.className = "daftar-chip";
  for (const opsi of PILIHAN_RENTANG) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = opsi.label;
    b.dataset.rentang = opsi.id;
    b.addEventListener("click", () => {
      rentang = opsi.id;
      gambar();
    });
    chipWrap.append(b);
  }
  kepala.append(judul, chipWrap);

  const statistik = document.createElement("div");
  statistik.className = "kartu-statistik";

  const metodePanel = document.createElement("section");
  metodePanel.className = "panel";

  const tabelPanel = document.createElement("section");
  tabelPanel.className = "panel";

  const bahaya = document.createElement("section");
  bahaya.className = "area-bahaya";
  const bahayaJudul = document.createElement("h2");
  bahayaJudul.textContent = "Zona Berbahaya";
  const bahayaKet = document.createElement("p");
  bahayaKet.textContent = "Reset mengembalikan menu ke data awal TeKo dan menghapus seluruh riwayat penjualan. Tindakan ini tidak bisa dibatalkan.";
  const resetTombol = document.createElement("button");
  resetTombol.type = "button";
  resetTombol.className = "tombol tombol-bahaya";
  resetTombol.textContent = "Reset Semua Data";
  resetTombol.addEventListener("click", async () => {
    const ya = await mintaKata({
      judul: "Reset semua data",
      pesan: "Seluruh menu dan riwayat penjualan akan dihapus.",
      kata: "HAPUS",
    });
    if (!ya) return;
    store.resetSemua();
    toast("Data dikembalikan ke kondisi awal", "sukses");
  });
  bahaya.append(bahayaJudul, bahayaKet, resetTombol);

  el.append(kepala, statistik, metodePanel, tabelPanel, bahaya);

  function kartuStatistik(label, nilai, ket = "") {
    const kotak = document.createElement("div");
    kotak.className = "kartu-statistik-item";
    const l = document.createElement("div");
    l.className = "kartu-statistik-label";
    l.textContent = label;
    const n = document.createElement("div");
    n.className = "kartu-statistik-nilai";
    n.textContent = nilai;
    kotak.append(l, n);
    if (ket) {
      const k = document.createElement("div");
      k.className = "kartu-statistik-ket";
      k.textContent = ket;
      kotak.append(k);
    }
    return kotak;
  }

  function gambarStatistik() {
    const r = store.laporan(rentang);
    statistik.replaceChildren(
      kartuStatistik("Omzet", formatRupiah(r.omzet)),
      kartuStatistik("Jumlah Transaksi", String(r.jumlah)),
      kartuStatistik("Rata-rata per Transaksi", formatRupiah(r.rataRata)),
      kartuStatistik(
        "Produk Terlaris",
        r.terlaris ? r.terlaris.name : "—",
        r.terlaris ? `${r.terlaris.qty} terjual` : "Belum ada penjualan"
      )
    );
  }

  function gambarMetode() {
    const r = store.laporan(rentang);
    metodePanel.replaceChildren();
    const h = document.createElement("h2");
    h.textContent = "Omzet per Metode Pembayaran";
    metodePanel.append(h);

    const total = Object.values(r.perMetode).reduce((a, b) => a + b, 0);
    for (const [id, label] of Object.entries(LABEL_METODE)) {
      const baris = document.createElement("div");
      baris.className = "baris-metode";
      const kiri = document.createElement("span");
      kiri.textContent = label;
      const kanan = document.createElement("span");
      const persen = total === 0 ? 0 : Math.round((r.perMetode[id] / total) * 100);
      kanan.textContent = `${formatRupiah(r.perMetode[id])} · ${persen}%`;
      baris.append(kiri, kanan);
      metodePanel.append(baris);
    }
  }

  function gambarTransaksi() {
    const daftar = store.transaksiRentang(rentang);
    tabelPanel.replaceChildren();
    const h = document.createElement("h2");
    h.textContent = `Transaksi (${daftar.length})`;
    tabelPanel.append(h);

    if (daftar.length === 0) {
      const kosong = document.createElement("div");
      kosong.className = "kosong-state";
      kosong.textContent = "Belum ada transaksi pada rentang ini.";
      tabelPanel.append(kosong);
      return;
    }

    const tabel = document.createElement("table");
    tabel.className = "tabel";
    tabel.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Nomor</th>
          <th scope="col">Jam</th>
          <th scope="col" class="tabel-angka">Item</th>
          <th scope="col">Metode</th>
          <th scope="col" class="tabel-angka">Total</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tabel.querySelector("tbody");

    for (const t of [...daftar].reverse()) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.className = "baris-transaksi";
      tr.setAttribute("aria-expanded", barisTerbuka.has(t.id) ? "true" : "false");

      const nilai = [
        t.code,
        formatJam(new Date(t.createdAt)),
        String(t.items.reduce((n, i) => n + i.qty, 0)),
        LABEL_METODE[t.payment.method] ?? t.payment.method,
      ];
      for (const teks of nilai) {
        const td = document.createElement("td");
        td.textContent = teks;
        tr.append(td);
      }
      const tdTotal = document.createElement("td");
      tdTotal.className = "tabel-angka";
      tdTotal.textContent = formatRupiah(t.subtotal);
      tr.append(tdTotal);

      const baris = document.createElement("tr");
      const tdDetail = document.createElement("td");
      tdDetail.colSpan = 5;
      if (barisTerbuka.has(t.id)) {
        const rincian = document.createElement("div");
        rincian.className = "bilah-rincian";
        for (const item of t.items) {
          const p = document.createElement("div");
          p.textContent = `${item.qty}× ${item.name} — ${formatRupiah(item.price * item.qty)}`;
          rincian.append(p);
        }
        const bayar = document.createElement("p");
        bayar.textContent = `Dibayar ${formatRupiah(t.payment.received)}, kembalian ${formatRupiah(t.payment.change)}`;
        rincian.append(bayar);
        tdDetail.append(rincian);
      }
      baris.append(tdDetail);

      const balik = () => {
        if (barisTerbuka.has(t.id)) barisTerbuka.delete(t.id);
        else barisTerbuka.add(t.id);
        gambarTransaksi();
      };
      tr.addEventListener("click", balik);
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          balik();
        }
      });

      tbody.append(tr, baris);
    }

    tabelPanel.append(tabel);
  }

  function gambar() {
    for (const b of chipWrap.querySelectorAll(".chip")) {
      b.classList.toggle("aktif", b.dataset.rentang === rentang);
    }
    gambarStatistik();
    gambarMetode();
    gambarTransaksi();
  }

  gambar();
  const lepas = store.subscribe(() => gambar());
  return () => lepas();
}
```

- [ ] **Step 2: Tambahkan gaya baris transaksi ke `css/views.css`**

```css
.baris-transaksi { cursor: pointer; }
.baris-transaksi:focus-visible { outline: 3px solid var(--c-accent); outline-offset: -3px; }
```

- [ ] **Step 3: Jalankan test**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 4: Verifikasi manual di browser**

Buka tab **Laporan** setelah menyelesaikan beberapa transaksi di Task 10. Yang harus benar:
- Empat kartu angka tampil; Omzet dan Rata-rata terformat rupiah
- "Produk Terlaris" menampilkan nama produk dengan qty terbesar, atau "—" bila belum ada transaksi
- Filter "Hari Ini" / "7 Hari" / "Semua" mengubah angka dan tabel
- Rincian per metode menampilkan persentase yang wajar
- Klik baris transaksi → rincian item muncul; klik lagi → tertutup
- Klik "Reset Semua Data" → dialog meminta mengetik `HAPUS`; teks salah → pesan galat dan dialog tetap terbuka; ketik `HAPUS` → data kembali ke 13 produk awal, transaksi kosong, toast muncul
- Tidak ada `NaN`, `undefined`, atau `Rp NaN` di mana pun

- [ ] **Step 5: Commit**

```bash
git add js/views/laporan.js css/views.css
git commit -m "feat: halaman laporan - statistik, rincian metode, tabel transaksi, reset data"
```

---

### Task 13: `tests/run.html` — hasil merah/hijau yang bisa dibaca manusia

**Files:**
- Create: `tests/run.html`

**Interfaces:**
- Consumes: `tests/harness.js` → `eq`, `deepEq`, `benar`; `tests/cases.js` → `daftarKasus({ test })`
- Menghasilkan DOM berisi daftar hasil dan ringkasan total

**Kenapa ada:** `node --test` adalah loop TDD, tapi bukan cara yang nyaman untuk memeriksa sendiri perubahan. Halaman ini menampilkan hasil yang sama dengan bentuk yang enak dibaca mata, tanpa dependency tambahan.

- [ ] **Step 1: Tulis `tests/run.html`**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hasil Test — Kasir TeKo</title>
  <style>
    :root { --lolos: #3F7D4E; --gagal: #B3402F; --garis: #E7D8C6; --lembut: #7A5C46; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px;
      font-family: ui-sans-serif, system-ui, "Segoe UI", sans-serif;
      background: #FBF6EF; color: #3E2A20; font-size: 14px;
    }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .sub { margin: 0 0 20px; color: var(--lembut); }
    #ringkasan {
      position: sticky; top: 0; padding: 14px 18px; margin-bottom: 20px;
      border-radius: 10px; background: #3E2A20; color: #FBF6EF; font-weight: 700;
    }
    #ringkasan.lolos { background: var(--lolos); }
    #ringkasan.gagal { background: var(--gagal); }
    .kasus {
      display: grid; grid-template-columns: 28px 1fr; gap: 10px;
      padding: 8px 12px; border-bottom: 1px solid var(--garis);
    }
    .kasus.gagal { background: #FBEDEA; }
    .tanda { font-weight: 700; color: var(--lembut); }
    .kasus.lolos .tanda { color: var(--lolos); }
    .kasus.gagal .tanda { color: var(--gagal); }
    .pesan {
      font-family: ui-monospace, "Courier New", monospace;
      font-size: 12px; color: var(--lembut);
    }
    .pesan.galat { color: var(--gagal); }
  </style>
</head>
<body>
  <h1>Hasil Test — Kasir TeKo</h1>
  <p class="sub">Halaman ini menjalankan kasus uji yang sama dengan <code>node --test</code>, memakai berkas yang sama.</p>
  <div id="ringkasan">Menjalankan…</div>
  <div id="hasil"></div>

  <script type="module">
    import { daftarKasus } from "./cases.js";

    const hasilEl = document.getElementById("hasil");
    const ringkasanEl = document.getElementById("ringkasan");

    let total = 0;
    let lolos = 0;
    const namaGagal = [];

    function baris(nama, benar, pesan) {
      const d = document.createElement("div");
      d.className = `kasus ${benar ? "lolos" : "gagal"}`;

      const tanda = document.createElement("span");
      tanda.className = "tanda";
      tanda.textContent = benar ? "lolos" : "GAGAL";

      const isi = document.createElement("div");
      const judul = document.createElement("div");
      judul.textContent = nama;
      isi.append(judul);

      if (pesan) {
        const p = document.createElement("div");
        p.className = `pesan${benar ? "" : " galat"}`;
        p.textContent = pesan;
        isi.append(p);
      }

      d.append(tanda, isi);
      return d;
    }

    function test(nama, fn) {
      total += 1;
      try {
        const hasil = fn();
        if (hasil && hasil.ok === true) {
          lolos += 1;
          hasilEl.append(baris(nama, true, hasil.pesan));
        } else {
          namaGagal.push(nama);
          hasilEl.append(baris(nama, false, hasil ? hasil.pesan : "fungsi mengembalikan null"));
        }
      } catch (e) {
        namaGagal.push(nama);
        hasilEl.append(baris(nama, false, `exception: ${e.message}`));
      }
    }

    daftarKasus({ test });

    ringkasanEl.textContent = `${lolos} lolos · ${namaGagal.length} gagal · dari ${total} kasus`;
    ringkasanEl.classList.add(namaGagal.length === 0 ? "lolos" : "gagal");
    document.title = namaGagal.length === 0
      ? `OK — ${lolos} lolos`
      : `${namaGagal.length} gagal`;
  </script>
</body>
</html>
```

- [ ] **Step 2: Verifikasi manual**

Dengan server lokal masih berjalan, buka `http://localhost:8000/tests/run.html`:
- Ringkasan teratas berbunyi `156 lolos / 0 gagal / dari 156 kasus`
- Judul tab browser berbunyi `OK - 156 lolos`
- Tidak ada baris merah

Lalu buktikan halaman ini benar-benar melaporkan kegagalan: sementara, ubah satu assertion
di `tests/cases.js` menjadi nilai yang salah, reload, dan pastikan baris itu merah serta
ringkasan berubah. Kembalikan assertionnya seperti semula.

- [ ] **Step 3: Commit**

```bash
git add tests/run.html
git commit -m "feat: halaman hasil test yang bisa dibaca manusia"
```

---

### Task 14: README, checklist manual, dan verifikasi akhir

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: tidak ada. Dokumentasi dan verifikasi.

- [ ] **Step 1: Tulis `README.md`**

````markdown
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
````

- [ ] **Step 2: Jalankan test terakhir kali**

Run: `node --test`
Expected: PASS — `# pass 156`, `# fail 0`

- [ ] **Step 3: Kerjakan checklist manual**

Centang setiap item yang benar-benar sudah dicoba. Item yang gagal berarti ada bug —
perbaiki, jalankan ulang test, lalu centang ulang. Jangan mencentang item yang belum dicoba.

- [ ] **Step 4: Verifikasi konsistensi akhir**

Pastikan tidak ada placeholder yang tertinggal:

```bash
grep -rn "TODO\|TBD\|FIXME" js css index.html
```

Hasil yang diharapkan: tidak ada baris.

Pastikan tidak ada akses penyimpanan di luar `store.js`:

```bash
grep -rn "localStorage" js | grep -v "js/store.js"
```

Hasil yang diharapkan: tidak ada baris. Kalau ada, pindahkan aksesnya ke `store.js`.

- [ ] **Step 5: Commit terakhir**

```bash
git add README.md
git commit -m "docs: README dengan cara menjalankan, aturan penting, checklist manual"
```

---

## Verifikasi Rencana terhadap Spec

Setiap bagian spec harus punya task yang mengimplementasinya:

| Bagian spec | Task |
|---|---|
| 1. Ringkasan | 7, 9 |
| 2. Keputusan yang dikunci | 1, 3, 5, 6, 9 |
| 3. Lingkup (termasuk) | 9, 10, 11, 12 |
| 3. Lingkup (di luar lingkup) | Sengaja tidak diimplementasikan |
| 4.1 Arah dependency | 1–7 |
| 4.2 Struktur file | 1–13 |
| 4.3 Menjalankan | 14 (README) |
| 5.1 Bentuk data | 6 |
| 5.2 Aturan domain | 2, 3, 4, 6 |
| 5.3 ID | 1 |
| 6.1 Shell | 7 |
| 6.2 Halaman Kasir | 9 |
| 6.3 Checkout 3 langkah | 10 |
| 6.4 Halaman Kelola Menu | 11 |
| 6.5 Halaman Laporan | 12 |
| 7. Format uang | 1 |
| 8. Penanganan error | 6 (logika), 7 (banner), 9 (pesan), 10 (galat), 11 (konfirmasi), 12 (reset) |
| 9. Aksesibilitas | 8 (focus trap, Esc), 9 (aria-live), 11 (label), 12 (keyboard baris) |
| 10.1 Test otomatis | 1–6, 13 |
| 10.2 Checklist manual | 14 |
| 11. Data awal | 5 |
| 12. Palet warna | 7 (`css/base.css`) |

### Satu penyimpangan yang disengaja

Spec bagian 9 menyebut target sentuh minimal 44px. Plan ini menerapkannya lewat
`--s-sentuh: 44px` pada `.tombol` dan `.isian`, memakai 38px pada `.chip`, dan 34px pada
kontrol quantity keranjang.

Alasan: panel keranjang selebar 340px tidak muat memuat tombol 44px tanpa membuat baris
mengubah tinggi setiap kali quantities berubah. Kontrol quantity adalah target yang paling
sering diklik, jadi memaksanya 44px justru akan memperburuk ketepatan klik bagi kasir.
Kompromi ini dipilih sadar, bukan diabaikan. Kalau kamu ingin 44px penuh, lebarkan panel
keranjang ke 380px dan buat nama produk satu baris dengan `text-overflow: ellipsis`.

---
