"use client";

import Link from "next/link";
import { Badge } from "@/components/badge";
import { useMapping } from "@/components/mapping-provider";
import { StatusSummary } from "@/components/status-summary";
import { mappingLabel, mappingTone } from "@/lib/status";

export function ChassisList({ officeId }: { officeId: number }) {
  const { assets } = useMapping();
  const chassisList = assets.filter(
    (a) => a.officeId === officeId && a.kind === "chassis",
  );

  return (
    <ul className="space-y-3">
      {chassisList.map((c) => {
        const modules = assets.filter((a) => a.parentId === c.id);
        return (
          <li key={c.id}>
            <Link
              href={`/teknisi/kantor/${officeId}/chassis/${c.id}`}
              className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.eq}</p>
                  <p className="font-mono text-sm text-slate-600">
                    {c.serialNumber} · {c.ref}
                  </p>
                </div>
                <Badge tone={mappingTone[c.mappingStatus]}>
                  {mappingLabel[c.mappingStatus]}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">{modules.length} modul</p>
              <StatusSummary items={modules} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
