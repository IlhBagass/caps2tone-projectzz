"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import { formatDay } from "@/lib/date";
import type { OfficeProgress } from "@/lib/admin-dashboard";

type SortKey = "nama" | "progres-rendah" | "progres-tinggi" | "jadwal";

const sorters: Record<SortKey, (a: OfficeProgress, b: OfficeProgress) => number> = {
  nama: (a, b) => a.name.localeCompare(b.name, "id"),
  "progres-rendah": (a, b) => a.percent - b.percent || a.name.localeCompare(b.name, "id"),
  "progres-tinggi": (a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "id"),
  // Jadwal terdekat dulu; kantor tanpa jadwal ada di paling bawah.
  jadwal: (a, b) =>
    (a.nextDate ?? "9999-12-31").localeCompare(b.nextDate ?? "9999-12-31") ||
    a.name.localeCompare(b.name, "id"),
};

function formatActivity(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Belum ada";
}

function ProgressBar({ r, className }: { r: OfficeProgress; className: string }) {
  return (
    <div
      className={`overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="progressbar"
      aria-valuenow={r.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progres ${r.name}`}
    >
      <div className="h-full bg-emerald-500" style={{ width: `${r.percent}%` }} />
    </div>
  );
}

export function StateBadge({ state }: { state: OfficeProgress["state"] }) {
  switch (state.kind) {
    case "berjalan":
      return <Badge tone="info">Sedang berjalan</Badge>;
    case "terjadwal":
      return <Badge tone="amber">Terjadwal {formatDay(state.date)}</Badge>;
    case "selesai":
      return <Badge tone="green">Selesai</Badge>;
    default:
      return <Badge tone="gray">Belum dijadwalkan</Badge>;
  }
}

export function OfficeProgressTable({ rows }: { rows: OfficeProgress[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("nama");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q)).sort(sorters[sort]);
  }, [rows, query, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama kantor"
          aria-label="Cari nama kantor"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 sm:ml-auto">
          Urutkan
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="nama">Nama (A-Z)</option>
            <option value="progres-rendah">Progres terendah</option>
            <option value="progres-tinggi">Progres tertinggi</option>
            <option value="jadwal">Jadwal terdekat</option>
          </select>
        </label>
      </div>

      {/* Layar kecil: kartu per kantor */}
      <ul className="space-y-2 md:hidden">
        {shown.length === 0 && (
          <li className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
            Tidak ada kantor yang cocok.
          </li>
        )}
        {shown.map((r) => (
          <li key={r.officeId}>
            <Link
              href={`/admin/kantor/${r.officeId}`}
              className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{r.name}</span>
                <StateBadge state={r.state} />
              </div>
              <div className="flex items-center gap-2">
                <ProgressBar r={r} className="h-2 flex-1" />
                <span className="text-sm font-medium tabular-nums">{r.percent}%</span>
              </div>
              <p className="flex flex-wrap gap-x-3 text-xs text-slate-600">
                <span className="tabular-nums">{r.done}/{r.total} aset</span>
                <span className={r.notFound > 0 ? "font-medium text-red-700" : ""}>
                  {r.notFound} tidak ditemukan
                </span>
              </p>
              <p className="text-xs text-slate-500">
                Jadwal: {r.nextDate ? formatDay(r.nextDate) : "-"} · Aktivitas:{" "}
                {formatActivity(r.lastActivity)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">Progres</th>
              <th className="px-4 py-2 font-medium" title="Aset berstatus sudah termapping">
                Ditemukan
              </th>
              <th className="px-4 py-2 font-medium" title="Aset yang ditandai tidak ada di lokasi">
                Tidak ditemukan
              </th>
              <th className="px-4 py-2 font-medium">Jadwal berikutnya</th>
              <th className="px-4 py-2 font-medium">Aktivitas terakhir</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada kantor yang cocok.
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr
                key={r.officeId}
                onClick={() => router.push(`/admin/kantor/${r.officeId}`)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/kantor/${r.officeId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:text-slate-900 hover:underline"
                  >
                    {r.name}
                  </Link>
                  <div className="mt-1">
                    <StateBadge state={r.state} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar r={r} className="h-2 w-28" />
                    <span className="tabular-nums font-medium">{r.percent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {r.done}/{r.total} aset
                  </p>
                </td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{r.done}</td>
                <td className={`px-4 py-3 tabular-nums ${r.notFound > 0 ? "font-medium text-red-700" : "text-slate-500"}`}>
                  {r.notFound}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.nextDate ? formatDay(r.nextDate) : "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatActivity(r.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Ditemukan dan Tidak ditemukan menghitung status aset per kantor, sama dengan
        kartu ringkasan di atas. Klik baris untuk melihat daftar asetnya.
      </p>
    </div>
  );
}
