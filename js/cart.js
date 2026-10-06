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
