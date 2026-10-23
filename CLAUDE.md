# CLAUDE.md

Project Capstone: sistem web untuk mapping, validasi, dan labeling aset infrastruktur jaringan.
Inti fitur: teknisi scan SN modul perangkat → sistem mencocokkan SN ke EQ di database.

**Baca `PLANNING.md` sebelum mengerjakan apa pun.** Dokumen itu berisi scope, arsitektur, rancangan data, API, pembagian tugas, dan keputusan yang masih terbuka.

## Stack
Next.js (App Router) + TypeScript, NeonDB (PostgreSQL), Telegram Bot API (notifikasi saja), deploy di Vercel. Tidak memakai Flutter.

## Aturan wajib
- Pengecekan role (`admin` / `teknisi`) dilakukan di `middleware.ts` **dan** diulang di setiap route handler / server action. Middleware saja tidak cukup.
- Token Telegram dan semua secret hanya di server (env var). Jangan pernah dipakai di komponen client atau di-commit.
- Setiap perubahan REF / STATUS / KONDISI aset wajib ditulis ke tabel `asset_history`.
- Pencocokan SN selalu menangani tiga hasil: `found`, `not_found`, `multiple`.
- Scan SN harus punya input manual sebagai cadangan.
- Jangan menambah fitur di luar scope (procurement, keuangan, AI, IoT, GPS real-time).

## Konvensi
- Nama kode dan variabel dalam bahasa Inggris, teks antarmuka dalam bahasa Indonesia.
- Branch `feature/<nama-fitur>`, merge lewat Pull Request.
- Jika menemukan hal yang masih **[TBD]** di `PLANNING.md`, tanyakan dulu sebelum memutuskan sendiri.

## Perintah
- `npm run dev` — jalankan dev server
- `npm run build` — build produksi
- `npm run lint` — ESLint
- [TBD] Perintah migrasi database (menunggu keputusan ORM).

Next.js yang terpasang adalah versi 16: file `middleware.ts` bernama **`proxy.ts`**, dan `params` di page bersifat Promise. Baca `node_modules/next/dist/docs/` sebelum menulis kode yang bergantung pada API Next.js.
