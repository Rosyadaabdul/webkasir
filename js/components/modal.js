const LAYER = () => document.getElementById("lapisan-modal");

let yangSedangBuka = null;

export function bukaModal({ judul, render, aksi, onTutup }) {
  const sebelumnyaFokus = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const kotak = document.createElement("div");
  kotak.className = "modal";
  kotak.setAttribute("role", "dialog");
  kotak.setAttribute("aria-modal", "true");
  kotak.setAttribute("aria-label", judul);

  const kepala = document.createElement("header");
  kepala.className = "modal-kepala";
  const judulEl = document.createElement("h2");
  judulEl.textContent = judul;
  const tutupEl = document.createElement("button");
  tutupEl.type = "button";
  tutupEl.className = "tombol tombol-hantu modal-tutup";
  tutupEl.setAttribute("aria-label", "Tutup");
  tutupEl.textContent = "×";
  kepala.append(judulEl, tutupEl);

  const isi = document.createElement("div");
  isi.className = "modal-isi";

  const kaki = document.createElement("footer");
  kaki.className = "modal-kaki";

  kotak.append(kepala, isi, kaki);
  overlay.append(kotak);

  const tutup = () => {
    if (yangSedangBuka !== kendali) return;
    document.removeEventListener("keydown", padaTombol);
    LAYER().classList.add("sembunyi");
    LAYER().replaceChildren();
    yangSedangBuka = null;
    if (sebelumnyaFokus && sebelumnyaFokus.focus) sebelumnyaFokus.focus();
    if (onTutup) onTutup();
  };

  const padaTombol = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      tutup();
      return;
    }
    if (e.key !== "Tab") return;
    const bisaFokus = kotak.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (bisaFokus.length === 0) return;
    const pertama = bisaFokus[0];
    const terakhir = bisaFokus[bisaFokus.length - 1];
    if (e.shiftKey && document.activeElement === pertama) {
      e.preventDefault();
      terakhir.focus();
    } else if (!e.shiftKey && document.activeElement === terakhir) {
      e.preventDefault();
      pertama.focus();
    }
  };

  const kendali = { el: isi, tutup };

  isi.append(render(kendali));
  if (aksi) kaki.append(...aksi(kendali));

  tutupEl.addEventListener("click", tutup);
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) tutup();
  });
  document.addEventListener("keydown", padaTombol);

  LAYER().classList.remove("sembunyi");
  LAYER().replaceChildren(overlay);

  yangSedangBuka = kendali;

  const fokusPertama = kotak.querySelector(
    'input:not([type="hidden"]), button:not(.modal-tutup), select, textarea'
  );
  if (fokusPertama) fokusPertama.focus();

  return kendali;
}

export function konfirmasi({ judul, pesan, labelYa = "Ya, lanjutkan" }) {
  return new Promise((selesai) => {
    let sudahDijawab = false;
    const jawab = (nilai) => {
      sudahDijawab = true;
      m.tutup();
      selesai(nilai);
    };

    const m = bukaModal({
      judul,
      render: () => {
        const p = document.createElement("p");
        p.className = "modal-pesan";
        p.textContent = pesan;
        return p;
      },
      aksi: (k) => [
        tombolAksi("Batal", "tombol-hantu", () => jawab(false), k),
        tombolAksi(labelYa, "tombol-utama", () => jawab(true), k),
      ],
      onTutup: () => { if (!sudahDijawab) selesai(false); },
    });
  });
}

export function mintaKata({ judul, pesan, kata = "HAPUS" }) {
  return new Promise((selesai) => {
    let sudahDijawab = false;
    const jawab = (nilai) => {
      sudahDijawab = true;
      m.tutup();
      selesai(nilai);
    };

    const m = bukaModal({
      judul,
      render: () => {
        const wrap = document.createElement("div");
        const p = document.createElement("p");
        p.className = "modal-pesan";
        p.textContent = `${pesan} Ketik ${kata} untuk melanjutkan.`;

        const label = document.createElement("label");
        label.className = "label";
        label.textContent = `Ketik ${kata}`;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "isian";
        input.autocomplete = "off";
        input.dataset.kunciBatal = "true";

        const galat = document.createElement("p");
        galat.className = "galat-teks sembunyi";

        input.addEventListener("input", () => {
          galat.classList.toggle("sembunyi", input.value.trim() === kata);
        });

        wrap.append(p, label, input, galat);
        return wrap;
      },
      aksi: (k) => {
        const input = k.el.querySelector("input");
        const galat = k.el.querySelector(".galat-teks");
        const ya = tombolAksi("Ya, hapus semua", "tombol-bahaya", () => {
          if (input.value.trim() !== kata) {
            galat.textContent = `Teks tidak cocok. Ketik ${kata}.`;
            galat.classList.remove("sembunyi");
            return;
          }
          jawab(true);
        }, k);
        return [tombolAksi("Batal", "tombol-hantu", () => jawab(false), k), ya];
      },
      onTutup: () => { if (!sudahDijawab) selesai(false); },
    });
  });
}

function tombolAksi(label, kelas, onClick, kendali) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `tombol ${kelas}`;
  b.textContent = label;
  b.dataset.kunciBatal = "true";
  b.addEventListener("click", onClick);
  return b;
}
