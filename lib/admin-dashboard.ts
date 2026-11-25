// Data dashboard admin dari backend. Hanya dipanggil dari komponen server (membaca cookie sesi lewat
// serverGet). Bentuk keluarannya tetap, jadi komponen tampilan tidak perlu berubah.
import { cache } from "react";
import { ApiError, type Envelope } from "@/lib/api";
import { serverGet } from "@/lib/api-server";
import { jakartaDay } from "@/lib/date";
import type { Asset, Office, ScheduleStatus } from "@/lib/types";

/** Semua halaman dari endpoint daftar backend (100 baris per halaman). */
async function getAll<T>(path: string): Promise<T[]> {
  const joiner = path.includes("?") ? "&" : "?";
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const { data, meta }: Envelope<T[]> = await serverGet<T[]>(`${path}${joiner}limit=100&page=${page}`);
    all.push(...data);
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

// --- Ringkasan aset dan hasil hari ini ---

interface RawSummary {
  total: number;
  sudah: number;
  belum: number;
  tidakDitemukan: number;
  percent: number;
  today: { found: number; notFound: number; multiple: number; refChanges: number; statusChanges: number };
}

// Satu panggilan per permintaan, dipakai bersama oleh ringkasan aset dan hasil hari ini.
const loadSummary = cache(async () => (await serverGet<RawSummary>("/api/dashboard/summary")).data);

export interface AssetSummary {
  total: number;
  sudah: number;
  belum: number;
  tidakDitemukan: number;
  percent: number;
}

export async function getAssetSummary(): Promise<AssetSummary> {
  const { total, sudah, belum, tidakDitemukan, percent } = await loadSummary();
  return { total, sudah, belum, tidakDitemukan, percent };
}

export interface TodayResults {
  found: number;
  notFound: number;
  multiple: number;
  refChanges: number;
  statusChanges: number;
}

/** Scan dan perubahan REF/STATUS pada tanggal hari ini (WIB), dihitung backend. */
export async function getTodayResults(): Promise<TodayResults> {
  return (await loadSummary()).today;
}

// --- Jadwal hari ini ---

export interface TodaySchedule {
  id: number;
  officeName: string;
  assignedTo: string | null;
  status: ScheduleStatus;
}

interface RawSchedule {
  id: number;
  officeName: string;
  technicianName: string | null;
  status: ScheduleStatus;
}

export async function getTodaySchedules(): Promise<TodaySchedule[]> {
  const rows = await getAll<RawSchedule>(`/api/schedules?date=${jakartaDay()}`);
  return rows
    .map((s) => ({ id: s.id, officeName: s.officeName, assignedTo: s.technicianName, status: s.status }))
    .sort((a, b) => a.officeName.localeCompare(b.officeName, "id"));
}

// --- Progres per kantor ---

export type OfficeScheduleState =
  | { kind: "berjalan" }
  | { kind: "terjadwal"; date: string }
  | { kind: "selesai" }
  | { kind: "belum" };

export interface OfficeProgress {
  officeId: number;
  name: string;
  total: number;
  done: number; // sudah termapping (aset ditemukan)
  notFound: number; // aset berstatus tidak_ditemukan
  percent: number;
  nextDate: string | null; // jadwal terjadwal terdekat mulai hari ini
  lastActivity: string | null; // ISO, scan terakhir di kantor ini
  state: OfficeScheduleState;
}

interface RawProgress {
  id: number;
  name: string;
  total: number;
  sudah: number;
  tidakDitemukan: number;
  percent: number;
  nextDate: string | null;
  lastActivity: string | null;
  scheduleState: "berjalan" | "terjadwal" | "selesai" | "belum";
}

const toProgress = (r: RawProgress): OfficeProgress => ({
  officeId: r.id,
  name: r.name,
  total: r.total,
  done: r.sudah,
  notFound: r.tidakDitemukan,
  percent: r.percent,
  nextDate: r.nextDate,
  lastActivity: r.lastActivity,
  state:
    r.scheduleState === "terjadwal" && r.nextDate
      ? { kind: "terjadwal", date: r.nextDate }
      : ({ kind: r.scheduleState === "terjadwal" ? "belum" : r.scheduleState } as OfficeScheduleState),
});

export async function getOfficeProgress(): Promise<OfficeProgress[]> {
  return (await getAll<RawProgress>("/api/dashboard/progress")).map(toProgress);
}

// --- Detail satu kantor ---

export async function getOfficeDetail(officeId: number): Promise<{
  office: Office;
  progress: OfficeProgress;
  assets: Asset[];
} | null> {
  let office: Office;
  try {
    office = (await serverGet<Office>(`/api/offices/${officeId}`)).data;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return null;
    throw error;
  }
  const [progress] = (await getAll<RawProgress>(`/api/dashboard/progress?office_id=${officeId}`)).map(toProgress);
  if (!progress) return null;
  const assets = await getAll<Asset>(`/api/assets?office_id=${officeId}`);
  // Chassis dulu, lalu modul; di dalam jenis yang sama urut menurut EQ.
  assets.sort((a, b) =>
    a.kind === b.kind ? a.eq.localeCompare(b.eq, "id", { numeric: true }) : a.kind === "chassis" ? -1 : 1,
  );
  return { office: { id: office.id, code: office.code, name: office.name, address: office.address }, progress, assets };
}

// --- Scan yang SN-nya tidak cocok ke EQ mana pun ---

export interface NotFoundScan {
  id: number;
  scannedSn: string;
  eq: string | null;
  officeName: string;
  scannedBy: string;
  scannedAt: string;
}

export interface NotFoundFilter {
  officeId?: number;
  from?: string; // YYYY-MM-DD (WIB)
  to?: string; // YYYY-MM-DD (WIB)
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

interface RawScan {
  id: number;
  scannedSn: string;
  eq: string | null;
  officeName: string;
  technicianName: string;
  scannedAt: string;
}

// Hanya scan dengan hasil not_found; difilter dan dibatasi tanggalnya oleh backend.
// Input filter divalidasi di sini; nilai yang tidak valid diabaikan.
export async function getNotFoundScans(input: NotFoundFilter): Promise<{
  rows: NotFoundScan[];
  filter: NotFoundFilter;
}> {
  const filter: NotFoundFilter = {
    officeId: input.officeId && Number.isInteger(input.officeId) && input.officeId > 0 ? input.officeId : undefined,
    from: input.from && DAY.test(input.from) ? input.from : undefined,
    to: input.to && DAY.test(input.to) ? input.to : undefined,
  };
  // Rentang terbalik tidak punya hasil (backend menolaknya, jadi tidak perlu bertanya).
  if (filter.from && filter.to && filter.from > filter.to) return { rows: [], filter };

  const params = new URLSearchParams({ result: "not_found" });
  if (filter.officeId) params.set("office_id", String(filter.officeId));
  if (filter.from) params.set("date_from", filter.from);
  if (filter.to) params.set("date_to", filter.to);
  const rows = (await getAll<RawScan>(`/api/reports/mapping?${params}`)).map((r) => ({
    id: r.id,
    scannedSn: r.scannedSn,
    eq: r.eq,
    officeName: r.officeName,
    scannedBy: r.technicianName,
    scannedAt: r.scannedAt,
  }));
  return { rows, filter };
}

/** Daftar kantor untuk pilihan filter. */
export async function getOfficeOptions(): Promise<Pick<Office, "id" | "name">[]> {
  return (await getAll<Office>("/api/offices")).map((o) => ({ id: o.id, name: o.name }));
}
