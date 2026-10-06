import { eq, deepEq, benar } from "./harness.js";
import {
  formatRupiah, parseRupiah, formatTanggal, formatTanggalPendek,
  formatJam, id, tengahMalam, awalTujuhHari,
} from "../js/format.js";
import {
  produkValid, normalisasiProduk, kategoriDari, tambahProduk,
  ubahProduk, hapusProduk, alihkanAktif, saringProduk,
} from "../js/catalog.js";
import {
  BATAS_QTY, tambahKeKeranjang, setQtyKeranjang, hapusDariKeranjang,
  kosongkanKeranjang, totalKeranjang, jumlahItemKeranjang, hitungKembalian,
  kodeBerikutnya,
} from "../js/cart.js";
import { RENTANG, transaksiDalamRentang, ringkasan } from "../js/reports.js";
import { SEED_PRODUK } from "../js/seed.js";
import { STORAGE_KEY, buatStore } from "../js/store.js";

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
    eq(formatTanggal(new Date(2026, 9, 6)), "Sel, 6 Okt 2026"));

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

  // Koreksi dari brief (expect 1): seed sudah memuat "Teh" Non-Kopi, tambah 1 lagi => 2.
  test("saringProduk memakai saringan katalog", () => {
    const s = storeDengan(penyimpananPalsu());
    s.tambahProduk({ name: "Matcha Latte", price: 26000, category: "Non-Kopi" });
    return eq(s.saringProduk({ category: "Non-Kopi", query: "" }).length, 2);
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

  // ---- fix-final ----
  test("salin-failure: tambahProduk saat storage penuh memutar balik perubahan", () => {
    const s = storeDengan(penyimpananPenuh());
    const sebelum = s.getState().products.length;
    s.tambahProduk({ name: "Gagal", price: 1000, category: "Kopi" });
    return deepEq([s.getState().products.length, s.getState().storagePenuh], [sebelum, true]);
  });

  test("salin-failure: ubahProduk saat storage penuh memutar balik perubahan", () => {
    const s = storeDengan(penyimpananPenuh());
    const namaSebelum = s.getState().products[0].name;
    s.ubahProduk("a", { name: "Ganti" });
    return deepEq([s.getState().products[0].name, s.getState().storagePenuh], [namaSebelum, true]);
  });

  test("resetSemua menghapus flag storagePenuh walau storage tetap penuh", () => {
    const s = storeDengan(penyimpananPenuh());
    s.tambahProduk({ name: "X", price: 1000, category: "Y" });
    benar(s.getState().storagePenuh === true);
    s.resetSemua();
    return eq(s.getState().storagePenuh, false);
  });

  test("simpan yang berhasil menghapus flag storagePenuh", () => {
    let gagal = true;
    const isi = new Map();
    const goyah = {
      getItem: (k) => (isi.has(k) ? isi.get(k) : null),
      setItem: (k, v) => { if (gagal) throw new Error("QuotaExceededError"); isi.set(k, v); },
      removeItem: (k) => { isi.delete(k); },
    };
    const s = storeDengan(goyah);
    benar(s.getState().storagePenuh === true);
    gagal = false;
    s.tambahProduk({ name: "Pulih", price: 1000, category: "Kopi" });
    return deepEq([s.getState().storagePenuh, s.getState().products.length], [false, 2]);
  });

  test("cart-works-when-full: tambahKeKeranjang tetap jalan saat storage penuh", () => {
    const s = storeDengan(penyimpananPenuh());
    s.tambahKeKeranjang("a");
    return deepEq([s.getState().cart.length, s.getState().cart[0].qty], [1, 1]);
  });

  test("cart-works-when-full: setQty tetap jalan saat storage penuh", () => {
    const s = storeDengan(penyimpananPenuh());
    s.tambahKeKeranjang("a");
    s.setQty("a", 3);
    return eq(s.getState().cart[0].qty, 3);
  });

  test('non-object JSON "5" → seed + peringatan data-rusak', () => {
    const s = storeDengan(penyimpananPalsu("5"));
    return deepEq([s.getState().products.length, s.getState().peringatan.includes("data-rusak"), s.getState().dataMentah], [1, true, "5"]);
  });

  test('non-object JSON "[]" → seed + peringatan data-rusak', () => {
    const s = storeDengan(penyimpananPalsu("[]"));
    return deepEq([s.getState().products.length, s.getState().peringatan.includes("data-rusak")], [1, true]);
  });

  test('non-object JSON "{}" → seed + peringatan data-rusak', () => {
    const s = storeDengan(penyimpananPalsu("{}"));
    return deepEq([s.getState().products.length, s.getState().peringatan.includes("data-rusak")], [1, true]);
  });

  test("JSON tanpa kunci products → peringatan data-rusak", () => {
    const s = storeDengan(penyimpananPalsu(JSON.stringify({ transactions: [] })));
    return benar(s.getState().peringatan.includes("data-rusak"));
  });
}
