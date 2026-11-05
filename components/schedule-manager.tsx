"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { TechnicianPicker } from "@/components/technician-picker";
import { TelegramNotifyPanel } from "@/components/telegram-notify-panel";
import {
  getOffice,
  isoDate,
  offices,
  schedules as initialSchedules,
  technicians,
} from "@/lib/mock-data";
import { AREA_LABEL } from "@/lib/types";
import type { Area, MappingSchedule, ScheduleStatus } from "@/lib/types";

const statusTone: Record<ScheduleStatus, "gray" | "info" | "green" | "red"> = {
  terjadwal: "gray",
  berjalan: "info",
  selesai: "green",
  dibatalkan: "red",
};

const AREAS = Object.keys(AREA_LABEL) as Area[];

// Nama teknisi yang melayani area tertentu.
const techniciansIn = (area: Area) =>
  technicians.filter((t) => t.areas.includes(area)).map((t) => t.name);

const isActive = (s: MappingSchedule) =>
  s.status === "terjadwal" || s.status === "berjalan";

export function ScheduleManager() {
  const [items, setItems] = useState<MappingSchedule[]>(initialSchedules);
  const [officeIds, setOfficeIds] = useState<number[]>([]);
  const [area, setArea] = useState<Area>("solo");
  const [date, setDate] = useState("");
  const [technician, setTechnician] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ScheduleStatus | "semua">("semua");
  const [techFilter, setTechFilter] = useState("semua"); // "semua" | "belum" | nama
  const [areaFilter, setAreaFilter] = useState<Area | "semua">("semua");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dihitung saat dipakai (bukan saat render awal) agar tidak ikut ter-prerender.
  const today = () => isoDate(0);

  // Satu kantor tidak boleh punya dua jadwal aktif di tanggal yang sama.
  function validate(office: number, day: string, ignoreId?: number): string | null {
    if (!day) return "Tanggal wajib diisi.";
    if (day < today()) return "Tanggal tidak boleh sebelum hari ini.";
    const clash = items.some(
      (s) =>
        s.id !== ignoreId &&
        isActive(s) &&
        s.officeId === office &&
        s.scheduledDate === day,
    );
    return clash ? "Kantor ini sudah punya jadwal aktif di tanggal tersebut." : null;
  }

  function openModal() {
    setError(null);
    setArea("solo");
    setOfficeIds([]);
    setDate("");
    setTechnician("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
  }

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function changeArea(next: Area) {
    setArea(next);
    // Teknisi yang tidak melayani area baru dilepas dari pilihan.
    if (technician && !techniciansIn(next).includes(technician)) setTechnician("");
  }

  function toggleOffice(id: number) {
    setOfficeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  // Satu kali simpan = satu jadwal per kantor yang dipilih, semuanya untuk
  // teknisi dan tanggal yang sama.
  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (officeIds.length === 0) {
      setError("Pilih minimal satu kantor.");
      return;
    }
    const problems = officeIds
      .map((id) => ({ id, problem: validate(id, date) }))
      .filter((x) => x.problem);
    if (problems.length > 0) {
      const names = problems.map((x) => getOffice(x.id)?.name).join(", ");
      setError(
        !date || date < today()
          ? problems[0].problem
          : `Sudah ada jadwal aktif di tanggal itu untuk: ${names}. Hapus centang kantor tersebut.`,
      );
      return;
    }
    setModalOpen(false);
    setError(null);
    setItems((prev) => {
      let nextId = Math.max(0, ...prev.map((s) => s.id));
      return [
        ...prev,
        ...officeIds.map((id) => ({
          id: ++nextId,
          officeId: id,
          area,
          scheduledDate: date,
          assignedTo: technician || null,
          status: "terjadwal" as const,
        })),
      ];
    });
  }

  // Mengembalikan pesan error, atau null jika berhasil disimpan.
  function update(id: number, day: string, assignedTo: string | null): string | null {
    const target = items.find((s) => s.id === id);
    if (!target) return "Jadwal tidak ditemukan.";
    const problem = validate(target.officeId, day, id);
    if (problem) return problem;
    setItems((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, scheduledDate: day, assignedTo } : s,
      ),
    );
    setEditingId(null);
    return null;
  }

  function cancel(id: number) {
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "dibatalkan" } : s)),
    );
  }

  const keyword = search.trim().toLowerCase();
  const filtersActive =
    filter !== "semua" || areaFilter !== "semua" || techFilter !== "semua" || !!search || !!dateFrom || !!dateTo;

  function resetFilters() {
    setFilter("semua");
    setAreaFilter("semua");
    setTechFilter("semua");
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  const sorted = items
    .filter((s) => filter === "semua" || s.status === filter)
    .filter((s) => areaFilter === "semua" || s.area === areaFilter)
    .filter((s) => {
      if (techFilter === "semua") return true;
      if (techFilter === "belum") return s.assignedTo === null;
      return s.assignedTo === techFilter;
    })
    .filter((s) => !dateFrom || s.scheduledDate >= dateFrom)
    .filter((s) => !dateTo || s.scheduledDate <= dateTo)
    .filter(
      (s) =>
        !keyword ||
        (getOffice(s.officeId)?.name ?? "").toLowerCase().includes(keyword) ||
        (s.assignedTo ?? "").toLowerCase().includes(keyword),
    )
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  return (
    <div className="space-y-6">
      <TelegramNotifyPanel schedules={items} />
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kantor atau teknisi..."
            aria-label="Cari kantor atau teknisi"
            className="w-full rounded-md border border-slate-300 px-3 py-2 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={openModal}
            className="rounded-md bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900"
          >
            + Tambah jadwal
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium">
            Area
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value as Area | "semua")}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5"
            >
              <option value="semua">Semua</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {AREA_LABEL[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Dari tanggal
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5"
            />
          </label>
          <label className="text-sm font-medium">
            Sampai tanggal
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5"
            />
          </label>
          <label className="text-sm font-medium">
            Teknisi
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5"
            >
              <option value="semua">Semua</option>
              <option value="belum">Belum ditugaskan</option>
              {technicians.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ScheduleStatus | "semua")}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5"
            >
              <option value="semua">Semua</option>
              {(Object.keys(statusTone) as ScheduleStatus[]).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtersActive && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{sorted.length} jadwal ditampilkan</span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-slate-700 underline-offset-2 hover:underline"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-schedule-title"
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
          >
            <h2 id="add-schedule-title" className="text-lg font-semibold">
              Tambah jadwal mapping
            </h2>
            <label className="block text-sm font-medium">
              Area
              <select
                value={area}
                onChange={(e) => changeArea(e.target.value as Area)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {AREA_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <div className="flex items-center justify-between">
                <legend className="text-sm font-medium">
                  Kantor <span className="font-normal text-slate-500">({officeIds.length} dipilih)</span>
                </legend>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    className="text-slate-700 underline-offset-2 hover:underline"
                    onClick={() => setOfficeIds(offices.map((o) => o.id))}
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    className="text-slate-700 underline-offset-2 hover:underline"
                    onClick={() => setOfficeIds([])}
                  >
                    Kosongkan
                  </button>
                </div>
              </div>
              <ul className="mt-1 max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-300">
                {offices.map((o) => (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={officeIds.includes(o.id)}
                        onChange={() => toggleOffice(o.id)}
                      />
                      {o.name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <label className="block text-sm font-medium">
              Tanggal
              <input
                type="date"
                value={date}
                min={today()}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="text-sm font-medium">
              Teknisi (opsional) &middot; area {AREA_LABEL[area]}
              <TechnicianPicker
                value={technician}
                options={techniciansIn(area)}
                onChange={setTechnician}
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-md bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900"
              >
                {officeIds.length > 1 ? `Simpan ${officeIds.length} jadwal` : "Simpan jadwal"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Tanggal</th>
              <th className="px-4 py-2 font-medium">Area</th>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">Teknisi</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada jadwal yang cocok.
                </td>
              </tr>
            )}
            {sorted.map((s) =>
              editingId === s.id ? (
                <EditRow
                  key={s.id}
                  schedule={s}
                  min={today()}
                  onSave={update}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.scheduledDate}</td>
                  <td className="px-4 py-2">{AREA_LABEL[s.area]}</td>
                  <td className="px-4 py-2">{getOffice(s.officeId)?.name}</td>
                  <td className="px-4 py-2">{s.assignedTo ?? "-"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="space-x-3 px-4 py-2 text-right">
                    {isActive(s) && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(s.id)}
                          className="text-slate-700 underline-offset-2 hover:underline"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => cancel(s.id)}
                          className="text-red-700 hover:underline"
                        >
                          Batalkan
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditRow({
  schedule,
  min,
  onSave,
  onClose,
}: {
  schedule: MappingSchedule;
  min: string;
  onSave: (id: number, day: string, assignedTo: string | null) => string | null;
  onClose: () => void;
}) {
  const [day, setDay] = useState(schedule.scheduledDate);
  const [tech, setTech] = useState(schedule.assignedTo ?? "");
  const [error, setError] = useState<string | null>(null);

  return (
    <tr className="border-t border-slate-100 bg-slate-50">
      <td className="px-4 py-2">
        <input
          type="date"
          value={day}
          min={min}
          onChange={(e) => setDay(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1"
        />
      </td>
      <td className="px-4 py-2">{AREA_LABEL[schedule.area]}</td>
      <td className="px-4 py-2">{getOffice(schedule.officeId)?.name}</td>
      <td className="px-4 py-2">
        <TechnicianPicker
          value={tech}
          options={techniciansIn(schedule.area)}
          onChange={setTech}
        />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <Badge tone={statusTone[schedule.status]}>{schedule.status}</Badge>
      </td>
      <td className="space-x-3 px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => setError(onSave(schedule.id, day, tech || null))}
          className="text-slate-700 underline-offset-2 hover:underline"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-600 hover:underline"
        >
          Batal
        </button>
      </td>
    </tr>
  );
}
