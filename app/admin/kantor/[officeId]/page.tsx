import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { Badge } from "@/components/badge";
import { LoadError } from "@/components/admin/load-error";
import { StateBadge } from "@/components/admin/office-progress-table";
import { getOfficeDetail } from "@/lib/admin-dashboard";
import { errorMessage } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { mappingLabel, mappingTone } from "@/lib/status";

export default function AdminOfficePage({
  params,
}: PageProps<"/admin/kantor/[officeId]">) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Memuat data kantor…</p>}>
      <OfficeDetail params={params} />
    </Suspense>
  );
}

async function OfficeDetail({
  params,
}: {
  params: PageProps<"/admin/kantor/[officeId]">["params"];
}) {
  await connection();
  await requireAdmin();

  const { officeId } = await params;
  const id = Number(officeId);
  let detail;
  try {
    detail = Number.isInteger(id) && id > 0 ? await getOfficeDetail(id) : null;
  } catch (err) {
    return <LoadError message={errorMessage(err)} />;
  }
  if (!detail) notFound();
  const { office, progress, assets } = detail;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-slate-700 underline-offset-2 hover:underline">
        ← Kembali ke dashboard
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
          {office.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{office.address}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-semibold tabular-nums">{progress.percent}%</p>
            <p className="text-sm text-slate-600">
              {progress.done}/{progress.total} aset sudah termapping
              {progress.notFound > 0 && ` · ${progress.notFound} tidak ditemukan`}
            </p>
          </div>
          <StateBadge state={progress.state} />
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres ${office.name}`}
        >
          <div className="h-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">EQ</th>
              <th className="px-4 py-2 font-medium">Jenis</th>
              <th className="px-4 py-2 font-medium">Serial</th>
              <th className="px-4 py-2 font-medium">REF</th>
              <th className="px-4 py-2 font-medium">Status aset</th>
              <th className="px-4 py-2 font-medium">Status mapping</th>
              <th className="px-4 py-2 font-medium">Label</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-600">
                  Belum ada aset di kantor ini.
                </td>
              </tr>
            )}
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{a.eq}</td>
                <td className="px-4 py-2">{a.kind === "chassis" ? "Chassis" : "Modul"}</td>
                <td className="px-4 py-2 font-mono">{a.serialNumber}</td>
                <td className="px-4 py-2">{a.ref}</td>
                <td className="px-4 py-2">{a.status}</td>
                <td className="px-4 py-2">
                  <Badge tone={mappingTone[a.mappingStatus]}>{mappingLabel[a.mappingStatus]}</Badge>
                </td>
                <td className="px-4 py-2">
                  <Badge tone={a.labelStatus === "terpasang" ? "green" : "gray"}>
                    {a.labelStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
