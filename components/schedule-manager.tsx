"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { TechnicianPicker } from "@/components/technician-picker";
import { TelegramNotifyPanel } from "@/components/telegram-notify-panel";
import { ApiError, errorMessage } from "@/lib/api";
import { jakartaDay } from "@/lib/date";
import { listActiveTechnicians, type TechnicianOption } from "@/lib/employees";
import { listOffices, type OfficeRow } from "@/lib/offices";
import {
  cancelSchedule,
  createSchedules,
  listSchedules,
  updateSchedule,
  type ScheduleRow,
} from "@/lib/schedules";
import { AREA_LABEL } from "@/lib/types";
import type { Area, ScheduleStatus } from "@/lib/types";

const statusTone: Record<ScheduleStatus, "gray" | "info" | "green" | "red"> = {
  terjadwal: "gray",
  berjalan: "info",
  selesai: "green",
  dibatalkan: "red",
};

const AREAS = Object.keys(AREA_LABEL) as Area[];

const isActive = (s: ScheduleRow) => s.status === "terjadwal" || s.status === "berjalan";

export function ScheduleManager() {
  const [items, setItems] = useState<ScheduleRow[] | null>(null);
  const [offices, setOffices] = useState<OfficeRow[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [officeIds, setOfficeIds] = useState<number[]>([]);
  const [area, setArea] = useState<Area>("solo");
  const [date, setDate] = useState("");
  const [technician, setTechnician] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ScheduleStatus | "semua">("semua");
  const [techFilter, setTechFilter] = useState("semua"); // "semua" | "belum" | id teknisi
  const [areaFilter, setAreaFilter] = useState<Area | "semua">("semua");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // search yang sudah ditunda, dipakai untuk memuat
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Dihitung saat dipakai (bukan saat render awal) agar tidak ikut ter-prerender.
  const today = () => jakartaDay();

  // Kantor dan teknisi dimuat sekali untuk formulir dan filter.
  useEffect(() => {
    let cancelled = false;
    Promise.all([listOffices(), listActiveTechnicians()]).then(
      ([o, t]) => {
        if (cancelled) return;
        setOffices(o);
        setTechnicians(t);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Pencarian ditunda sebentar supaya tidak memanggil backend di setiap ketukan.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Daftar jadwal difilter di backend dan dimuat ulang setiap filter berubah.
  useEffect(() => {
    let cancelled = false;
    listSchedules({
      status: filter === "semua" ? undefined : filter,
      area: areaFilter === "semua" ? undefined : areaFilter,
      technician: techFilter === "semua" ? undefined : techFilter === "belum" ? "belum" : Number(techFilter),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: query || undefined,
    }).then(
      (rows) => {
        if (cancelled) return;
        setItems(rows);
        setLoadError(null);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [filter, areaFilter, techFilter, dateFrom, dateTo, query, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  function openModal() {
    setError(null);
    setArea("solo");
    setOfficeIds([]);
    setDate("");
    setTechnician(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setError(null);
  }

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // Kantor yang boleh dijadwalkan di area ini (kantor tanpa area boleh di mana pun).
  const officesInArea = (a: Area) => offices.filter((o) => o.area === null || o.area === a);
  const techniciansIn = (a: Area) => technicians.filter((t) => t.areas.includes(a));

  function changeArea(next: Area) {
    setArea(next);
    // Kantor dan teknisi yang tidak melayani area baru dilepas dari pilihan.
    const allowed = new Set(officesInArea(next).map((o) => o.id));
    setOfficeIds((cur) => cur.filter((id) => allowed.has(id)));
    if (technician !== null && !techniciansIn(next).some((t) => t.id === technician)) setTechnician(null);
  }

  function toggleOffice(id: number) {
    setOfficeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  // Satu kali simpan = satu jadwal per kantor yang dipilih, semuanya untuk teknisi dan tanggal yang sama.
  // Backend menyimpannya atomik dan menolak kantor yang sudah punya jadwal aktif di tanggal itu.
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (officeIds.length === 0) {
      setError("Pilih minimal satu kantor.");
      return;
    }
    if (!date) {
      setError("Tanggal wajib diisi.");
      return;
    }
    if (date < today()) {
      setError("Tanggal tidak boleh sebelum hari ini.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createSchedules({ officeIds, area, scheduledDate: date, technicianId: technician });
      setModalOpen(false);
      setNotice(`${created.length} jadwal ditambahkan.`);
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "SCHEDULE_CONFLICT"
          ? `${err.message} Hapus centang kantor tersebut.`
          : errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  // Mengembalikan pesan error, atau null jika berhasil disimpan.
  async function update(id: number, day: string, technicianId: number | null): Promise<string | null> {
    if (!day) return "Tanggal wajib diisi.";
    if (day < today()) return "Tanggal tidak boleh sebelum hari ini.";
    try {
      await updateSchedule(id, { scheduledDate: day, technicianId });
    } catch (err) {
      return errorMessage(err);
    }
    setEditingId(null);
    setNotice(null);
    reload();
    return null;
  }

  async function cancel(id: number) {
    setBusyId(id);
    setNotice(null);
    try {
      await cancelSchedule(id);
      reload();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const filtersActive =
    filter !== "semua" || areaFilter !== "semua" || techFilter !== "semua" || !!search || !!dateFrom || !!dateTo;

  function resetFilters() {
    setFilter("semua");
    setAreaFilter("semua");
    setTechFilter("semua");
    setSearch("");
    setQuery("");
    setDateFrom("");
    setDateTo("");
  }

  const shown = items ?? [];
  const modalOffices = officesInArea(area);

  return (
    <div className="space-y-6">
      <TelegramNotifyPanel refreshKey={reloadKey} />
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex-1">Data jadwal tidak dapat dimuat. {loadError}</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            Coba lagi
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800">
          {notice}
        </p>
      )}
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
                <option key={t.id} value={t.id}>
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
            <span>{shown.length} jadwal ditampilkan</span>
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
                    onClick={() => setOfficeIds(modalOffices.map((o) => o.id))}
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
                {modalOffices.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-500">Tidak ada kantor di area {AREA_LABEL[area]}.</li>
                )}
                {modalOffices.map((o) => (
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
                disabled={saving}
                className="rounded-md bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {saving ? "Menyimpan…" : officeIds.length > 1 ? `Simpan ${officeIds.length} jadwal` : "Simpan jadwal"}
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
            {items === null && !loadError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Memuat jadwal…
                </td>
              </tr>
            )}
            {items !== null && shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada jadwal yang cocok.
                </td>
              </tr>
            )}
            {shown.map((s) =>
              editingId === s.id ? (
                <EditRow
                  key={s.id}
                  schedule={s}
                  min={today()}
                  options={techniciansIn(s.area)}
                  onSave={update}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.scheduledDate}</td>
                  <td className="px-4 py-2">{AREA_LABEL[s.area]}</td>
                  <td className="px-4 py-2">{s.officeName}</td>
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
                          disabled={busyId === s.id}
                          onClick={() => cancel(s.id)}
                          className="text-red-700 hover:underline disabled:opacity-60"
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
  options,
  onSave,
  onClose,
}: {
  schedule: ScheduleRow;
  min: string;
  options: TechnicianOption[];
  onSave: (id: number, day: string, technicianId: number | null) => Promise<string | null>;
  onClose: () => void;
}) {
  const [day, setDay] = useState(schedule.scheduledDate);
  const [tech, setTech] = useState<number | null>(schedule.assignedToId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(await onSave(schedule.id, day, tech));
    setSaving(false);
  }

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
      <td className="px-4 py-2">{schedule.officeName}</td>
      <td className="px-4 py-2">
        <TechnicianPicker value={tech} options={options} onChange={setTech} />
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <Badge tone={statusTone[schedule.status]}>{schedule.status}</Badge>
      </td>
      <td className="space-x-3 px-4 py-2 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="text-slate-700 underline-offset-2 hover:underline disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onClose} className="text-slate-600 hover:underline">
          Batal
        </button>
      </td>
    </tr>
  );
}
