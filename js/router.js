const rute = new Map();
let elemenMount = null;
let ctxRouter = null;
let ruteAktif = null;
let lepasAktif = null;

function pathDariHash() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash === "" || hash === "/" ? "/kasir" : hash;
}

export function daftarRute(path, view) {
  rute.set(path, view);
}

export function ke(path) {
  if (path === ruteAktif) return;
  window.location.hash = `#${path}`;
}

export function ruteSaatIni() {
  return ruteAktif;
}

function pasang(path) {
  const view = rute.get(path);
  if (!view) {
    if (path !== "/kasir") ke("/kasir");
    return;
  }

  if (lepasAktif) {
    lepasAktif();
    lepasAktif = null;
  }

  elemenMount.replaceChildren();
  ruteAktif = path;
  lepasAktif = view(elemenMount, ctxRouter) || null;
}

export function mulaiRouter({ mount, ctx }) {
  elemenMount = mount;
  ctxRouter = ctx;

  daftarRute("/kasir", ctxRouter.__views.kasir);
  daftarRute("/menu", ctxRouter.__views.menu);
  daftarRute("/laporan", ctxRouter.__views.laporan);

  window.addEventListener("hashchange", () => pasang(pathDariHash()));

  const awal = pathDariHash();
  if (window.location.hash === "" || window.location.hash === "#") {
    window.history.replaceState(null, "", "#/kasir");
  }
  pasang(awal);
}
