import { formatRupiah } from "../format.js";
import { BATAS_QTY, totalKeranjang, jumlahItemKeranjang } from "../cart.js";
import { bukaCheckout } from "../components/checkout.js";

const SEMUA = "Semua";

export function mount(el, ctx) {
  const { store, toast } = ctx;

  let kategori = SEMUA;
  let cari = "";
  let panelTerbuka = false;

  const alat = document.createElement("div");
  alat.className = "kasir-alat";

  const daftarChip = document.createElement("div");
  daftarChip.className = "daftar-chip";

  const cariWrap = document.createElement("div");
  cariWrap.className = "kasir-cari";

  const cariLabel = document.createElement("label");
  cariLabel.className = "sr-only";
  cariLabel.textContent = "Cari menu";
  cariLabel.htmlFor = "cari-menu";

  const cariInput = document.createElement("input");
  cariInput.id = "cari-menu";
  cariInput.type = "search";
  cariInput.className = "isian";
  cariInput.placeholder = "Cari menu…";
  cariInput.addEventListener("input", () => {
    cari = cariInput.value;
    gambar();
  });

  cariWrap.append(cariLabel, cariInput);

  const areaProduk = document.createElement("div");
  areaProduk.className = "kartu-produk";

  const panel = document.createElement("aside");
  panel.className = "keranjang";
  panel.setAttribute("aria-label", "Pesanan berjalan");

  const sticky = document.createElement("button");
  sticky.type = "button";
  sticky.className = "bar-sticky";
  sticky.addEventListener("click", () => {
    panelTerbuka = !panelTerbuka;
    panel.classList.toggle("terbuka", panelTerbuka);
    gambar();
  });

  const status = document.createElement("p");
  status.id = "keranjang-status";
  status.className = "sr-only";
  status.setAttribute("aria-live", "polite");

  alat.append(daftarChip, cariWrap);

  const layout = document.createElement("div");
  layout.className = "kasir";
  layout.append(areaProduk, panel);

  el.append(alat, layout, sticky, status);

  function gambarChip() {
    daftarChip.replaceChildren(
      ...[SEMUA, ...store.kategori()].map((nama) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = nama;
        b.classList.toggle("aktif", nama === kategori);
        b.addEventListener("click", () => {
          kategori = nama;
          gambar();
        });
        return b;
      })
    );
  }

  function gambarProduk() {
    const daftar = store.saringProduk({ category: kategori, query: cari });

    if (daftar.length === 0) {
      areaProduk.replaceChildren();
      const kosong = document.createElement("div");
      kosong.className = "kosong-state";
      kosong.textContent = "Tidak ada menu yang cocok. Ubah kata kunci atau pilih kategori lain.";
      areaProduk.append(kosong);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "daftar-produk";
    for (const produk of daftar) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kartu-produk-item";
      b.innerHTML =
        `<span class="kartu-produk-nama"></span><span class="kartu-produk-harga"></span>`;
      b.querySelector(".kartu-produk-nama").textContent = produk.name;
      b.querySelector(".kartu-produk-harga").textContent = formatRupiah(produk.price);
      b.addEventListener("click", () => {
        store.tambahKeKeranjang(produk.id);
        toast(`${produk.name} ditambahkan`, "sukses");
      });
      grid.append(b);
    }
    areaProduk.replaceChildren(grid);
  }

  function barisItem(item) {
    const baris = document.createElement("div");
    baris.className = "keranjang-item";

    const kiri = document.createElement("div");
    const nama = document.createElement("div");
    nama.className = "keranjang-nama";
    nama.textContent = item.name;
    const harga = document.createElement("div");
    harga.className = "keranjang-harga";
    harga.textContent = formatRupiah(item.price);
    kiri.append(nama, harga);

    const kanan = document.createElement("div");
    kanan.className = "keranjang-kontrol";

    const kurang = document.createElement("button");
    kurang.type = "button";
    kurang.textContent = "−";
    kurang.setAttribute("aria-label", `Kurangi ${item.name}`);
    kurang.addEventListener("click", () => store.setQty(item.productId, item.qty - 1));

    const qty = document.createElement("span");
    qty.className = "keranjang-qty";
    qty.textContent = String(item.qty);

    const tambah = document.createElement("button");
    tambah.type = "button";
    tambah.textContent = "+";
    tambah.setAttribute("aria-label", `Tambah ${item.name}`);
    tambah.disabled = item.qty >= BATAS_QTY;
    tambah.addEventListener("click", () => store.setQty(item.productId, item.qty + 1));

    const buang = document.createElement("button");
    buang.type = "button";
    buang.textContent = "×";
    buang.setAttribute("aria-label", `Hapus ${item.name}`);
    buang.addEventListener("click", () => store.hapusItem(item.productId));

    kanan.append(kurang, qty, tambah, buang);
    baris.append(kiri, kanan);
    return baris;
  }

  function gambarKeranjang() {
    const { cart } = store.getState();
    const total = totalKeranjang(cart);

    panel.replaceChildren();

    const kepala = document.createElement("div");
    kepala.className = "keranjang-kepala";
    const judul = document.createElement("h2");
    judul.textContent = "Pesanan";
    const kosongkan = document.createElement("button");
    kosongkan.type = "button";
    kosongkan.className = "tombol tombol-kecil tombol-hantu";
    kosongkan.textContent = "Kosongkan";
    kosongkan.disabled = cart.length === 0;
    kosongkan.addEventListener("click", () => store.kosongkanKeranjang());
    kepala.append(judul, kosongkan);

    const daftar = document.createElement("div");
    daftar.className = "keranjang-daftar";

    if (cart.length === 0) {
      const kosong = document.createElement("p");
      kosong.className = "keranjang-kosong";
      kosong.textContent = "Keranjang masih kosong. Klik menu untuk menambahkan.";
      daftar.append(kosong);
    } else {
      for (const item of cart) daftar.append(barisItem(item));
    }

    const kaki = document.createElement("div");
    kaki.className = "keranjang-kaki";
    const subtotal = document.createElement("div");
    subtotal.className = "keranjang-subtotal";
    const label = document.createElement("span");
    label.textContent = "Total";
    const nilai = document.createElement("span");
    nilai.textContent = formatRupiah(total);
    subtotal.append(label, nilai);

    const bayar = document.createElement("button");
    bayar.type = "button";
    bayar.className = "tombol tombol-utama keranjang-bayar";
    bayar.textContent = "Bayar";
    bayar.disabled = cart.length === 0;
    bayar.addEventListener("click", () => {
      bukaCheckout({
        cart,
        store,
        onSelesai: (hasil) => {
          if (!hasil.ok) ctx.toast(pesanAlasan(hasil.alasan), "galat");
          else ctx.toast(`${hasil.transaksi.code} tersimpan`, "sukses");
        },
      });
    });

    kaki.append(subtotal, bayar);
    panel.append(kepala, daftar, kaki);

    sticky.replaceChildren();
    const teks = document.createElement("span");
    teks.className = "bar-sticky-teks";
    const jumlah = document.createElement("strong");
    jumlah.textContent = `${jumlahItemKeranjang(cart)} item · ${formatRupiah(total)}`;
    const lihat = document.createElement("span");
    lihat.textContent = panelTerbuka ? "Tutup" : "Lihat";
    teks.append(jumlah, lihat);
    sticky.append(teks);

    panel.classList.toggle("terbuka", panelTerbuka);

    status.textContent = cart.length === 0
      ? "Keranjang kosong"
      : `Keranjang berisi ${jumlahItemKeranjang(cart)} item, total ${formatRupiah(total)}`;
  }

  function pesanAlasan(alasan) {
    return {
      "keranjang-kosong": "Keranjang kosong.",
      "metode-tidak-valid": "Metode pembayaran tidak dikenal.",
      "uang-kurang": "Uang yang diterima kurang dari total.",
      "gagal-simpan": "Gagal menyimpan: penyimpanan browser penuh.",
      "ditutup": "Pembayaran dibatalkan.",
    }[alasan] ?? "Transaksi gagal.";
  }

  function gambar() {
    gambarChip();
    gambarProduk();
    gambarKeranjang();
  }

  gambar();

  const lepas = store.subscribe(() => gambar());

  return () => {
    lepas();
    panel.classList.remove("terbuka");
  };
}
