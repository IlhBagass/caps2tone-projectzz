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
  appendHistory,
  setAssets,
  updateAsset,
  useAssetStore,
} from "@/lib/asset-store";
import { currentTechnician, getOffice, offices } from "@/lib/mock-data";
import { displayAssetValue, UNKNOWN_VALUE } from "@/lib/types";

const btn =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";

type SortKey =
  | "eq"
  | "kind"
  | "serialNumber"
  | "office"
  | "ref"
  | "status"
  | "kondisi"
  | "labelStatus"
  | "labelCode";

const columns: { key: SortKey; label: string }[] = [
  { key: "eq", label: "EQ" },
  { key: "kind", label: "Jenis" },
  { key: "serialNumber", label: "Serial" },
  { key: "office", label: "Kantor" },
  { key: "ref", label: "REF" },
  { key: "status", label: "Status" },
  { key: "kondisi", label: "Kondisi" },
  { key: "labelStatus", label: "Label" },
  { key: "labelCode", label: "Kode label" },
];

export function AssetTable() {
  // Sementara di memori browser (dibagi dengan halaman teknisi). Ganti dengan
  // API saat database siap.
  const { assets, history } = useAssetStore();
  const [photoOpen, setPhotoOpen] = useState<{ src: string; title: string } | null>(null);
  const [rejecting, setRejecting] = useState<{ id: number; eq: string } | null>(null);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
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
    appendHistory(res.newHistory);
    setNotice({
      tone: "ok",
      text: `Impor selesai: ${res.added} aset baru, ${res.updated} diperbarui, ${preview.errors.length} baris dilewati.`,
      details: res.warnings,
    });
    setPreview(null);
  }

  // Mapping yang ditolak dikembalikan ke "belum" supaya teknisi mengulang.
  // Foto dan kode label lama dipertahankan sebagai bahan tinjauan.
  function confirmReject() {
    const text = reason.trim();
    if (!rejecting || !text) return;
    updateAsset(rejecting.id, {
      mappingStatus: "belum",
      rejection: { reason: text, rejectedBy: "Admin", rejectedAt: new Date().toISOString() },
    });
    setRejecting(null);
    setReason("");
    setNotice({ tone: "ok", text: `Mapping ${rejecting.eq} ditolak dan dikembalikan ke teknisi.` });
  }

  const q = query.trim().toLowerCase();
  const filtered = assets.filter(
    (a) =>
      !q ||
      a.eq.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      a.assetCode.toLowerCase().includes(q),
  );

  function sortValue(a: (typeof assets)[number], key: SortKey): string {
    if (key === "office") return getOffice(a.officeId)?.name ?? "";
    if (key === "status" || key === "kondisi") return displayAssetValue(a, a[key]);
    return String(a[key] ?? "");
  }

  const sorted = sort
    ? [...filtered].sort((x, y) => {
        const r = sortValue(x, sort.key).localeCompare(sortValue(y, sort.key), "id", {
          numeric: true,
          sensitivity: "base",
        });
        return sort.dir === "asc" ? r : -r;
      })
    : filtered;

  function toggleSort(key: SortKey) {
    setSort((s) =>
      !s || s.key !== key
        ? { key, dir: "asc" }
        : s.dir === "asc"
          ? { key, dir: "desc" }
          : null,
    );
  }

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
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-2 font-medium"
                  aria-sort={
                    sort?.key === c.key
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    {c.label}
                    <span
                      aria-hidden
                      className={sort?.key === c.key ? "text-slate-900" : "text-slate-400"}
                    >
                      {sort?.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Foto</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada aset yang cocok.
                </td>
              </tr>
            )}
            {sorted.map((a) => {
              const rows = history.filter((h) => h.assetId === a.id);
              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{a.eq}</td>
                    <td className="px-4 py-2">{a.kind === "chassis" ? "Chassis" : "Modul"}</td>
                    <td className="px-4 py-2 font-mono">{a.serialNumber}</td>
                    <td className="px-4 py-2">{getOffice(a.officeId)?.name}</td>
                    <td className="px-4 py-2">{a.ref}</td>
                    <td className="px-4 py-2">
                      <UnknownAware value={displayAssetValue(a, a.status)} />
                    </td>
                    <td className="px-4 py-2">
                      <UnknownAware value={displayAssetValue(a, a.kondisi)} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={a.labelStatus === "terpasang" ? "green" : "gray"}>
                        {a.labelStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 font-mono">{a.labelCode ?? "-"}</td>
                    <td className="px-4 py-2">
                      {a.photoUrl ? (
                        <button
                          type="button"
                          onClick={() => setPhotoOpen({ src: a.photoUrl!, title: `${a.eq} · ${a.labelCode ?? "tanpa label"}` })}
                          aria-label={`Lihat foto validasi ${a.eq}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.photoUrl}
                            alt={`Foto validasi ${a.eq}`}
                            className="h-10 w-14 rounded border border-slate-200 object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="space-x-3 whitespace-nowrap px-4 py-2 text-right">
                      {a.rejection && a.mappingStatus !== "sudah" && (
                        <span title={a.rejection.reason}>
                          <Badge tone="red">Ditolak</Badge>
                        </span>
                      )}
                      {a.mappingStatus === "sudah" && (
                        <button
                          type="button"
                          onClick={() => {
                            setReason("");
                            setRejecting({ id: a.id, eq: a.eq });
                          }}
                          className="text-red-700 underline-offset-2 hover:underline"
                        >
                          Tolak
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === a.id ? null : a.id)}
                        className="text-slate-700 underline-offset-2 hover:underline"
                      >
                        Riwayat
                      </button>
                    </td>
                  </tr>
                  {a.rejection && a.mappingStatus !== "sudah" && (
                    <tr className="bg-red-50">
                      <td colSpan={11} className="px-4 py-2 text-red-800">
                        <b>Mapping ditolak</b> oleh {a.rejection.rejectedBy},{" "}
                        {new Date(a.rejection.rejectedAt).toLocaleString("id-ID")}.{" "}
                        <b>Alasan:</b> {a.rejection.reason}
                      </td>
                    </tr>
                  )}
                  {openId === a.id && (
                    <tr key={`${a.id}-history`} className="bg-slate-50">
                      <td colSpan={11} className="px-4 py-3">
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

      {rejecting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tolak mapping"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRejecting(null)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">Tolak mapping {rejecting.eq}</p>
            <p className="text-slate-600">
              Aset dikembalikan ke status belum dimapping dan teknisi diminta
              mengulang.
            </p>
            <label className="block font-medium">
              Alasan penolakan
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                autoFocus
                placeholder="Contoh: foto buram, kode label tidak sesuai"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={() => setRejecting(null)}>
                Batal
              </button>
              <button
                type="button"
                disabled={!reason.trim()}
                onClick={confirmReject}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                Tolak mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {photoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto validasi"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoOpen(null)}
        >
          <div
            className="max-h-full max-w-3xl space-y-2 rounded-xl bg-white p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">{photoOpen.title}</span>
              <button type="button" className={btn} onClick={() => setPhotoOpen(null)}>
                Tutup
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoOpen.src}
              alt="Foto validasi"
              className="max-h-[75vh] w-full rounded object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UnknownAware({ value }: { value: string }) {
  return value === UNKNOWN_VALUE ? (
    <span className="italic text-slate-400">{value}</span>
  ) : (
    <>{value}</>
  );
}
