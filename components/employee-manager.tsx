"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { loadEmployees, setEmployeeStatus } from "@/lib/employee-store";
import { AREA_LABEL, type Employee, type EmployeeStatus } from "@/lib/types";

const statusTone = {
  menunggu: "amber",
  aktif: "green",
  ditolak: "red",
  nonaktif: "gray",
} as const;

const statusLabel: Record<EmployeeStatus, string> = {
  menunggu: "Menunggu persetujuan",
  aktif: "Aktif",
  ditolak: "Ditolak",
  nonaktif: "Nonaktif",
};

const btn =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50";

const typeLabel = (e: Employee) => (e.type === "magang" ? "Magang" : "Karyawan");
const areaLabel = (e: Employee) => e.areas.map((a) => AREA_LABEL[a]).join(", ");

export function EmployeeManager() {
  // null = belum dibaca dari localStorage (hanya tersedia di browser).
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [filter, setFilter] = useState<"semua" | EmployeeStatus>("semua");

  useEffect(() => {
    queueMicrotask(() => setEmployees(loadEmployees()));
  }, []);

  if (employees === null) return null;

  const pending = employees.filter((e) => e.status === "menunggu");
  const shown = employees.filter((e) => filter === "semua" || e.status === filter);

  function decide(id: number, status: EmployeeStatus) {
    setEmployees(setEmployeeStatus(id, status));
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">{pending.length} akun menunggu persetujuan</p>
          <ul className="mt-3 space-y-2">
            {pending.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-xs text-slate-600">
                    @{e.username} · {typeLabel(e)} · {areaLabel(e) || "Area belum dipilih"}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900"
                  onClick={() => decide(e.id, "aktif")}
                >
                  Setujui
                </button>
                <button type="button" className={btn} onClick={() => decide(e.id, "ditolak")}>
                  Tolak
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
        {(["semua", "menunggu", "aktif", "ditolak", "nonaktif"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              filter === s
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Username</th>
              <th className="px-4 py-2 font-medium">Tipe</th>
              <th className="px-4 py-2 font-medium">Area</th>
              <th className="px-4 py-2 font-medium">Daftar</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada data karyawan.
                </td>
              </tr>
            )}
            {shown.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{e.name}</td>
                <td className="px-4 py-2 font-mono">{e.username}</td>
                <td className="px-4 py-2">{typeLabel(e)}</td>
                <td className="px-4 py-2">{areaLabel(e) || "-"}</td>
                <td className="px-4 py-2">{new Date(e.registeredAt).toLocaleDateString("id-ID")}</td>
                <td className="px-4 py-2">
                  <Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  {e.status === "aktif" && (
                    <button type="button" className="text-slate-700 underline-offset-2 hover:underline" onClick={() => decide(e.id, "nonaktif")}>
                      Nonaktifkan
                    </button>
                  )}
                  {(e.status === "nonaktif" || e.status === "ditolak") && (
                    <button type="button" className="text-slate-700 underline-offset-2 hover:underline" onClick={() => decide(e.id, "aktif")}>
                      Aktifkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
