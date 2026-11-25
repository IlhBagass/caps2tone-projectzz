// Data karyawan lewat backend (tabel users). Dipakai komponen client: /daftar dan kelola karyawan.
// Frontend menyebutnya Employee (type, status); backend menyebutnya users (employee_type, approval_status).
import { api } from "@/lib/api-client";
import type { Area, Employee, EmployeeStatus, EmployeeType } from "@/lib/types";

interface UserRow {
  id: number;
  name: string;
  username: string;
  employeeType: EmployeeType;
  approvalStatus: EmployeeStatus;
  areas: Area[];
  createdAt: string;
  decidedAt: string | null;
}

const toEmployee = (u: UserRow): Employee => ({
  id: u.id,
  name: u.name,
  username: u.username,
  type: u.employeeType,
  areas: u.areas,
  status: u.approvalStatus,
  registeredAt: u.createdAt,
  decidedAt: u.decidedAt,
});

/** Semua teknisi (karyawan dan magang) dari semua status; akun admin tidak ikut. */
export async function listEmployees(): Promise<Employee[]> {
  const all: Employee[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await api.page<UserRow>(`/api/users?role=teknisi&limit=100&page=${page}`);
    all.push(...data.map(toEmployee));
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

export interface TechnicianOption {
  id: number;
  name: string;
  areas: Area[];
}

/** Teknisi aktif untuk dipilih sebagai penanggung jawab jadwal. */
export async function listActiveTechnicians(): Promise<TechnicianOption[]> {
  const all: TechnicianOption[] = [];
  for (let page = 1; ; page++) {
    const { data, meta } = await api.page<UserRow>(`/api/users?role=teknisi&approval_status=aktif&limit=100&page=${page}`);
    all.push(...data.map((u) => ({ id: u.id, name: u.name, areas: u.areas })));
    if (!meta || all.length >= meta.total || data.length === 0) return all;
  }
}

export interface NewEmployee {
  name: string;
  username: string;
  password: string;
  type: EmployeeType;
  areas: Area[];
}

/** Admin menambah akun: langsung aktif, tanpa menunggu persetujuan. */
export async function createEmployee(input: NewEmployee): Promise<Employee> {
  const user = await api.post<UserRow>("/api/users", {
    name: input.name.trim(),
    username: input.username.trim(),
    password: input.password,
    role: "teknisi",
    areas: input.areas,
    employeeType: input.type,
    approvalStatus: "aktif",
  });
  return toEmployee(user);
}

/** Setujui, tolak, nonaktifkan, atau aktifkan kembali. Menolak atau menonaktifkan mencabut sesi akun itu. */
export async function decideEmployee(id: number, status: EmployeeStatus): Promise<Employee> {
  return toEmployee(await api.patch<UserRow>(`/api/users/${id}`, { approvalStatus: status }));
}

/** Pendaftaran mandiri dari halaman /daftar (publik). Akun berstatus "menunggu" sampai admin menyetujui. */
export async function registerAccount(input: NewEmployee): Promise<void> {
  await api.post("/api/auth/register", {
    name: input.name.trim(),
    username: input.username.trim(),
    password: input.password,
    employeeType: input.type,
    areas: input.areas,
  });
}

/** Aturan password backend (bcrypt): 12 sampai 72 karakter. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Password minimal 12 karakter.";
  if (new TextEncoder().encode(password).length > 72) return "Password terlalu panjang (maksimal 72 byte).";
  return null;
}
