"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import {
  getOffice,
  mockTechnicians,
  offices,
  schedules as initialSchedules,
} from "@/lib/mock-data";
import type { MappingSchedule, ScheduleStatus } from "@/lib/types";

const statusTone: Record<ScheduleStatus, "gray" | "blue" | "green" | "red"> = {
  terjadwal: "gray",
  berjalan: "blue",
  selesai: "green",
  dibatalkan: "red",
};

export function ScheduleManager() {
  const [items, setItems] = useState<MappingSchedule[]>(initialSchedules);
  const [officeId, setOfficeId] = useState(String(offices[0].id));
  const [date, setDate] = useState("");
  const [technician, setTechnician] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Tanggal wajib diisi.");
      return;
    }
    setError(null);
    setItems((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((s) => s.id)) + 1,
        officeId: Number(officeId),
        scheduledDate: date,
        assignedTo: technician || null,
        status: "terjadwal",
      },
    ]);
  }

  function cancel(id: number) {
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dibatalkan" } : s)),
    );
  }

  const sorted = [...items].sort((a, b) =>
    b.scheduledDate.localeCompare(a.scheduledDate),
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="text-sm font-medium">
          Kantor
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Tanggal
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Teknisi (opsional)
          <select
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">Belum ditugaskan</option>
            {mockTechnicians.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-sky-600 py-2 font-medium text-white hover:bg-sky-700"
          >
            Tambah jadwal
          </button>
        </div>
        {error && <p className="text-sm text-red-700 sm:col-span-full">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Tanggal</th>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">Teknisi</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{s.scheduledDate}</td>
                <td className="px-4 py-2">{getOffice(s.officeId)?.name}</td>
                <td className="px-4 py-2">{s.assignedTo ?? "-"}</td>
                <td className="px-4 py-2">
                  <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  {(s.status === "terjadwal" || s.status === "berjalan") && (
                    <button
                      type="button"
                      onClick={() => cancel(s.id)}
                      className="text-red-700 hover:underline"
                    >
                      Batalkan
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
