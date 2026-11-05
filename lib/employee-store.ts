// Penyimpanan data karyawan SEMENTARA di localStorage browser (demo).
// Ganti dengan API + tabel `users` (kolom approval_status) saat database siap.
// Password sengaja tidak disimpan di sini.
import type { Area, Employee, EmployeeStatus, EmployeeType } from "@/lib/types";

const KEY = "tif-employees";

const seed: Employee[] = [
  { id: 1, name: "Budi Santoso", username: "budi", type: "karyawan", areas: ["solo"], status: "aktif", registeredAt: "2026-01-10T08:00:00.000Z", decidedAt: "2026-01-10T09:00:00.000Z" },
  { id: 2, name: "Sari Wulandari", username: "sari", type: "karyawan", areas: ["solo", "grobogan"], status: "aktif", registeredAt: "2026-01-10T08:00:00.000Z", decidedAt: "2026-01-10T09:00:00.000Z" },
  { id: 3, name: "Dimas Prakoso", username: "dimas", type: "karyawan", areas: ["grobogan"], status: "aktif", registeredAt: "2026-01-12T08:00:00.000Z", decidedAt: "2026-01-12T09:00:00.000Z" },
  { id: 4, name: "Rina Kusuma", username: "rina", type: "karyawan", areas: ["grobogan", "solo"], status: "aktif", registeredAt: "2026-01-12T08:00:00.000Z", decidedAt: "2026-01-12T09:00:00.000Z" },
];

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Employee[];
  } catch {
    // abaikan: pakai data awal
  }
  return seed;
}

export function saveEmployees(list: Employee[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // penyimpanan tidak tersedia; perubahan hanya berlaku selama halaman terbuka
  }
}

export function registerEmployee(input: {
  name: string;
  username: string;
  type: EmployeeType;
  areas: Area[];
}): { ok: true } | { ok: false; message: string } {
  const list = loadEmployees();
  const username = input.username.trim().toLowerCase();
  if (username === "admin" || list.some((e) => e.username === username)) {
    return { ok: false, message: "Username sudah dipakai." };
  }
  saveEmployees([
    ...list,
    {
      id: Math.max(0, ...list.map((e) => e.id)) + 1,
      name: input.name.trim(),
      username,
      type: input.type,
      areas: input.areas,
      status: "menunggu",
      registeredAt: new Date().toISOString(),
      decidedAt: null,
    },
  ]);
  return { ok: true };
}

export function setEmployeeStatus(id: number, status: EmployeeStatus): Employee[] {
  const next = loadEmployees().map((e) =>
    e.id === id ? { ...e, status, decidedAt: new Date().toISOString() } : e,
  );
  saveEmployees(next);
  return next;
}

export function findByUsername(username: string): Employee | undefined {
  const u = username.trim().toLowerCase();
  return loadEmployees().find((e) => e.username === u);
}
