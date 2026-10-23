"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { useMapping } from "@/components/mapping-provider";
import { PhotoInput } from "@/components/photo-input";
import { Scanner } from "@/components/scanner";
import {
  matchSerial,
  normalizeSerial,
  validateSerial,
} from "@/lib/match";
import type { Asset, MatchResponse, MatchResultType } from "@/lib/types";

const STATUS_OPTIONS = ["Aktif", "Rusak", "Tidak Aktif"];

interface SavedEntry {
  sn: string;
  result: MatchResultType;
  eq: string | null;
  changes: string[];
  labelCode: string | null;
  photoUrl: string | null;
}

const resultLabel: Record<MatchResultType, string> = {
  found: "Ditemukan",
  not_found: "Not Found",
  multiple: "Lebih dari satu EQ",
};

const resultTone: Record<MatchResultType, "green" | "red" | "amber"> = {
  found: "green",
  not_found: "red",
  multiple: "amber",
};

export function MappingWorkspace({ chassisId }: { chassisId: number }) {
  const { assets, updateAsset } = useMapping();
  const [sn, setSn] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [ref, setRef] = useState("");
  const [status, setStatus] = useState("");
  const [labelCode, setLabelCode] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedEntry[]>([]);

  function reset() {
    setSn("");
    setMatch(null);
    setSelected(null);
    setError(null);
    setLabelCode("");
    setPhotoUrl(null);
    setScanning(false);
    setScanningLabel(false);
  }

  function selectAsset(asset: Asset) {
    setSelected(asset);
    setRef(asset.ref);
    setStatus(asset.status);
  }

  async function runMatch(raw: string) {
    const value = normalizeSerial(raw);
    setSn(value);
    const invalid = validateSerial(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setLoading(true);
    setSelected(null);
    try {
      const res = await matchSerial(value, assets);
      setMatch(res);
      if (res.result === "found") selectAsset(res.assets[0]);
    } catch {
      setError("Gagal mencocokkan serial number. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleLabelDetected(raw: string) {
    setScanningLabel(false);
    setLabelCode(raw.trim());
  }

  const trimmedLabel = labelCode.trim();
  const labelTaken =
    selected !== null &&
    trimmedLabel !== "" &&
    assets.some((a) => a.id !== selected.id && a.labelCode === trimmedLabel);

  function handleSave() {
    if (!match) return;
    const changes: string[] = [];
    if (selected) {
      if (ref !== selected.ref) changes.push(`REF: ${selected.ref} → ${ref}`);
      if (status !== selected.status)
        changes.push(`STATUS: ${selected.status} → ${status}`);
    }
    if (selected) {
      updateAsset(selected.id, {
        ref,
        status,
        mappingStatus: "sudah",
        labelStatus: "terpasang",
        labelCode: trimmedLabel,
      });
    }
    setSaved((prev) => [
      {
        sn,
        result: match.result,
        eq: selected?.eq ?? null,
        changes,
        labelCode: selected ? trimmedLabel : null,
        photoUrl: selected ? photoUrl : null,
      },
      ...prev,
    ]);
    reset();
  }

  // Aset yang cocok baru bisa diselesaikan setelah ada foto validasi dan
  // kode label dari hasil scan QR label.
  const canSave =
    match !== null &&
    (match.result === "not_found" ||
      (selected !== null &&
        photoUrl !== null &&
        trimmedLabel !== "" &&
        !labelTaken));

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runMatch(sn);
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium">
            SERIAL
            <div className="mt-1 flex gap-2">
              <input
                value={sn}
                onChange={(e) => setSn(e.target.value)}
                placeholder="Scan atau ketik serial number"
                autoCapitalize="characters"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base uppercase"
              />
              <button
                type="button"
                onClick={() => {
                  setScanningLabel(false);
                  setScanning((s) => !s);
                }}
                className="rounded-md border border-sky-600 px-3 text-sm font-medium text-sky-700 hover:bg-sky-50"
              >
                Scan
              </button>
            </div>
          </label>

          {scanning && (
            <Scanner
              onDetected={(text) => {
                setScanning(false);
                runMatch(text);
              }}
              onClose={() => setScanning(false)}
            />
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? "Mencocokkan…" : "Cocokkan"}
          </button>
        </form>
        <p className="text-xs text-slate-500">
          Mode pengembangan, SN contoh: SN-A1004 (ditemukan), SN-DUP900
          (lebih dari satu, chassis CH-JKT-01), SN-ZZ999 (tidak ditemukan).
        </p>
      </section>

      {match && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Hasil pencocokan</h2>
            <Badge tone={resultTone[match.result]}>
              {resultLabel[match.result]}
            </Badge>
          </div>

          {match.result === "not_found" && (
            <p className="text-sm text-slate-700">
              SN <b>{sn}</b> tidak ada di database. Aset akan dicatat sebagai
              selisih data dengan kondisi fisik. Periksa lagi SN jika label
              buram atau rusak.
            </p>
          )}

          {match.result === "multiple" && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                SN <b>{sn}</b> cocok ke {match.assets.length} EQ. Pilih yang
                sesuai dengan kondisi fisik, atau periksa ulang SN.
              </p>
              <ul className="space-y-2">
                {match.assets.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => selectAsset(a)}
                      className={`w-full rounded-lg border p-3 text-left text-sm ${
                        selected?.id === a.id
                          ? "border-sky-600 bg-sky-50"
                          : "border-slate-300"
                      }`}
                    >
                      <b>{a.eq}</b> · REF {a.ref} · {a.assetCode}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected && selected.parentId !== chassisId && (
            <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">
              Modul ini terdaftar di chassis lain di database. Pastikan modul
              benar-benar terpasang di chassis ini sebelum menyimpan.
            </p>
          )}

          {selected && (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500">EQ</dt>
                <dd className="font-medium">{selected.eq}</dd>
                <dt className="text-slate-500">Kode aset</dt>
                <dd className="font-medium">{selected.assetCode}</dd>
                <dt className="text-slate-500">KONDISI</dt>
                <dd className="font-medium">{selected.kondisi}</dd>
              </dl>

              <label className="block text-sm font-medium">
                REF
                <input
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base"
                />
              </label>

              <label className="block text-sm font-medium">
                STATUS
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base"
                >
                  {Array.from(
                    new Set([...STATUS_OPTIONS, selected.status]),
                  ).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500">
                Perubahan REF/STATUS akan dicatat di riwayat aset.
              </p>
            </div>
          )}

          {selected && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <PhotoInput value={photoUrl} onChange={setPhotoUrl} />

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Kode label (scan QR label)
                  <div className="mt-1 flex gap-2">
                    <input
                      value={labelCode}
                      onChange={(e) => setLabelCode(e.target.value)}
                      placeholder="Scan QR label atau ketik kode"
                      className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScanning(false);
                        setScanningLabel((v) => !v);
                      }}
                      className="rounded-md border border-sky-600 px-3 text-sm font-medium text-sky-700 hover:bg-sky-50"
                    >
                      Scan
                    </button>
                  </div>
                </label>
                {scanningLabel && (
                  <Scanner
                    onDetected={handleLabelDetected}
                    onClose={() => setScanningLabel(false)}
                  />
                )}
                {labelTaken && (
                  <p className="text-sm text-red-700">
                    Kode label ini sudah dipakai aset lain.
                  </p>
                )}
                {selected.labelCode && (
                  <p className="text-xs text-slate-500">
                    Label saat ini: {selected.labelCode}. Scan label baru untuk
                    memperbarui.
                  </p>
                )}
              </div>

              {!canSave && (
                <p className="text-xs text-slate-500">
                  Mapping selesai setelah foto validasi dan kode label terisi.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-medium hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="flex-1 rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Selesai mapping
            </button>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">
          Tersimpan sesi ini
        </h2>
        {saved.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada aset yang disimpan.</p>
        ) : (
          <ul className="space-y-2">
            {saved.map((s, i) => (
              <li
                key={`${s.sn}-${i}`}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.sn}</span>
                  <Badge tone={resultTone[s.result]}>
                    {resultLabel[s.result]}
                  </Badge>
                </div>
                {s.eq && <p className="text-slate-600">{s.eq}</p>}
                {s.changes.map((c) => (
                  <p key={c} className="text-slate-600">
                    {c}
                  </p>
                ))}
                {s.labelCode && (
                  <p className="text-xs text-slate-500">
                    Label: <span className="font-mono">{s.labelCode}</span>
                  </p>
                )}
                {s.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.photoUrl}
                    alt={`Foto validasi ${s.sn}`}
                    className="mt-2 h-20 rounded border border-slate-200 object-cover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
