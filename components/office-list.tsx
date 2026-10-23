"use client";

import Link from "next/link";
import { Badge } from "@/components/badge";
import { useMapping } from "@/components/mapping-provider";
import { StatusSummary } from "@/components/status-summary";
import { offices } from "@/lib/mock-data";

export function OfficeList({
  scheduledOfficeIds,
}: {
  scheduledOfficeIds: number[];
}) {
  const { assets } = useMapping();

  function stats(officeId: number) {
    const modules = assets.filter(
      (a) => a.officeId === officeId && a.kind === "module",
    );
    const chassisCount = assets.filter(
      (a) => a.officeId === officeId && a.kind === "chassis",
    ).length;
    return { modules, chassisCount };
  }

  const today = offices.filter((o) => scheduledOfficeIds.includes(o.id));
  const others = offices.filter((o) => !scheduledOfficeIds.includes(o.id));

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
            {today.map((office) => {
              const { modules, chassisCount } = stats(office.id);
              return (
                <li key={office.id}>
                  <Link
                    href={`/teknisi/kantor/${office.id}`}
                    className="block space-y-2 rounded-xl border-2 border-sky-500 bg-sky-50 p-4 shadow-sm active:bg-sky-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{office.name}</p>
                        <p className="text-sm text-slate-600">
                          {chassisCount} chassis · {modules.length} modul
                        </p>
                      </div>
                      <Badge tone="blue">Hari ini</Badge>
                    </div>
                    <StatusSummary items={modules} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600">
            {today.length > 0 ? "Kantor lain" : "Semua kantor"}
          </h3>
          <ul
            className="max-h-[22rem] space-y-2 overflow-y-auto pr-1"
            tabIndex={0}
            aria-label="Daftar kantor lain"
          >
            {others.map((office) => {
              const { modules, chassisCount } = stats(office.id);
              return (
                <li key={office.id}>
                  <details className="group rounded-xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                      <span className="font-medium">{office.name}</span>
                      <span className="text-sm text-sky-700 group-open:hidden">
                        Lihat detail
                      </span>
                      <span className="hidden text-sm text-slate-500 group-open:inline">
                        Tutup
                      </span>
                    </summary>
                    <div className="space-y-2 border-t border-slate-100 p-3">
                      <p className="text-sm text-slate-600">
                        {office.address}
                      </p>
                      <p className="text-sm text-slate-600">
                        {chassisCount} chassis · {modules.length} modul
                      </p>
                      <StatusSummary items={modules} />
                      <Link
                        href={`/teknisi/kantor/${office.id}`}
                        className="block rounded-md border border-sky-600 py-2 text-center text-sm font-medium text-sky-700 hover:bg-sky-50"
                      >
                        Buka daftar chassis
                      </Link>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
