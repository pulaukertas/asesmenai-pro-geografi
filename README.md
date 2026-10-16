# AsesmenAI Pro Online — Fondasi

Aplikasi awal untuk Guru Geografi SMAN 26 Bone.

## Struktur

- `index.html`: antarmuka generator awal.
- `functions/api/generate.js`: Cloudflare Pages Function pada endpoint `POST /api/generate`.

## Deploy ke Cloudflare Pages

1. Hubungkan repositori GitHub ini ke Cloudflare Pages.
2. Framework preset: `None`.
3. Build command: kosongkan.
4. Build output directory: `.` (root repository).
5. Tambahkan environment variable `GEMINI_API_KEY` di pengaturan Pages.
6. Opsional: tambahkan `GEMINI_MODEL` (default `gemini-2.5-flash`).
7. Deploy, lalu buka domain Pages dan uji generator.

## Catatan

- Jangan menaruh API key di `index.html`, GitHub, atau percakapan.
- Paket ini adalah fondasi awal. Bank soal terpusat, login/identitas siswa, kuis, Mode PID lengkap, dan rekap nilai akan dibangun pada tahap berikutnya.
- Hasil soal AI perlu ditinjau guru sebelum digunakan untuk penilaian resmi.
- Uji fungsi di lingkungan Cloudflare setelah deploy; pemeriksaan lokal tidak membuktikan integrasi cloud sudah aktif.
