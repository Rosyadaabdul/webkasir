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
      barisTerbuka.clear();
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
      tr.dataset.transaksiId = t.id;
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
        const ganti = tabelPanel.querySelector(`tr[data-transaksi-id="${CSS.escape(t.id)}"]`);
        if (ganti) ganti.focus();
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
