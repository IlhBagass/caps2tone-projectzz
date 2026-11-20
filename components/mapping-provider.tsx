"use client";

import { appendHistory, updateAsset, useAssetStore } from "@/lib/asset-store";
import type { Asset, AssetHistory, MappingStatus } from "@/lib/types";

// Pembungkus tipis atas lib/asset-store (penyimpanan sementara di memori
// browser, dipakai bersama halaman admin). Ganti dengan API saat siap.
interface MappingContextValue {
  assets: Asset[];
  setMappingStatus: (id: number, status: MappingStatus) => void;
  updateAsset: (id: number, patch: Partial<Asset>) => void;
  addHistory: (entries: Omit<AssetHistory, "id">[]) => void;
}

export function MappingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useMapping(): MappingContextValue {
  const { assets } = useAssetStore();
  return {
    assets,
    updateAsset,
    addHistory: appendHistory,
    setMappingStatus: (id, mappingStatus) => updateAsset(id, { mappingStatus }),
  };
}
