"use client";

import Link from "next/link";
import { Badge } from "@/components/badge";
import { StatusSummary } from "@/components/status-summary";
import { OfficesStatus, useTechnicianOffices } from "@/components/technician-provider";
import type { TechnicianOffice } from "@/lib/technician";

const moduleCounts = (o: TechnicianOffice) => ({
  sudah: o.moduleSudah,
  belum: o.moduleBelum,
  tidak_ditemukan: o.moduleTidakDitemukan,
});

export function OfficeList() {
  const { offices } = useTechnicianOffices();
  if (offices === null) return <OfficesStatus />;

  // Kantor dengan jadwal aktif hari ini lebih dulu; sisanya hanya bisa dilihat.
  const today = offices.filter((o) => o.canScan);
  const others = offices.filter((o) => !o.canScan);

  if (offices.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Belum ada kantor yang ditugaskan kepadamu. Hubungi admin untuk dijadwalkan.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {today.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-sky-800">Jadwal hari ini</h3>
          <ul
            className="max-h-[22rem] space-y-3 overflow-y-auto pr-1"
            tabIndex={0}
            aria-label="Daftar kantor jadwal hari ini"
          >
            {today.map((office) => (
              <li key={office.id}>
                <Link
                  href={`/teknisi/kantor/${office.id}`}
                  className="block space-y-2 rounded-xl border-2 border-sky-500 bg-sky-50 p-4 shadow-sm active:bg-sky-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{office.name}</p>
                      <p className="text-sm text-slate-600">
                        {office.chassis} chassis · {office.modules} modul
                      </p>
                    </div>
                    <Badge tone="blue">Hari ini</Badge>
                  </div>
                  <StatusSummary counts={moduleCounts(office)} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600">{today.length > 0 ? "Kantor lain" : "Semua kantor"}</h3>
          <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1" tabIndex={0} aria-label="Daftar kantor lain">
            {others.map((office) => (
              <li key={office.id}>
                <details className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                    <span className="font-medium">{office.name}</span>
                    <span className="text-sm text-sky-700 group-open:hidden">Lihat detail</span>
                    <span className="hidden text-sm text-slate-500 group-open:inline">Tutup</span>
                  </summary>
                  <div className="space-y-2 border-t border-slate-100 p-3">
                    <p className="text-sm text-slate-600">{office.address}</p>
                    <p className="text-sm text-slate-600">
                      {office.chassis} chassis · {office.modules} modul
                    </p>
                    <p className="text-xs text-slate-500">
                      Jadwal terakhir {office.scheduledDate}: hanya dapat dilihat, scan hanya pada jadwal aktif hari ini.
                    </p>
                    <StatusSummary counts={moduleCounts(office)} />
                    <Link
                      href={`/teknisi/kantor/${office.id}`}
                      className="block rounded-md border border-sky-600 py-2 text-center text-sm font-medium text-sky-700 hover:bg-sky-50"
                    >
                      Buka daftar chassis
                    </Link>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
