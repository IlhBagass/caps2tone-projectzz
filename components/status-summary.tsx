import { Badge } from "@/components/badge";
import { mappingLabel, mappingTone } from "@/lib/status";
import type { Asset, MappingStatus } from "@/lib/types";

const order: MappingStatus[] = ["sudah", "belum", "tidak_ditemukan"];

// Ringkasan jumlah per status, dari daftar aset atau dari jumlah yang sudah dihitung backend.
export function StatusSummary({
  items,
  counts,
}: {
  items?: Asset[];
  counts?: Record<MappingStatus, number>;
}) {
  const count = (s: MappingStatus) =>
    counts ? counts[s] : (items ?? []).filter((a) => a.mappingStatus === s).length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((s) => (
        <Badge key={s} tone={mappingTone[s]}>
          {count(s)} {mappingLabel[s].toLowerCase()}
        </Badge>
      ))}
    </div>
  );
}
