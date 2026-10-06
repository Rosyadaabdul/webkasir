export function eq(actual, expected, pesan = "") {
  return {
    ok: Object.is(actual, expected),
    pesan: pesan || `harapan: ${tampil(expected)} · faktanya: ${tampil(actual)}`,
  };
}

export function deepEq(actual, expected, pesan = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  return { ok: a === b, pesan: pesan || `harapan: ${b} · faktanya: ${a}` };
}

export function benar(nilai, pesan = "") {
  return { ok: nilai === true, pesan: pesan || `harapan: true · faktanya: ${tampil(nilai)}` };
}

function tampil(nilai) {
  if (typeof nilai === "string") return JSON.stringify(nilai);
  return String(nilai);
}
