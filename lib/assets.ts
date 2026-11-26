// Data aset untuk admin lewat backend: daftar (cari, urut, halaman), riwayat, tolak mapping,
// serta impor dan ekspor Excel yang dijalankan di server. Dipakai komponen client.
import { ApiError, queryString } from "@/lib/api";
import { api, download } from "@/lib/api-client";
import { saveBlob } from "@/lib/asset-excel";
import type { Asset, AssetHistory } from "@/lib/types";

/** Asset plus nama dan kode kantor dari backend. */
export interface AdminAsset extends Asset {
  officeName: string;
  officeCode: string;
}

export type AssetSortKey =
  | "eq"
  | "kind"
  | "serialNumber"
  | "office"
  | "ref"
  | "status"
  | "kondisi"
  | "labelStatus"
  | "labelCode";

const SORT_PARAM: Record<AssetSortKey, string> = {
  eq: "eq",
  kind: "kind",
  serialNumber: "serial_number",
  office: "office",
  ref: "ref",
  status: "status",
  kondisi: "kondisi",
  labelStatus: "label_status",
  labelCode: "label_code",
};

export interface AssetPage {
  rows: AdminAsset[];
  total: number;
}

export async function listAssets(options: {
  search?: string;
  page: number;
  limit: number;
  sort?: { key: AssetSortKey; dir: "asc" | "desc" } | null;
}): Promise<AssetPage> {
  const query = queryString({
    search: options.search,
    page: options.page,
    limit: options.limit,
    sort: options.sort ? SORT_PARAM[options.sort.key] : undefined,
    dir: options.sort?.dir,
  });
  const { data, meta } = await api.page<AdminAsset>(`/api/assets${query}`);
  return { rows: data, total: meta?.total ?? data.length };
}

interface RawHistory {
  id: number;
  field: AssetHistory["field"];
  oldValue: string;
  newValue: string;
  changedByName: string | null;
  changedAt: string;
}

/** Riwayat perubahan REF, STATUS, dan KONDISI satu aset, terbaru di atas. */
export async function getAssetHistory(assetId: number): Promise<AssetHistory[]> {
  const all: AssetHistory[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await api.page<RawHistory>(`/api/assets/${assetId}/history?limit=100&page=${page}`);
    all.push(
      ...data.map((h) => ({
        id: h.id,
        assetId,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        changedBy: h.changedByName ?? "-",
        changedAt: h.changedAt,
      })),
    );
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

/** Tolak hasil mapping: aset kembali "belum", foto dan label lama dipertahankan, teknisi mengulang. */
export const rejectAsset = (assetId: number, reason: string) =>
  api.post<AdminAsset>(`/api/assets/${assetId}/reject`, { reason });

// --- Impor dan ekspor Excel (dijalankan backend) ---

export interface ImportSummary {
  dryRun: boolean;
  created: number;
  updated: number;
  total: number;
}

export interface ImportProblem {
  line: number;
  message: string;
}

/** Kirim file XLSX ke backend. dryRun=true hanya memeriksa dan tidak menyimpan apa pun. */
export function importAssetsFile(file: File, dryRun: boolean): Promise<ImportSummary> {
  const form = new FormData();
  form.append("file", file);
  return api.upload<ImportSummary>(`/api/assets/import?dry_run=${dryRun}`, form);
}

/** Daftar baris bermasalah dari error validasi impor (nomor baris Excel), atau null bila bukan error validasi. */
export function importProblems(error: unknown): ImportProblem[] | null {
  if (!(error instanceof ApiError) || error.code !== "IMPORT_VALIDATION" || !Array.isArray(error.details)) return null;
  return (error.details as { row?: number; message?: string }[]).map((d) => ({ line: d.row ?? 0, message: d.message ?? "" }));
}

/** Unduh Excel sesuai pencarian yang sedang dipakai (maksimal 10.000 baris). */
export async function exportAssets(search?: string): Promise<void> {
  const { blob, filename } = await download(`/api/assets/export${queryString({ search })}`);
  saveBlob(blob, filename ?? "data-aset.xlsx");
}
