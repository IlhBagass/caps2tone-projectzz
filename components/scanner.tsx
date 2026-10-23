"use client";

import { useEffect, useId, useRef, useState } from "react";

export function Scanner({
  onDetected,
  onClose,
}: {
  onDetected: (text: string) => void;
  onClose: () => void;
}) {
  const elementId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(elementId);
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (text) => onDetectedRef.current(text),
          () => {},
        );
      } catch {
        setError("Kamera tidak dapat diakses. Gunakan input manual.");
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [elementId]);

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-3">
      <div id={elementId} className="overflow-hidden rounded-md bg-black" />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full rounded-md border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Tutup kamera
      </button>
    </div>
  );
}
