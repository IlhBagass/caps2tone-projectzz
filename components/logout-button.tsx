"use client";

import { useState } from "react";
import { api, setCsrfToken } from "@/lib/api-client";

// Keluar sungguhan: mencabut sesi di backend, lalu memuat ulang halaman masuk
// supaya semua state di memori browser ikut hilang.
export function LogoutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Sesi mungkin sudah habis; tetap kembali ke halaman masuk.
    }
    setCsrfToken(null);
    // Navigasi penuh (bukan router) agar semua state di memori browser ikut hilang.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- navigasi penuh disengaja: membersihkan state memori
    window.location.href = "/login";
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {children ?? (busy ? "Keluar…" : "Keluar")}
    </button>
  );
}
