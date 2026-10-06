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
