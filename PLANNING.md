# PLANNING — Sistem Mapping, Validasi, dan Labeling Aset Infrastruktur Jaringan

> Dokumen perencanaan untuk pengembangan sistem Capstone Design.
> Status: **draft**. Bagian bertanda **[TBD]** belum diputuskan tim.

---

## 1. Ringkasan Project

**Judul Capstone:**
Optimalisasi Proses Mapping, Validasi, dan Labeling Aset Infrastruktur Jaringan untuk Meningkatkan Akurasi Data melalui Sistem Informasi bagi Teknisi Lapangan.

**Tujuan utama sistem:**
Teknisi memindai serial number (SN) modul perangkat di lapangan, lalu sistem **otomatis mencocokkan SN tersebut ke data EQ di database** dan menampilkan data asetnya. Dengan begitu teknisi tidak perlu lagi mengetik pesan mapping secara manual.

**Masalah yang diselesaikan:**
1. Progres mapping sulit dipantau.
2. Data aset tidak selalu sesuai dengan kondisi fisik.
3. Ada aset yang tidak ditemukan saat validasi lapangan.

**Kondisi eksisting (as-is):**
Data aset disimpan di Excel. Teknisi mengirim pesan mapping berisi EQ, REF, STATUS, KONDISI, dan SERIAL ke Telegram Bot. Bot mengembalikan kode aset, lalu teknisi memvalidasi fisik, memasang label, dan mengirim update label lewat Telegram.

**Kondisi usulan (to-be):**
Satu aplikasi web (Next.js) yang dibuka lewat browser HP oleh teknisi dan lewat browser desktop oleh admin. Database menjadi sumber data utama. Telegram hanya dipakai untuk notifikasi.

---

## 2. Ruang Lingkup

### Termasuk
- Login dan pemisahan akses teknisi dan admin.
- Scan SN dari modul perangkat untuk mengisi field SERIAL.
- Pencocokan SN ke EQ dari dataset yang sudah ada.
- Perubahan REF dan STATUS oleh teknisi (misalnya aset rusak), beserta riwayatnya.
- Penjadwalan mapping per kantor oleh admin.
- Dashboard progres dan laporan untuk admin.
- Notifikasi Telegram (jadwal mapping hari ini, hasil mapping hari ini).

### Tidak termasuk
Procurement, pembelian, depresiasi, akuntansi, keuangan, manajemen pemeliharaan penuh, prediksi AI, IoT, dan pelacakan GPS real-time.

Sistem diuji pada use case yang tersedia, bukan diklaim sebagai solusi enterprise yang sudah dipakai penuh.

---

## 3. Pengguna dan Hak Akses

| Peran | Akses | Fungsi utama |
|---|---|---|
| **Teknisi** | `/teknisi/*` | Scan SN, konfirmasi hasil pencocokan, ubah REF/STATUS, update label |
| **Admin** | `/admin/*` | Atur jadwal mapping per kantor, pantau progres, kelola data aset, lihat laporan |
| **Belum login** | `/login` | Masuk ke sistem |

---

## 4. Tech Stack

| Bagian | Teknologi | Status |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Disepakati |
| Database | NeonDB (PostgreSQL) | Disepakati |
| ORM / query | Drizzle atau Prisma | **[TBD]** |
| Autentikasi | Auth.js (NextAuth) atau JWT di cookie `httpOnly` | **[TBD]** |
| Scan SN | `html5-qrcode` atau `@zxing/browser` | **[TBD]**, cek dulu jenis kode di modul (barcode 1D atau QR) |
| UI | Tailwind CSS | **[TBD]** |
| Notifikasi | Telegram Bot API | Disepakati |
| Penjadwal | Vercel Cron Jobs | Disepakati, cek batas frekuensi sesuai paket |
| Media (opsional) | Cloudinary | Opsional |
| Deploy | Vercel | Disepakati |
| Uji API | Postman | Disepakati |
| Version control | GitHub | Disepakati |
| Manajemen project | ClickUp | Disepakati |

Flutter **tidak dipakai**. Teknisi menggunakan web responsif lewat browser HP.

---

## 5. Arsitektur

```
Teknisi (browser HP)        Admin (browser desktop)
          \                       /
           \                     /
         Next.js App (Vercel, HTTPS)
         ├─ middleware.ts  → cek login + role, redirect halaman
         ├─ app/teknisi/*  → form mapping + scan SN
         ├─ app/admin/*    → jadwal, dashboard, data aset, laporan
         └─ app/api/*      → route handler (validasi, query, logika)
                 │                         │
                 ▼                         ▼
          NeonDB (PostgreSQL)       Telegram Bot API
          dataset EQ–SN,            notifikasi harian
          jadwal, riwayat           (dipicu Vercel Cron)
```

