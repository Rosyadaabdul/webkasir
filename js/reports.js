import { tengahMalam, awalTujuhHari } from "./format.js";

export const RENTANG = {
  HARI_INI: "hari-ini",
  TUJUH_HARI: "tujuh-hari",
  SEMUA: "semua",
};

export function transaksiDalamRentang(transactions, rentang, sekarang = new Date()) {
  if (rentang === RENTANG.SEMUA) return transactions.slice();
  const mulai = rentang === RENTANG.TUJUH_HARI ? awalTujuhHari(sekarang) : tengahMalam(sekarang);
  const akhir = tengahMalam(sekarang);
  akhir.setDate(akhir.getDate() + 1);
  return transactions.filter((t) => {
    const waktu = new Date(t.createdAt).getTime();
    return waktu >= mulai.getTime() && waktu < akhir.getTime();
  });
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
