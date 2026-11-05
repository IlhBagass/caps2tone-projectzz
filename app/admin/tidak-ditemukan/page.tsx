import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getNotFoundScans } from "@/lib/admin-dashboard";
import { offices } from "@/lib/mock-data";
import { requireAdmin } from "@/lib/session";

const field = "mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function NotFoundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
          SN tidak ditemukan
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Daftar scan yang SN-nya tidak cocok ke EQ mana pun di database.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-600">Memuat data…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const officeId = Number(one(params.kantor)) || undefined;
  const from = one(params.dari);
  const to = one(params.sampai);
  const { rows, filter } = getNotFoundScans({ officeId, from, to });
  const filtered = Boolean(filter.officeId || filter.from || filter.to);

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-xs font-medium text-slate-600">
          Kantor
          <select name="kantor" defaultValue={filter.officeId ?? ""} className={`${field} block`}>
            <option value="">Semua kantor</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Dari tanggal
          <input type="date" name="dari" defaultValue={filter.from ?? ""} className={`${field} block`} />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Sampai tanggal
          <input type="date" name="sampai" defaultValue={filter.to ?? ""} className={`${field} block`} />
        </label>
        <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
          Terapkan
        </button>
        {filtered && (
          <Link href="/admin/tidak-ditemukan" className="py-2 text-sm text-slate-700 underline-offset-2 hover:underline">
            Reset
          </Link>
        )}
      </form>

      <p className="text-sm text-slate-600" role="status">
        {rows.length} scan tidak ditemukan{filtered ? " (sesuai filter)" : ""}.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">SN di-scan</th>
              <th className="px-4 py-2 font-medium">EQ</th>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">Teknisi</th>
              <th className="px-4 py-2 font-medium">Waktu scan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada scan tidak ditemukan.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono">{r.scannedSn}</td>
                <td className="px-4 py-2">{r.eq ?? "-"}</td>
                <td className="px-4 py-2">{r.officeName}</td>
                <td className="px-4 py-2">{r.scannedBy}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(r.scannedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Daftar ini berasal dari hasil scan. Angka &ldquo;Tidak ditemukan&rdquo; di dashboard
        menghitung aset yang ditandai teknisi tidak ada di lokasi, jadi angkanya bisa
        berbeda. EQ kosong berarti SN tidak cocok ke aset mana pun.
      </p>
    </>
  );
}
