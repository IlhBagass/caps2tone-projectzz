# jadwalDB.md

Rancangan database untuk **modul Jadwal Mapping** (NeonDB / PostgreSQL), beserta query yang dipakai halaman `/admin/jadwal`, halaman teknisi, dan pengiriman jadwal ke Telegram.

Dokumen ini melengkapi `queryDB.md` (modul 5 dan 8). Jika ada perbedaan, **dokumen ini yang dipakai untuk modul jadwal**. Perbedaannya ada di bagian "Perubahan dari queryDB.md" di bawah.

Catatan penggunaan:
- `$1, $2, ...` adalah parameter query berparameter (dipanggil dari server). Jangan menyusun SQL dengan string concatenation.
- Semua penentuan "hari ini" memakai zona waktu `Asia/Jakarta`.
- Cek role `admin` dilakukan di setiap route handler / server action, bukan hanya di `proxy.ts`.

---

## 1. Ringkasan alur di aplikasi

| Fitur di UI | Yang terjadi di database |
|---|---|
| Admin menambah jadwal, **memilih beberapa kantor sekaligus** untuk satu teknisi dan satu tanggal | Satu transaksi, **satu baris `mapping_schedules` per kantor** |
| Teknisi (opsional) ditugaskan pada jadwal | Kolom `assigned_to` (boleh kosong) |
| Satu kantor tidak boleh punya dua jadwal aktif di tanggal yang sama | Unique index parsial (lihat bagian 3) |
| Admin mengubah tanggal / teknisi | `UPDATE` satu baris |
| Admin membatalkan jadwal | `status = 'dibatalkan'` (tidak dihapus agar ada jejak) |
| Teknisi membuka beranda | Jadwal hari ini miliknya, plus jadwal yang belum ditugaskan |
| Scan pertama di sebuah jadwal | Status otomatis `terjadwal` menjadi `berjalan` (lihat `queryDB.md` modul 6) |
| Admin menekan **Kirim ke Telegram** (manual, satu pesan per teknisi per hari) | Baca data, kirim lewat bot di server, catat ke `notification_logs` |

Tidak ada pengiriman otomatis terjadwal (prototipe: kirim manual), jadi tidak perlu kolom jam kirim maupun cron.

---

## 2. Prasyarat

Tabel `offices` dan `users` serta tipe enum berikut harus sudah ada (definisinya ada di `queryDB.md` modul 0 sampai 2). Ringkasannya:

```sql
-- Tipe enum yang dipakai modul ini
CREATE TYPE area_type       AS ENUM ('grobogan', 'solo');
CREATE TYPE schedule_status AS ENUM ('terjadwal', 'berjalan', 'selesai', 'dibatalkan');

-- Fungsi trigger updated_at (modul 0 di queryDB.md)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Kolom yang dibutuhkan dari tabel lain:
- `offices(id, name, ...)`
- `users(id, name, role, areas area_type[], approval_status, telegram_chat_id, ...)`
- `assets(office_id, mapping_status, ...)` untuk menghitung jumlah perangkat di pesan Telegram
- `mapping_results(schedule_id, scanned_at, ...)`

---

## 3. Tabel `mapping_schedules`

```sql
CREATE TABLE mapping_schedules (
  id             serial PRIMARY KEY,
  office_id      integer         NOT NULL REFERENCES offices (id),
  area           area_type       NOT NULL,
  scheduled_date date            NOT NULL,
  assigned_to    integer         REFERENCES users (id) ON DELETE SET NULL, -- opsional
  status         schedule_status NOT NULL DEFAULT 'terjadwal',
  created_by     integer         REFERENCES users (id),
  created_at     timestamptz     NOT NULL DEFAULT now(),
  updated_at     timestamptz     NOT NULL DEFAULT now()
);

-- Daftar jadwal diurutkan / difilter per tanggal
CREATE INDEX mapping_schedules_date_idx
  ON mapping_schedules (scheduled_date);

-- Jadwal milik satu teknisi pada rentang tanggal
CREATE INDEX mapping_schedules_assigned_idx
  ON mapping_schedules (assigned_to, scheduled_date);

-- Riwayat jadwal per kantor (halaman dashboard: jadwal berikutnya per kantor)
CREATE INDEX mapping_schedules_office_idx
  ON mapping_schedules (office_id, scheduled_date);

-- ATURAN BISNIS: satu kantor hanya boleh punya SATU jadwal aktif per tanggal.
-- Jadwal berstatus selesai atau dibatalkan tidak dihitung.
CREATE UNIQUE INDEX mapping_schedules_office_date_active_uq
  ON mapping_schedules (office_id, scheduled_date)
  WHERE status IN ('terjadwal', 'berjalan');

CREATE TRIGGER mapping_schedules_set_updated_at
  BEFORE UPDATE ON mapping_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

