import { InventoryTable } from "@/components/inventory-table";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <span className="h-6 w-1 rounded-full bg-slate-700" aria-hidden />
        Inventaris
      </h1>
      <InventoryTable />
    </div>
  );
}
