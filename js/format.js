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
