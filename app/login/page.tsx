"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { api, setCsrfToken } from "@/lib/api-client";
import type { Role } from "@/lib/types";

// Login ke backend (cookie sesi httpOnly + token CSRF). Admin masuk ke /admin, teknisi ke /teknisi.
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Pesan error (salah password, akun menunggu persetujuan, ditolak) datang dari backend.
      const data = await api.post<{ user: { role: Role }; csrfToken: string }>("/api/auth/login", {
        username: username.trim(),
        password,
      });
      setCsrfToken(data.csrfToken);
      router.replace(data.user.role === "admin" ? "/admin" : "/teknisi");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold">Masuk</h1>
          <p className="text-sm text-slate-600">
            Sistem Mapping Aset Infrastruktur Jaringan
          </p>
        </div>

        <label className="block text-sm font-medium">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {busy ? "Masuk…" : "Masuk"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Belum punya akun?{" "}
          <Link href="/daftar" className="text-sky-700 hover:underline">
            Daftar
          </Link>
        </p>

      </form>
    </main>
  );
}
