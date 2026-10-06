import test from "node:test";
import { daftarKasus } from "./cases.js";

function tegas(nama, fn) {
  test(nama, () => {
    const hasil = fn();
    if (hasil && hasil.ok === false) throw new Error(hasil.pesan);
  });
}

daftarKasus({ test: tegas });
