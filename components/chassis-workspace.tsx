"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/badge";
import { MappingWorkspace } from "@/components/mapping-workspace";
import { useMapping } from "@/components/mapping-provider";
import { PhotoInput } from "@/components/photo-input";
import { Scanner } from "@/components/scanner";
import { normalizeSerial, validateSerial } from "@/lib/match";
import { mappingLabel, mappingTone } from "@/lib/status";

export function ChassisWorkspace({
  officeId,
  officeName,
  chassisId,
}: {
  officeId: number;
  officeName: string;
  chassisId: number;
}) {
  const { assets, setMappingStatus, updateAsset } = useMapping();
  const chassis = assets.find((a) => a.id === chassisId);
  const modules = assets.filter((a) => a.parentId === chassisId);

  const [sn, setSn] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [labelCode, setLabelCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [labelNotice, setLabelNotice] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  if (!chassis) return null;

  // Label bisa ditambahkan atau diperbarui setelah chassis terverifikasi.
  function saveLabel() {
    const label = labelCode.trim();
    if (!label) {
      setLabelNotice({ ok: false, text: "Kode label wajib diisi." });
      return;
    }
    if (assets.some((a) => a.id !== chassisId && a.labelCode === label)) {
      setLabelNotice({ ok: false, text: "Kode label ini sudah dipakai aset lain." });
      return;
    }
    updateAsset(chassisId, { labelCode: label, labelStatus: "terpasang" });
    setLabelNotice({ ok: true, text: "Label tersimpan." });
  }

  const verified = chassis.mappingStatus === "sudah";

  // Verifikasi chassis: serial harus cocok dan foto wajib ada. Update label
  // tidak diwajibkan, karena sebagian chassis berlabel milik tim lain.
  function verify() {
    const value = normalizeSerial(sn);
    setSn(value);
    const invalid = validateSerial(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (value !== chassis!.serialNumber) {
      setError(
        `Serial ${value} tidak cocok dengan chassis ini. Pastikan chassis yang discan benar.`,
      );
      return;
    }
    if (!photoUrl) {
      setError("Foto chassis wajib diambil atau diunggah.");
      return;
    }
    const label = labelCode.trim();
    if (
      label &&
      assets.some((a) => a.id !== chassisId && a.labelCode === label)
    ) {
      setError("Kode label ini sudah dipakai aset lain.");
      return;
    }
    setError(null);
    updateAsset(
      chassisId,
      label
        ? { mappingStatus: "sudah", labelCode: label, labelStatus: "terpasang" }
        : { mappingStatus: "sudah" },
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/teknisi/kantor/${officeId}`}
          className="text-sm text-sky-700 hover:underline"
        >
          ← Kembali ke chassis {officeName}
        </Link>
        <div className="mt-1 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{chassis.eq}</h1>
            <p className="font-mono text-sm text-slate-600">
              {chassis.serialNumber} · {chassis.ref}
            </p>
          </div>
          <Badge tone={mappingTone[chassis.mappingStatus]}>
            {mappingLabel[chassis.mappingStatus]}
          </Badge>
        </div>
      </div>

      {!verified && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">Langkah 1: scan chassis</h2>
          <p className="text-sm text-slate-600">
            Scan serial number chassis dan lampirkan foto. Modul baru bisa
            dipindai setelah chassis terverifikasi.
          </p>

          {chassis.mappingStatus === "tidak_ditemukan" ? (
            <div className="space-y-2">
              <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">
                Chassis ini ditandai tidak ditemukan.
              </p>
              <button
                type="button"
                onClick={() => setMappingStatus(chassisId, "belum")}
                className="w-full rounded-md border border-slate-300 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Batalkan tanda tidak ditemukan
              </button>
            </div>
          ) : (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  verify();
                }}
                className="space-y-3"
              >
                <label className="block text-sm font-medium">
                  SERIAL CHASSIS
                  <div className="mt-1 flex gap-2">
                    <input
                      value={sn}
                      onChange={(e) => setSn(e.target.value)}
                      placeholder="Scan atau ketik serial chassis"
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
                      setSn(normalizeSerial(text));
                    }}
                    onClose={() => setScanning(false)}
                  />
                )}

                <PhotoInput value={photoUrl} onChange={setPhotoUrl} />

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Kode label (opsional)
                    <div className="mt-1 flex gap-2">
                      <input
                        value={labelCode}
                        onChange={(e) => setLabelCode(e.target.value)}
                        placeholder="Scan QR label jika ingin memperbarui"
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
                      onDetected={(text) => {
                        setScanningLabel(false);
                        setLabelCode(text.trim());
                      }}
                      onClose={() => setScanningLabel(false)}
                    />
                  )}
                  <p className="text-xs text-slate-500">
                    Boleh dikosongkan, misalnya untuk chassis berlabel milik
                    tim lain.
                  </p>
                </div>

                {error && <p className="text-sm text-red-700">{error}</p>}

                <button
                  type="submit"
                  className="w-full rounded-md bg-sky-600 py-2.5 font-medium text-white hover:bg-sky-700"
                >
                  Verifikasi chassis
                </button>
              </form>
              <button
                type="button"
                onClick={() => setMappingStatus(chassisId, "tidak_ditemukan")}
                className="w-full text-sm text-red-700 hover:underline"
              >
                Chassis tidak ditemukan di lokasi
              </button>
              <p className="text-xs text-slate-500">
                Mode pengembangan, serial chassis ini: {chassis.serialNumber}
              </p>
            </>
          )}
        </section>
      )}

      {verified && (
        <>
          <section className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Foto chassis"
                className="size-16 rounded border border-emerald-200 object-cover"
              />
            )}
            <div>
              <p className="font-medium text-emerald-800">
                Chassis terverifikasi
              </p>
              <p className="text-slate-600">
                Label:{" "}
                <span className="font-mono">
                  {chassis.labelCode ?? "tidak diperbarui"}
                </span>
              </p>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Label chassis</h2>
            <p className="text-sm text-slate-600">
              {chassis.labelCode
                ? "Label saat ini tercatat. Scan QR baru untuk memperbarui."
                : "Label belum dicatat. Tambahkan jika sebelumnya terlewat."}
            </p>
            <div className="flex gap-2">
              <input
                value={labelCode}
                onChange={(e) => {
                  setLabelCode(e.target.value);
                  setLabelNotice(null);
                }}
                placeholder="Scan QR label atau ketik kode"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-base"
              />
              <button
                type="button"
                onClick={() => setScanningLabel((v) => !v)}
                className="rounded-md border border-sky-600 px-3 text-sm font-medium text-sky-700 hover:bg-sky-50"
              >
                Scan
              </button>
            </div>
            {scanningLabel && (
              <Scanner
                onDetected={(text) => {
                  setScanningLabel(false);
                  setLabelCode(text.trim());
                  setLabelNotice(null);
                }}
                onClose={() => setScanningLabel(false)}
              />
            )}
            {labelNotice && (
              <p
                className={`text-sm ${labelNotice.ok ? "text-emerald-700" : "text-red-700"}`}
              >
                {labelNotice.text}
              </p>
            )}
            <button
              type="button"
              onClick={saveLabel}
              className="w-full rounded-md bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Simpan label
            </button>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Modul pada chassis ({modules.length})</h2>
            <ul className="space-y-2">
              {modules.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.eq}</p>
                      <p className="font-mono text-slate-600">
                        {m.serialNumber} · {m.ref}
                      </p>
                    </div>
                    <Badge tone={mappingTone[m.mappingStatus]}>
                      {mappingLabel[m.mappingStatus]}
                    </Badge>
                  </div>
                  {m.mappingStatus === "belum" && (
                    <button
                      type="button"
                      onClick={() => setMappingStatus(m.id, "tidak_ditemukan")}
                      className="mt-2 text-red-700 hover:underline"
                    >
                      Tandai tidak ditemukan
                    </button>
                  )}
                  {m.mappingStatus === "tidak_ditemukan" && (
                    <button
                      type="button"
                      onClick={() => setMappingStatus(m.id, "belum")}
                      className="mt-2 text-slate-600 hover:underline"
                    >
                      Kembalikan ke belum termapping
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Langkah 2: scan modul</h2>
            <MappingWorkspace chassisId={chassisId} />
          </section>
        </>
      )}
    </div>
  );
}
