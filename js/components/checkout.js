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
