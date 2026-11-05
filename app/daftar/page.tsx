"use client";

import Link from "next/link";
import { useState } from "react";
import { registerEmployee } from "@/lib/employee-store";
import { AREA_LABEL, type Area, type EmployeeType } from "@/lib/types";

const field = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<EmployeeType>("karyawan");
  const [areas, setAreas] = useState<Area[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleArea(a: Area) {
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password) {
      setError("Nama, username, dan password wajib diisi.");
      return;
    }
    if (!/^[a-z0-9._-]{3,}$/i.test(username.trim())) {
      setError("Username minimal 3 karakter (huruf, angka, titik, strip, atau garis bawah).");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (areas.length === 0) {
      setError("Pilih minimal satu area.");
      return;
    }
    // TODO: kirim ke API; password harus di-hash di server, bukan disimpan di klien.
    const res = registerEmployee({ name, username, type, areas });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setError(null);
    setDone(true);
  }

  if (done) {
    return (
      <main className="theme-tif flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Pendaftaran terkirim</h1>
          <p className="text-sm text-slate-600">
            Akun kamu menunggu persetujuan admin. Kamu baru bisa masuk setelah
            disetujui.
          </p>
          <Link
            href="/login"
            className="block rounded-md bg-sky-600 py-2.5 text-center font-medium text-white hover:bg-sky-700"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-tif flex flex-1 items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold">Buat akun</h1>
          <p className="text-sm text-slate-600">Akun aktif setelah disetujui admin.</p>
        </div>

        <label className="block text-sm font-medium">
          Nama lengkap
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Tipe
          <select value={type} onChange={(e) => setType(e.target.value as EmployeeType)} className={field}>
            <option value="karyawan">Karyawan</option>
            <option value="magang">Magang</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Area</legend>
          <div className="mt-1 flex gap-4">
            {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={areas.includes(a)} onChange={() => toggleArea(a)} />
                {AREA_LABEL[a]}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" className="w-full rounded-md bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-700">
          Daftar
        </button>
        <p className="text-center text-sm text-slate-600">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-sky-700 hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </main>
  );
}
