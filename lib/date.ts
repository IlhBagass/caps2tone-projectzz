// Semua penentuan "hari ini" memakai zona waktu Asia/Jakarta, bukan UTC
// server (Vercel berjalan di UTC), supaya hari tidak bergeser pukul 00.00-07.00 WIB.
export const TIME_ZONE = "Asia/Jakarta";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Tanggal YYYY-MM-DD di Asia/Jakarta untuk sebuah waktu (default: sekarang). */
export function jakartaDay(value: Date | string | number = new Date()): string {
  return dayFormat.format(new Date(value));
}

/** Tanggal YYYY-MM-DD di Asia/Jakarta, digeser `offsetDays` dari hari ini. */
export function jakartaDayOffset(offsetDays: number): string {
  const [y, m, d] = jakartaDay().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD menjadi "5 Nov 2026" tanpa pergeseran zona waktu. */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
