// Query data dashboard admin. Hanya dipanggil dari komponen server.
// Sementara membaca data mock; bentuk keluarannya sama dengan hasil query SQL
// di queryDB.md (modul 7), jadi saat Neon terhubung hanya isi fungsi yang diganti.
import { jakartaDay } from "@/lib/date";
import {
  assets,
  getOffice,
  history,
  offices,
  results,
  schedules,
} from "@/lib/mock-data";
import type { MappingStatus, ScheduleStatus } from "@/lib/types";

export interface AssetSummary {
  total: number;
  sudah: number;
  belum: number;
  tidakDitemukan: number;
  percent: number;
}

export function getAssetSummary(): AssetSummary {
  const count = (s: MappingStatus) => assets.filter((a) => a.mappingStatus === s).length;
  const sudah = count("sudah");
  return {
    total: assets.length,
    sudah,
    belum: count("belum"),
    tidakDitemukan: count("tidak_ditemukan"),
    percent: assets.length === 0 ? 0 : Math.round((sudah / assets.length) * 100),
  };
}

export interface TodaySchedule {
  id: number;
  officeName: string;
  assignedTo: string | null;
  status: ScheduleStatus;
}

export function getTodaySchedules(): TodaySchedule[] {
  const today = jakartaDay();
  return schedules
    .filter((s) => s.scheduledDate === today)
    .map((s) => ({
      id: s.id,
      officeName: getOffice(s.officeId)?.name ?? "-",
      assignedTo: s.assignedTo,
      status: s.status,
    }))
    .sort((a, b) => a.officeName.localeCompare(b.officeName));
}

export interface TodayResults {
  found: number;
  notFound: number;
  multiple: number;
  refChanges: number;
  statusChanges: number;
}

export function getTodayResults(): TodayResults {
  const today = jakartaDay();
  const scans = results.filter((r) => jakartaDay(r.scannedAt) === today);
  const changes = history.filter((h) => jakartaDay(h.changedAt) === today);
  return {
    found: scans.filter((r) => r.result === "found").length,
    notFound: scans.filter((r) => r.result === "not_found").length,
    multiple: scans.filter((r) => r.result === "multiple").length,
    refChanges: changes.filter((h) => h.field === "ref").length,
    statusChanges: changes.filter((h) => h.field === "status").length,
  };
}

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

// Skema A: hanya scan dengan result = 'not_found' dari mapping_results.
// Input filter divalidasi di sini; nilai yang tidak valid diabaikan.
export function getNotFoundScans(input: NotFoundFilter): {
  rows: NotFoundScan[];
  filter: NotFoundFilter;
} {
  const filter: NotFoundFilter = {
    officeId: input.officeId && getOffice(input.officeId) ? input.officeId : undefined,
    from: input.from && DAY.test(input.from) ? input.from : undefined,
    to: input.to && DAY.test(input.to) ? input.to : undefined,
  };

  const rows = results
    .filter((r) => r.result === "not_found")
    .map((r) => {
      const schedule = schedules.find((s) => s.id === r.scheduleId);
      return {
        id: r.id,
        scannedSn: r.scannedSn,
        eq: assets.find((a) => a.id === r.assetId)?.eq ?? null,
        officeId: schedule?.officeId,
        officeName: schedule ? (getOffice(schedule.officeId)?.name ?? "-") : "-",
        scannedBy: r.scannedBy,
        scannedAt: r.scannedAt,
      };
    })
    .filter((r) => {
      const day = jakartaDay(r.scannedAt);
      return (
        (!filter.officeId || r.officeId === filter.officeId) &&
        (!filter.from || day >= filter.from) &&
        (!filter.to || day <= filter.to)
      );
    })
    .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));

  return { rows, filter };
}

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

// Satu pass agregat per kantor (tanpa query per baris). Padanan SQL ada di queryDB.md.
export function getOfficeProgress(): OfficeProgress[] {
  const today = jakartaDay();
  return offices.map((office) => {
    const items = assets.filter((a) => a.officeId === office.id);
    const done = items.filter((a) => a.mappingStatus === "sudah").length;
    const notFound = items.filter((a) => a.mappingStatus === "tidak_ditemukan").length;

    const own = schedules.filter((s) => s.officeId === office.id && s.status !== "dibatalkan");
    const upcoming = own
      .filter((s) => s.status === "terjadwal" && s.scheduledDate >= today)
      .map((s) => s.scheduledDate)
      .sort();
    const nextDate = upcoming[0] ?? null;

    const ownIds = new Set(schedules.filter((s) => s.officeId === office.id).map((s) => s.id));
    const lastActivity =
      results
        .filter((r) => ownIds.has(r.scheduleId))
        .map((r) => r.scannedAt)
        .sort()
        .at(-1) ?? null;

    const state: OfficeScheduleState = own.some((s) => s.status === "berjalan")
      ? { kind: "berjalan" }
      : nextDate
        ? { kind: "terjadwal", date: nextDate }
        : own.some((s) => s.status === "selesai")
          ? { kind: "selesai" }
          : { kind: "belum" };

    return {
      officeId: office.id,
      name: office.name,
      total: items.length,
      done,
      notFound,
      percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
      nextDate,
      lastActivity,
      state,
    };
  });
}

export function getOfficeDetail(officeId: number) {
  const office = getOffice(officeId);
  if (!office) return null;
  const progress = getOfficeProgress().find((p) => p.officeId === officeId)!;
  const items = assets
    .filter((a) => a.officeId === officeId)
    .sort((a, b) => (a.kind === b.kind ? a.eq.localeCompare(b.eq) : a.kind === "chassis" ? -1 : 1));
  return { office, progress, assets: items };
}
