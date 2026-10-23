import type { Asset, MatchResponse } from "./types";

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

// Pengganti sementara untuk POST /api/scan/match.
// Selalu mengembalikan salah satu dari: found, not_found, multiple.
export async function matchSerial(
  sn: string,
  pool: Asset[],
): Promise<MatchResponse> {
  await new Promise((r) => setTimeout(r, 300));
  const matches = pool.filter(
    (a) => a.kind === "module" && a.serialNumber === sn,
  );
  if (matches.length === 0) return { result: "not_found", assets: [] };
  if (matches.length === 1) return { result: "found", assets: matches };
  return { result: "multiple", assets: matches };
}
