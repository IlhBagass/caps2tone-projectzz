"use client";

import Link from "next/link";
import { OfficesStatus, useTechnicianOffices } from "@/components/technician-provider";
import { mappingLabel } from "@/lib/status";
import type { MappingStatus } from "@/lib/types";

const order: MappingStatus[] = ["sudah", "belum", "tidak_ditemukan"];

const barColor: Record<MappingStatus, string> = {
  sudah: "bg-emerald-500",
  belum: "bg-slate-300",
  tidak_ditemukan: "bg-red-500",
};

const textColor: Record<MappingStatus, string> = {
  sudah: "text-emerald-700",
  belum: "text-slate-700",
  tidak_ditemukan: "text-red-700",
};

type Counts = Record<MappingStatus, number> & { total: number };

function StackedBar({ counts, label }: { counts: Counts; label: string }) {
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-slate-200"
      role="img"
      aria-label={`${label}: ${order.map((s) => `${counts[s]} ${mappingLabel[s].toLowerCase()}`).join(", ")}`}
    >
      {counts.total > 0 &&
        order.map((s) => (
          <div key={s} className={barColor[s]} style={{ width: `${(counts[s] / counts.total) * 100}%` }} />
        ))}
    </div>
  );
}

export function ProgressDashboard() {
  const { offices } = useTechnicianOffices();
  if (offices === null) return <OfficesStatus />;

  // Progres dihitung dari seluruh aset (chassis dan modul) di kantor-kantor teknisi ini.
  const all: Counts = {
    sudah: offices.reduce((n, o) => n + o.sudah, 0),
    belum: offices.reduce((n, o) => n + o.belum, 0),
    tidak_ditemukan: offices.reduce((n, o) => n + o.tidakDitemukan, 0),
    total: offices.reduce((n, o) => n + o.total, 0),
  };
  const percent = all.total === 0 ? 0 : Math.round((all.sudah / all.total) * 100);

  // Kantor dengan aset belum termapping terbanyak ada di paling atas.
  const rows = offices
    .map((office) => ({
      office,
      counts: { sudah: office.sudah, belum: office.belum, tidak_ditemukan: office.tidakDitemukan, total: office.total } as Counts,
    }))
    .sort((a, b) => b.counts.belum - a.counts.belum || a.office.name.localeCompare(b.office.name, "id"));

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Progres mapping</h2>
          <span className="text-sm text-slate-600">
            {all.sudah}/{all.total} aset ({percent}%)
          </span>
        </div>
        <div className="mt-2">
          <StackedBar counts={all} label="Semua kantor" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {order.map((s) => (
          <div key={s} className="rounded-lg bg-slate-50 p-2">
            <p className={`text-xl font-semibold ${textColor[s]}`}>{all[s]}</p>
            <p className="text-xs text-slate-600">{mappingLabel[s]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">Kantor dengan aset belum termapping terbanyak</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada kantor yang ditugaskan kepadamu.</p>
        ) : (
          <ul className="max-h-56 space-y-3 overflow-y-auto pr-1" tabIndex={0} aria-label="Progres mapping per kantor">
            {rows.map(({ office, counts }, i) => (
              <li key={office.id}>
                <Link href={`/teknisi/kantor/${office.id}`} className="block space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {i + 1}. {office.name}
                    </span>
                    <span className="shrink-0 text-slate-600">
                      {counts.sudah}/{counts.total}
                      {counts.belum > 0 ? ` · ${counts.belum} belum` : " · selesai"}
                    </span>
                  </div>
                  <StackedBar counts={counts} label={office.name} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
