"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;

// Foto bukti validasi: bisa diambil langsung dari kamera atau diunggah dari
// galeri. Foto hanya disimpan di memori browser (object URL); penyimpanan
// permanen (misalnya Cloudinary) masih [TBD].
export function PhotoInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fallbackCameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kamera langsung lewat getUserMedia. Butuh HTTPS atau localhost; kalau
  // gagal, pakai input file dengan atribut capture (membuka kamera di HP).
  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }
      } catch {
        if (cancelled) return;
        setCameraOpen(false);
        setError("Kamera tidak dapat diakses, pilih foto dari perangkat.");
        fallbackCameraRef.current?.click();
      }
    })();

    return () => {
      cancelled = true;
      setCameraReady(false);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOpen]);

  function setPhoto(url: string) {
    if (value) URL.revokeObjectURL(value);
    onChange(url);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    setError(null);
    setPhoto(URL.createObjectURL(file));
  }

  function takePicture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Gagal mengambil foto. Coba lagi.");
          return;
        }
        setError(null);
        setPhoto(URL.createObjectURL(blob));
        setCameraOpen(false);
      },
      "image/jpeg",
      0.85,
    );
  }

  function handleRemove() {
    if (value) URL.revokeObjectURL(value);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Foto validasi</p>

      {cameraOpen ? (
        <div className="space-y-2 rounded-lg border border-slate-300 bg-white p-3">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full rounded-md bg-black"
          />
          {!cameraReady && (
            <p className="text-sm text-slate-600">Membuka kamera…</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCameraOpen(false)}
              className="rounded-md border border-slate-300 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={takePicture}
              disabled={!cameraReady}
              className="rounded-md bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              Jepret
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Foto validasi aset"
            className="max-h-56 w-full rounded-md border border-slate-300 object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="text-sm text-red-700 hover:underline"
          >
            Hapus foto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCameraOpen(true);
            }}
            className="rounded-md border border-sky-600 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
          >
            Ambil foto
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="rounded-md border border-slate-300 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Upload foto
          </button>
        </div>
      )}

      <input
        ref={fallbackCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
