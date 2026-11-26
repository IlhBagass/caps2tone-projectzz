"use client";

import Link from "next/link";
import { ChassisList } from "@/components/chassis-list";
import { OfficesStatus, useOffice } from "@/components/technician-provider";

// Daftar chassis satu kantor. Hanya pada jadwal aktif hari ini teknisi dapat scan; selain itu hanya melihat.
export function OfficeScreen() {
  const { office, assets, canScan, error } = useOffice();

  const back = (
    <Link href="/teknisi" className="text-sm text-sky-700 hover:underline">
      ← Kembali ke daftar kantor
    </Link>
  );

  if (!office) {
    return (
      <div className="space-y-3">
        {back}
        <OfficesStatus />
        {/* OfficesStatus kosong bila daftar kantor sudah dimuat: berarti kantor ini bukan penugasannya. */}
        <NotAssigned />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        {back}
        <h1 className="mt-1 text-lg font-semibold">{office.name}</h1>
        <p className="text-sm text-slate-600">
          Pilih chassis, lalu scan chassis sebelum memindai modulnya.
        </p>
      </div>
      {!canScan && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Kantor ini tidak punya jadwal aktif hari ini (jadwal terakhir {office.scheduledDate}). Kamu hanya dapat melihat
          data; scan dan perubahan hanya bisa pada jadwal aktif hari ini.
        </p>
      )}
      {error && assets === null ? (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          Data chassis tidak dapat dimuat. {error}
        </p>
      ) : assets === null ? (
        <p className="text-sm text-slate-600">Memuat data chassis…</p>
      ) : (
        <ChassisList />
      )}
    </div>
  );
}

function NotAssigned() {
  const { office } = useOffice();
  return office ? null : (
    <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
      Kantor ini tidak ditemukan atau bukan penugasanmu.
    </p>
  );
}
