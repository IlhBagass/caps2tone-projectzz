"use client";

import { Fragment, useRef, useState } from "react";
import { Badge } from "@/components/badge";
import {
  applyImport,
  downloadTemplate,
  exportAssets,
  parseAssetFile,
  type ImportError,
  type ParseResult,
} from "@/lib/asset-excel";
import {
  assets as initialAssets,
  currentTechnician,
  getOffice,
  history as initialHistory,
  offices,
} from "@/lib/mock-data";

const btn =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";

export function AssetTable() {
  // Sementara di memori browser. Ganti dengan API saat database siap.
  const [assets, setAssets] = useState(initialAssets);
  const [history, setHistory] = useState(initialHistory);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<(ParseResult & { name: string }) | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; details?: ImportError[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch {
      setNotice({ tone: "error", text: "Terjadi kesalahan saat memproses file Excel." });
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setNotice(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setNotice({ tone: "error", text: "Format file harus .xlsx." });
      return;
    }
    void run(async () => {
      setPreview({ ...(await parseAssetFile(file, offices)), name: file.name });
    });
  }

  function confirmImport() {
    if (!preview) return;
    const res = applyImport(assets, preview.rows, currentTechnician, history.length + 1);
    setAssets(res.assets);
    setHistory((h) => [...h, ...res.newHistory]);
    setNotice({
      tone: "ok",
      text: `Impor selesai: ${res.added} aset baru, ${res.updated} diperbarui, ${preview.errors.length} baris dilewati.`,
      details: res.warnings,
    });
    setPreview(null);
  }

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
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari EQ, serial number, atau kode aset"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button type="button" className={btn} disabled={busy} onClick={() => void run(() => downloadTemplate(offices))}>
            Unduh template
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            Impor Excel
          </button>
          <button
            type="button"
            className={btn}
            disabled={busy || filtered.length === 0}
            onClick={() => void run(() => exportAssets(filtered, offices))}
          >
            Ekspor Excel{q ? " (hasil cari)" : ""}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-md border px-3 py-2 text-sm ${
            notice.tone === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p>{notice.text}</p>
          {notice.details && notice.details.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {notice.details.map((d, i) => (
                <li key={i}>Baris {d.line}: {d.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium">Pratinjau impor: {preview.name}</p>
          <p>
            {preview.rows.length} baris valid, {preview.errors.length} baris bermasalah.
            Aset dengan EQ yang sudah ada akan diperbarui.
          </p>
          {preview.errors.length > 0 && (
            <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-red-700">
              {preview.errors.map((e, i) => (
                <li key={i}>{e.line ? `Baris ${e.line}: ` : ""}{e.message}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={preview.rows.length === 0} onClick={confirmImport}>
              Impor {preview.rows.length} baris
            </button>
            <button type="button" className={btn} onClick={() => setPreview(null)}>
              Batal
            </button>
          </div>
        </div>
      )}

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
