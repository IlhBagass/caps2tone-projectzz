import { assets, offices } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  const modules = assets;
  const count = (items: typeof modules, status: string) =>
    items.filter((a) => a.mappingStatus === status).length;

  const rows = offices.map((office) => {
    const items = modules.filter((a) => a.officeId === office.id);
    const done = count(items, "sudah");
    const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
    return { office, total: items.length, done, percent };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard progres mapping</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total aset" value={modules.length} />
        <Stat label="Sudah termapping" value={count(modules, "sudah")} tone="text-emerald-700" />
        <Stat label="Belum termapping" value={count(modules, "belum")} />
        <Stat label="Tidak ditemukan" value={count(modules, "tidak_ditemukan")} tone="text-red-700" />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Progres per kantor</h2>
        <ul className="space-y-3">
          {rows.map(({ office, total, done, percent }) => (
            <li
              key={office.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex justify-between text-sm">
                <span className="font-medium">{office.name}</span>
                <span className="text-slate-600">
                  {done}/{total} aset ({percent}%)
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progres ${office.name}`}
              >
                <div
                  className="h-full bg-sky-600"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-slate-900",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
