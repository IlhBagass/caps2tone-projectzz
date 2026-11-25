import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LoadError } from "@/components/admin/load-error";
import { Badge } from "@/components/badge";
import { errorMessage } from "@/lib/api";
import { serverGet } from "@/lib/api-server";
import { requireAdmin } from "@/lib/session";
import type { MatchResultType } from "@/lib/types";

const PAGE_SIZE = 50;

const label: Record<MatchResultType, string> = {
  found: "Ditemukan",
  not_found: "Not Found",
  multiple: "Lebih dari satu EQ",
};
const tone: Record<MatchResultType, "green" | "red" | "amber"> = {
  found: "green",
  not_found: "red",
  multiple: "amber",
};

interface ReportRow {
  id: number;
  scannedAt: string;
  officeName: string;
  scannedSn: string;
  eq: string | null;
  result: MatchResultType;
  labelAttached: boolean;
  technicianName: string;
}

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function AdminReportPage({ searchParams }: PageProps<"/admin/laporan">) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
          Laporan hasil mapping
        </h1>
        {/* Diunduh langsung dari backend lewat rewrite /api; sesi ikut sebagai cookie. */}
        <a
          href="/api/reports/mapping/export"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Ekspor Excel
        </a>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-600">Memuat laporan…</p>}>
        <Report searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Report({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(one(params.halaman))) || 1);

  let report;
  try {
    report = await serverGet<ReportRow[]>(`/api/reports/mapping?limit=${PAGE_SIZE}&page=${page}`);
  } catch (err) {
    return <LoadError message={errorMessage(err)} />;
  }
  const rows = report.data;
  const total = report.meta?.total ?? rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Waktu</th>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">Serial</th>
              <th className="px-4 py-2 font-medium">EQ</th>
              <th className="px-4 py-2 font-medium">Hasil</th>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Teknisi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-600">
                  Belum ada hasil mapping.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  {new Date(r.scannedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                </td>
                <td className="px-4 py-2">{r.officeName}</td>
                <td className="px-4 py-2 font-mono">{r.scannedSn}</td>
                <td className="px-4 py-2">{r.eq ?? "-"}</td>
                <td className="px-4 py-2">
                  <Badge tone={tone[r.result]}>{label[r.result]}</Badge>
                </td>
                <td className="px-4 py-2">{r.labelAttached ? "Terpasang" : "Belum"}</td>
                <td className="px-4 py-2">{r.technicianName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          {total === 0 ? "0 hasil" : `Menampilkan ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} dari ${total} hasil`}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={`/admin/laporan?halaman=${page - 1}`} className="rounded-md border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
              Sebelumnya
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-2 text-slate-400">Sebelumnya</span>
          )}
          <span>
            Halaman {page} dari {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/admin/laporan?halaman=${page + 1}`} className="rounded-md border border-slate-300 bg-white px-3 py-2 hover:bg-slate-50">
              Berikutnya
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-2 text-slate-400">Berikutnya</span>
          )}
        </div>
      </div>
    </>
  );
}
