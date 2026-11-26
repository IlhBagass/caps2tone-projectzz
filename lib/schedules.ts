// Jadwal mapping lewat backend. Dipakai komponen client (kelola jadwal admin).
import { api } from "@/lib/api-client";
import { queryString } from "@/lib/api";
import type { Area, MappingSchedule, ScheduleStatus } from "@/lib/types";

/** MappingSchedule plus id teknisi dan nama kantor dari backend. assignedTo tetap berupa nama teknisi. */
export interface ScheduleRow extends MappingSchedule {
  assignedToId: number | null;
  officeName: string;
  officeCode: string;
}

interface RawSchedule {
  id: number;
  officeId: number;
  area: Area;
  scheduledDate: string;
  assignedTo: number | null;
  status: ScheduleStatus;
  technicianName: string | null;
  officeName: string;
  officeCode: string;
}

const toSchedule = (r: RawSchedule): ScheduleRow => ({
  id: r.id,
  officeId: r.officeId,
  area: r.area,
  scheduledDate: r.scheduledDate,
  assignedTo: r.technicianName,
  assignedToId: r.assignedTo,
  status: r.status,
  officeName: r.officeName,
  officeCode: r.officeCode,
});

export interface ScheduleFilters {
  status?: ScheduleStatus;
  area?: Area;
  /** Id teknisi, atau "belum" untuk jadwal yang belum ditugaskan. */
  technician?: number | "belum";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/** Semua jadwal yang cocok dengan filter (filter dijalankan di backend), terbaru di atas. */
export async function listSchedules(filters: ScheduleFilters = {}): Promise<ScheduleRow[]> {
  const all: ScheduleRow[] = [];
  for (let page = 1; ; page++) {
    const query = queryString({
      limit: 100,
      page,
      status: filters.status,
      area: filters.area,
      assignedTo: typeof filters.technician === "number" ? filters.technician : undefined,
      unassigned: filters.technician === "belum" ? true : undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: filters.search,
    });
    const { data, meta } = await api.page<RawSchedule>(`/api/schedules${query}`);
    all.push(...data.map(toSchedule));
    if (!meta || all.length >= meta.total || data.length === 0) break;
  }
  return all.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.officeName.localeCompare(b.officeName, "id"));
}

/** Satu jadwal per kantor untuk satu tanggal dan teknisi (opsional); atomik: gagal satu, gagal semua. */
export async function createSchedules(input: {
  officeIds: number[];
  area: Area;
  scheduledDate: string;
  technicianId: number | null;
}): Promise<ScheduleRow[]> {
  const rows = await api.post<RawSchedule[]>("/api/schedules", {
    officeIds: input.officeIds,
    area: input.area,
    scheduledDate: input.scheduledDate,
    assignedTo: input.technicianId,
  });
  return rows.map(toSchedule);
}

export async function updateSchedule(
  id: number,
  input: { scheduledDate: string; technicianId: number | null },
): Promise<ScheduleRow> {
  return toSchedule(
    await api.patch<RawSchedule>(`/api/schedules/${id}`, { scheduledDate: input.scheduledDate, assignedTo: input.technicianId }),
  );
}

/** Membatalkan jadwal (tidak dihapus; hasil scan tetap tersimpan). */
export async function cancelSchedule(id: number): Promise<ScheduleRow> {
  return toSchedule(await api.delete<RawSchedule>(`/api/schedules/${id}`));
}

// --- Kirim jadwal ke Telegram (manual) ---

export interface NotifyOffice {
  officeId: number;
  officeName: string;
  total: number;
  remaining: number;
}

export interface NotifyRecipient {
  userId: number;
  name: string;
  linked: boolean;
  offices: NotifyOffice[];
  totalRemaining: number;
  message: string;
  lastSent: { success: boolean; at: string } | null;
}

export interface NotifyPreview {
  date: string;
  recipients: NotifyRecipient[];
  unassigned: { officeId: number; officeName: string }[];
  sendable: number;
  skipped: number;
}

export interface NotifyResult {
  date: string;
  sent: number;
  skipped: number;
  failed: number;
  results: { userId: number; name: string; status: "sent" | "skipped" | "failed" }[];
}

export const previewNotify = (date: string) =>
  api.get<NotifyPreview>(`/api/schedules/notify-preview${queryString({ date })}`);

export const sendNotify = (date: string) => api.post<NotifyResult>("/api/schedules/notify", { date });
