"use client";

import { useMapping } from "@/components/mapping-provider";

export function TechnicianHero({ name }: { name: string }) {
  const { assets } = useMapping();
  const done = assets.filter((a) => a.mappingStatus === "sudah").length;
  const left = assets.filter((a) => a.mappingStatus === "belum").length;
  const percent =
    assets.length === 0 ? 0 : Math.round((done / assets.length) * 100);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <section className="tif-hero relative overflow-hidden rounded-2xl p-5 text-white shadow-md">
      <div className="tif-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold ring-2 ring-white/40">
          {initials}
        </span>
        <div>
          <p className="text-xs text-white/80">Selamat bertugas,</p>
          <h1 className="text-lg font-semibold leading-tight">{name}</h1>
          <p className="text-xs text-white/80">Teknisi Lapangan</p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex items-end justify-between">
          <p className="text-4xl font-bold tabular-nums leading-none">
            {percent}
            <span className="text-xl font-semibold">%</span>
          </p>
          <p className="text-right text-xs text-white/85">
            {done} dari {assets.length} aset termapping
            <br />
            {left} menunggu validasi
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-black/25"
          role="img"
          aria-label={`Progres mapping ${percent} persen`}
        >
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