Penjelasan kolom:

| Kolom | Keterangan |
|---|---|
| `office_id` | Kantor yang dimapping. |
| `area` | Area jadwal (`grobogan` / `solo`). Dipakai untuk filter dan untuk membatasi teknisi yang bisa ditugaskan. |
| `scheduled_date` | Tanggal mapping (tipe `date`, tanpa jam). |
| `assigned_to` | Teknisi yang ditugaskan. `NULL` berarti belum ditugaskan; jadwal tetap terlihat oleh semua teknisi. |
| `status` | `terjadwal` → `berjalan` (otomatis saat scan pertama) → `selesai`. `dibatalkan` jika admin membatalkan. |
| `created_by` | Admin yang membuat jadwal. |

> Aturan "tanggal tidak boleh sebelum hari ini" **tidak** dibuat sebagai `CHECK` constraint, karena data lama harus tetap bisa disimpan. Aturan ini divalidasi di server saat membuat atau mengubah jadwal.

---

## 4. Query aplikasi

### 4.1 Membaca jadwal

```sql
-- Halaman admin: daftar jadwal dengan filter (semua parameter boleh NULL = tidak difilter)
-- $1 = area, $2 = status, $3 = teknisi (user id),
-- $4 = hanya yang belum ditugaskan (boolean), $5 = dari tanggal, $6 = sampai tanggal,
-- $7 = kata kunci kantor / teknisi
SELECT s.id, s.office_id, o.name AS office_name, s.area, s.scheduled_date,
       s.assigned_to, u.name AS assigned_name, s.status
FROM mapping_schedules s
JOIN offices o ON o.id = s.office_id
LEFT JOIN users u ON u.id = s.assigned_to
WHERE ($1::area_type IS NULL OR s.area = $1)
  AND ($2::schedule_status IS NULL OR s.status = $2)
  AND ($3::integer IS NULL OR s.assigned_to = $3)
  AND (NOT COALESCE($4::boolean, false) OR s.assigned_to IS NULL)
  AND ($5::date IS NULL OR s.scheduled_date >= $5)
  AND ($6::date IS NULL OR s.scheduled_date <= $6)
  AND ($7::text IS NULL
       OR o.name ILIKE '%' || $7 || '%'
       OR u.name ILIKE '%' || $7 || '%')
ORDER BY s.scheduled_date DESC, o.name
LIMIT $8 OFFSET $9;
```

```sql
-- Beranda teknisi: jadwal hari ini miliknya + yang belum ditugaskan ($1 = id teknisi)
SELECT s.id, s.office_id, o.name AS office_name, s.area, s.status
FROM mapping_schedules s
JOIN offices o ON o.id = s.office_id
WHERE s.scheduled_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
  AND s.status <> 'dibatalkan'
  AND (s.assigned_to IS NULL OR s.assigned_to = $1)
ORDER BY o.name;
```

```sql
-- Dashboard admin: panel "Jadwal hari ini"
SELECT s.id, o.name AS office_name, u.name AS assigned_name, s.status
FROM mapping_schedules s
JOIN offices o ON o.id = s.office_id
LEFT JOIN users u ON u.id = s.assigned_to
WHERE s.scheduled_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
ORDER BY o.name;

-- Badge angka di menu "Jadwal" (jumlah jadwal aktif hari ini)
SELECT count(*)
FROM mapping_schedules
WHERE scheduled_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
  AND status IN ('terjadwal', 'berjalan');
```

### 4.2 Membuat jadwal (banyak kantor sekaligus)

Satu kali simpan = satu teknisi, satu tanggal, **beberapa kantor**. Semua baris masuk dalam **satu statement**, jadi atomik: jika salah satu kantor bentrok (unique index di atas), seluruh insert gagal dan tidak ada yang tersimpan.

```sql
-- $1 = array id kantor (integer[]), $2 = area, $3 = tanggal,
-- $4 = id teknisi atau NULL, $5 = id admin pembuat
INSERT INTO mapping_schedules (office_id, area, scheduled_date, assigned_to, created_by)
SELECT office_id, $2::area_type, $3::date, $4::integer, $5::integer
FROM unnest($1::integer[]) AS office_id
RETURNING id, office_id;
```

Jika gagal dengan kode error PostgreSQL `23505` (unique violation), server membalas error "kantor sudah punya jadwal aktif di tanggal itu". Untuk menampilkan **nama kantor yang bentrok** (seperti yang dilakukan UI), jalankan pengecekan ini sebelum insert:

