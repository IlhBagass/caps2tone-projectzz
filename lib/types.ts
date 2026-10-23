// Tipe mengikuti rancangan tabel di PLANNING.md bagian 7.
// Nama kolom asli dataset masih [TBD]; sesuaikan setelah dataset dicek.

export type Role = "admin" | "teknisi";

export type MatchResultType = "found" | "not_found" | "multiple";

export interface Office {
  id: number;
  code: string;
  name: string;
  address: string;
}

// Status mapping per aset, ditampilkan di daftar teknisi.
export type MappingStatus = "sudah" | "belum" | "tidak_ditemukan";

// Chassis adalah induk, modul adalah anak (parentId = id chassis).
export type AssetKind = "chassis" | "module";

export interface Asset {
  id: number;
  kind: AssetKind;
  parentId: number | null;
  mappingStatus: MappingStatus;
  eq: string;
  serialNumber: string;
  ref: string;
  status: string;
  kondisi: string;
  assetCode: string;
  officeId: number;
  labelStatus: "terpasang" | "belum";
  labelCode: string | null; // kode dari QR label fisik
}

export type ScheduleStatus = "terjadwal" | "berjalan" | "selesai" | "dibatalkan";

export interface MappingSchedule {
  id: number;
  officeId: number;
  scheduledDate: string; // YYYY-MM-DD
  assignedTo: string | null; // nama teknisi, opsional
  status: ScheduleStatus;
}

export interface MappingResult {
  id: number;
  scheduleId: number;
  assetId: number | null;
  scannedSn: string;
  result: MatchResultType;
  scannedBy: string;
  scannedAt: string; // ISO
  labelAttached: boolean;
}

export interface AssetHistory {
  id: number;
  assetId: number;
  field: "ref" | "status" | "kondisi";
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string; // ISO
}

// Bentuk respons POST /api/scan/match
export interface MatchResponse {
  result: MatchResultType;
  assets: Asset[];
}
