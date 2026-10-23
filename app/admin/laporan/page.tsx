import { Badge } from "@/components/badge";
import { assets, getOffice, results, schedules } from "@/lib/mock-data";
import type { MatchResultType } from "@/lib/types";

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

export default function AdminReportPage() {
  const rows = [...results].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Laporan hasil mapping</h1>

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
            {rows.map((r) => {
              const schedule = schedules.find((s) => s.id === r.scheduleId);
              const asset = assets.find((a) => a.id === r.assetId);
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {new Date(r.scannedAt).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-2">
                    {schedule ? getOffice(schedule.officeId)?.name : "-"}
                  </td>
                  <td className="px-4 py-2 font-mono">{r.scannedSn}</td>
                  <td className="px-4 py-2">{asset?.eq ?? "-"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={tone[r.result]}>{label[r.result]}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {r.labelAttached ? "Terpasang" : "Belum"}
                  </td>
                  <td className="px-4 py-2">{r.scannedBy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
