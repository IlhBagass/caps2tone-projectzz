import { Badge } from "@/components/badge";
import { mappingLabel, mappingTone } from "@/lib/status";
import type { Asset, MappingStatus } from "@/lib/types";

const order: MappingStatus[] = ["sudah", "belum", "tidak_ditemukan"];

export function StatusSummary({ items }: { items: Asset[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {order.map((s) => (
        <Badge key={s} tone={mappingTone[s]}>
          {items.filter((a) => a.mappingStatus === s).length}{" "}
          {mappingLabel[s].toLowerCase()}
        </Badge>
      ))}
    </div>
  );
}
