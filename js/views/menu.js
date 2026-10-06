import { formatRupiah, parseRupiah } from "../format.js";
import { produkValid } from "../catalog.js";
import { bukaModal, konfirmasi } from "../components/modal.js";

const SEMUA = "Semua";

export function mount(el, ctx) {
  const { store, toast } = ctx;

  let kategori = SEMUA;
  let cari = "";

  const kepala = document.createElement("div");
  kepala.className = "halaman-kepala";
  const judul = document.createElement("h1");
  judul.textContent = "Kelola Menu";
  const tambah = document.createElement("button");
  tambah.type = "button";
  tambah.className = "tombol tombol-utama";
  tambah.textContent = "+ Tambah Produk";
  tambah.addEventListener("click", () => formProduk(null));
  kepala.append(judul, tambah);

  const alat = document.createElement("div");
  alat.className = "halaman-alat";

  const cariLabel = document.createElement("label");
  cariLabel.className = "sr-only";
  cariLabel.textContent = "Cari produk";
  cariLabel.htmlFor = "cari-produk";

  const cariInput = document.createElement("input");
  cariInput.id = "cari-produk";
  cariInput.type = "search";
  cariInput.className = "isian";
  cariInput.placeholder = "Cari produk…";
  cariInput.addEventListener("input", () => {
    cari = cariInput.value;
    gambar();
  });

  const chipWrap = document.createElement("div");
  chipWrap.className = "daftar-chip";

  const isi = document.createElement("div");
  alat.append(cariLabel, cariInput, chipWrap);
  el.append(kepala, alat, isi);

  function gambarChip() {
    const semua = [...new Set(store.getState().products.map((p) => p.category))].sort();
    chipWrap.replaceChildren(
      ...[SEMUA, ...semua].map((nama) => {
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

  function lencanaAktif(status) {
    const s = document.createElement("span");
    s.className = status === true ? "lencana-aktif" : "lencana-nonaktif";
    s.textContent = status ? "Aktif" : "Nonaktif";
    return s;
  }

  function tombolIkon(teks, aria, onClick, varian = "tombol-hantu") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tombol tombol-kecil ${varian}`;
    b.textContent = teks;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  }

  function selAksi(p) {
    return tombolIkon(
      p.active ? "Matikan" : "Aktifkan",
      `${p.active ? "Matikan" : "Aktifkan"} ${p.name}`,
      () => {
        store.alihkanAktif(p.id);
        toast(`${p.name} ${p.active ? "dimatikan" : "diaktifkan"}`, "sukses");
      }
    );
  }

  async function hapus(p) {
    const ya = await konfirmasi({
      judul: "Hapus produk",
      pesan: `Hapus "${p.name}" dari daftar menu? Transaksi yang sudah pernah terjadi tetap utuh, karena nama dan harga tiap transaksi tersimpan sendiri di dalam struknya.`,
      labelYa: "Ya, hapus",
    });
    if (!ya) return;
    store.hapusProduk(p.id);
    toast(`${p.name} dihapus`, "sukses");
  }

  function formProduk(produk) {
    bukaModal({
      judul: produk ? "Ubah Produk" : "Tambah Produk",
      render: () => {
        const form = document.createElement("div");

        const namaBaris = document.createElement("div");
        namaBaris.className = "baris-isian";
        const namaLabel = document.createElement("label");
        namaLabel.className = "label";
        namaLabel.textContent = "Nama produk";
        namaLabel.htmlFor = "f-nama";
        const namaInput = document.createElement("input");
        namaInput.id = "f-nama";
        namaInput.type = "text";
        namaInput.className = "isian";
        namaInput.value = produk ? produk.name : "";
        namaBaris.append(namaLabel, namaInput);

        const hargaBaris = document.createElement("div");
        hargaBaris.className = "baris-isian";
        const hargaLabel = document.createElement("label");
        hargaLabel.className = "label";
        hargaLabel.textContent = "Harga";
        hargaLabel.htmlFor = "f-harga";
        const hargaInput = document.createElement("input");
        hargaInput.id = "f-harga";
        hargaInput.type = "text";
        hargaInput.inputMode = "numeric";
        hargaInput.className = "isian";
        hargaInput.value = produk ? String(produk.price) : "";
        hargaBaris.append(hargaLabel, hargaInput);

        const kategoriBaris = document.createElement("div");
        kategoriBaris.className = "baris-isian";
        const kategoriLabel = document.createElement("label");
        kategoriLabel.className = "label";
        kategoriLabel.textContent = "Kategori";
        kategoriLabel.htmlFor = "f-kategori";
        const kategoriInput = document.createElement("input");
        kategoriInput.id = "f-kategori";
        kategoriInput.type = "text";
        kategoriInput.className = "isian";
        kategoriInput.value = produk ? produk.category : "";
        const datalist = document.createElement("datalist");
        datalist.id = "daftar-kategori";
        for (const namaKtg of new Set(store.getState().products.map((p) => p.category))) {
          const opt = document.createElement("option");
          opt.value = namaKtg;
          datalist.append(opt);
        }
        kategoriInput.setAttribute("list", "daftar-kategori");
        kategoriBaris.append(kategoriLabel, kategoriInput, datalist);

        const aktifBaris = document.createElement("div");
        aktifBaris.className = "baris-isian";
        const aktifLabel = document.createElement("label");
        aktifLabel.className = "label";
        aktifLabel.textContent = "Tampilkan di layar kasir";
        aktifLabel.htmlFor = "f-aktif";
        const aktifInput = document.createElement("input");
        aktifInput.id = "f-aktif";
        aktifInput.type = "checkbox";
        aktifInput.checked = produk ? produk.active === true : true;
        aktifBaris.append(aktifLabel, aktifInput);

        form.append(namaBaris, hargaBaris, kategoriBaris, aktifBaris);
        return form;
      },
      aksi: (kendali) => {
        const namaInput = kendali.el.querySelector("#f-nama");
        const hargaInput = kendali.el.querySelector("#f-harga");
        const kategoriInput = kendali.el.querySelector("#f-kategori");
        const aktifInput = kendali.el.querySelector("#f-aktif");

        const simpan = document.createElement("button");
        simpan.type = "button";
        simpan.className = "tombol tombol-utama";
        simpan.textContent = produk ? "Simpan perubahan" : "Tambah produk";
        simpan.dataset.kunciBatal = "true";

        const data = () => ({
          name: namaInput.value.trim(),
          price: parseRupiah(hargaInput.value),
          category: kategoriInput.value.trim(),
          active: aktifInput.checked,
        });

        const perbarui = () => {
          simpan.disabled = !produkValid({ id: "x", ...data() });
        };

        simpan.addEventListener("click", () => {
          const nilai = data();
          if (produk) {
            store.ubahProduk(produk.id, nilai);
            toast(`${nilai.name} diperbarui`, "sukses");
          } else {
            store.tambahProduk(nilai);
            toast(`${nilai.name} ditambahkan`, "sukses");
          }
          kendali.tutup();
        });

        for (const input of [namaInput, hargaInput, kategoriInput, aktifInput]) {
          input.addEventListener("input", perbarui);
          input.addEventListener("change", perbarui);
        }
        perbarui();

        const batal = document.createElement("button");
        batal.type = "button";
        batal.className = "tombol tombol-hantu";
        batal.textContent = "Batal";
        batal.dataset.kunciBatal = "true";
        batal.addEventListener("click", kendali.tutup);

        return [batal, simpan];
      },
    });
  }

  function gambar() {
    gambarChip();
    const daftar = store.saringProduk({ category: kategori, query: cari, hanyaAktif: false });

    if (daftar.length === 0) {
      isi.replaceChildren();
      const kosong = document.createElement("div");
      kosong.className = "kosong-state";
      kosong.textContent = "Tidak ada produk yang cocok.";
      isi.append(kosong);
      return;
    }

    const tabel = document.createElement("table");
    tabel.className = "tabel tabel-menu";
    tabel.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Produk</th>
          <th scope="col">Kategori</th>
          <th scope="col" class="tabel-angka">Harga</th>
          <th scope="col">Status</th>
          <th scope="col"><span class="sr-only">Aksi</span></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tabel.querySelector("tbody");

    for (const p of daftar) {
      const tr = document.createElement("tr");

      const tdNama = document.createElement("td");
      const nama = document.createElement("div");
      nama.className = "kartu-menu-nama";
      nama.textContent = p.name;
      const meta = document.createElement("div");
      meta.className = "kartu-menu-meta";
      meta.textContent = p.category;
      tdNama.append(nama, meta);

      const tdKategori = document.createElement("td");
      tdKategori.textContent = p.category;

      const tdHarga = document.createElement("td");
      tdHarga.className = "tabel-angka";
      tdHarga.textContent = formatRupiah(p.price);

      const tdStatus = document.createElement("td");
      tdStatus.append(lencanaAktif(p.active));

      const tdAksi = document.createElement("td");
      tdAksi.className = "sel-aksi-luar";
      const aksiWrap = document.createElement("div");
      aksiWrap.className = "sel-aksi";
      aksiWrap.append(
        tombolIkon("Ubah", `Ubah ${p.name}`, () => formProduk(p)),
        selAksi(p),
        tombolIkon("Hapus", `Hapus ${p.name}`, () => hapus(p), "tombol-bahaya-lembut")
      );
      tdAksi.append(aksiWrap);

      tr.append(tdNama, tdKategori, tdHarga, tdStatus, tdAksi);
      tbody.append(tr);
    }

    isi.replaceChildren(tabel);
  }

  gambar();
  const lepas = store.subscribe(() => gambar());
  return () => lepas();
}
