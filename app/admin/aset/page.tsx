import { AssetTable } from "@/components/asset-table";

export default function AdminAssetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
        Data aset
      </h1>
      <AssetTable />
    </div>
  );
}