### Aturan keamanan
- **Middleware hanya untuk redirect halaman.** Pengecekan role **wajib diulang di setiap route handler / server action**.
- Gunakan versi Next.js yang sudah ter-patch dari celah bypass middleware (CVE-2025-29927).
- **Token Telegram hanya di server** (environment variable), tidak pernah dikirim ke browser.
- Password disimpan dalam bentuk hash.
- Endpoint cron dilindungi secret (`CRON_SECRET`).

---

## 6. Alur Utama

### 6.1 Alur teknisi: scan dan pencocokan SN
1. Teknisi login, lalu diarahkan ke `/teknisi`.
2. Teknisi melihat jadwal mapping hari ini dan memilih kantor.
3. Teknisi menekan tombol **Scan** di field SERIAL. Kamera membaca kode di modul perangkat.
4. Hasil scan tampil dan bisa diedit manual (cadangan jika label rusak atau buram).
5. Sistem memvalidasi format SN, lalu mencocokkan ke database:
   - **SN ditemukan:** EQ dan data aset tampil otomatis. Teknisi mengonfirmasi.
   - **SN tidak ditemukan:** ditandai **Not Found** dan dicatat sebagai selisih data dengan kondisi fisik.
   - **SN cocok ke lebih dari satu EQ:** teknisi diminta memilih atau memeriksa ulang.
6. Teknisi dapat mengubah REF dan STATUS jika perlu (misalnya aset rusak). Setiap perubahan dicatat di riwayat.
7. Teknisi memvalidasi fisik dan memasang label, lalu menyimpan hasil.

### 6.2 Alur admin: penjadwalan
1. Admin login, lalu diarahkan ke `/admin`.
2. Admin membuat jadwal mapping: pilih kantor, tentukan tanggal atau periode, dan (opsional) teknisi yang ditugaskan.
3. Admin dapat mengubah atau membatalkan jadwal.
4. Admin memantau progres per kantor di dashboard.

### 6.3 Alur notifikasi
1. Vercel Cron memanggil endpoint notifikasi sesuai jadwal.
2. Pagi hari: kirim **jadwal mapping hari ini**.
3. Sore/malam hari: kirim **ringkasan hasil mapping hari ini** (jumlah ditemukan, tidak ditemukan, perubahan status).

---

## 7. Rancangan Data (draft)

> Nama kolom dataset asli perlu dicocokkan dengan file dataset. Sesuaikan tabel `assets` dengan kolom yang benar-benar ada.

| Tabel | Kolom utama | Keterangan |
|---|---|---|
| `users` | id, name, username, password_hash, role (`admin`/`teknisi`), telegram_chat_id | telegram_chat_id hanya jika notifikasi per orang |
| `offices` | id, code, name, address | Daftar kantor |
| `assets` | id, eq, serial_number, ref, status, kondisi, asset_code, office_id, label_status | Diimpor dari dataset EQ–SN. Index pada `serial_number` |
| `mapping_schedules` | id, office_id, scheduled_date, assigned_to (user_id, opsional), status, created_by | Jadwal mapping per kantor |
| `mapping_results` | id, schedule_id, asset_id (nullable), scanned_sn, result (`found`/`not_found`/`multiple`), scanned_by, scanned_at, label_attached | Satu baris per scan |
| `asset_history` | id, asset_id, field, old_value, new_value, changed_by, changed_at | Riwayat perubahan REF/STATUS/KONDISI |
| `notification_logs` | id, type, payload, sent_at, success | Jejak pengiriman Telegram |

---

## 8. Rancangan Halaman dan API (draft)

### Halaman
| Route | Peran | Isi |
|---|---|---|
| `/login` | Semua | Form login |
| `/teknisi` | Teknisi | Jadwal hari ini |
| `/teknisi/mapping/[scheduleId]` | Teknisi | Scan SN, hasil pencocokan, ubah REF/STATUS |
| `/admin` | Admin | Dashboard progres |
| `/admin/jadwal` | Admin | Kelola jadwal per kantor |
| `/admin/aset` | Admin | Data aset dan riwayat |
| `/admin/laporan` | Admin | Laporan hasil mapping |

