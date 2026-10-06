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
