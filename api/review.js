// Jembatan halaman review ke antrean keputusan (3 November 2026, pola BeritaSawit).
// Sudah digerbang middleware, jadi cuma orang yang login sampai ke sini. REVIEW_KUNCI
// tinggal di env server dan tidak pernah dikirim ke browser. Isi cerita dibaca halaman
// langsung dari view publik, yang ditulis di sini cuma antrean keputusan. Pekerja di
// laci yang menjalankan gerbang.py, jalur yang sama dengan balasan WhatsApp.
// Berkas yang sama dipakai web garisbesarnya. Kalau mengubah, ubah di keduanya.
const URL_RPC = "https://khntypqoxcwntfnvewzy.supabase.co/rest/v1/rpc/";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobnR5cHFveGN3bnRmbnZld3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTc3NDEsImV4cCI6MjA4NzEzMzc0MX0.YvLe6hRXZSPvc_vamBa9TWc5RhHAqQ25tNKh-c7Nncc"; // kunci publik, sama dengan halaman status
const AKSI = ["acc", "pilih", "geser", "revisi", "ganti", "stop"];

function balas(status, isi) {
  return new Response(JSON.stringify(isi), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

async function rpc(nama, isi) {
  const r = await fetch(URL_RPC + nama, {
    method: "POST",
    headers: { apikey: ANON, authorization: "Bearer " + ANON, "content-type": "application/json" },
    body: JSON.stringify({ p_kunci: process.env.REVIEW_KUNCI, ...isi }),
  });
  if (!r.ok) throw new Error("rpc " + nama + " " + r.status);
  return r.json();
}

function kodeSah(k) {
  return /^[A-Za-z0-9]{6}$/.test(k || "");
}

export async function GET(request) {
  if (!process.env.REVIEW_KUNCI) return balas(503, { ok: false, alasan: "Review belum disiapkan." });
  const kode = new URL(request.url).searchParams.get("kode");
  if (!kodeSah(kode)) return balas(400, { ok: false, alasan: "Kode tidak sah." });
  try {
    const isi = await rpc("cerita_web_keputusan", { p_kode: kode });
    if (isi === null) return balas(503, { ok: false, alasan: "Kunci review tidak dikenali basis data." });
    return balas(200, { ok: true, ...isi });
  } catch (e) {
    console.error(e.message);
    return balas(502, { ok: false, alasan: "Basis data tidak menjawab, coba lagi." });
  }
}

export async function POST(request) {
  if (!process.env.REVIEW_KUNCI) return balas(503, { ok: false, alasan: "Review belum disiapkan." });
  // Formulir dari situs lain tidak bisa mengirim JSON tanpa izin CORS.
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) return balas(415, { ok: false, alasan: "Permintaan tidak sah." });
  let isi;
  try {
    isi = await request.json();
  } catch {
    return balas(400, { ok: false, alasan: "Permintaan tidak sah." });
  }
  if (!kodeSah(isi.kode)) return balas(400, { ok: false, alasan: "Kode tidak sah." });
  if (!AKSI.includes(isi.aksi)) return balas(400, { ok: false, alasan: "Keputusan tidak dikenal." });
  try {
    const hasil = await rpc("cerita_web_putuskan", {
      p_kode: isi.kode, p_aksi: isi.aksi, p_waktu: isi.waktu || null, p_catatan: isi.catatan ? String(isi.catatan).slice(0, 1000) : null,
    });
    return balas(hasil.ok ? 200 : 409, hasil);
  } catch (e) {
    console.error(e.message);
    return balas(502, { ok: false, alasan: "Basis data tidak menjawab, keputusan belum tercatat." });
  }
}