```sql
-- $1 = array id kantor, $2 = tanggal, $3 = (opsional) id jadwal yang sedang diedit
SELECT s.office_id, o.name AS office_name
FROM mapping_schedules s
JOIN offices o ON o.id = s.office_id
WHERE s.office_id = ANY($1::integer[])
  AND s.scheduled_date = $2::date
  AND s.status IN ('terjadwal', 'berjalan')
  AND ($3::integer IS NULL OR s.id <> $3);
```

Validasi di server sebelum insert:
- `$3 >= tanggal hari ini (WIB)`.
- Array kantor tidak kosong dan semua id ada di `offices`.
- Jika `assigned_to` diisi: teknisi harus aktif dan melayani area tersebut.

```sql
-- Validasi teknisi: aktif, role teknisi, dan melayani area jadwal ($1 = id teknisi, $2 = area)
SELECT id
FROM users
WHERE id = $1
  AND role = 'teknisi'
  AND approval_status = 'aktif'
  AND $2::area_type = ANY (areas);
```

### 4.3 Mengubah, membatalkan, menghapus

```sql
-- Ubah tanggal dan/atau teknisi satu jadwal ($1 = id jadwal, $2 = tanggal, $3 = id teknisi atau NULL).
-- Hanya jadwal yang masih aktif yang boleh diubah.
UPDATE mapping_schedules
SET scheduled_date = $2, assigned_to = $3
WHERE id = $1 AND status IN ('terjadwal', 'berjalan')
RETURNING id, scheduled_date, assigned_to, status;

-- Batalkan jadwal (dianjurkan dibanding hapus agar jejak tetap ada)
UPDATE mapping_schedules
SET status = 'dibatalkan'
WHERE id = $1 AND status IN ('terjadwal', 'berjalan')
RETURNING id, status;

-- Tandai selesai ($1 = id jadwal). Aturan kapan jadwal dianggap selesai masih [TBD]:
-- manual oleh admin, atau otomatis saat semua aset kantor sudah termapping.
UPDATE mapping_schedules
SET status = 'selesai'
WHERE id = $1 AND status = 'berjalan'
RETURNING id, status;

-- Hapus jadwal. Gagal jika sudah punya hasil mapping (FK dari mapping_results),
-- jadi untuk jadwal yang sudah berjalan gunakan pembatalan di atas.
DELETE FROM mapping_schedules WHERE id = $1 AND status = 'terjadwal';
```

### 4.4 Dipakai modul lain

```sql
-- Scan pertama membuat jadwal otomatis berjalan (dijalankan di transaksi simpan hasil mapping)
UPDATE mapping_schedules
SET status = 'berjalan'
WHERE id = $1 AND status = 'terjadwal';

-- Dashboard: jadwal terdekat dan aktivitas terakhir per kantor
-- (query lengkap ada di queryDB.md modul 7, "tabel progres per kantor")
SELECT office_id, min(scheduled_date) AS next_date
FROM mapping_schedules
WHERE status = 'terjadwal'
  AND scheduled_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
GROUP BY office_id;
```

---

## 5. Kirim jadwal ke Telegram (manual)

Panel "Kirim jadwal ke Telegram" di `/admin/jadwal`: admin memilih tanggal, lalu sistem mengirim **satu pesan per teknisi untuk hari itu**. Isi pesan memuat semua kantor teknisi itu di tanggal tersebut, jumlah perangkat yang belum termapping per kantor, dan totalnya.

Contoh pesan:

```
Jadwal mapping 5 Nov 2026
Halo Budi Santoso, kamu bertugas di:
1. Jebres: 3 perangkat belum termapping (dari 4)
2. Laweyan: 4 perangkat belum termapping (dari 4)

Total yang harus dimapping: 7 perangkat.
Selamat bekerja.
```

"Perangkat yang harus dimapping" = aset berstatus `belum` (aset `sudah` dan `tidak_ditemukan` tidak dihitung).

### 5.1 Data pesan (satu query, tanpa N+1)

```sql
-- $1 = tanggal. Satu baris per teknisi; kolom offices berisi array JSON.
-- telegram_chat_id HANYA dipakai di server untuk mengirim, jangan kirim ke browser.
SELECT u.id AS user_id, u.name, u.telegram_chat_id,
       (u.telegram_chat_id IS NOT NULL) AS linked,
       json_agg(
         json_build_object(
           'office_id',   o.id,
           'office_name', o.name,
           'total',       a.total,
           'remaining',   a.remaining
         ) ORDER BY o.name
       ) AS offices,
       sum(a.remaining) AS total_remaining
FROM mapping_schedules s
JOIN users u   ON u.id = s.assigned_to
JOIN offices o ON o.id = s.office_id
CROSS JOIN LATERAL (
  SELECT count(*)                                         AS total,
         count(*) FILTER (WHERE mapping_status = 'belum') AS remaining
  FROM assets WHERE office_id = o.id
) a
WHERE s.scheduled_date = $1::date
  AND s.status IN ('terjadwal', 'berjalan')
  AND u.approval_status = 'aktif'
GROUP BY u.id
ORDER BY u.name;
```

