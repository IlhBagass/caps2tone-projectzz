"use client";

import Link from "next/link";
import { use } from "react";
import { ChassisWorkspace } from "@/components/chassis-workspace";
import { OfficesStatus, useOffice } from "@/components/technician-provider";

export function ChassisScreen({ params }: { params: Promise<{ officeId: string; chassisId: string }> }) {
  const { officeId, chassisId } = use(params);
  const { office, assets, error } = useOffice();
  const chassis = assets?.find((a) => a.id === Number(chassisId) && a.kind === "chassis") ?? null;

  const back = (
    <Link href={`/teknisi/kantor/${officeId}`} className="text-sm text-sky-700 hover:underline">
      ← Kembali ke chassis {office?.name ?? ""}
    </Link>
  );

  if (!office) {
    return (
      <div className="space-y-3">
        {back}
        <OfficesStatus />
      </div>
    );
  }
  if (assets === null) {
    return (
      <div className="space-y-3">
        {back}
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            Data chassis tidak dapat dimuat. {error}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Memuat data chassis…</p>
        )}
      </div>
    );
  }
  if (!chassis) {
    return (
      <div className="space-y-3">
        {back}
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          Chassis tidak ditemukan di kantor ini.
        </p>
      </div>
    );
  }
  return <ChassisWorkspace chassisId={chassis.id} />;
}
