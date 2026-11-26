// Alur teknisi lewat backend: kantor dan jadwalnya, aset kantor, pencocokan SN, simpan hasil scan,
// tandai tidak ditemukan, dan ubah REF/STATUS/label. Dipakai komponen client.
import { api } from "@/lib/api-client";
import type { Area, Asset, MatchResponse, ScheduleStatus } from "@/lib/types";

/** Kantor yang dapat dibuka teknisi, dengan jadwal yang dipakai untuk membuka asetnya dan jumlah aset per status. */
export interface TechnicianOffice {
  id: number;
  code: string;
  name: string;
  address: string;
  area: Area | null;
  scheduleId: number;
  scheduledDate: string;
  scheduleStatus: ScheduleStatus;
  /** Jadwal aktif hari ini: scan dan perubahan data diizinkan. Selain itu hanya melihat. */
  canScan: boolean;
  chassis: number;
  modules: number;
  total: number;
  sudah: number;
  belum: number;
  tidakDitemukan: number;
  moduleSudah: number;
  moduleBelum: number;
  moduleTidakDitemukan: number;
}

export const listTechnicianOffices = () => api.get<TechnicianOffice[]>("/api/technician/offices");

/** Semua aset (chassis dan modul) di kantor milik jadwal itu. */
export async function loadOfficeAssets(scheduleId: number): Promise<Asset[]> {
  const all: Asset[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await api.page<Asset>(`/api/technician/assets?schedule_id=${scheduleId}&limit=100&page=${page}`);
    all.push(...data);
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

/** Cocokkan SN di kantor jadwal itu. kind membatasi ke chassis atau modul. Hasilnya found, not_found, atau multiple. */
export const matchSerialNumber = (serialNumber: string, scheduleId: number, kind: "chassis" | "module") =>
  api.post<MatchResponse>("/api/scan/match", { serialNumber, scheduleId, kind });

export interface ScanInput {
  scheduleId: number;
  scannedSn: string;
  kind: "chassis" | "module";
  /** Aset yang dipilih: dikirim agar server memastikan SN cocok dengan aset itu. */
  assetId?: number;
  labelCode?: string;
  photoUrl?: string;
}

/** Simpan satu scan. Aset yang cocok menjadi "sudah"; SN yang tidak dikenal tercatat sebagai not_found. */
export const saveScan = (input: ScanInput) =>
  api.post("/api/mapping-results", {
    scheduleId: input.scheduleId,
    scannedSn: input.scannedSn,
    kind: input.kind,
    assetId: input.assetId,
    labelAttached: Boolean(input.labelCode),
    labelCode: input.labelCode,
    photoUrl: input.photoUrl,
  });

export const markNotFound = (assetId: number, scheduleId: number) =>
  api.post(`/api/assets/${assetId}/not-found`, { scheduleId });

/** Batalkan tanda "tidak ditemukan": aset kembali belum termapping. */
export const resetNotFound = (assetId: number, scheduleId: number) =>
  api.post(`/api/assets/${assetId}/reset`, { scheduleId });

/** Ubah REF, STATUS, atau kode label. Perubahan REF/STATUS dicatat ke riwayat oleh backend. */
export const patchAsset = (assetId: number, scheduleId: number, fields: { ref?: string; status?: string; labelCode?: string }) =>
  api.patch(`/api/assets/${assetId}`, { scheduleId, ...fields });
