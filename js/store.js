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

  function salinProduk(produkBerikut, transaksiBerikut) {
    const produkSebelum = state.products;
    const transaksiSebelum = state.transactions;
    state.products = produkBerikut;
    if (transaksiBerikut !== undefined) state.transactions = transaksiBerikut;
    if (!simpan()) {
      state.products = produkSebelum;
      state.transactions = transaksiSebelum;
    }
    kabari();
  }

  function salinKeranjang(keranjangBerikut) {
    state.cart = keranjangBerikut;
    kabari();
  }

  function simpan() {
    if (!storage || state.storageTersedia === false) return true;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        products: state.products,
        transactions: state.transactions,
      }));
      state.storagePenuh = false;
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
      return { products: seedAwal(), transactions: [] };
    }
    let mentah = null;
    try {
      mentah = storage.getItem(STORAGE_KEY);
    } catch {
      state.storageTersedia = false;
      return { products: seedAwal(), transactions: [] };
    }
    if (mentah === null || mentah === "") {
      const awal = seedAwal();
      state.products = awal;
      simpan();
      return { products: awal, transactions: [] };
    }
    let parsed;
    try {
      parsed = JSON.parse(mentah);
    } catch {
      state.peringatan.push("data-rusak");
      state.dataMentah = mentah;
      return { products: seedAwal(), transactions: [] };
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
      || !Array.isArray(parsed.products) || !Array.isArray(parsed.transactions)) {
      state.peringatan.push("data-rusak");
      state.dataMentah = mentah;
      return { products: seedAwal(), transactions: [] };
    }
    const products = parsed.products;
    const transactions = parsed.transactions;
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
      salinProduk(tambahProduk(state.products, data));
    },
    ubahProduk(id, patch) {
      salinProduk(ubahProduk(state.products, id, patch));
    },
    hapusProduk(id) {
      salinProduk(hapusProduk(state.products, id));
    },
    alihkanAktif(id) {
      salinProduk(alihkanAktif(state.products, id));
    },

    tambahKeKeranjang(productId) {
      const produk = state.products.find((p) => p.id === productId);
      if (!produk) return;
      salinKeranjang(tambahKeKeranjang(state.cart, produk));
    },
    setQty(productId, qty) {
      salinKeranjang(setQtyKeranjang(state.cart, productId, qty));
    },
    hapusItem(productId) {
      salinKeranjang(hapusDariKeranjang(state.cart, productId));
    },
    kosongkanKeranjang() {
      salinKeranjang(kosongkanKeranjang());
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
      state.storagePenuh = false;
      kabari();
    },
  };

  return api;
}
