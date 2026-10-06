import { buatStore } from "./store.js";
import { mulaiRouter, ke } from "./router.js";
import { formatTanggal, formatJam } from "./format.js";
import { toast } from "./components/toast.js";
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
    toast,
    __views: { kasir: mountKasir, menu: mountMenu, laporan: mountLaporan },
  },
});
