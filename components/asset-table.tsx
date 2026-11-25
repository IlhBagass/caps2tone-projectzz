"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/badge";
import { errorMessage } from "@/lib/api";
import { downloadTemplate } from "@/lib/asset-excel";
import {
  exportAssets,
  getAssetHistory,
  importAssetsFile,
  importProblems,
  listAssets,
  rejectAsset,
  type AdminAsset,
  type AssetSortKey,
  type ImportProblem,
  type ImportSummary,
} from "@/lib/assets";
import { listOffices } from "@/lib/offices";
import { displayAssetValue, UNKNOWN_VALUE } from "@/lib/types";
import type { AssetHistory } from "@/lib/types";

const btn =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";

const PAGE_SIZE = 25;

const columns: { key: AssetSortKey; label: string }[] = [
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

interface ImportPreview {
  name: string;
  file: File;
  /** Hasil dry run: tidak ada baris bermasalah. */
  summary: ImportSummary | null;
  problems: ImportProblem[];
}

interface HistoryState {
  loading: boolean;
  rows: AssetHistory[];
  error: string | null;
}

export function AssetTable() {
  const [rows, setRows] = useState<AdminAsset[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // pencarian yang sudah ditunda, dipakai untuk memuat
  const [sort, setSort] = useState<{ key: AssetSortKey; dir: "asc" | "desc" } | null>(null);

  const [photoOpen, setPhotoOpen] = useState<{ src: string; title: string } | null>(null);
  const [rejecting, setRejecting] = useState<{ id: number; eq: string } | null>(null);
  const [reason, setReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [histories, setHistories] = useState<Record<number, HistoryState>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string; details?: ImportProblem[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pencarian ditunda sebentar dan mengembalikan ke halaman pertama.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Daftar dimuat dari backend (cari, urut, dan halaman dijalankan di server).
  useEffect(() => {
    let cancelled = false;
    listAssets({ search: query || undefined, page, limit: PAGE_SIZE, sort }).then(
      (result) => {
        if (cancelled) return;
        setRows(result.rows);
        setTotal(result.total);
        setLoadError(null);
      },
      (err) => !cancelled && setLoadError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [query, page, sort, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, {}, "Terjadi kesalahan saat memproses file Excel.") });
    } finally {
      setBusy(false);
    }
  }

  // Pratinjau impor = dry run di backend: semua aturan dijalankan, tetapi tidak ada yang disimpan.
  function onPickFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setNotice(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setNotice({ tone: "error", text: "Format file harus .xlsx." });
      return;
    }
    void run(async () => {
      try {
        setPreview({ name: file.name, file, summary: await importAssetsFile(file, true), problems: [] });
      } catch (err) {
        const problems = importProblems(err);
        if (!problems) throw err;
        setPreview({ name: file.name, file, summary: null, problems });
      }
    });
  }

  function confirmImport() {
    if (!preview) return;
    const { file } = preview;
    void run(async () => {
      try {
        const done = await importAssetsFile(file, false);
        setNotice({ tone: "ok", text: `Impor selesai: ${done.created} aset baru, ${done.updated} diperbarui.` });
        setPreview(null);
        reload();
      } catch (err) {
        const problems = importProblems(err);
        if (!problems) throw err;
        setPreview({ name: file.name, file, summary: null, problems });
      }
    });
  }

  // Mapping yang ditolak dikembalikan ke "belum" supaya teknisi mengulang.
  // Foto dan kode label lama dipertahankan sebagai bahan tinjauan.
  async function confirmReject() {
    const text = reason.trim();
    if (!rejecting || !text) return;
    setRejectBusy(true);
    setRejectError(null);
    try {
      await rejectAsset(rejecting.id, text);
      setNotice({ tone: "ok", text: `Mapping ${rejecting.eq} ditolak dan dikembalikan ke teknisi.` });
      setRejecting(null);
      setReason("");
      reload();
    } catch (err) {
      setRejectError(errorMessage(err, { NOT_MAPPED: "Hanya mapping yang sudah selesai yang dapat ditolak." }));
    } finally {
      setRejectBusy(false);
    }
  }

  function toggleHistory(assetId: number) {
    if (openId === assetId) {
      setOpenId(null);
      return;
    }
    setOpenId(assetId);
    setHistories((h) => ({ ...h, [assetId]: { loading: true, rows: [], error: null } }));
    getAssetHistory(assetId).then(
      (list) => setHistories((h) => ({ ...h, [assetId]: { loading: false, rows: list, error: null } })),
      (err) => setHistories((h) => ({ ...h, [assetId]: { loading: false, rows: [], error: errorMessage(err) } })),
    );
  }

  function toggleSort(key: AssetSortKey) {
    setSort((s) =>
      !s || s.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null,
    );
    setPage(1);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const shown = rows ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari EQ, serial number, atau kode aset"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => void run(async () => downloadTemplate(await listOffices()))}
          >
            Unduh template
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            Impor Excel
          </button>
          <button
            type="button"
            className={btn}
            disabled={busy || total === 0}
            onClick={() => void run(() => exportAssets(query || undefined))}
          >
            Ekspor Excel{query ? " (hasil cari)" : ""}
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

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="flex-1">Data aset tidak dapat dimuat. {loadError}</p>
          <button type="button" className={btn} onClick={reload}>
            Coba lagi
          </button>
        </div>
      )}

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
          {preview.summary ? (
            <p>
              {preview.summary.total} baris valid: {preview.summary.created} aset baru dan {preview.summary.updated}{" "}
              diperbarui. Aset dengan EQ yang sudah ada akan diperbarui.
            </p>
          ) : (
            <p className="text-red-700">
              {preview.problems.length} baris bermasalah. Tidak ada yang disimpan; perbaiki file lalu impor ulang.
            </p>
          )}
          {preview.problems.length > 0 && (
            <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-red-700">
              {preview.problems.map((e, i) => (
                <li key={i}>{e.line ? `Baris ${e.line}: ` : ""}{e.message}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <button type="button" className={btn} disabled={busy || !preview.summary} onClick={confirmImport}>
              {busy ? "Mengimpor…" : preview.summary ? `Impor ${preview.summary.total} baris` : "Impor"}
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
                    sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    {c.label}
                    <span aria-hidden className={sort?.key === c.key ? "text-slate-900" : "text-slate-400"}>
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
            {rows === null && !loadError && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-600">
                  Memuat data aset…
                </td>
              </tr>
            )}
            {rows !== null && shown.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-600">
                  Tidak ada aset yang cocok.
                </td>
              </tr>
            )}
            {shown.map((a) => {
              const history = histories[a.id];
              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{a.eq}</td>
                    <td className="px-4 py-2">{a.kind === "chassis" ? "Chassis" : "Modul"}</td>
                    <td className="px-4 py-2 font-mono">{a.serialNumber}</td>
                    <td className="px-4 py-2">{a.officeName}</td>
                    <td className="px-4 py-2">{a.ref}</td>
                    <td className="px-4 py-2">
                      <UnknownAware value={displayAssetValue(a, a.status)} />
                    </td>
                    <td className="px-4 py-2">
                      <UnknownAware value={displayAssetValue(a, a.kondisi)} />
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={a.labelStatus === "terpasang" ? "green" : "gray"}>{a.labelStatus}</Badge>
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
                            setRejectError(null);
                            setRejecting({ id: a.id, eq: a.eq });
                          }}
                          className="text-red-700 underline-offset-2 hover:underline"
                        >
                          Tolak
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleHistory(a.id)}
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
                        {new Date(a.rejection.rejectedAt).toLocaleString("id-ID")}. <b>Alasan:</b> {a.rejection.reason}
                      </td>
                    </tr>
                  )}
                  {openId === a.id && (
                    <tr key={`${a.id}-history`} className="bg-slate-50">
                      <td colSpan={11} className="px-4 py-3">
                        {!history || history.loading ? (
                          <p className="text-slate-600">Memuat riwayat…</p>
                        ) : history.error ? (
                          <p className="text-red-700">Riwayat tidak dapat dimuat. {history.error}</p>
                        ) : history.rows.length === 0 ? (
                          <p className="text-slate-600">Belum ada riwayat perubahan.</p>
                        ) : (
                          <ul className="space-y-1">
                            {history.rows.map((h) => (
                              <li key={h.id}>
                                <b>{h.field.toUpperCase()}</b>: {h.oldValue} → {h.newValue}{" "}
                                <span className="text-slate-500">
                                  oleh {h.changedBy}, {new Date(h.changedAt).toLocaleString("id-ID")}
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>{total === 0 ? "0 aset" : `Menampilkan ${first}–${last} dari ${total} aset`}</span>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {pageCount}
          </span>
          <button type="button" className={btn} disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </button>
        </div>
      </div>

      {rejecting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tolak mapping"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setRejecting(null)}
        >
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-4 text-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium">Tolak mapping {rejecting.eq}</p>
            <p className="text-slate-600">
              Aset dikembalikan ke status belum dimapping dan teknisi diminta mengulang.
            </p>
            <label className="block font-medium">
              Alasan penolakan
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                autoFocus
                placeholder="Contoh: foto buram, kode label tidak sesuai"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            {rejectError && <p className="text-red-700">{rejectError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={() => setRejecting(null)}>
                Batal
              </button>
              <button
                type="button"
                disabled={!reason.trim() || rejectBusy}
                onClick={() => void confirmReject()}
                className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectBusy ? "Menolak…" : "Tolak mapping"}
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
          <div className="max-h-full max-w-3xl space-y-2 rounded-xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">{photoOpen.title}</span>
              <button type="button" className={btn} onClick={() => setPhotoOpen(null)}>
                Tutup
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoOpen.src} alt="Foto validasi" className="max-h-[75vh] w-full rounded object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function UnknownAware({ value }: { value: string }) {
  return value === UNKNOWN_VALUE ? <span className="italic text-slate-400">{value}</span> : <>{value}</>;
}
