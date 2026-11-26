export function normalizeSerial(raw: string): string {
  return raw.trim().toUpperCase();
}

// Format SN asli masih [TBD]; validasi sementara hanya memastikan tidak kosong
// dan tanpa spasi.
export function validateSerial(sn: string): string | null {
  if (!sn) return "Serial number wajib diisi.";
  if (/\s/.test(sn)) return "Serial number tidak boleh mengandung spasi.";
  if (sn.length < 4) return "Serial number terlalu pendek.";
  return null;
}
