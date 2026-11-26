"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { PhotoInput } from "@/components/photo-input";
import { Scanner } from "@/components/scanner";
import { useOffice } from "@/components/technician-provider";
import { errorMessage } from "@/lib/api";
import { normalizeSerial, validateSerial } from "@/lib/match";
import { matchSerialNumber, patchAsset, saveScan } from "@/lib/technician";
import type { Asset, MatchResponse, MatchResultType } from "@/lib/types";

const STATUS_OPTIONS = ["Aktif", "Rusak", "Tidak Aktif"];

const ERRORS = {
  LABEL_IN_USE: "Kode label ini sudah dipakai aset lain.",
  SCHEDULE_INACTIVE: "Jadwal kantor ini tidak aktif hari ini, jadi data tidak bisa diubah.",
};

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
  const { assets, scheduleId, refresh } = useOffice();
  const all = assets ?? [];
  const [saving, setSaving] = useState(false);
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
    if (scheduleId === null) {
      setError("Jadwal kantor ini belum tersedia.");
      return;
    }
    setError(null);
    setLoading(true);
    setSelected(null);
    try {
      // Pencocokan dilakukan backend, hanya ke modul di kantor jadwal ini.
      const res = await matchSerialNumber(value, scheduleId, "module");
      setMatch(res);
      if (res.result === "found") selectAsset(res.assets[0]);
    } catch (err) {
      setError(errorMessage(err, ERRORS, "Gagal mencocokkan serial number. Coba lagi."));
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
    all.some((a) => a.id !== selected.id && a.labelCode === trimmedLabel);

  // Simpan hasil scan ke backend. Aset yang cocok menjadi "sudah" dengan foto dan label; perubahan REF/STATUS
  // dicatat backend ke riwayat. SN yang tidak dikenal tercatat sebagai not_found.
  async function handleSave() {
    if (!match || scheduleId === null) return;
    setSaving(true);
    setError(null);
    try {
      const changes: string[] = [];
      if (selected) {
        await saveScan({
          scheduleId,
          scannedSn: sn,
          kind: "module",
          assetId: selected.id,
          labelCode: trimmedLabel,
          photoUrl: photoUrl ?? undefined,
        });
        const fields: { ref?: string; status?: string } = {};
        if (ref !== selected.ref) fields.ref = ref;
        if (status !== selected.status) fields.status = status;
        if (fields.ref !== undefined) changes.push(`REF: ${selected.ref} → ${ref}`);
        if (fields.status !== undefined) changes.push(`STATUS: ${selected.status} → ${status}`);
        if (Object.keys(fields).length > 0) {
          try {
            await patchAsset(selected.id, scheduleId, fields);
          } catch (err) {
            // Mapping sudah tersimpan; hanya perubahan REF/STATUS yang gagal.
            changes.length = 0;
            changes.push(`REF/STATUS belum tersimpan: ${errorMessage(err)}`);
          }
        }
      } else {
        await saveScan({ scheduleId, scannedSn: sn, kind: "module" });
      }
      await refresh();
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
    } catch (err) {
      setError(errorMessage(err, ERRORS));
    } finally {
      setSaving(false);
    }
  }

  // Aset yang cocok baru bisa diselesaikan setelah ada foto validasi dan
  // kode label dari hasil scan QR label.
  const canSave =
    !saving &&
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

          {selected?.rejection && (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              Mapping sebelumnya ditolak admin. Alasan: {selected.rejection.reason}.
              Mohon validasi ulang.
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
              <PhotoInput value={photoUrl} onChange={setPhotoUrl} scheduleId={scheduleId} />

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
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="flex-1 rounded-md bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Selesai mapping"}
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
