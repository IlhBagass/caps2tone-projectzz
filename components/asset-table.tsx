"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/badge";
import { assets, getOffice, history } from "@/lib/mock-data";

export function AssetTable() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = assets.filter(
    (a) =>
      !q ||
      a.eq.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      a.assetCode.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari EQ, serial number, atau kode aset"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 sm:max-w-sm"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">EQ</th>
              <th className="px-4 py-2 font-medium">Jenis</th>
              <th className="px-4 py-2 font-medium">Serial</th>
              <th className="px-4 py-2 font-medium">Kantor</th>
              <th className="px-4 py-2 font-medium">REF</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Kondisi</th>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Kode label</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada aset yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const rows = history.filter((h) => h.assetId === a.id);
              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{a.eq}</td>
                    <td className="px-4 py-2">{a.kind === "chassis" ? "Chassis" : "Modul"}</td>
                    <td className="px-4 py-2 font-mono">{a.serialNumber}</td>
                    <td className="px-4 py-2">{getOffice(a.officeId)?.name}</td>
                    <td className="px-4 py-2">{a.ref}</td>
                    <td className="px-4 py-2">{a.status}</td>
                    <td className="px-4 py-2">{a.kondisi}</td>
                    <td className="px-4 py-2">
                      <Badge tone={a.labelStatus === "terpasang" ? "green" : "gray"}>
                        {a.labelStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono">{a.labelCode ?? "-"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === a.id ? null : a.id)}
                        className="text-sky-700 hover:underline"
                      >
                        Riwayat
                      </button>
                    </td>
                  </tr>
                  {openId === a.id && (
                    <tr key={`${a.id}-history`} className="bg-slate-50">
                      <td colSpan={10} className="px-4 py-3">
                        {rows.length === 0 ? (
                          <p className="text-slate-600">
                            Belum ada riwayat perubahan.
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {rows.map((h) => (
                              <li key={h.id}>
                                <b>{h.field.toUpperCase()}</b>: {h.oldValue} →{" "}
                                {h.newValue}{" "}
                                <span className="text-slate-500">
                                  oleh {h.changedBy},{" "}
                                  {new Date(h.changedAt).toLocaleString("id-ID")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
