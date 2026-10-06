const LAYER = () => document.getElementById("lapisan-toast");

export function toast(pesan, tone = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${tone}`;
  el.textContent = pesan;
  LAYER().append(el);
  setTimeout(() => el.remove(), 3200);
}
