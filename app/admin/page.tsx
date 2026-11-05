import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/badge";
import { OfficeProgressTable } from "@/components/admin/office-progress-table";
import {
  getAssetSummary,
  getOfficeProgress,
  getTodayResults,
  getTodaySchedules,
} from "@/lib/admin-dashboard";
import { requireAdmin } from "@/lib/session";
import type { ScheduleStatus } from "@/lib/types";

const scheduleLabel: Record<ScheduleStatus, string> = {
  terjadwal: "Terjadwal",
  berjalan: "Sedang berjalan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};
const scheduleTone: Record<ScheduleStatus, "gray" | "info" | "green" | "red"> = {
  terjadwal: "gray",
  berjalan: "info",
  selesai: "green",
  dibatalkan: "red",
};

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat dashboard…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  // "Hari ini" bergantung waktu sekarang, jadi dirender per permintaan.
  await connection();
  await requireAdmin();

  const summary = getAssetSummary();
  const todaySchedules = getTodaySchedules();
  const todayResults = getTodayResults();

  const officeRows = getOfficeProgress();

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
        Dashboard progres mapping
      </h1>

      <section
        aria-label="Progres keseluruhan"
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm text-slate-600">Progres keseluruhan</p>
            <p className="text-4xl font-semibold tabular-nums">{summary.percent}%</p>
          </div>
          <p className="text-sm text-slate-600">
            {summary.sudah} dari {summary.total} aset sudah termapping
          </p>
        </div>
        <div
          className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={summary.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres mapping keseluruhan"
        >
          <div className="h-full bg-emerald-500" style={{ width: `${summary.percent}%` }} />
        </div>
      </section>

      <section aria-label="Ringkasan aset" className="space-y-2">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Total aset"
            value={summary.total}
            hint="Semua chassis dan modul."
          />
          <Stat
            label="Sudah termapping"
            value={summary.sudah}
            tone="text-emerald-700"
            hint="Sudah dipindai dan dicocokkan. Dihitung sebagai progres."
          />
          <Stat
            label="Belum termapping"
            value={summary.belum}
            hint="Belum dipindai teknisi."
          />
          <Stat
            label="Tidak ditemukan"
            value={summary.tidakDitemukan}
            tone="text-red-700"
            hint="Ada di database, tapi tidak ditemukan di lokasi. Belum dihitung sebagai progres."
            href="/admin/tidak-ditemukan"
          />
        </div>
        <p className="text-xs text-slate-500">
          Total = Sudah termapping + Belum termapping + Tidak ditemukan. Setiap aset
          hanya punya satu status.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Jadwal hari ini</h2>
          {todaySchedules.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Tidak ada jadwal mapping hari ini.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {todaySchedules.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{s.officeName}</p>
                    <p className="text-xs text-slate-600">
                      {s.assignedTo ?? "Belum ditugaskan"}
                    </p>
                  </div>
                  <Badge tone={scheduleTone[s.status]}>{scheduleLabel[s.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Hasil mapping hari ini</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Aset ditemukan" value={todayResults.found} tone="text-emerald-700" />
            <Metric label="Tidak ditemukan" value={todayResults.notFound} tone="text-red-700" />
            <Metric label="Perubahan REF" value={todayResults.refChanges} />
            <Metric label="Perubahan STATUS" value={todayResults.statusChanges} />
          </dl>
          {todayResults.multiple > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              {todayResults.multiple} scan cocok ke lebih dari satu EQ dan perlu diperiksa.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Dihitung berdasarkan hari ini (WIB). &ldquo;Tidak ditemukan&rdquo; di sini
            adalah SN hasil scan yang tidak cocok ke EQ mana pun.
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Progres per kantor</h2>
        <OfficeProgressTable rows={officeRows} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
  tone = "text-slate-900",
}: {
  label: string;
  value: number;
  hint: string;
  href?: string;
  tone?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      {href && <p className="mt-2 text-xs font-medium text-sky-700">Lihat daftar SN →</p>}
    </>
  );
  const box = "block rounded-xl border border-slate-200 bg-white p-4";
  return href ? (
    <Link href={href} title={hint} className={`${box} hover:border-slate-500`}>
      {body}
    </Link>
  ) : (
    <div title={hint} className={box}>
      {body}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "text-slate-900",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