```sql
-- Jadwal pada tanggal itu yang BELUM ditugaskan (ditampilkan sebagai peringatan, tidak terkirim ke siapa pun)
SELECT o.name AS office_name
FROM mapping_schedules s
JOIN offices o ON o.id = s.office_id
WHERE s.scheduled_date = $1::date
  AND s.status IN ('terjadwal', 'berjalan')
  AND s.assigned_to IS NULL
ORDER BY o.name;
```

Alur di server (route handler admin, mis. `POST /api/schedules/notify`):
1. Cek sesi dan role `admin`.
2. Jalankan query 5.1 untuk tanggal yang dipilih.
3. Lewati teknisi yang `linked = false` (belum menekan Start di bot).
4. Kirim pesan ke `telegram_chat_id` tiap teknisi memakai `TELEGRAM_BOT_TOKEN` dari env var (server saja).
5. Catat hasil tiap pengiriman ke `notification_logs` (5.2).
6. Balas ke UI: jumlah terkirim, jumlah dilewati, dan teknisi yang gagal.

### 5.2 Catatan pengiriman (`notification_logs`)

Tabel ini sudah ada di `queryDB.md` modul 8:

```sql
CREATE TABLE IF NOT EXISTS notification_logs (
  id      serial PRIMARY KEY,
  type    text        NOT NULL,
  payload jsonb       NOT NULL DEFAULT '{}',
  sent_at timestamptz NOT NULL DEFAULT now(),
  success boolean     NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_logs_type_idx
  ON notification_logs (type, sent_at DESC);
```

Untuk pengiriman jadwal manual, pakai `type = 'jadwal_manual'` dengan isi `payload` seperti:

```json
{
  "date": "2026-11-05",
  "user_id": 4,
  "technician": "Budi Santoso",
  "office_ids": [6, 4],
  "total_remaining": 7,
  "sent_by": 1,
  "error": null
}
```

```sql
-- Catat satu pengiriman ($1 = payload JSON, $2 = berhasil atau tidak)
INSERT INTO notification_logs (type, payload, success)
VALUES ('jadwal_manual', $1::jsonb, $2);

-- Riwayat kirim untuk satu tanggal (menampilkan "terakhir dikirim pukul ..." dan mencegah kirim ganda tanpa sengaja)
SELECT payload->>'technician' AS technician, success, sent_at
FROM notification_logs
WHERE type = 'jadwal_manual'
  AND payload->>'date' = $1
ORDER BY sent_at DESC;
```

> Token bot tidak boleh pernah ada di `payload`, log, atau respons ke browser.

---

## 6. Perubahan dari `queryDB.md`

| Hal | `queryDB.md` | Dokumen ini |
|---|---|---|
| Unique index jadwal aktif per kantor per tanggal | Belum ada | **Ditambah**: `mapping_schedules_office_date_active_uq` |
| Index `(office_id, scheduled_date)` | Belum ada | **Ditambah** |
| Insert jadwal | Satu kantor per insert | **Banyak kantor sekaligus** lewat `unnest($1::integer[])` |
| Filter daftar jadwal | Hanya urut tanggal | Filter area, status, teknisi, rentang tanggal, dan pencarian |
| Pengiriman Telegram | Query ringkasan harian umum | Query **per teknisi per hari** lengkap dengan jumlah perangkat |

Tabel `mapping_schedules` sendiri **kolomnya sama** dengan di `queryDB.md`, jadi tidak ada perubahan kolom.

---

## 7. Hal yang masih terbuka

- **Kapan jadwal menjadi `selesai`.** Manual oleh admin atau otomatis saat semua aset kantor sudah termapping? Belum diputuskan.
- **Menghubungkan Telegram teknisi.** Teknisi harus menekan Start di bot (bot tidak bisa memulai chat). Pola yang disarankan: admin memberi tautan `t.me/<NamaBot>?start=<kode unik>`, lalu webhook menyimpan `chat_id` ke `users.telegram_chat_id`. Itu butuh satu kolom token sementara di `users` (misalnya `telegram_link_token`) yang **belum ada** di `queryDB.md`. Putuskan bersama dengan pemegang modul `users` sebelum menambahkannya.
- **Kolom `offices.area`.** UI sudah punya filter area pada jadwal, tetapi daftar kantor di modal tambah jadwal belum difilter menurut area karena data kantor belum punya kolom area (ada di rancangan `queryDB.md` modul 2).
- **Nama teknisi di UI.** Data mock memakai nama teknisi sebagai teks. Di database yang disimpan adalah `assigned_to` (id), jadi API harus mengembalikan `assigned_name` dari join ke `users`.
