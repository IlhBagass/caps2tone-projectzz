"use client";

import { createContext, use, useCallback, useContext, useEffect, useState } from "react";
import { errorMessage } from "@/lib/api";
import { listTechnicianOffices, loadOfficeAssets, type TechnicianOffice } from "@/lib/technician";
import type { Asset } from "@/lib/types";

// --- Daftar kantor teknisi (beranda dan semua halaman kantor) ---

interface OfficesValue {
  /** null = belum dimuat. */
  offices: TechnicianOffice[] | null;
  error: string | null;
  reload: () => Promise<void>;
}

const OfficesContext = createContext<OfficesValue | null>(null);

export function TechnicianProvider({ children }: { children: React.ReactNode }) {
  const [offices, setOffices] = useState<TechnicianOffice[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setOffices(await listTechnicianOffices());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listTechnicianOffices().then(
      (list) => {
        if (cancelled) return;
        setOffices(list);
        setError(null);
      },
      (err) => !cancelled && setError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return <OfficesContext.Provider value={{ offices, error, reload }}>{children}</OfficesContext.Provider>;
}

export function useTechnicianOffices(): OfficesValue {
  const value = useContext(OfficesContext);
  if (!value) throw new Error("useTechnicianOffices harus dipakai di dalam TechnicianProvider.");
  return value;
}

/** Pesan memuat atau gagal memuat daftar kantor, dengan tombol coba lagi. Null bila data sudah siap. */
export function OfficesStatus() {
  const { offices, error, reload } = useTechnicianOffices();
  if (error && offices === null) {
    return (
      <div role="alert" className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p>Data kantor tidak dapat dimuat. {error}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (offices === null) return <p className="text-sm text-slate-600">Memuat data kantor…</p>;
  return null;
}

// --- Satu kantor: aset-asetnya dan jadwal yang dipakai untuk membukanya ---

interface OfficeValue {
  office: TechnicianOffice | null;
  /** Aset chassis dan modul kantor ini; null = belum dimuat. */
  assets: Asset[] | null;
  /** Id jadwal untuk setiap panggilan scan atau ubah data. */
  scheduleId: number | null;
  /** Hanya pada jadwal aktif hari ini teknisi boleh scan dan mengubah data. */
  canScan: boolean;
  error: string | null;
  /** Muat ulang aset dan ringkasan kantor dari backend (dipanggil setelah setiap perubahan). */
  refresh: () => Promise<void>;
}

const OfficeContext = createContext<OfficeValue | null>(null);

export function OfficeProvider({
  params,
  children,
}: {
  params: Promise<{ officeId: string }>;
  children: React.ReactNode;
}) {
  const { officeId } = use(params);
  const { offices, error: officesError, reload } = useTechnicianOffices();
  const office = offices?.find((o) => o.id === Number(officeId)) ?? null;
  const scheduleId = office?.scheduleId ?? null;

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (scheduleId === null) return;
    let cancelled = false;
    loadOfficeAssets(scheduleId).then(
      (list) => {
        if (cancelled) return;
        setAssets(list);
        setError(null);
      },
      (err) => !cancelled && setError(errorMessage(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [scheduleId, reloadKey]);

  const refresh = useCallback(async () => {
    await reload();
    setReloadKey((k) => k + 1);
  }, [reload]);

  return (
    <OfficeContext.Provider
      value={{ office, assets, scheduleId, canScan: office?.canScan ?? false, error: error ?? officesError, refresh }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice(): OfficeValue {
  const value = useContext(OfficeContext);
  if (!value) throw new Error("useOffice harus dipakai di dalam OfficeProvider.");
  return value;
}
