"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/badge";
import { addEmployee, loadEmployees, setEmployeeStatus } from "@/lib/employee-store";
import {
  AREA_LABEL,
  type Area,
  type Employee,
  type EmployeeStatus,
  type EmployeeType,
} from "@/lib/types";

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

const emptyForm = {
  name: "",
  username: "",
  password: "",
  type: "karyawan" as EmployeeType,
  areas: [] as Area[],
};
const input = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2";

export function EmployeeManager() {
  // null = belum dibaca dari localStorage (hanya tersedia di browser).
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [filter, setFilter] = useState<"semua" | EmployeeStatus>("semua");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => setEmployees(loadEmployees()));
  }, []);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      setFormError("Nama, username, dan password wajib diisi.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password minimal 8 karakter.");
      return;
    }
    if (form.areas.length === 0) {
      setFormError("Pilih minimal satu area.");
      return;
    }
    // TODO: kirim ke API; password di-hash di server, tidak disimpan di klien.
    const res = addEmployee({
      name: form.name,
      username: form.username,
      type: form.type,
      areas: form.areas,
    });
    if (!res.ok) {
      setFormError(res.message);
      return;
    }
    setEmployees(res.list);
    setForm(emptyForm);
    setFormError(null);
    setAdding(false);
  }

  if (employees === null) return null;

  const pending = employees.filter((e) => e.status === "menunggu");
  const shown = employees.filter((e) => filter === "semua" || e.status === filter);

  function decide(id: number, status: EmployeeStatus) {
    setEmployees(setEmployeeStatus(id, status));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          onClick={() => {
            setAdding((v) => !v);
            setFormError(null);
          }}
        >
          {adding ? "Tutup form" : "Tambah karyawan"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submitNew} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium">Tambah karyawan baru</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block font-medium">
              Nama lengkap
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </label>
            <label className="block font-medium">
              Username
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoCapitalize="none"
                className={input}
              />
            </label>
            <label className="block font-medium">
              Password (min. 8 karakter)
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                className={input}
              />
            </label>
            <label className="block font-medium">
              Tipe
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EmployeeType })}
                className={input}
              >
                <option value="karyawan">Karyawan</option>
                <option value="magang">Magang</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="font-medium">Area</legend>
            <div className="mt-1 flex gap-4">
              {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
                <label key={a} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.areas.includes(a)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        areas: e.target.checked ? [...form.areas, a] : form.areas.filter((x) => x !== a),
                      })
                    }
                  />
                  {AREA_LABEL[a]}
                </label>
              ))}
            </div>
          </fieldset>
          {formError && <p className="text-red-700">{formError}</p>}
          <p className="text-xs text-slate-500">Akun yang ditambahkan admin langsung aktif tanpa perlu persetujuan.</p>
          <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900">
            Simpan karyawan
          </button>
        </form>
      )}

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