### API (route handler)
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/scan/match` | Cocokkan SN ke EQ |
| POST | `/api/mapping-results` | Simpan hasil mapping |
| PATCH | `/api/assets/[id]` | Ubah REF/STATUS + catat riwayat |
| GET/POST/PATCH/DELETE | `/api/schedules` | Kelola jadwal |
| GET | `/api/dashboard/progress` | Progres per kantor |
| GET | `/api/cron/notify-schedule` | Kirim jadwal hari ini (dipanggil cron) |
| GET | `/api/cron/notify-results` | Kirim hasil hari ini (dipanggil cron) |

Contoh respons `/api/scan/match`:
```json
{
  "result": "found",
  "assets": [
    { "id": 12, "eq": "EQ-XXXX", "ref": "...", "status": "...", "kondisi": "...", "asset_code": "..." }
  ]
}
```
`result` bernilai `found`, `not_found`, atau `multiple`.

---

## 9. Pembagian Tugas Tim

Dibagi **per fitur**, bukan per peminatan. Setiap anggota memegang modulnya dari database, API, sampai halaman.

| | Anggota 1 | Anggota 2 | Anggota 3 |
|---|---|---|---|
| **Modul** | Fondasi & Halaman Teknisi | Pencocokan SN ke EQ & Data Aset | Jadwal, Monitoring & Notifikasi |
| **Development** | Setup Next.js, auth, middleware, tabel `users`, form mapping + scan SN, deploy | Impor dataset, tabel `assets` + `asset_history`, API pencocokan, ubah REF/STATUS, halaman data aset | Tabel `offices` + `mapping_schedules`, CRUD jadwal, dashboard, laporan, Telegram + cron |
| **Desain & dokumen** | Arsitektur, use case, bab perancangan | ERD, kamus data, bab data | BPMN as-is/to-be, bab proses bisnis |
| **Menguji modul** | Anggota 2 | Anggota 3 | Anggota 1 |

Modul 1 paling berat karena menjadi fondasi, sehingga cocok dipegang anggota EISD.

**Dikerjakan bersama:** ERD, format data API, alur Git, code review silang, Black-box Testing, SUS, dan bab pengujian.

---

## 10. Rencana Sprint (Agile)

> Durasi per sprint **[TBD]** (misalnya 1–2 minggu). Isi tanggal sesuai jadwal akademik.

| Sprint | Target |
|---|---|
| **Sprint 0** | Setup repo, Next.js, NeonDB, Vercel. Sepakati ERD, format API, alur Git. BPMN as-is |
| **Sprint 1** | Auth + middleware role. Impor dataset EQ–SN. Tabel kantor dan jadwal |
| **Sprint 2** | Scan SN + API pencocokan (3 kemungkinan hasil). CRUD jadwal |
| **Sprint 3** | Ubah REF/STATUS + riwayat. Dashboard progres. Halaman data aset |
| **Sprint 4** | Notifikasi Telegram + cron. Laporan. Integrasi semua modul |
| **Sprint 5** | Black-box Testing, uji coba dengan teknisi, SUS, perbaikan, dokumentasi |

Setiap akhir sprint: review bersama dan, bila memungkinkan, minta umpan balik teknisi lapangan.

---

## 11. Pengujian

- **Black-box Testing:** setiap fitur diuji berdasarkan skenario input dan output yang diharapkan.
- **Akurasi pencocokan:** bandingkan hasil scan dengan data fisik pada sampel aset.
- **System Usability Scale (SUS):** kuesioner untuk teknisi dan admin setelah uji coba.

---

## 12. Konvensi Pengembangan

- Bahasa kode dan nama variabel: Inggris. Teks antarmuka: Indonesia.
- Branch: `main` (stabil), `dev` (integrasi), `feature/<nama-fitur>`.
- Semua perubahan lewat Pull Request dan minimal satu review dari anggota lain.
- Rahasia (`DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `AUTH_SECRET`, `CRON_SECRET`) hanya di `.env.local` dan Vercel. Jangan di-commit.
- Sediakan `.env.example` berisi nama variabel tanpa nilai.

---

## 13. Keputusan yang Masih Terbuka

- [ ] ORM: Drizzle atau Prisma.
- [ ] Library autentikasi.
- [ ] Jenis kode SN di modul perangkat (barcode 1D atau QR), lalu pilih library scan.
- [ ] Apakah KONDISI juga bisa diubah teknisi (selain REF dan STATUS).
- [ ] Penerima notifikasi: satu grup Telegram atau per teknisi.
- [ ] Isi notifikasi: per kantor atau satu ringkasan harian.
- [ ] Apakah admin menugaskan teknisi tertentu ke setiap jadwal.
- [ ] Nama kolom asli pada dataset EQ–SN.
- [ ] Durasi sprint dan tanggal milestone.
- [ ] Nama anggota untuk Anggota 1, 2, dan 3.
