"use client";

import { createContext, useContext, useState } from "react";
import { assets as initialAssets } from "@/lib/mock-data";
import type { Asset, MappingStatus } from "@/lib/types";

// Penyimpanan sementara di memori browser supaya status mapping terlihat
// konsisten antar halaman teknisi. Hilang saat refresh. Ganti dengan API.
interface MappingContextValue {
  assets: Asset[];
  setMappingStatus: (id: number, status: MappingStatus) => void;
  updateAsset: (id: number, patch: Partial<Asset>) => void;
}

const MappingContext = createContext<MappingContextValue | null>(null);

export function MappingProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);

  function updateAsset(id: number, patch: Partial<Asset>) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  return (
    <MappingContext.Provider
      value={{
        assets,
        updateAsset,
        setMappingStatus: (id, mappingStatus) =>
          updateAsset(id, { mappingStatus }),
      }}
    >
      {children}
    </MappingContext.Provider>
  );
}

export function useMapping(): MappingContextValue {
  const ctx = useContext(MappingContext);
  if (!ctx) throw new Error("useMapping harus dipakai di dalam MappingProvider");
  return ctx;
}
