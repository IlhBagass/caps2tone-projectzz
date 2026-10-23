"use client";

import Link from "next/link";
import { useMapping } from "@/components/mapping-provider";
import { offices } from "@/lib/mock-data";
import { mappingLabel } from "@/lib/status";
import type { Asset, MappingStatus } from "@/lib/types";

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

function count(items: Asset[], status: MappingStatus) {
  return items.filter((a) => a.mappingStatus === status).length;
}

function StackedBar({ items, label }: { items: Asset[]; label: string }) {
  const total = items.length;
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-slate-200"
      role="img"
      aria-label={`${label}: ${order
        .map((s) => `${count(items, s)} ${mappingLabel[s].toLowerCase()}`)
        .join(", ")}`}
    >
      {total > 0 &&
        order.map((s) => (
          <div
            key={s}
            className={barColor[s]}
            style={{ width: `${(count(items, s) / total) * 100}%` }}
          />
        ))}
    </div>
  );
}

export function ProgressDashboard() {
  const { assets } = useMapping();
  // Progres dihitung dari seluruh data aset (chassis dan modul).
  const done = count(assets, "sudah");
  const percent = assets.length === 0 ? 0 : Math.round((done / assets.length) * 100);

  // Kantor dengan aset belum termapping terbanyak ada di paling atas.
  const rows = offices
    .map((office) => {
      const items = assets.filter((a) => a.officeId === office.id);
      return { office, items, remaining: count(items, "belum") };
    })
    .sort(
      (a, b) =>
        b.remaining - a.remaining || a.office.name.localeCompare(b.office.name),
    );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Progres mapping</h2>
          <span className="text-sm text-slate-600">
            {done}/{assets.length} aset ({percent}%)
          </span>
        </div>
        <div className="mt-2">
          <StackedBar items={assets} label="Semua kantor" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {order.map((s) => (
          <div key={s} className="rounded-lg bg-slate-50 p-2">
            <p className={`text-xl font-semibold ${textColor[s]}`}>
              {count(assets, s)}
            </p>
            <p className="text-xs text-slate-600">{mappingLabel[s]}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700">
          Kantor dengan aset belum termapping terbanyak
        </h3>
        <ul
          className="max-h-56 space-y-3 overflow-y-auto pr-1"
          tabIndex={0}
          aria-label="Progres mapping per kantor"
        >
          {rows.map(({ office, items, remaining }, i) => (
            <li key={office.id}>
              <Link
                href={`/teknisi/kantor/${office.id}`}
                className="block space-y-1"
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {i + 1}. {office.name}
                  </span>
                  <span className="shrink-0 text-slate-600">
                    {count(items, "sudah")}/{items.length}
                    {remaining > 0 ? ` · ${remaining} belum` : " · selesai"}
                  </span>
                </div>
                <StackedBar items={items} label={office.name} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
