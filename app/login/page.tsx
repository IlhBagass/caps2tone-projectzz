"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Login sementara: belum ada autentikasi. Username "admin" masuk ke /admin,
// selain itu masuk ke /teknisi. Ganti dengan auth asli saat backend siap.
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setError(null);
    router.push(username.trim().toLowerCase() === "admin" ? "/admin" : "/teknisi");
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
          className="w-full rounded-md bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-700"
        >
          Masuk
        </button>

        <p className="text-xs text-slate-500">
          Mode pengembangan: ketik <b>admin</b> untuk halaman admin, nama lain
          untuk halaman teknisi. Password bebas.
        </p>
      </form>
    </main>
  );
}
