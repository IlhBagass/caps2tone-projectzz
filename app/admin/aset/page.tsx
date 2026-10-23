import { AssetTable } from "@/components/asset-table";

export default function AdminAssetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Data aset</h1>
      <AssetTable />
    </div>
  );
}
